import { ethers } from "hardhat";

async function main() {
  const initialOwner = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";

  const stakingDuration = 60 * 60 * 24 * 365; // 1 year
  const minLockPeriod = 60 * 60 * 24 * 30; // 30 days

  const myERC20 = await ethers.deployContract("MyERC20", [initialOwner]);
  await myERC20.waitForDeployment();

  const erc20Staking = await ethers.deployContract("ERC20Staking", [myERC20.target, stakingDuration, minLockPeriod]);
  await erc20Staking.waitForDeployment();

  console.log("MyERC20 deployed to:", myERC20.target);
  console.log("ERC20Staking deployed to:", erc20Staking.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
