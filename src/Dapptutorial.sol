pragma solidity ^0.8.6;

contract Dapptutorial {
    receive() external payable {
    }

    function withdraw(uint password) public {
        require(password == 42, "Access denied!");

        uint256 balance = address(this).balance;

        payable(msg.sender).transfer(balance);
    }
}