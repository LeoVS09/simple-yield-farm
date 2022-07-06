/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FakeContract, smock, MockContract } from "@defi-wonderland/smock";
import { expect, use } from "chai";
import { BigNumberish, BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { ERC4626Upgradeable, TestERC4626, USDT } from "../typechain";
import { USDTABI, IUSDT } from "./ERC20";

use(smock.matchers);

// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
// const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("ERC4626", function () {
  let contract: TestERC4626;
  let owners: Array<SignerWithAddress>;
  let ownerAddressses: Array<string>;
  let USDT: USDT;

  before(async () => {
    owners = await ethers.getSigners();
    ownerAddressses = await Promise.all(
      owners.map(async (owner) => {
        return await owner.getAddress();
      })
    );

    const usdtFactory = await ethers.getContractFactory("USDT");
    USDT = await usdtFactory.deploy();

    const VaultFactory = await ethers.getContractFactory("TestERC4626");
    const instance = await upgrades.deployProxy(VaultFactory, [
      USDT.address,
      "TestERC4626",
      "TVS",
      [],
    ]);
    contract = (await upgrades.upgradeProxy(
      instance.address,
      VaultFactory
    )) as TestERC4626;

    console.log("addresses\n", {
      owner: ownerAddressses[0],
      contract: contract.address,
      USDT: USDT.address,
    });
  });

  it("Should return correct metadata", async () => {
    expect(await contract.name()).to.equal("TestERC4626");
    expect(await contract.symbol()).to.equal("TVS");
    expect(await contract.asset()).to.equal(USDT.address);
  });

  it("Should deposit tokens", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();

    expectEth(await contract.previewDeposit(toEth("10.0"))).to.equal("10.0");

    await USDT.mint(ownerAddress, toEth("15"));
    await USDT.connect(owner).approve(contract.address, toEth("15"));

    await contract.connect(owner).deposit(toEth("10"), ownerAddress);

    // Expect exchange rate to be 1:1 on initial deposit.
    // When vault not have shares it must not check assets balance
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("5.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("10.0");
    expectEth(await contract.totalSupply()).to.equal("10.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("10.0");
    expect(await contract.afterDepositHookCalledCounter()).to.equal(1);
    expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(0);
    expectEth(await contract.previewWithdraw(toEth("10.0"))).to.equal("10.0");
    expectEth(await contract.previewDeposit(toEth("10.0"))).to.equal("10.0");
    expectEth(
      await contract.convertToAssets(await contract.balanceOf(ownerAddress))
    ).to.equal("10.0");
  });

  it("Should withdraw tokens", async function () {
    const owner = owners[0];
    const ownerAddress = await owner.getAddress();

    await contract
      .connect(owner)
      .withdraw(toEth("10"), ownerAddress, ownerAddress);

    // When vault not have shares it must not check assets balance
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("15.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("0.0");
    expectEth(await contract.totalSupply()).to.equal("0.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.0");
    expect(await contract.afterDepositHookCalledCounter()).to.equal(1);
    expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(1);
  });

  it("Should mint tokens", async function () {
    const owner = owners[1];
    const ownerAddress = await owner.getAddress();

    expectEth(await contract.previewMint(toEth("10.0"))).to.equal("10.0");

    await USDT.mint(ownerAddress, toEth("15"));
    await USDT.connect(owner).approve(contract.address, toEth("15"));

    await contract.connect(owner).mint(toEth("10"), ownerAddress);

    // Expect exchange rate to be 1:1 on initial deposit.
    // When vault not have shares it must not check assets balance
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("5.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("10.0");
    expectEth(await contract.totalSupply()).to.equal("10.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("10.0");
    expect(await contract.afterDepositHookCalledCounter()).to.equal(2);
    expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(1);
    expectEth(await contract.previewRedeem(toEth("10.0"))).to.equal("10.0");
    expectEth(await contract.previewMint(toEth("10.0"))).to.equal("10.0");
    expectEth(
      await contract.convertToAssets(await contract.balanceOf(ownerAddress))
    ).to.equal("10.0");
  });

  it("Should redeem tokens", async function () {
    const owner = owners[1];
    const ownerAddress = await owner.getAddress();

    await contract
      .connect(owner)
      .redeem(toEth("10"), ownerAddress, ownerAddress);

    // When vault not have shares it must not check assets balance
    expectEth(await USDT.balanceOf(ownerAddress)).to.equal("15.0");
    expectEth(await USDT.balanceOf(contract.address)).to.equal("0.0");
    expectEth(await contract.totalSupply()).to.equal("0.0");
    expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.0");
    expect(await contract.afterDepositHookCalledCounter()).to.equal(2);
    expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(2);
  });

  describe("Scenario: should handle miltiple deposit and withdraws", () => {
    // Scenario:
    // A = Alice, B = Bob
    //  ________________________________________________________
    // | Vault shares | A share | A assets | B share | B assets |
    // |========================================================|
    // | 1. Alice mints 2000 shares (costs 2000 tokens)         |
    // |--------------|---------|----------|---------|----------|
    // |         2000 |    2000 |     2000 |       0 |        0 |
    // |--------------|---------|----------|---------|----------|
    // | 2. Bob deposits 4000 tokens (mints 4000 shares)        |
    // |--------------|---------|----------|---------|----------|
    // |         6000 |    2000 |     2000 |    4000 |     4000 |
    // |--------------|---------|----------|---------|----------|
    // | 3. Vault mutates by +3000 tokens...                    |
    // |    (simulated yield returned from strategy)...         |
    // |--------------|---------|----------|---------|----------|
    // |         6000 |    2000 |     3000 |    4000 |     6000 |
    // |--------------|---------|----------|---------|----------|
    // | 4. Alice deposits 2000 tokens (mints 1333 shares)      |
    // |--------------|---------|----------|---------|----------|
    // |         7333 |    3333 |     4999 |    4000 |     6000 |
    // |--------------|---------|----------|---------|----------|
    // | 5. Bob mints 2000 shares (costs 3001 assets)           |
    // |    NOTE: Bob's assets spent got rounded up             |
    // |    NOTE: Alice's vault assets got rounded up           |
    // |--------------|---------|----------|---------|----------|
    // |         9333 |    3333 |     5000 |    6000 |     9000 |
    // |--------------|---------|----------|---------|----------|
    // | 6. Vault mutates by +3000 tokens...                    |
    // |    (simulated yield returned from strategy)            |
    // |    NOTE: Vault holds 17001 tokens, but sum of          |
    // |          assetsOf() is 17000.                          |
    // |--------------|---------|----------|---------|----------|
    // |         9333 |    3333 |     6071 |    6000 |    10929 |
    // |--------------|---------|----------|---------|----------|
    // | 7. Alice redeem 1333 shares (2428 assets)              |
    // |--------------|---------|----------|---------|----------|
    // |         8000 |    2000 |     3643 |    6000 |    10929 |
    // |--------------|---------|----------|---------|----------|
    // | 8. Bob withdraws 2928 assets (1608 shares)             |
    // |--------------|---------|----------|---------|----------|
    // |         6392 |    2000 |     3643 |    4392 |     8000 |
    // |--------------|---------|----------|---------|----------|
    // | 9. Alice withdraws 3643 assets (2000 shares)           |
    // |    NOTE: Bob's assets have been rounded back up        |
    // |--------------|---------|----------|---------|----------|
    // |         4392 |       0 |        0 |    4392 |     8001 |
    // |--------------|---------|----------|---------|----------|
    // | 10. Bob redeem 4392 shares (8001 tokens)               |
    // |--------------|---------|----------|---------|----------|
    // |            0 |       0 |        0 |       0 |        0 |
    // |______________|_________|__________|_________|__________|

    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let aliceAddress: string;
    let bobAddress: string;

    before(async () => {
      [alice, bob] = owners;
      [aliceAddress, bobAddress] = await Promise.all([
        alice.getAddress(),
        bob.getAddress(),
      ]);
    });

    it("Preparation checks", async () => {
      // Burn all and set initial conditions
      await USDT.burn(aliceAddress, await USDT.balanceOf(aliceAddress));
      await USDT.burn(bobAddress, await USDT.balanceOf(bobAddress));

      await USDT.mint(aliceAddress, toEth("4000"));
      await USDT.mint(bobAddress, toEth("7001"));

      // Checks itself...
      expectEth(await USDT.balanceOf(aliceAddress)).to.equal("4000.0");
      expectEth(await USDT.balanceOf(bobAddress)).to.equal("7001.0");
      expectEth(await USDT.balanceOf(contract.address)).to.equal("0.0");
      expectEth(await contract.totalSupply()).to.equal("0.0");
      expectEth(await contract.totalAssets()).to.equal("0.0");
      expectEth(await contract.balanceOf(aliceAddress)).to.equal("0.0");
      expectEth(await contract.balanceOf(bobAddress)).to.equal("0.0");
      expect(await contract.afterDepositHookCalledCounter()).to.equal(2);
      expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(2);
    });

    it("1. Alice mints 2000 shares (costs 2000 tokens)", async () => {
      expectEth(await contract.previewDeposit(toEth("2000.0"))).to.equal(
        "2000.0"
      );

      await USDT.connect(alice).approve(contract.address, toEth("4000"));
      // Simulate transaction to receive return value
      const aliceAssetsAmount = await contract
        .connect(alice)
        .callStatic.mint(toEth("2000"), aliceAddress);
      expectEth(aliceAssetsAmount).to.equal("2000.0");

      // execture transaction itslef
      await contract.connect(alice).mint(toEth("2000"), aliceAddress);

      expectEth(await USDT.balanceOf(aliceAddress)).to.equal("2000.0");
      expectEth(await USDT.balanceOf(contract.address)).to.equal("2000.0");
      expectEth(await contract.balanceOf(aliceAddress)).to.equal("2000.0");
      expectEth(await contract.totalSupply()).to.equal("2000.0");
      expectEth(await contract.totalAssets()).to.equal("2000.0");
      expectEth(await contract.previewDeposit(toEth("2000.0"))).to.equal(
        "2000.0"
      );
      expectEth(await contract.previewWithdraw(toEth("2000.0"))).to.equal(
        "2000.0"
      );
      expect(await contract.afterDepositHookCalledCounter()).to.equal(3);
      expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(2);
    });

    it("2. Bob deposits 4000 tokens (mints 4000 shares)", async () => {
      expectEth(await contract.previewDeposit(toEth("4000.0"))).to.equal(
        "4000.0"
      );
      await USDT.connect(bob).approve(contract.address, toEth("4000"));
      // Simulate transaction to receive return value
      const assetsAmount = await contract
        .connect(bob)
        .callStatic.mint(toEth("4000"), bobAddress);
      expectEth(assetsAmount).to.equal("4000.0");

      // execute transaction itslef
      await contract.connect(bob).deposit(toEth("4000"), bobAddress);

      expectEth(await USDT.balanceOf(bobAddress)).to.equal("3001.0");
      expectEth(await USDT.balanceOf(contract.address)).to.equal("6000.0");
      expectEth(await contract.totalSupply()).to.equal("6000.0");
      expectEth(await contract.totalAssets()).to.equal("6000.0");
      expectEth(await contract.balanceOf(bobAddress)).to.equal("4000.0");
      expectEth(await contract.previewDeposit(toEth("4000.0"))).to.equal(
        "4000.0"
      );
      expectEth(await contract.previewWithdraw(toEth("4000.0"))).to.equal(
        "4000.0"
      );
      expect(await contract.afterDepositHookCalledCounter()).to.equal(4);
      expect(await contract.beforeWithdrawHookCalledCounter()).to.equal(2);
      // expect 1:1 ratio
      expectEth(await contract.convertToAssets(toEth("4000.0"))).to.equal(
        "4000.0"
      );
      expectEth(await contract.convertToShares(toEth("4000.0"))).to.equal(
        "4000.0"
      );
    });

    // The Vault now contains more tokens than deposited which causes the exchange rate to change.
    // Alice share is 33.33% of the Vault, Bob 66.66% of the Vault.
    // Alice's share count stays the same but the underlying amount changes from 2000 to 3000.
    // Bob's share count stays the same but the underlying amount changes from 4000 to 6000.
    it("3. Vault mutates by +3000 tokens (simulated yield returned from strategy)", async () => {
      await USDT.mint(contract.address, toEth("3000"));

      expectEth(await contract.totalSupply()).to.equal("6000.0");
      expectEth(await contract.totalAssets()).to.equal("9000.0");

      expectEth(await contract.balanceOf(aliceAddress)).to.equal("2000.0");
      expectEth(
        await contract.convertToAssets(await contract.balanceOf(aliceAddress))
      ).to.equal("3000.0");

      expectEth(await contract.balanceOf(bobAddress)).to.equal("4000.0");
      expectEth(
        await contract.convertToAssets(await contract.balanceOf(bobAddress))
      ).to.equal("6000.0");
    });
  });
});
