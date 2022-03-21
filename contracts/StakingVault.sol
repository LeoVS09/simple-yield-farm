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

    event DepositStart(address sender, uint money);
    event TryToMint(address sender, uint money);
    event DepositEnd(address sender, uint money);

    mapping (address => Cell) public cells;

    constructor(address stakeTokenContractAddress) {
        stakeToken = iETH(stakeTokenContractAddress);
    }

    function deposit() payable external {
        emit DepositStart(msg.sender, msg.value);
        require(msg.value > 0, "Money count must be greater then zero");

        Cell storage cell = cells[msg.sender];
        cell.balance = cell.balance + msg.value;

        // emit TryToMint(msg.sender, msg.value);
        stakeToken.mint{ value: msg.value }(address(this));
        emit DepositEnd(msg.sender, msg.value);
    } 

    function withdraw(uint256 amount) external {
        require(amount > 0);

        Cell storage cell = cells[msg.sender];
        require(cell.balance >= amount);

        cell.balance = cell.balance - amount;
        
        stakeToken.redeem(address(this), amount);
        payable(msg.sender).transfer(amount);
    }

    function getCurrentBalance() external view returns (uint) {
        return cells[msg.sender].balance;
    }

    function getBalanceInStake() external returns (uint) {
        return stakeToken.balanceOfUnderlying(address(this));
    }

}

