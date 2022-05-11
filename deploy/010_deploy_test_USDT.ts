/* eslint-disable camelcase */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { USDT } from "../typechain";

// Binance Smart Chain
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// const iUSDT_address = '0x0BF8C72d618B5d46b055165e21d661400008fa0F'
// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const NULL_ADDDRESS = "0x0000000000000000000000000000000000000000";

const isLocal = process.env.NODE_ENV === "local";
console.log("isLocal", isLocal);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  console.log("deployer", deployer);

  if (isLocal) {
    const deployment = await deploy("USDT", {
      from: deployer,
      // Lender unknown during deployment, will start with null address
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks,
      //   to: USDT_address,
    });

    // Write this in `npx hardhat console` to give some tokens to account
    const Usdt = (await ethers.getContractAt(
      "USDT",
      deployment.address
    )) as USDT;

    const address_for_balance = deployer;
    await Usdt.mint(address_for_balance, parseEther("1000.0"));
    console.log(
      "USDT balance",
      address_for_balance,
      await Usdt.balanceOf(address_for_balance)
    );
  }
};

export default func;
func.tags = ["USDT"];
