/* eslint-disable camelcase */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { USDT } from "../typechain";
import UsdtAbi from "../local/USDT_abi.json";

// Binance Smart Chain
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// const iUSDT_address = '0x0BF8C72d618B5d46b055165e21d661400008fa0F'
// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDT_owner_address = "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828";

const NULL_ADDDRESS = "0x0000000000000000000000000000000000000000";

const isLocal = process.env.NODE_ENV === "local";
console.log("isLocal", isLocal);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  console.log("deployer", deployer);

  if (isLocal) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_owner_address],
    });
    const signer = await ethers.getSigner(USDT_owner_address);
    const usdtContract = new ethers.Contract(USDT_address, UsdtAbi, signer);
    await usdtContract.issue(ethers.utils.parseEther("10000"));
    console.log(
      "owner usdt balance",
      ethers.utils.formatEther(await usdtContract.balanceOf(USDT_owner_address))
    );

    await usdtContract.transfer(deployer, ethers.utils.parseEther("10000"));
    console.log(
      "deployer usdt balance",
      ethers.utils.formatEther(await usdtContract.balanceOf(deployer))
    );
  }
};

export default func;
func.tags = ["USDT"];
