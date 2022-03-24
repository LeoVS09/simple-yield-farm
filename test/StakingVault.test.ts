import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { StakingVault } from "../typechain";

// Binance Smart Chain
// eslint-disable-next-line camelcase
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// Etherium Mainnet
// eslint-disable-next-line camelcase
const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";

describe("StakingVault", function () {
  let contract: StakingVault;
  let owner: SignerWithAddress;

  before(async () => {
    const StakingVaultFactory = await ethers.getContractFactory("StakingVault");
    contract = await StakingVaultFactory.deploy(iETH_address);
    await contract.deployed();
    owner = (await ethers.getSigners())[0];
  });

  it("Should save money for staking", async function () {
    const money = ethers.utils.parseEther("10");

    const tx = await contract.deposit({
      value: money,
    });
    const receipt = await tx.wait();

    expect(await contract.getCurrentBalance()).to.equal(money);

    expect(
      receipt.events?.find(({ event }) => event === "NewBalanceInStake")?.args
    ).to.equal([await owner.getAddress(), money]);
  });
});
