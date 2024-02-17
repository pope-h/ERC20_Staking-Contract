import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
// import { MyERC20 } from "../typechain-types";

describe("ERC20Staking", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60;
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const STAKED_AMOUNT = 1_000_000_000;
    const amount = 50_000_000_000_000_000_000;

    const lockedAmount = STAKED_AMOUNT;
    const approvedAmount = BigInt(amount);
    const unlockTime = (await time.latest()) + ONE_MONTH_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const MyERC20 = await ethers.getContractFactory("MyERC20");
    const myERC20 = (await MyERC20.deploy(owner.address));

    const ERC20Staking = await ethers.getContractFactory("ERC20Staking");
    const erc20Staking = await ERC20Staking.deploy(myERC20.target, ONE_YEAR_IN_SECS, unlockTime);

    return { erc20Staking, myERC20, approvedAmount, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { erc20Staking, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await erc20Staking.getMinLockPeriod()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { erc20Staking, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await erc20Staking.getOwner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to erc20Staking", async function () {
      const { erc20Staking, myERC20, approvedAmount, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      await myERC20.approve(erc20Staking.target, approvedAmount);
      await erc20Staking.stake(lockedAmount);
      expect(await myERC20.balanceOf(erc20Staking.target)).to.equal(lockedAmount);
    });

    // it("Should fail if the unlockTime is not in the future", async function () {
    //   const { myERC20, unlockTime } = await loadFixture(
    //     deployOneYearLockFixture
    //   );
    //   // We don't use the fixture here because we want a different deployment
    //   const latestTime = await time.latest();
    //   const minLockPeriod = latestTime + 3600; // Set a minimum lock period of 1 hour
    //   const ERC20Staking = await ethers.getContractFactory("ERC20Staking");
    //   await expect(ERC20Staking.deploy(myERC20.target, unlockTime, minLockPeriod)).to.be.revertedWith("Unlock time should be in the future");
    // });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called without staking", async function () {
        const { erc20Staking } = await loadFixture(deployOneYearLockFixture);

        await expect(erc20Staking.withdraw()).to.be.revertedWith("No active stake");
      });

      it("Should revert with the right error if called too soon", async function () {
        const { erc20Staking, myERC20, approvedAmount, lockedAmount } = await loadFixture(deployOneYearLockFixture);

        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);

        await expect(erc20Staking.withdraw()).to.be.revertedWith(
          "Minimum lock period not reached"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { erc20Staking, myERC20, approvedAmount, lockedAmount, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);
        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);

        // We use lock.connect() to send a transaction from another account
        await expect(erc20Staking.connect(otherAccount).withdraw()).to.be.revertedWith(
          "No active stake"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { erc20Staking, myERC20, approvedAmount, lockedAmount, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);
        await time.increase(unlockTime);

        await expect(erc20Staking.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { erc20Staking, myERC20, approvedAmount, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);
        await time.increase(unlockTime);

        await expect(erc20Staking.withdraw())
          .to.emit(erc20Staking, "Withdrawn")
          .withArgs(owner.address, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Stake Information", function () {
      it("Should provide accurate stake information", async function () {
        const { erc20Staking, myERC20, approvedAmount, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        // Approve and stake tokens
        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);

        // Get stake information
        const [stakedAmount, startTime] = await erc20Staking.getStake(owner);

        // Check staked amount and start time
        expect(stakedAmount).to.equal(lockedAmount);
        expect(startTime).to.be.above(0);
      });
    });


    // FOR THE BELOW, I HAVE TO MAKE THE calculateReward FUNCTION PUBLIC OR PUBLIC TO ACCESS IT
    // THIS CHECK ISN'T DOING WHAT IT IS MEANT FOR... CHECK THE CALCULATE REWARD FUNCTION
    describe("Rewards", function () {
      it("Should calculate rewards correctly", async function () {
        const { erc20Staking, myERC20, approvedAmount, unlockTime, lockedAmount, owner } =   await loadFixture(
          deployOneYearLockFixture
        );

        await myERC20.approve(erc20Staking.target, approvedAmount);
        await erc20Staking.stake(lockedAmount);

        await time.increase(unlockTime);

        const expectedReward = await erc20Staking.calculateReward(owner.address);
        console.log("expectedReward: ", (expectedReward).toString());

        await expect(erc20Staking.withdraw()).to.changeTokenBalances(myERC20, [owner], ["1000000000"]);
      });
    });

    // describe("Transfers", function () {
    //   it("Should transfer the funds to the owner", async function () {
    //     const { erc20Staking, myERC20, approvedAmount, unlockTime, lockedAmount, owner } = await loadFixture(
    //       deployOneYearLockFixture
    //     );

    //     await myERC20.approve(erc20Staking.target, approvedAmount);
    //     await erc20Staking.stake(lockedAmount);
    //     await time.increase(unlockTime);

    //     await expect(erc20Staking.withdraw()).to.changeEtherBalances(
    //       [owner, erc20Staking],
    //       [lockedAmount, -lockedAmount]
    //     );
    //   });
    // });
  });
});
