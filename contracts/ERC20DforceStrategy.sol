/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./dependencies/dforce/ERC20iToken.sol";
import "./IBorrower.sol";
import "./BaseStrategy.sol";

import "./library/SafeRatioMath.sol";

contract ERC20DforceStrategy is Initializable, IBorrower, BaseStrategy, ReentrancyGuardUpgradeable {
    /// Contract which allow stake token
    ERC20iToken internal stake;

    using SafeRatioMath for uint256;

    event Borrowed(uint256 amount);
    event PutInStake(uint256 amount);
    event Redeemed(uint256 amount);
    event ReturnToLender(uint256 amount);

    /// name - name of the token
    /// wantTokenAddress - address of ERC20 token contract which will be stored in fund
    /// stakingAddress - address of token where possible stake token
    function initialize(
        string memory _name,
        address wantTokenAddress,
        address lenderAddress,
        address stakingAddress
    ) initializer public {
        __BaseStrategy__init(_name, wantTokenAddress, lenderAddress);

        stake = ERC20iToken(stakingAddress);
    }

    /// Make all work which need for invest or reinvest tokens
    function work() external {
        _tryToBorrow();

        uint256 balance = _availableAssets();
        if (balance == 0) {
            // not have anyting to put in stake
            return;
        }

        // Try to put in stake borrowed assets
        _putInStake(balance);
    }

    /// Try to borrow some assets from the lender
    function _tryToBorrow() internal {
        uint256 avaiable = _lender.creditAvailable();
        if(avaiable == 0) {
            return;
        }

        _lender.borrow(avaiable);

        emit Borrowed(avaiable);
    }

    function _putInStake(uint256 amount) internal {
        _increaseAssetsAllowance(address(stake), amount);

        stake.mint(address(this), amount);

        emit PutInStake(amount);
    }

    /// Try to widthdraw given amount and return loss
    function withdraw(uint256 amount) external override onlyLender nonReentrant returns (uint256) {
        require(amount <= totalAssets(), "Not have enough money to withdraw");

        if (amount >= _availableAssets()) {
            // We have enough free money to return to lender
            _transferAssetsToLender(amount);
            return 0;
        }

        // TODO: use safe math
        uint256 lost = _redeem(amount - _availableAssets());
        
        // transfer all assets to lender
        // can be case when redeemed more money then need
        // TODO: try to check such case
        _transferAssetsToLender(_availableAssets());

        return lost;
    }

    /// Redeem given amount of "want" token and return lost amount
    function _redeem(uint256 amount) internal returns (uint256) {
        uint256 balance = _availableAssets();

        stake.redeemUnderlying(address(this), amount);
        uint256 withdrawn = _availableAssets() - balance;

       // Calculate amount of lost assets during withdraw from stake
        return amount - withdrawn;
    }

    /// Estimated total assets which currently hold in strategy and in stake
    function totalAssets() public view override returns (uint256) {
        return _availableAssets() + balanceOfAssetsInStake();
    }

    /// Return current balance of assets which put in stake
    function balanceOfAssetsInStake() public view returns (uint256) {
        return stake.exchangeRateStored().rmul(stake.balanceOf(address(this)));
    }

    /// Return current balance of assets which put in stake, as transaction, because can modify state
    function directBalanceOfAssetsInStake() public returns (uint256) {
        return stake.balanceOfUnderlying(address(this));
    }

    function _transferAssetsToLender(uint256 amount) internal {
        _transferAssets(address(_lender), amount);
    }

}