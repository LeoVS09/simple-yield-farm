/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface iETH {
    /**
     * @dev Caller deposits assets into the market and `_recipient` receives iToken in exchange.
     * @param _recipient The account that would receive the iToken.
     */
    function mint(address _recipient) external payable;
    /**
     * @dev Get cash balance of this iToken in the underlying token.
     */
    function getCash() external view returns (uint256);
    /**
     * @dev Gets the underlying balance of the `_account`.
     * @param _account The address of the account to query.
     */
    function balanceOfUnderlying(address _account) external returns (uint256);
    /**
     * @dev Caller redeems specified iToken from `_from` to get underlying token.
     * @param _from The account that would burn the iToken.
     * @param _redeemiToken The number of iToken to redeem.
     */
    function redeem(address _from, uint256 _redeemiToken) external;
    /**
     * @dev Gets the newest exchange rate by accruing interest.
     */
    function exchangeRateCurrent() external returns (uint256);

    /**
     * @dev Calculates the exchange rate without accruing interest.
     */
    function exchangeRateStored() external view returns (uint256);

}


contract StakingVault {

    iETH internal stakeToken;

    struct Cell {
        uint balance;
    }

    event NewBalanceInStake(uint256 amount);


    mapping (address => Cell) public cells;

    constructor(address stakeTokenContractAddress) {
        stakeToken = iETH(stakeTokenContractAddress);
    }

    function deposit() payable external {
        require(msg.value > 0, "Money count must be greater then zero");

        Cell storage cell = cells[msg.sender];
        cell.balance = cell.balance + msg.value;

        // emit TryToMint(msg.sender, msg.value);
        stakeToken.mint{ value: msg.value }(address(this));

        uint256 balanceInStake = stakeToken.balanceOfUnderlying(address(this));
        emit NewBalanceInStake(balanceInStake);
    } 

    function withdraw(uint256 amount) external {
        require(amount > 0, "Withdraw amount must be greater than zero");

        Cell storage cell = cells[msg.sender];
        require(cell.balance >= amount, "Cell balance lower then requested withdraw");

        cell.balance = cell.balance - amount;
        
        stakeToken.redeem(address(this), amount);
        payable(msg.sender).transfer(amount);
    }

    function getCurrentBalance() external view returns (uint) {
        return cells[msg.sender].balance;
    }

    function getBalanceInStake() external view returns (uint) {
        return cells[msg.sender].balance / stakeToken.exchangeRateStored();
    }

    function getExchangeRate() external view returns (uint) {
        return stakeToken.exchangeRateStored();
    }

}
