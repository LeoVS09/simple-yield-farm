import { ethers, upgrades } from "hardhat";

const ADDRESS = "todo";

async function main() {
  const SharedVault = await ethers.getContractFactory("SharedVault");
  const sc = await upgrades.upgradeProxy(ADDRESS, SharedVault);
  console.log("Box upgraded", sc.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
