/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "./StrategiesManager.sol";
import "./StakingVault.sol";


interface HealthCheck {
    function check(address strategy, uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding, uint256totalDebt) external view returns (bool);
    function doHealthCheck(address strategy) external view returns (bool);
    function enableCheck(address strategy) external;
}

contract StrategiesReporter is Initializable, StrategiesManager {

    // NOTE: A four-century period will be missing 3 of its 100 Julian leap years, leaving 97.
    //       So the average year has 365 + 97/400 = 365.2425 days
    //       ERROR(Julian): -0.0078
    //       ERROR(Gregorian): -0.0003
    //       A day = 24 * 60 * 60 sec = 86400 sec
    //       365.2425 * 86400 = 31556952.0
    uint256 constant SECUNDS_PER_YEAR = 31_556_952;  // 365.2425 days

    address public healthCheck;
    

    /// @param storageTokenAddress - address of ERC20 token contract which will be stored in fund
    /// @param fund - Address of fund, which assets this manager should manage 
    function initialize(address storageTokenAddress, address fund, address _healthCheck) initializer public {
        __StrategiesManager__init(storageTokenAddress, fund);

        healthCheck = _healthCheck;
    }

    ///  Reports the amount of assets the calling Strategy has free (usually interms of ROI).
    ///  The performance fee is determined here, off of the strategy's profits
    ///  (if any), and sent to governance.
    ///  The strategist's fee is also determined here (off of profits), to be
    ///  handled according to the strategist on the next harvest.
    ///  This may only be called by a Strategy managed by this Vault.
    ///  @dev
    ///     For approved strategies, this is the most efficient behavior.
    ///     The Strategy reports back what it has free, then Vault "decides"
    ///     whether to take some back or give it more. Note that the most it can
    ///     take is `gain + _debtPayment`, and the most it can give is all of the
    ///     remaining reserves. Anything outside of those bounds is abnormal behavior.
    ///     All approved strategies must have increased diligence around
    ///     calling this function, as abnormal behavior could become catastrophic.
    ///  @param gain
    ///     Amount Strategy has realized as a gain on it's investment since its
    ///     last report, and is free to be given back to Vault as earnings
    ///  @param loss
    ///     Amount Strategy has realized as a loss on it's investment since its
    ///     last report, and should be accounted for on the Vault's balance sheet.
    ///     The loss will reduce the debtRatio. The next time the strategy will harvest,
    ///     it will pay back the debt in an attempt to adjust to the new debt limit.
    ///  @param _debtPayment
    ///   Amount Strategy has made available to cover outstanding debt
    ///  @return Amount of debt outstanding (if totalDebt > debtLimit or emergency shutdown).
    function report(uint256 gain, uint256 loss, uint256 _debtPayment) external nonReentrant returns(uint256) {
        // Only approved strategies can call this function
        require(strategies[msg.sender].activation > 0);
        // Check report is within healthy ranges
        require(_isStrategyHealthy(msg.sender, gain, loss, _debtPayment));
        // No lying about total available to withdraw!
        require(assets.balanceOf(msg.sender) >= gain + _debtPayment);

        // We have a loss to report, do it before the rest of the calculations
        if (loss > 0) {
            _reportLoss(msg.sender, loss);
        }

        // Assess both management fee and performance fee, and issue both as shares of the vault
        uint256 totalFees = _assessFees(msg.sender, gain);

        // Returns are always "realized gains"
        strategies[msg.sender].totalGain += gain;

        // Compute the line of credit the Vault is able to offer the Strategy (if any)
        uint256 credit = _creditAvailable(msg.sender);

        // Outstanding debt the Strategy wants to take back from the Vault (if any)
        //  debtOutstanding <= StrategyParams.totalDebt
        uint256 debt = _debtOutstanding(msg.sender);
        uint256 debtPayment = min(_debtPayment, debt);

        if (debtPayment > 0) {
            strategies[msg.sender].totalDebt -= debtPayment;
            totalDebt -= debtPayment;
            debt -= debtPayment;
            // `debt` is being tracked for later
        }

        // Update the actual debt based on the full credit we are extending to the Strategy
        // or the returns if we are taking funds back
        //  credit + self.strategies[msg.sender].totalDebt is always < self.debtLimit
        //  At least one of `credit` or `debt` is always 0 (both can be 0)
        if (credit > 0) {
            strategies[msg.sender].totalDebt += credit;
            totalDebt += credit;
        }

        // Give/take balance to Strategy, based on the difference between the reported gains
        // (if any), the debt payment (if any), the credit increase we are offering (if any),
        // and the debt needed to be paid off (if any)
        //  This is just used to adjust the balance of tokens between the Strategy and
        //       the Vault based on the Strategy's debt limit (as well as the Vault's).
        uint256 totalAvail = gain + debtPayment;
        if (totalAvail < credit) {
            // credit surplus, give to Strategy
            _transferAssets(msg.sender, credit - totalAvail);
        } else if (totalAvail > credit) {
            // credit deficit, take from Strategy
            _transferAssetsFrom(msg.sender, self, totalAvail - credit);
        }
        // else, don't do anything because it is balanced

        // Profit is locked and gradually released per block
        //  compute current locked profit and replace with sum of current and new
        uint256 lockedProfitBeforeLoss = _calculateLockedProfit() + gain - totalFees;
        if (lockedProfitBeforeLoss > loss) {
            lockedProfit = lockedProfitBeforeLoss - loss;
        } else {
            lockedProfit = 0;
        }

        // Update reporting time
        strategies[msg.sender].lastReport = block.timestamp;
        lastReport = block.timestamp;

        emit StrategyReported(
            msg.sender,
            gain,
            loss,
            debtPayment,
            self.strategies[msg.sender].totalGain,
            self.strategies[msg.sender].totalLoss,
            self.strategies[msg.sender].totalDebt,
            credit,
            self.strategies[msg.sender].debtRatio
        );

        if (strategies[msg.sender].debtRatio == 0 || paused()) {
            // Take every last penny the Strategy has (Emergency Exit/revokeStrategy)
            //  This is different than `debt` in order to extract *all* of the returns
            return Strategy(msg.sender).estimatedTotalAssets();
        } else {
            // Otherwise, just return what we have as debt outstanding
            return debt;
        }
    }

    /// Check is strategy report healthy
    function _isStrategyHealthy(address strategy, uint256 gain, uint256 loss, uint256 _debtPayment) public view returns (bool) {
        if(healthCheck == address(0)) {
            return true;
        }

        if(HealthCheck(healthCheck).doHealthCheck(strategy)){
                
            uint256 debtOutstanding = _debtOutstanding(strategy);
            uint256 strategyTotalDebt = strategies[strategy].totalDebt;

            // fail healthcheck
            require(HealthCheck(healthCheck).check(strategy, gain, loss, _debtPayment, debtOutstanding, strategyTotalDebt));
            
            return true;
        } 
        
        HealthCheck(healthCheck).enableCheck(strategy);
    }

    /// Determines if `strategy` is past its debt limit and if any tokens
    ///     should be withdrawn to the Vault.
    /// @param strategy The Strategy to check. Defaults to the caller.
    /// @return The quantity of tokens to withdraw.
    function _debtOutstanding(address strategy) internal view returns(uint256) {
        if (debtRatio == 0) {
            return strategies[strategy].totalDebt;
        }

        uint256 strategyTotalDebt = strategies[strategy].totalDebt;

        if (paused()) {
            return strategyTotalDebt;
        } 

        // TODO: Use Safe Math
        uint256 strategyDebtLimit = strategies[strategy].debtRatio * StakingVault(fund).totalAssets() / MAX_BASIS_POINTS;        
        if(strategyTotalDebt <= strategyDebtLimit) {
            return 0;
        } 

        return strategyTotalDebt - strategyDebtLimit;
    }

    function _assessFees(address strategy, uint256 gain) internal returns (uint256){
        // Issue new shares to cover fees
        // NOTE: In effect, this reduces overall share price by the combined fee
        // NOTE: may throw if Vault.totalAssets() > 1e64, or not called for more than a year
        if (strategies[strategy].activation == block.timestamp){
            return 0;  // NOTE: Just added, no fees to assess
        }

        uint256 duration = block.timestamp - strategies[strategy].lastReport;
        require(duration != 0, "can't call assessFees twice within the same block");

        if(gain == 0) {
            // NOTE: The fees are not charged if there hasn't been any gains reported
            return 0;
        }

        // TODO: use safe math
        uint256 management_fee = (
            (
                (self.strategies[strategy].totalDebt - Strategy(strategy).delegatedAssets())
                * duration
                * self.managementFee
            )
            / MAX_BASIS_POINTS
            / SECUNDS_PER_YEAR
        );

        // NOTE: Applies if Strategy is not shutting down, or it is but all debt paid off
        // NOTE: No fee is taken when a Strategy is unwinding it's position, until all debt is paid
        uint256 strategist_fee = (
            gain
            * self.strategies[strategy].performanceFee
            / MAX_BASIS_POINTS
        );
        // NOTE: Unlikely to throw unless strategy reports >1e72 harvest profit
        uint256 performance_fee = gain * self.performanceFee / MAX_BASIS_POINTS;

        // NOTE: This must be called prior to taking new collateral,
        //       or the calculation will be wrong!
        // NOTE: This must be done at the same time, to ensure the relative
        //       ratio of governance_fee : strategist_fee is kept intact
        uint256 total_fee = performance_fee + strategist_fee + management_fee;

        // ensure total_fee is not more than gain
        if (total_fee > gain) {
            total_fee = gain;
        }
        
        if (total_fee > 0){  // NOTE: If mgmt fee is 0% and no gains were realized, skip
            uint256 reward = _issueSharesForFund(total_fee);

            // Send the rewards out as new shares in this Vault
            if (strategist_fee > 0) {  // NOTE: Guard against DIV/0 fault
                // NOTE: Unlikely to throw unless sqrt(reward) >>> 1e39
                uint256 strategist_reward = (
                    strategist_fee
                    * reward
                    / total_fee
                );
                _transferShares(strategy, strategist_reward);
                // NOTE: Strategy distributes rewards at the end of harvest()
            }

            // NOTE: Governance earns any dust leftover from flooring math above
            if (_sharesBalanceOfFund() > 0) {
                _transferShares(rewards, self.balanceOf[self]);
            }
        }

        return total_fee;
    }

    function _transferShares(address to, uint256 amount) internal {        
        revert("not implemented");
    }

    function _sharesBalanceOfFund() internal view returns (uint256) {
        revert("not implemented");
    }

    function _issueSharesForFund(uint256 amount) internal returns (uint256) {
        // under the hood must call fund._issueSharesForAmount
        revert("not implemented");
    }

    /// @notice
    ///     Amount of tokens in Vault a Strategy has access to as a credit line.
    ///     This will check the Strategy's debt limit, as well as the tokens
    ///     available in the Vault, and determine the maximum amount of tokens
    ///     (if any) the Strategy may draw on.
    ///     In the rare case the Vault is in emergency shutdown this will return 0.
    /// @param strategy The Strategy to check. Defaults to caller.
    function _creditAvailable(address strategy ) internal whenNotPaused returns (uint256) {
        uint256 vault_totalAssets = StakingVault(fund).totalAssets();
        uint256 vault_debtLimit =  debtRatio * vault_totalAssets / MAX_BASIS_POINTS;
        uint256 vault_totalDebt = totalDebt;
        uint256 strategy_debtLimit = strategies[strategy].debtRatio * vault_totalAssets / MAX_BASIS_POINTS;
        uint256 strategy_totalDebt = strategies[strategy].totalDebt;
        uint256 strategy_minDebtPerHarvest = strategies[strategy].minDebtPerHarvest;
        uint256 strategy_maxDebtPerHarvest = strategies[strategy].maxDebtPerHarvest;

        // Exhausted credit line
        if (strategy_debtLimit <= strategy_totalDebt || vault_debtLimit <= vault_totalDebt) {
            return 0;
        }

        // Start with debt limit left for the Strategy
        uint256 available = strategy_debtLimit - strategy_totalDebt;

        // Adjust by the global debt limit left
        available = MathUpgradeable.min(available, vault_debtLimit - vault_totalDebt);

        // Can only borrow up to what the contract has in reserve
        // NOTE: Running near 100% is discouraged
        revert("Need use avaialbe assets not a reporter, but fund and reporter together");
        available = MathUpgradeable.min(available, _availableAssets());

        // Adjust by min and max borrow limits (per harvest)
        // NOTE: min increase can be used to ensure that if a strategy has a minimum
        //       amount of capital needed to purchase a position, it's not given capital
        //       it can't make use of yet.
        // NOTE: max increase is used to make sure each harvest isn't bigger than what
        //       is authorized. This combined with adjusting min and max periods in
        //       `BaseStrategy` can be used to effect a "rate limit" on capital increase.
        if (available < strategy_minDebtPerHarvest) {
            return 0;
        } else {
            return MathUpgradeable.min(available, strategy_maxDebtPerHarvest);
        }
    }
}