/* eslint-disable camelcase */
import { expect, use } from "chai";
// import { BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
// eslint-disable-next-line node/no-missing-import
import { ERC20DforceStrategy, Lender, TestLender } from "../typechain";
import { USDTABI, IUSDT } from "./ERC20";
import { BigNumber } from "ethers";
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

// const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("ERC20DforceStrategy", function () {
  let contract: ERC20DforceStrategy;
  let lender: FakeContract<Lender>;
  let testLender: TestLender;
  let USDT: FakeContract<IUSDT>;

  before(async () => {
    USDT = await smock.fake<IUSDT>(USDTABI, { address: USDT_address });
    lender = await smock.fake("Lender");

    const ERC20DforceStrategyFactory = await ethers.getContractFactory(
      "ERC20DforceStrategy"
    );
    const instance = await upgrades.deployProxy(ERC20DforceStrategyFactory, [
      "USDT DForce Strategy",
      USDT.address,
      lender.address,
      iUSDT_address,
    ]);

    contract = (await upgrades.upgradeProxy(
      instance.address,
      ERC20DforceStrategyFactory
    )) as ERC20DforceStrategy;

    const testLenderFactory = await ethers.getContractFactory("TestLender");
    testLender = await testLenderFactory.deploy();

    console.log("addresses\n", {
      contract: contract.address,
      USDT: USDT.address,
      lender: lender.address,
      iUSDT: iUSDT_address,
      testLender: testLender.address,
    });
  });

  beforeEach(() => {
    lender.borrow.reset();
    lender.borrow.reverts();
    lender.creditAvailable.reset();
    lender.creditAvailable.reverts();
    USDT.balanceOf.reset();
    USDT.balanceOf.reverts();
    USDT.transferFrom.reset();
    USDT.transferFrom.reverts();
  });

  it("should borrow and stake tokens", async function () {
    lender.creditAvailable.returns(BigNumber.from(100000));
    lender.borrow.whenCalledWith(BigNumber.from(100000)).returns();

    let calledOnce = false;
    USDT.balanceOf.returns(([addr]: Array<string>) => {
      console.log("balanceOf", addr);
      if (addr === contract.address) {
        return BigNumber.from(100000);
      }
      if (addr !== iUSDT_address) {
        return toEth("0");
      }

      if (!calledOnce) {
        // first call inside of iUSDT
        calledOnce = true;
        return BigNumber.from(596551011229);
      }

      return BigNumber.from(596551011229).add(BigNumber.from(100000));
    });

    USDT.allowance.whenCalledWith(contract.address, iUSDT_address).returns(0);
    USDT.approve
      .whenCalledWith(iUSDT_address, BigNumber.from(100000))
      .returns(true);

    USDT.transferFrom
      .whenCalledWith(contract.address, iUSDT_address, BigNumber.from(100000))
      .returns(true);

    await contract.work();

    // eslint-disable-next-line no-unused-expressions
    expect(lender.creditAvailable).to.have.been.called;
    expect(lender.borrow).to.have.been.calledWith(BigNumber.from(100000));

    expect(USDT.approve).to.have.been.calledWith(
      iUSDT_address,
      BigNumber.from(100000)
    );
    expect(USDT.transferFrom).to.have.been.calledWith(
      contract.address,
      iUSDT_address,
      BigNumber.from(100000)
    );
  });

  it("should redeem and widthdraw tokens", async () => {
    let calledByContract = 0;

    USDT.balanceOf.returns(([addr]: Array<string>) => {
      console.log("balanceOf", addr);
      if (addr === contract.address) {
        calledByContract++;
        if (calledByContract <= 5) {
          return BigNumber.from(0);
        }

        return BigNumber.from(100000);
      }

      if (addr !== iUSDT_address) {
        return toEth("0");
      }

      return BigNumber.from(596551011229).add(BigNumber.from(100000));
    });

    USDT.transferFrom
      .whenCalledWith(iUSDT_address, contract.address, BigNumber.from(100000))
      .returns(true);

    USDT.transfer
      .whenCalledWith(testLender.address, BigNumber.from(100000))
      .returns(true);

    await contract.setLender(testLender.address);

    await testLender.withdraw(contract.address, BigNumber.from(100000));

    expect(USDT.transfer).to.have.been.calledWith(
      testLender.address,
      BigNumber.from(100000)
    );
  });
});
