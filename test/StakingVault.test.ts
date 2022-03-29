import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { StakingVault } from "../typechain";

// Binance Smart Chain
// eslint-disable-next-line camelcase
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// Etherium Mainnet
// eslint-disable-next-line camelcase
const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("StakingVault", function () {
  let contract: StakingVault;

  before(async () => {
    const StakingVaultFactory = await ethers.getContractFactory("StakingVault");
    contract = await StakingVaultFactory.deploy(iETH_address);
    await contract.deployed();
  });

  it("Should save money for staking", async function () {
    const value = "1.0";

    const expectedExchangeRate = fromEth(await contract.getExchangeRate());
    console.log("expected exchange rate", expectedExchangeRate);

    const tx = await contract.deposit({
      value: toEth(value),
    });
    const receipt = await tx.wait();

    // TODO
    // expectEth(await contract.getCurrentBalance()).to.equal(value);

    const [newBalance, exchangeRate] =
      receipt.events?.find(({ event }) => event === "StakedInTotal")?.args ||
      [];
    expectEth(newBalance).to.equal("0.999999999999999999");
    expectEth(exchangeRate).to.equal(expectedExchangeRate);

    // TODO
    // expectEth(await contract.getBalanceInStake()).to.equal(fromEth(newBalance));
  });

  it("Should return exchange rate", async () => {
    const exchangeRate = fromEth(await contract.getExchangeRate());
    console.log("Current exchange rate", exchangeRate);

    expect(exchangeRate.slice(0, 5)).to.equal("1.000");
  });
});
