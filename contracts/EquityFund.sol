// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./SimpleVault.sol";

contract EquityFund is Initializable, SimpleVault, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    /// Fired when new amount of thokens deposited and shares a issued for recepient
    event Deposit(uint256 amount, uint256 shares, address sender, address holder);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// storageTokenAddress - address of ERC20 token contract which will be stored in fund
    function initialize(address storageTokenAddress) initializer public {
        __ERC20_init("EquityFund", "EFS");
        __ERC20Burnable_init();
        __Ownable_init();
        __SimpleVault_init(storageTokenAddress);
    }

    /// Add deposit to fund storage and issues shares for a recepient
    /// Mint shares based on expected value under control at the moment
    /// Not collect real assets from borrowers, as it allow manipulate issue rate
    /// Will transfer `amount` of tokens from `sender` and issue shares to `holder`
    function deposit(uint256 amount, address sender, address holder) external nonReentrant returns (uint256) {
        require(amount > 0, "For deposit amount must be non-zero");
        require(holder != address(0), "Holder cannot be zero");
        require(holder != address(this), "Holder cannot be this contract");

        // Issue new shares (needs to be done before taking deposit to be accurate)
        uint256 shares = _issueShares(amount, holder);

        // Transfer tokens from sender to this contract
        _transferAssetsFrom(sender, address(this), amount);

        emit Deposit(amount, shares, sender, holder);
        return shares;
    }

    /// Issues `amount` fund shares to `holder`.
    /// Shares must be issued prior to taking on new collateral, or
    /// calculation will be wrong. This means that only *trusted* tokens
    /// (with no capability for exploitative behavior) can be used.
    function _issueShares(uint256 amount, address holder) internal virtual returns (uint256) {
        require(amount > 0, "For issue shares amount must be non-zero");

        if (totalSupply() == 0) {
            // No existing shares, so mint 1:1
            _mint(holder, amount);
            return amount;
        }

        // Mint amount of shares based on what the fund is managing overall
        // if sqrt(totalSupply()) > 1e39, this could potentially revert
        // TODO: use safe math
        // TODO: use rounding calculation
        uint256 shares = amount * totalSupply() / _expectedAssets();
        require(shares > 0, "Incorrect calcualtion of shares during issing"); // rounding calcualtion must fix it

        _mint(holder, shares);
        return shares;
    }

    /// Calculate how much assets currently have fund 
    /// Expectation based on real assets minus probably lost assets
    function _expectedAssets() internal virtual view returns (uint256) {
        return _totalAssets() - _probablyLostAssets();
    }

    /// Assets can be lost because exists time difference between 
    /// moment when assets was borrowed and moment when current assets of borrowers was updated. 
    function _probablyLostAssets() internal virtual view returns (uint256) {
        // TODO: expected lost assets since last update of assets
        return 0;
    }
}
