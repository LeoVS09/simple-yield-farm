import { ethers, upgrades } from "hardhat";

async function main() {
  const SharedVault = await ethers.getContractFactory("SharedVault");
  const sc = await upgrades.deployProxy(SharedVault, [42]);
  await sc.deployed();
  console.log("SharedVault deployed to:", sc.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
