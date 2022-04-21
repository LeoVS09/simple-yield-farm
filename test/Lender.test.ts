/* eslint-disable camelcase */
import { expect, use } from "chai";
import { ethers, upgrades } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ERC20DforceStrategy, Lender } from "../typechain";
import { USDTABI, IUSDT } from "./ERC20";
import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

use(smock.matchers);

// Binance Smart Chain
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// const iUSDT_address = '0x0BF8C72d618B5d46b055165e21d661400008fa0F'
// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("Lender", () => {
  let owners: Array<SignerWithAddress>;
  let ownerAddressses: Array<string>;
  let strategy: FakeContract<ERC20DforceStrategy>;
  let USDT: FakeContract<IUSDT>;
  let contract: Lender;

  before(async () => {
    owners = await ethers.getSigners();
    ownerAddressses = await Promise.all(
      owners.map(async (owner) => {
        return await owner.getAddress();
      })
    );

    strategy = await smock.fake("ERC20DforceStrategy", {
      address: ownerAddressses[1],
    });
    USDT = await smock.fake<IUSDT>(USDTABI, { address: USDT_address });

    strategy.want.returns(USDT.address);

    const LenderFactory = await ethers.getContractFactory("Lender");
    const instance = await upgrades.deployProxy(LenderFactory, [
      strategy.address,
      USDT.address,
    ]);

    contract = (await upgrades.upgradeProxy(
      instance.address,
      LenderFactory
    )) as Lender;

    console.log("addresses\n", {
      owner: ownerAddressses[0],
      strategy: strategy.address,
      contract: contract.address,
      USDT: USDT.address,
      iUSDT: iUSDT_address,
    });
  });

  beforeEach(async () => {
    USDT.balanceOf.reset();
    USDT.transfer.reset();
  });

  it("should return total assets", async () => {
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("10"));

    expectEth(await contract.totalAssets()).to.equal("10.0");
    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
  });

  it("should borrow assets for strategy", async () => {
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("10"));
    USDT.transfer.whenCalledWith(ownerAddressses[1], toEth("3")).returns(true);

    await contract.connect(owners[1]).borrow(toEth("3"));

    expect(USDT.transfer).to.have.been.calledWith(
      ownerAddressses[1],
      toEth("3")
    );

    // Must track lended deposites + USDT.balanceOf retuns 10
    expectEth(await contract.totalAssets()).to.equal("13.0");

    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("7"));
    expectEth(await contract.totalAssets()).to.equal("10.0");
  });
});
