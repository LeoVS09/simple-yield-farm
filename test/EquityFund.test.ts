import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, ContractTransaction, PayableOverrides } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { EquityFund, IERC20 } from "../typechain";
import { getERC20Contract } from "./ERC20";

// WETH address in etherium mainnet
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

interface IWETH extends IERC20 {
  deposit(
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;
}

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("EquityFund", function () {
  let contract: EquityFund;
  let owner: SignerWithAddress;
  let ownerAddres: string;
  let WETH: IWETH;

  before(async () => {
    const EquityFundFactory = await ethers.getContractFactory("EquityFund");
    const instance = await upgrades.deployProxy(EquityFundFactory, [
      WETH_ADDRESS,
    ]);
    contract = (await upgrades.upgradeProxy(
      instance.address,
      EquityFundFactory
    )) as EquityFund;

    [owner] = await ethers.getSigners();
    ownerAddres = await owner.getAddress();

    WETH = getERC20Contract(WETH_ADDRESS) as IWETH;

    const tx = await WETH.deposit({ value: toEth("10") });
    await tx.wait();
  });

  it("Should deposit tokens", async function () {
    const approveTx = await WETH.approve(contract.address, toEth("10"));
    await approveTx.wait();

    const tx = await contract.deposit(toEth("10"), ownerAddres, ownerAddres);
    await tx.wait();

    expectEth(await contract.balanceOf(ownerAddres)).to.equal("10.0");
  });
});
