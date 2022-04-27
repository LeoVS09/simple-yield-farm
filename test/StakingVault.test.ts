/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FakeContract, smock, MockContract } from "@defi-wonderland/smock";
import { expect, use } from "chai";
import { BigNumberish, BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { StakingVault, TestStrategy, USDT } from "../typechain";

use(smock.matchers);

// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
// const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("StakingVault", function () {
  let contract: StakingVault;
  let owners: Array<SignerWithAddress>;
  let ownerAddressses: Array<string>;
  let USDT: USDT;
  let strategy: TestStrategy;

  before(async () => {
    owners = await ethers.getSigners();
    ownerAddressses = await Promise.all(
      owners.map(async (owner) => {
        return await owner.getAddress();
      })
    );

    const usdtFactory = await ethers.getContractFactory("USDT");
    USDT = await usdtFactory.deploy();

    const strategyFactory = await ethers.getContractFactory("TestStrategy");
    strategy = await strategyFactory.deploy(USDT.address);

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

    strategy.setLender(contract.address);

    console.log("addresses\n", {
      owner: ownerAddressses[0],
      strategy: strategy.address,
      contract: contract.address,
      USDT: USDT.address,
      iUSDT: iUSDT_address,
    });
  });

  beforeEach(() => {
    strategy.setLoss(toEth("0"));
  });

  it("Should deposit tokens", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();
    await USDT.mint(ownerAddress, toEth("10"));
    await USDT.connect(owner).approve(contract.address, toEth("10"));

    await contract.connect(owner).deposit(toEth("10"));

    // When vault not have shares it must not check assets balance
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("0.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("10.0");
    expectEth(await contract.totalSupply()).to.equal("10.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("10.0");
  });

  it("Should deposit second owner tokens", async function () {
    const owner = owners[1];
    const ownerAddress = await owner.getAddress();
    await USDT.mint(ownerAddress, toEth("10"));
    await USDT.connect(owner).approve(contract.address, toEth("5"));

    await contract.connect(owner).deposit(toEth("5"));

    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("5.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("15.0");
    expectEth(await contract.totalSupply()).to.equal("15.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("5.0");
  });

  it("should borrow assets for strategy", async () => {
    expectEth(await USDT.balanceOf(contract.address)).to.equal("15.0");

    // will call StackingVault.borrow under the hood
    await strategy.borrow(toEth("3"));

    expectEth(await USDT.balanceOf(strategy.address)).to.equal("3.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("12.0");

    // Must track lended deposites + USDT.balanceOf retuns 10
    expectEth(await contract.totalDebt()).to.equal("3.0");
  });

  it("Should returns tokens to owner proportionally to increased assets", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();

    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("0.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("12.0");

    await USDT.mint(strategy.address, toEth("10"));
    expectEth(await USDT.balanceOf(strategy.address)).to.equal("13.0");

    // shares at this moment must be 15 and total assets at 25
    expectEth(await contract.totalSupply()).to.equal("15.0");
    expectEth(await contract.totalAssets()).to.equal("25.0");

    // withdraw 6 shares = 6 shares * 25 Assets / 15 total shares = 10 assets
    await contract.connect(owner).withdraw(toEth("6"), 0);

    expectEth(await USDT.balanceOf(strategy.address)).to.equal("13.0");
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("10.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("2.0");
    expectEth(await contract.totalSupply()).to.equal("9.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("4.0");
  });

  it("Should withdraw tokens from strategy if not have enough to return to user", async function () {
    const owner = owners[1];
    const ownerAddress = await owner.getAddress();

    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("5.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("2.0");

    await USDT.burn(strategy.address, toEth("3"));
    expectEth(await USDT.balanceOf(strategy.address)).to.equal("10.0");

    // shares at this moment must be 9 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("9.0");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 4.5 shares = 4.5 shares * 12 Assets / 9 total shares = 6 assets
    await contract.connect(owners[1]).withdraw(toEth("4.5"), 0);

    console.log("await contract.totalSupply()", await contract.totalSupply());

    expectEth(await USDT.balanceOf(strategy.address)).to.equal("6.0");
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("11.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("0.0");
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.5");
  });

  it("Should try widthdraw tokens from strategy and revert with big loss", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("10.0");

    await strategy.setLoss(toEth("0.001"));

    await USDT.mint(contract.address, toEth("2"));
    expectEth(await USDT.balanceOf(contract.address)).to.equal("2.0");
    await USDT.mint(strategy.address, toEth("4"));
    expectEth(await USDT.balanceOf(strategy.address)).to.equal("10.0");

    // shares at this moment must be 4.5 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 3 shares = 3 shares * 12 Assets / 4.5 total shares = 8 assets
    await expect(contract.connect(ownerAddress).withdraw(toEth("3"), 1))
      .reverted; // aceptable loss is 0.01% = 0.0008 assets

    expectEth(await USDT.balanceOf(strategy.address)).to.equal("10.0");
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("10.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("2.0");
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("4.0");
  });

  it("Should withdraw tokens from strategy with loss", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("10.0");

    await strategy.setLoss(toEth("0.0008"));

    expectEth(await USDT.balanceOf(contract.address)).to.equal("2.0");
    expectEth(await USDT.balanceOf(strategy.address)).to.equal("10.0");

    // shares at this moment must be 4.5 and total assets at 12
    expectEth(await contract.totalSupply()).to.equal("4.5");
    expectEth(await contract.totalAssets()).to.equal("12.0");

    // withdraw 3 shares = 3 shares * 12 Assets / 4.5 total shares = 8 assets
    await contract.connect(owner).withdraw(toEth("3"), 1); // aceptable loss is 0.01% = 0.0008 assets

    expectEth(await USDT.balanceOf(strategy.address)).to.equal("4.0");
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("18.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("0.0");
    expectEth(await contract.totalSupply()).to.equal("1.5");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("1.0");
  });
});
