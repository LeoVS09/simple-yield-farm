/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./dependencies/iETH.sol";
import "./EquityFund.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract StakingVault is Initializable, EquityFund {

    iETH internal stakeToken;

    /// Amount of tokens that a borrowed from this vault.
    uint256 internal totalDebt;
    
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

    /// Returns the total quantity of all assets under control of this
    /// fund, whether they're loaned out to a strategy, or currently held in
    /// the fund.
    function _totalAssets() internal override view returns (uint256) {
        return assets.balanceOf(address(this)) + totalDebt;
    }

    /// Calculate how much assets currently have fund 
    /// Expectation based on real assets minus probably lost assets
    function _expectedAssets() internal override view returns (uint256) {
        return _totalAssets() - _probablyLostAssets();
    }

    /// Assets can be lost because exists time difference between 
    /// moment when assets was borrowed and moment when current assets of borrowers was updated. 
    function _probablyLostAssets() internal view returns (uint256) {
        // TODO: expected lost assets since last update of assets
        return 0;
    }

}
