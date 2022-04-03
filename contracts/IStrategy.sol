/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// Interface of Strategy which need implement to allow Strategy manager communicate with it
interface IStrategy {
    function want() external view returns (address);
    function vault() external view returns (address);
    function isActive() external view returns (bool);
    function delegatedAssets() external view returns (uint256);
    function estimatedTotalAssets() external view returns (uint256);
    function withdraw(uint256 amount) external  returns (uint256);
}