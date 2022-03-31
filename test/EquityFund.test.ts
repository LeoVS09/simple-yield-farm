import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { expect, use } from "chai";
import { BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { EquityFund } from "../typechain";
import { WETHABI, IWETH } from "./ERC20";

use(smock.matchers);

// WETH address in etherium mainnet
// const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("EquityFund", function () {
  let contract: EquityFund;
  let owners: Array<SignerWithAddress>;
  let ownerAddressses: Array<string>;
  let WETH: FakeContract<IWETH>;

  before(async () => {
    WETH = await smock.fake<IWETH>(WETHABI);

    owners = await ethers.getSigners();
    ownerAddressses = await Promise.all(
      owners.map(async (owner) => {
        return await owner.getAddress();
      })
    );

    WETH.balanceOf.returns(toEth("10"));
    // Check smock working properly
    // If fail at this place, just restart test
    console.log("WETH.balanceOf", await WETH.balanceOf(ownerAddressses[0]));

    const EquityFundFactory = await ethers.getContractFactory("EquityFund");
    const instance = await upgrades.deployProxy(EquityFundFactory, [
      "Equity Fund",
      "EFS",
      WETH.address,
    ]);
    contract = (await upgrades.upgradeProxy(
      instance.address,
      EquityFundFactory
    )) as EquityFund;
  });

  beforeEach(() => {
    WETH.balanceOf.reset();
    WETH.balanceOf.reverts();
    WETH.transferFrom.reset();
    WETH.transferFrom.reverts();
  });

  describe("deposit()", () => {
    it("Should deposit tokens", async function () {
      const ownerAddress = ownerAddressses[0];
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("0"));
      WETH.transferFrom
        .whenCalledWith(ownerAddress, contract.address, toEth("10"))
        .returns(true);

      await contract.connect(owners[0]).deposit(toEth("10"));

      // eslint-disable-next-line no-unused-expressions
      expect(WETH.balanceOf).to.not.have.been.called;
      expect(WETH.transferFrom).to.have.been.calledWith(
        ownerAddress,
        contract.address,
        toEth("10")
      );
      expectEth(await contract.totalSupply()).to.equal("10.0");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("10.0");
    });

    it("Should deposit second owner tokens", async function () {
      const ownerAddress = ownerAddressses[1];
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("10"));
      WETH.transferFrom
        .whenCalledWith(ownerAddress, contract.address, toEth("5"))
        .returns(true);

      await contract.connect(owners[1]).deposit(toEth("5"));

      expect(WETH.balanceOf).to.have.been.calledWith(contract.address);
      expect(WETH.transferFrom).to.have.been.calledWith(
        ownerAddress,
        contract.address,
        toEth("5")
      );
      expectEth(await contract.totalSupply()).to.equal("15.0");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("5.0");
    });

    it("Should issue shares proportianaly to increased assets", async function () {
      // increase balance of vault without issue shares
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("20"));
      // deposit from new address
      const ownerAddress = ownerAddressses[2];
      WETH.transferFrom
        .whenCalledWith(ownerAddress, contract.address, toEth("10"))
        .returns(true);

      await contract.connect(owners[2]).deposit(toEth("10"));

      expect(WETH.balanceOf).to.have.been.calledWith(contract.address);
      expect(WETH.transferFrom).to.have.been.calledWith(
        ownerAddress,
        contract.address,
        toEth("10")
      );
      expectEth(await contract.totalSupply()).to.equal("22.5");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("7.5");
    });

    it("Should issue shares proportianaly to decreased assets", async function () {
      // decrease balance of vault without changes shares
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("20"));
      // deposit from new address
      const ownerAddress = ownerAddressses[3];
      WETH.transferFrom
        .whenCalledWith(ownerAddress, contract.address, toEth("10"))
        .returns(true);

      await contract.connect(owners[3]).deposit(toEth("10"));

      expect(WETH.balanceOf).to.have.been.calledWith(contract.address);
      expect(WETH.transferFrom).to.have.been.calledWith(
        ownerAddress,
        contract.address,
        toEth("10")
      );
      expectEth(await contract.totalSupply()).to.equal("33.75");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("11.25");
    });
  });

  describe("withdraw()", () => {
    it("Should returns tokens to owner of shares", async function () {
      const ownerAddress = ownerAddressses[0];
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("33.75"));
      WETH.transferFrom
        .whenCalledWith(contract.address, ownerAddress, toEth("10"))
        .returns(true);

      await contract.connect(owners[0]).withdraw(toEth("10"), 0);

      expect(WETH.balanceOf).to.have.been.calledWith(contract.address);
      expect(WETH.transferFrom).to.have.been.calledWith(
        contract.address,
        ownerAddress,
        toEth("10")
      );
      expectEth(await contract.totalSupply()).to.equal("23.75");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.0");
    });

    it("Should revert if owner do not have shares", async function () {
      const ownerAddress = ownerAddressses[0];
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("23.75"));
      WETH.transferFrom
        .whenCalledWith(contract.address, ownerAddress, toEth("10"))
        .returns(true);

      await expect(contract.connect(owners[0]).withdraw(toEth("10"), 0))
        .reverted;

      // eslint-disable-next-line no-unused-expressions
      expect(WETH.balanceOf).to.not.have.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(WETH.transferFrom).to.not.have.been.called;
      expectEth(await contract.totalSupply()).to.equal("23.75");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("0.0");
    });

    it("Should revert if owner do not have enough shares", async function () {
      const ownerAddress = ownerAddressses[1];
      WETH.balanceOf.whenCalledWith(contract.address).returns(toEth("23.75"));
      WETH.transferFrom
        .whenCalledWith(contract.address, ownerAddress, toEth("5.0"))
        .returns(true);

      await expect(contract.connect(owners[1]).withdraw(toEth("10"), 0))
        .reverted;

      // eslint-disable-next-line no-unused-expressions
      expect(WETH.balanceOf).to.not.have.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(WETH.transferFrom).to.not.have.been.called;
      expectEth(await contract.totalSupply()).to.equal("23.75");
      expectEth(await contract.balanceOf(ownerAddress)).to.equal("5.0");
    });
  });
});
