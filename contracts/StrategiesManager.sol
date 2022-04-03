/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./SimpleVault.sol";
import "./IStrategy.sol";



/// Borrowing manager for strategies
contract StrategiesManager is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, SimpleVault {
    
    bytes32 public constant FUND_ROLE = keccak256("FUND_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// 100% or 10k basis points for uint256 rounding
    uint256 constant MAX_BASIS_POINTS = 10_000;

    /// Fired when new strategy added to maanger
    /// debtRatio - Maximum borrow amount (in BPS of total assets)
    /// minDebtPerHarvest - Lower limit on the increase of debt since last harvest
    /// maxDebtPerHarvest - Upper limit on the increase of debt since last harvest
    /// performanceFee - Strategist's fee (basis points)
    event StrategyAdded(address strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee);

    /// Address of the strategy that is added to the withdrawal queue
    event StrategyAddedToQueue(address strategy);

    event StrategyReported (
        address strategy,
        uint256 gain,
        uint256 loss,
        uint256 debtPaid,
        uint256 totalGain,
        uint256 totalLoss,
        uint256 totalDebt,
        uint256 debtAdded,
        uint256 debtRatio
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    struct StrategyParams {
        /// Strategist's fee (basis points)
        uint256 performanceFee; 
        /// Activation block.timestamp
        uint256 activation; 
        /// Maximum borrow amount (in BPS of total assets)
        uint256 debtRatio;  
        /// Lower limit on the increase of debt since last harvest
        uint256 minDebtPerHarvest;
        /// Upper limit on the increase of debt since last harvest
        uint256 maxDebtPerHarvest;
        /// block.timestamp of the last time a report occured
        uint256 lastReport; 
        /// Total outstanding debt that Strategy has 
        uint256 totalDebt; 
        /// Total returns that Strategy has realized for Vault 
        uint256 totalGain; 
        /// Total losses that Strategy has realized for Vault
        uint256 totalLoss; 
    }

    /// Amount of tokens that all strategies have borrowed.
    uint256 public totalDebt;

    /// Debt ratio for the Vault across all strategies (in BPS, <= 10k)
    uint256 public debtRatio;



    /// Track the total for overhead targeting purposes
    mapping(address => StrategyParams) public strategies;
    
    uint256 constant MAXIMUM_STRATEGIES = 20;

    /// Ordering that `withdraw` uses to determine which strategies to pull funds from
    ///  Does *NOT* have to match the ordering of all the current strategies that
    ///  exist, but it is recommended that it does or else withdrawal depth is
    ///  limited to only those inside the queue.
    ///
    ///  The first time a ZERO_ADDRESS is encountered, it stops withdrawing
    address[MAXIMUM_STRATEGIES] public withdrawalQueue;

    /// @param storageTokenAddress - address of ERC20 token contract which will be stored in fund
    /// @param fund - Address of fund, which assets this manager should manage 
    function __StrategiesManager__init(address storageTokenAddress, address fund) initializer public {
        __AccessControl_init();
        __SimpleVault_init(storageTokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(FUND_ROLE, fund);
    }

    // Move to separate contract pauser related stuff
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// Add strategy to a list, which allow this strategy borrow from a vault
    ///     Add a Strategy to the Vault.
    ///     This may only be called by governance.
    /// @dev
    ///     The Strategy will be appended to `withdrawalQueue`, call
    ///     `setWithdrawalQueue` to change the order.
    /// @param strategy The address of the Strategy to add.
    /// @param strategyDebtRatio
    ///     The share of the total assets in the `vault that the `strategy` has access to.
    /// @param minDebtPerHarvest
    ///     Lower limit on the increase of debt since last harvest
    /// @param maxDebtPerHarvest
    ///     Upper limit on the increase of debt since last harvest
    /// @param performanceFee
    ///     The fee the strategist will receive based on this Vault's performance.
    /// @param profitLimitRatio
    ///     1 = 0.01%, use by default 100
    /// @param lossLimitRatio
    ///     1 = 0.01%, use by default 1
    function addStrategy(
        address strategy,
        uint256 strategyDebtRatio,
        uint256 minDebtPerHarvest,
        uint256 maxDebtPerHarvest,
        uint256 performanceFee,
        uint256 profitLimitRatio, 
        uint256 lossLimitRatio 
    ) public onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        require(withdrawalQueue[MAXIMUM_STRATEGIES - 1] == address(0), "queue is full");
        // Check strategy configuration
        require(strategy != address(0));
        require(strategies[strategy].activation == 0, "Strategy not activated");
        require(address(this) == IStrategy(strategy).vault());
        require(address(assets) == IStrategy(strategy).want());

        // Check strategy parameters
        // TODO: Use Safe math
        require(debtRatio + strategyDebtRatio <= MAX_BASIS_POINTS);
        require(minDebtPerHarvest <= maxDebtPerHarvest);
        require(performanceFee <= MAX_BASIS_POINTS / 2);

        // Add strategy to approved strategies
        strategies[strategy] = StrategyParams({
            performanceFee: performanceFee,
            activation: block.timestamp,
            debtRatio: debtRatio,
            minDebtPerHarvest: minDebtPerHarvest,
            maxDebtPerHarvest: maxDebtPerHarvest,
            lastReport: block.timestamp,
            totalDebt: 0,
            totalGain: 0,
            totalLoss: 0
        });
        emit StrategyAdded(strategy, debtRatio, minDebtPerHarvest, maxDebtPerHarvest, performanceFee);

        // Update Vault parameters
        debtRatio += strategyDebtRatio;

        // Add strategy to the end of the withdrawal queue
        withdrawalQueue[MAXIMUM_STRATEGIES - 1] = strategy;
        _organizeWithdrawalQueue();
    }

    /// @notice
    ///     Adds `strategy` to `withdrawalQueue`.
    /// @dev
    ///     The Strategy will be appended to `withdrawalQueue`, call
    ///     `setWithdrawalQueue` to change the order.
    /// @param strategy The Strategy to add.
    function addStrategyToQueue(address strategy) public onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        // Must be a current Strategy
        require(strategies[strategy].activation > 0);
        
        // Can't already be in the queue
        uint256 last_idx = 0;
        for(uint i = 0; i < withdrawalQueue.length; i++) {
            address s = withdrawalQueue[i];
            if(strategy == address(0)){
                break;  // We've exhausted the queue
            }

            require(s != strategy, "Strategy alredy in queue");
            last_idx += 1;
        }

        // Check if queue is full
        require(last_idx < MAXIMUM_STRATEGIES);

        withdrawalQueue[MAXIMUM_STRATEGIES - 1] = strategy;
        _organizeWithdrawalQueue();

        emit StrategyAddedToQueue(strategy);
    }

    /// Reorganize `withdrawalQueue` based on premise that if there is an
    /// empty value between two actual values, then the empty value should be
    /// replaced by the later value.
    function _organizeWithdrawalQueue() internal {
        // Relative ordering of non-zero values is maintained.
        uint256 offset = 0;

        for (uint idx = 0; idx < MAXIMUM_STRATEGIES; idx++) {
            address strategy = withdrawalQueue[idx];
            if(strategy == address(0)) {
                // how many values we need to shift, always `<= idx`
                offset += 1;
                continue;
            }
            
            if (offset > 0) {
                withdrawalQueue[idx - offset] = strategy;
                withdrawalQueue[idx] = address(0);
            }
        }
    }

    /// Hook which must return assets from strategies if it possible
    ///  We need to go get some from our strategies in the withdrawal queue
    ///  This performs forced withdrawals from each Strategy. During
    ///  forced withdrawal, a Strategy may realize a loss. That loss
    ///  is reported back to the Vault, and the will affect the amount
    ///  of tokens that the withdrawer receives for their shares. They
    ///  can optionally specify the maximum acceptable loss (in BPS)
    ///  to prevent excessive losses on their withdrawals (which may
    ///  happen in certain edge cases where Strategies realize a loss)
    /// @param needReturn - amount of assets which need to return from strategies
    /// @return totalLoss - loss of all performed actions
    function returnAssets(uint256 needReturn) public onlyRole(FUND_ROLE) nonReentrant returns (uint256) {
        uint256 totalLoss = 0;
        uint256 value = needReturn;

        for(uint i = 0; i < withdrawalQueue.length; i++) {
            address strategy = withdrawalQueue[i];
            if(strategy == address(0)){
                break;  // We've exhausted the queue
            }

            uint256 balance = _availableAssets();
            if (value <= balance) {
                break;  // We're done withdrawing
            }

            // TODO: use safe math
            uint256 amountNeeded = value - balance;

            (uint256 loss, ) = _withdrawFromStrategy(strategy, amountNeeded);

            // Withdrawer incurs any losses from liquidation
            if (loss > 0) {
                // TODO: use safe math
                value -= loss;
                totalLoss += loss;
            }
        }

        // Return what possibe or if have more then only requested
        uint256 amount = MathUpgradeable.min(needReturn, _availableAssets());
        _transferAssetsFrom(address(this), msg.sender, amount);

        return totalLoss;
    }

    /// Try widthdraw from givent strategy
    /// retusn (uint256 loss, uint256 withdrawn amount)
    function _withdrawFromStrategy(address strategy, uint256 amountNeeded) internal returns(uint256, uint256) {
        // Don't withdraw more than the debt so that Strategy can still
        // continue to work based on the profits it has
        //
        // This means that user will lose out on any profits that each
        // Strategy in the queue would return on next harvest, benefiting others
        amountNeeded = MathUpgradeable.min(amountNeeded, strategies[strategy].totalDebt);
        if (amountNeeded == 0) {
            return (0, 0); // Nothing to withdraw from this Strategy, try the next one
        }

        uint256 balance = _availableAssets();

        // Force withdraw amount from each Strategy in the order set by governance
        uint256 loss = IStrategy(strategy).withdraw(amountNeeded);
        // TODO: use safe math
        uint256 withdrawn = _availableAssets() - balance;

        // Must be before strategy params modifications
        _reportLoss(strategy, loss);

        // Reduce the Strategy's debt by the amount withdrawn ("realized returns")
        //  This doesn't add to returns as it's not earned by "normal means"
        // TODO: use safe math
        strategies[strategy].totalDebt -= withdrawn;
        totalDebt -= withdrawn;
        
        return (loss, withdrawn);
    }

    function _reportLoss(address strategy, uint256 loss) internal {
        // Loss can only be up the amount of debt issued to strategy
        uint256 strategyDept = strategies[strategy].totalDebt;
        require(totalDebt >= loss, "Reported loss begger then strategy have in debt");

        // Also, make sure we reduce our trust with the strategy by the amount of loss
        if (debtRatio != 0) { // if vault with single strategy that is set to EmergencyOne
            // The context to this calculation is different than the calculation in `_reportLoss`,
            // this calculation intentionally approximates via `totalDebt` to avoid manipulatable results
            uint256 ratio_change = MathUpgradeable.min(
                // This calculation isn't 100% precise, the adjustment is ~10%-20% more severe due to EVM math
                // TODO: use safe math
                loss * debtRatio / totalDebt,
                strategies[strategy].debtRatio
            );

            // If the loss is too small, ratio_change will be 0
            if(ratio_change != 0) {
                strategies[strategy].debtRatio -= ratio_change;
                debtRatio -= ratio_change;
            }
        }

        // Finally, adjust our strategy's parameters by the loss
        strategies[strategy].totalLoss += loss;
        strategies[strategy].totalDebt = strategyDept - loss;
        totalDebt -= loss;
    }



}