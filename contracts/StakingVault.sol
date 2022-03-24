/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface iETH {
    function mint(address _recipient) external payable;
    function getCash() external view returns (uint256);
    function balanceOfUnderlying(address _account) external returns (uint256);
    function redeem(address _from, uint256 _redeemiToken) external;
}


contract StakingVault {

    iETH internal stakeToken;

    struct Cell {
        uint balance;
    }

    event NewBalanceInStake(address holder, uint256 amount);


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
        emit NewBalanceInStake(msg.sender, balanceInStake);
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

}
