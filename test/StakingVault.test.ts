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

  before(async () => {
    const StakingVaultFactory = await ethers.getContractFactory("StakingVault");
    contract = await StakingVaultFactory.deploy(iETH_address);
    await contract.deployed();
  });

  it("Should save money for staking", async function () {
    const value = ethers.utils.parseEther("1");
    const money = ethers.utils.formatEther(value);

    const tx = await contract.deposit({
      value,
    });
    const receipt = await tx.wait();

    expect(
      ethers.utils.formatEther(await contract.getCurrentBalance())
    ).to.equal(money);

    const [newBalance] =
      receipt.events?.find(({ event }) => event === "NewBalanceInStake")
        ?.args || [];
    expect(ethers.utils.formatEther(newBalance)).to.equal(
      "0.999999999999999999"
    );

    expect(
      ethers.utils.formatEther(await contract.getBalanceInStake())
    ).to.equal(ethers.utils.formatEther(newBalance));
  });

  it("Should return exchange rate", async () => {
    const exchangeRate = ethers.utils.formatEther(
      await contract.getExchangeRate()
    );
    // console.log("Current exchange rate", exchangeRate);

    expect(exchangeRate.slice(0, 5)).to.equal("1.000");
  });
});
