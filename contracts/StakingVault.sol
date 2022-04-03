/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./dependencies/iETH.sol";
import "./EquityFund.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract StakingVault is Initializable, EquityFund {

    iETH internal stakeToken;

    uint256 constant DEGRADATION_COEFFICIENT = 10 ** 18;
    
    /// name - name of the token
    /// symbol - token symbol
    /// storageTokenAddress - address of ERC20 token contract which will be stored in fund
    /// stakeTokenContractAddress - address of token where possible stake token
    function initialize(
        string memory name, 
        string memory symbol, 
        address storageTokenAddress, 
        address stakeTokenContractAddress
    ) initializer public {
        EquityFund.initialize(name, symbol, storageTokenAddress);
        stakeToken = iETH(stakeTokenContractAddress);
    }

    /// Redeem up to `maxShares` for assets, and return `redeemd shares, assets ammount`.
    /// Allow `maxLoss`
    function _redeemShares(uint256 maxShares, uint256 maxLoss) internal override returns (uint256, uint256) {
        uint256 shares = maxShares; // May reduce this number below

        // Calculate how much tokens must be withdraw based on current assets of the fund
        uint256 value = _estimateShareValue(maxShares);
        
        if (value > _availableAssets()) {
            // try return assets under control of the fund
            uint256 totalLoss = _returnAssetsToFund(value);

            uint256 fundBalance = _availableAssets();
            if (value > fundBalance) {
                // We have withdrawn everything possible out
                // but we still don't have enough to fully pay them back, so adjust
                // to the total amount we've freed up through forced withdrawals
                value = fundBalance;
                // Burn shares that corresponds to what Vault has on-hand,
                // including the losses that were incurred above during withdrawals
                // TODO: use safe math
                shares = _estimateSharesForAmount(value + totalLoss);
                // Check current shares must be lower than maxShare.
                // This implies that large withdrawals within certain parameter ranges might fail.
                require(shares <= maxShares);
            }

            // This loss protection is put in place to revert if losses from
            // withdrawing are more than what is considered acceptable
            // TODO: use safe math
            // TODO: Maybe use rounding calculation
            require(totalLoss <= (value + totalLoss) * maxLoss / LOSS_MAX_BASIS_POINTS);
        }

        // Burn shares (full value of what is being withdrawn)
        _burn(msg.sender, shares);

        return (shares, value);
    }

    /// Hook which must return assets to fund if it possible
    /// @param targetBalance - balance which fund must have at the end of hook executuin
    /// @return totalLoss - loss of all performed actions
    function _returnAssetsToFund(uint256 targetBalance) internal virtual returns (uint256) {
        // TODO: implement with proper way to return assets
        // For testing purposes will return all required additional assets as lost
        return targetBalance - _availableAssets();
    }

    /// Determines how many shares `amount` of token would receive.
    // Very strange function, not sure why we cannot use _estimateShares directly
    //  but use this logic just in case
    function _estimateSharesForAmount(uint256 amount) internal virtual view returns (uint256) {
        if (_expectedAssets() == 0 || totalSupply() == 0) {
            return 0;
        }

        return _estimateShares(amount);
    }

    /// Calculate how much assets currently have fund 
    /// Expectation based on real assets minus probably lost assets
    function _expectedAssets() internal override view returns (uint256) {
        return totalAssets() - _probablyLostAssets();
    }

    /// Returns the total quantity of all assets under control of this
    /// fund, whether they're loaned out to a strategy, or currently held in
    /// the fund.
    function totalAssets() public view returns (uint256) {
        return assets.balanceOf(address(this)) + totalDebt;
    }

    /// Assets can be lost because exists time difference between 
    /// moment when assets was borrowed and moment when current assets of borrowers was updated. 
    function _probablyLostAssets() internal view returns (uint256) {
        // TODO: expected lost assets since last update of assets
        return 0;
    }

}
