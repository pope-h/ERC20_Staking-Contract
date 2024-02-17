// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./IMyERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ERC20Staking {
    using Math for uint256;

    IMyERC20 public token;

    struct Stake {
        uint amount;
        uint startTime;
    }

    mapping (address => Stake) stakes;

    uint256 totalStaked;
    uint256 stakingDuration; // Staking duration in seconds
    uint256 minLockPeriod;

    uint256 desiredAPY = 10; // 10%
    uint256 totalRewardPool = (1000000 * 1e18); // Total reward pool in your base unit (e.g., wei)
    uint256 dailyRate = ((desiredAPY * 1e18) / 365); // Convert APY to daily rate
    uint256 secondRate = (dailyRate / 86400); // Convert daily rate to second rate
    uint256 rewardRate = (secondRate * totalRewardPool); // Reward rate per second

    event Staked(address indexed user, uint256 amount, uint256 startTime); // Event emitted when a user stakes tokens
    event Withdrawn(address indexed user, uint256 amount);

    constructor(
        address _tokenAddress,
        uint256 _stakingDuration,
        uint256 _minLockPeriod
    ) {
        token = IMyERC20(_tokenAddress);
        stakingDuration = _stakingDuration;
        minLockPeriod = _minLockPeriod;
    }

    function stake(uint256 _amount) external {
        require(_amount > 0, "Cannot stake 0 tokens");
        require(stakes[msg.sender].amount == 0, "You already have an active stake");
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        stakes[msg.sender] = Stake(_amount, block.timestamp);
        totalStaked += _amount;
        emit Staked(msg.sender, _amount, block.timestamp);
    }

    function withdraw() external {
        require(stakes[msg.sender].amount > 0, "No active stake");
        require(block.timestamp >= stakes[msg.sender].startTime + minLockPeriod, "Minimum lock period not reached");
        uint256 reward = calculateReward(msg.sender);
        uint256 amount = stakes[msg.sender].amount;
        stakes[msg.sender].amount = 0;
        totalStaked -= amount;
        require(token.transfer(msg.sender, (amount + (reward / 1e36))), "Transfer failed"); // use (reward / 1e36) during testing
        emit Withdrawn(msg.sender, amount);
    }

    function calculateReward(address _user) public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - stakes[_user].startTime;
        uint256 reward = (stakes[_user].amount * (rewardRate / 1e18) * timeElapsed) / (stakingDuration * 1e18);
        return reward;
    }

    function getReward(address _user) external view returns (uint256) {
        return (calculateReward(_user) / 1e36); // use (reward / 1e33) during testing
    }

    function getStake(address _user) external view returns (uint256, uint256) {
        return (stakes[_user].amount, stakes[_user].startTime);
    }

    function getStakingDuration() external view returns (uint256) {
        return stakingDuration;
    }

    function getRewardRate() external view returns (uint256) {
        return (rewardRate / 1e36); // use (reward / 1e33) during testing
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getTotalRewardPool() external view returns (uint256) {
        return totalRewardPool;
    }

    function getMinLockPeriod() external view returns (uint256) {
        return minLockPeriod;
    }

    function getOwner() external view returns (address) {
        return msg.sender;
    }
}