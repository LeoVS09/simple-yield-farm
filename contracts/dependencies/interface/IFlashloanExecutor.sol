//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFlashloanExecutor {
    function executeOperation(
        address reserve,
        uint256 amount,
        uint256 fee,
        bytes memory data
    ) external;
}