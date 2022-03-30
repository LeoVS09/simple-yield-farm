import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { EquityFund } from "../typechain";
import { getWETHContract, IWETH } from "./ERC20";

// WETH address in etherium mainnet
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("EquityFund", function () {
  let contract: EquityFund;
  let owners: Array<SignerWithAddress>;
  let ownerAddresses: Array<string>;
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

    owners = await ethers.getSigners();
    ownerAddresses = await Promise.all(
      owners.map(async (owner) => {
        return await owner.getAddress();
      })
    );

    WETH = getWETHContract(WETH_ADDRESS);
  });

  it("Should deposit tokens", async function () {
    const ownerAddres = ownerAddresses[0];
    await depositAndApproveEth2Weth(
      WETH,
      owners[0],
      toEth("10"),
      contract.address
    );

    await contract.deposit(toEth("10"), ownerAddres, ownerAddres);

    expectEth(await WETH.balanceOf(contract.address)).to.equal("10.0");
    expectEth(await contract.totalSupply()).to.equal("10.0");
    expectEth(await contract.balanceOf(ownerAddres)).to.equal("10.0");
  });

  it("Should deposit second owner tokens", async function () {
    const ownerAddres = ownerAddresses[1];
    await depositAndApproveEth2Weth(
      WETH,
      owners[1],
      toEth("5"),
      contract.address
    );

    await contract.deposit(toEth("5"), ownerAddres, ownerAddres);

    expectEth(await WETH.balanceOf(contract.address)).to.equal("15.0");
    expectEth(await contract.totalSupply()).to.equal("15.0");
    expectEth(await contract.balanceOf(ownerAddres)).to.equal("5.0");
  });

  it("Should issue shares proportianaly to current assets (increase)", async function () {
    // increase balance of vault without issue shares
    await transferEthInWeth(WETH, owners[0], toEth("5"), contract.address);
    // deposit from new address
    const ownerAddres = ownerAddresses[2];
    await depositAndApproveEth2Weth(
      WETH,
      owners[2],
      toEth("10"),
      contract.address
    );

    await contract.deposit(toEth("10"), ownerAddres, ownerAddres);

    expectEth(await WETH.balanceOf(contract.address)).to.equal("30.0");
    expectEth(await contract.totalSupply()).to.equal("22.5");
    expectEth(await contract.balanceOf(ownerAddres)).to.equal("7.5");
  });

  it("Should issue shares proportianaly to current assets (decrease)", async function () {
    // decrease balance of vault without changes shares
    await WETH.connect(contract.signer).transfer(
      ownerAddresses[0],
      toEth("15")
    );
    // deposit from new address
    const ownerAddres = ownerAddresses[2];
    await depositAndApproveEth2Weth(
      WETH,
      owners[2],
      toEth("10"),
      contract.address
    );

    await contract.deposit(toEth("10"), ownerAddres, ownerAddres);

    expectEth(await WETH.balanceOf(contract.address)).to.equal("15.0");
    expectEth(await contract.totalSupply()).to.equal("37.5");
    expectEth(await contract.balanceOf(ownerAddres)).to.equal("15.0");
  });
});

async function depositAndApproveEth2Weth(
  WETH: IWETH,
  signer: SignerWithAddress,
  value: BigNumberish,
  spender: string
) {
  WETH = WETH.connect(signer);

  const sendTx = await WETH.deposit({ value });
  await sendTx.wait();

  const approveTx = await WETH.approve(spender, value);
  await approveTx.wait();
}

async function transferEthInWeth(
  WETH: IWETH,
  signer: SignerWithAddress,
  value: BigNumberish,
  to: string
) {
  WETH = WETH.connect(signer);

  const sendTx = await WETH.deposit({ value });
  await sendTx.wait();

  const approveTx = await WETH.transfer(to, value);
  await approveTx.wait();
}
