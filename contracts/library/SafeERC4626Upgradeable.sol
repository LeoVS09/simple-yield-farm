// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {ERC4626Upgradeable} from "./ERC4626Upgradeable.sol";

/// ERC-4626 standard allow deposit and withdraw not for message sender.
/// It commonly known issue, which hardly to test and much error prune. 
/// Such interfaces caused vulnarabilities, which resulted in million dollars hacks.
/// On anther hand, this interfaces not have any use cases which cannot be implemented without `transferFrom` method.
/// This implementation prevent spends and allowances from any methods except transferFrom/send
abstract contract SafeERC4626Upgradeable is ERC4626Upgradeable {

    /**
     * @param _asset which will be stored in this Vault
     * @dev `defaultOperators` may be an empty array.
     */
    function __SafeERC4626_init(
        IERC20Upgradeable _asset,
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_
    ) internal onlyInitializing {
        __ERC4626_init(_asset, name_, symbol_, defaultOperators_);
    }


    function deposit(uint256 assets, address receiver) public virtual override nonReentrant returns (uint256 shares) {
        return ERC4626Upgradeable.deposit(assets, msg.sender);
    }

    function mint(uint256 shares, address receiver) public virtual override nonReentrant returns (uint256 assets) {
        return ERC4626Upgradeable.mint(shares, msg.sender);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256 shares) {
        return ERC4626Upgradeable.withdraw(assets, msg.sender, msg.sender);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256 assets) {
        return ERC4626Upgradeable.redeem(shares, msg.sender, msg.sender);
    }
}