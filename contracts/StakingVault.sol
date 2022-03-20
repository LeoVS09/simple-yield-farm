/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface iETH {
    function mint(address _recipient) external payable;
    function getCash() external view returns (uint256);
    function redeem(address _from, uint256 _redeemiToken) external;
}


contract StakingVault {

    iETH internal stakeToken;

    struct Cell {
        uint balance;
    }

    mapping (address => Cell) cells;

    constructor(address stakeTokenContractAddress) {
        stakeToken = iETH(stakeTokenContractAddress);
    }

    function deposit() payable external {
        require(msg.value > 0);

        Cell storage cell = cells[msg.sender];
        cell.balance = cell.balance + msg.value;

        stakeToken.mint{ value:msg.value }(address(this));
    } 

    function withdraw(uint256 amount) external {
        require(amount > 0);

        Cell storage cell = cells[msg.sender];
        require(cell.balance >= amount);

        cell.balance = cell.balance - amount;
        
        stakeToken.redeem(address(this), amount);
        payable(msg.sender).transfer(amount);
    }

}

