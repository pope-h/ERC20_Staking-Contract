// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMyERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}