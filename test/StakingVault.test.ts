/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { expect, use } from "chai";
import { BigNumberish, BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { StakingVault, ERC20DforceStrategy } from "../typechain";
import { USDTABI, IUSDT } from "./ERC20";

use(smock.matchers);

// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("StakingVault", function () {
  let contract: StakingVault;
  let owners: Array<SignerWithAddress>;
  let ownerAddressses: Array<string>;
  let USDT: FakeContract<IUSDT>;
  let strategy: FakeContract<ERC20DforceStrategy>;

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

    const StakingVaultFactory = await ethers.getContractFactory("StakingVault");
    const instance = await upgrades.deployProxy(
      StakingVaultFactory,
      ["StakingVault", "SVS", USDT.address, strategy.address],
      {
        initializer:
          "initialize(string memory name, string memory symbol, address storageTokenAddress, address strategyAddress)",
      }
    );
    contract = (await upgrades.upgradeProxy(
      instance.address,
      StakingVaultFactory
    )) as StakingVault;

    console.log("addresses\n", {
      owner: ownerAddressses[0],
      strategy: strategy.address,
      contract: contract.address,
      USDT: USDT.address,
      iUSDT: iUSDT_address,
    });
  });

  beforeEach(() => {
    USDT.balanceOf.reset();
    USDT.balanceOf.reverts();
    USDT.transferFrom.reset();
    USDT.transferFrom.reverts();
    USDT.transfer.reset();
    USDT.transfer.reverts();
    strategy.totalAssets.reset();
    strategy.withdraw.reset();
  });

  it("Should deposit tokens", async function () {
    const ownerAddress = ownerAddressses[0];
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("0"));
    strategy.totalAssets.returns(toEth("0"));
    USDT.transferFrom
      .whenCalledWith(ownerAddress, contract.address, toEth("10"))
      .returns(true);

    await contract.connect(owners[0]).deposit(toEth("10"));

    // When vault not have shares it must not check assets balance
    expect(USDT.balanceOf).to.not.have.been.called;
    expect(strategy.totalAssets).to.not.have.been.called;
    expect(USDT.transferFrom).to.have.been.calledWith(
      ownerAddress,
      contract.address,
      toEth("10")
    );
    expectEth(await contract.totalSupply()).to.equal("10.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("10.0");
  });

  it("Should deposit second owner tokens", async function () {
    const ownerAddress = ownerAddressses[1];
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("10"));
    strategy.totalAssets.returns(toEth("0"));
    USDT.transferFrom
      .whenCalledWith(ownerAddress, contract.address, toEth("5"))
      .returns(true);

    await contract.connect(owners[1]).deposit(toEth("5"));

    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
    expect(strategy.totalAssets).to.have.been.called;
    expect(USDT.transferFrom).to.have.been.calledWith(
      ownerAddress,
      contract.address,
      toEth("5")
    );
    expectEth(await contract.totalSupply()).to.equal("15.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("5.0");
  });

  it("should borrow assets for strategy", async () => {
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("15"));
    USDT.transfer.whenCalledWith(ownerAddressses[1], toEth("3")).returns(true);

    await contract.connect(owners[1]).borrow(toEth("3"));

    expect(USDT.transfer).to.have.been.calledWith(
      ownerAddressses[1],
      toEth("3")
    );

    // Must track lended deposites + USDT.balanceOf retuns 10
    expectEth(await contract.totalDebt()).to.equal("3.0");
  });

  it("Should returns tokens to owner proportionally to increased assets", async function () {
    const ownerAddress = ownerAddressses[0];
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("12"));
    strategy.totalAssets.returns(toEth("13"));
    USDT.transfer.whenCalledWith(ownerAddress, toEth("10")).returns(true);

    // shares at this moment must be 15 and total assets at 25
    expectEth(await contract.totalSupply()).to.equal("15.0");
    expectEth(await contract.totalAssets()).to.equal("25.0");

    // withdraw 6 shares = 6 shares * 25 Assets / 15 total shares = 10 assets
    await contract.connect(owners[0]).withdraw(toEth("6"), 0);

    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
    expect(USDT.balanceOf).to.have.been.callCount(5);
    expect(strategy.totalAssets).to.have.been.callCount(3);
    expect(USDT.transfer).to.have.been.calledWith(ownerAddress, toEth("10"));
    expectEth(await contract.totalSupply()).to.equal("9.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("4.0");
  });

  it("Should withdraw tokens from strategy if not have enough to return to user", async function () {
    const ownerAddress = ownerAddressses[1];
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("2"));
    strategy.totalAssets.returns(toEth("10"));
    strategy.withdraw.returns(([amount]: Array<BigNumberish>) => {
      console.log("strategy.withdraw", amount);
      USDT.balanceOf
        .whenCalledWith(contract.address)
        .returns(toEth("2").add(amount));

      strategy.totalAssets.returns(toEth("10").sub(amount));

      return BigNumber.from(0);
    });
    USDT.transfer.whenCalledWith(ownerAddress, toEth("6")).returns(true);

    // shares at this moment must be 9 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("9.0");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 4.5 shares = 4.5 shares * 12 Assets / 9 total shares = 6 assets
    await contract.connect(owners[1]).withdraw(toEth("4.5"), 0);

    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
    expect(USDT.balanceOf).to.have.been.callCount(7);
    expect(strategy.totalAssets).to.have.been.callCount(3);
    expect(strategy.withdraw).to.have.been.calledWith(toEth("4"));
    expect(USDT.transfer).to.have.been.calledWith(ownerAddress, toEth("6"));
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.5");
  });

  it("Should try widthdraw tokens from strategy and revert with big loss", async function () {
    const ownerAddress = ownerAddressses[0];
    const loss = toEth("0.001");
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("2"));
    strategy.totalAssets.returns(toEth("10"));

    let withdrawCalledTimes = 0;
    strategy.withdraw.returns(([amount]: Array<BigNumberish>) => {
      console.log("strategy.withdraw", amount, "loss", loss);
      withdrawCalledTimes++;
      if (withdrawCalledTimes > 1) {
        console.warn("Called second time");
        return toEth("1");
      }

      USDT.balanceOf
        .whenCalledWith(contract.address)
        .returns(toEth("2").add(amount).sub(loss));

      strategy.totalAssets.returns(toEth("10").sub(amount));

      return loss;
    });
    USDT.transfer.whenCalledWith(ownerAddress, toEth("6")).returns(true);

    // shares at this moment must be 4.5 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 3 shares = 3 shares * 12 Assets / 4.5 total shares = 8 assets
    await expect(contract.connect(owners[0]).withdraw(toEth("3"), 1)).reverted; // aceptable loss is 0.01% = 0.0008 assets

    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
    expect(USDT.balanceOf).to.have.been.callCount(11);
    expect(strategy.totalAssets).to.have.been.callCount(5);
    expect(strategy.withdraw).to.have.been.calledWith(toEth("6"));
    expect(USDT.transfer).to.not.have.been.called;
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("4.0");
  });

  it("Should withdraw tokens from strategy with losts", async function () {
    const ownerAddress = ownerAddressses[0];
    const loss = toEth("0.0008");
    USDT.balanceOf.whenCalledWith(contract.address).returns(toEth("2"));
    strategy.totalAssets.returns(toEth("10"));

    let withdrawCalledTimes = 0;
    strategy.withdraw.returns(([amount]: Array<BigNumberish>) => {
      console.log("strategy.withdraw", amount, "loss", loss);
      withdrawCalledTimes++;
      if (withdrawCalledTimes > 1) {
        console.warn("Called second time");
        return toEth("0");
      }

      USDT.balanceOf
        .whenCalledWith(contract.address)
        .returns(toEth("2").add(amount).sub(loss));

      strategy.totalAssets.returns(toEth("10").sub(amount));

      return loss;
    });
    USDT.transfer.whenCalledWith(ownerAddress, toEth("6")).returns(true);

    // shares at this moment must be 4.5 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 3 shares = 3 shares * 12 Assets / 4.5 total shares = 8 assets
    await contract.connect(owners[0]).withdraw(toEth("3"), 1); // aceptable loss is 0.01% = 0.0008 assets

    expect(USDT.balanceOf).to.have.been.calledWith(contract.address);
    expect(USDT.balanceOf).to.have.been.callCount(11);
    expect(strategy.totalAssets).to.have.been.callCount(5);
    expect(strategy.withdraw).to.have.been.calledWith(toEth("6"));
    expect(USDT.transfer).to.have.been.calledWith(
      ownerAddress,
      toEth("8").sub(loss)
    );
    expectEth(await contract.totalSupply()).to.equal("1.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("1");
  });
});
