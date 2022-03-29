import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { SharedVault } from "../typechain";

const { formatEther: fromEth, parseEther: toEth } = ethers.utils;

const expectEth = (wei: BigNumberish) => expect(fromEth(wei));

describe("SharedVault", function () {
  let contract: SharedVault;
  let owner: SignerWithAddress;
  let ownerAddres: string;

  before(async () => {
    const SharedVaultFactory = await ethers.getContractFactory("SharedVault");
    const instance = await upgrades.deployProxy(SharedVaultFactory);
    contract = (await upgrades.upgradeProxy(
      instance.address,
      SharedVaultFactory
    )) as SharedVault;

    [owner] = await ethers.getSigners();
    ownerAddres = await owner.getAddress();
  });

  it("Should mint tokens", async function () {
    const tx = await contract.mint(ownerAddres, toEth("10"));
    await tx.wait();

    expectEth(await contract.balanceOf(ownerAddres)).to.equal("10.0");
  });
});
