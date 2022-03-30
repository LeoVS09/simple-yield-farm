// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 * SimpleVault for store underlaing "assets", 
 * where assets represented as ERC20 token. Allow borrow assets for another accounts.
 */
contract SimpleVault is Initializable {
    
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// Contract of token which will be stored in this vault
    IERC20Upgradeable internal assets;
    
    /// Amount of tokens that a borrowed from this vault.
    uint256 internal totalDebt;

    /**
     * @dev Sets the values for {assets}.
     *
     * Init ERC20 based contract with given address
     */
    function __SimpleVault_init(address storageTokenAddress) internal onlyInitializing {
        __SimpleVault_init_unchained(storageTokenAddress);
    }

    function __SimpleVault_init_unchained(address storageTokenAddress) internal onlyInitializing {
        assets = IERC20Upgradeable(storageTokenAddress);
    }

    /// Safely transfer assets token from given address to sender
    function _transferAssetsFrom(address from, address to, uint256 value) internal {
        assets.safeTransferFrom(from, to, value);
    }

    /// Returns the total quantity of all assets under control of this
    /// fund, whether they're loaned out to a strategy, or currently held in
    /// the fund.
    function _totalAssets() internal view returns (uint256) {
        return assets.balanceOf(address(this)) + totalDebt;
    }
}
