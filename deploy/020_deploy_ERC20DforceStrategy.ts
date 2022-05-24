/* eslint-disable camelcase */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers/lib/utils";

// Binance Smart Chain
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// const iUSDT_address = "0x0BF8C72d618B5d46b055165e21d661400008fa0F";
// const USDT_address = "0x55d398326f99059fF775485246999027B3197955"; // BUSD-T actually
// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const NULL_ADDDRESS = "0x0000000000000000000000000000000000000000";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, tenderly } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  // const openzeppelin = await deploy("@openzeppelin/contracts", {
  //   from: deployer,
  // });

  // const openzeppelinUpgradable = await deploy(
  //   "@openzeppelin/contracts-upgradeable",
  //   {
  //     from: deployer,
  //   }
  // );

  const result = await deploy("ERC20DforceStrategy", {
    from: deployer,
    // Lender unknown during deployment, will start with null address
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks,
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          "USDT dForce Strategy",
          USDT_address,
          NULL_ADDDRESS,
          iUSDT_address,
        ],
      },
    },
    // libraries: {
    //   "@openzeppelin/contracts": openzeppelin.address,
    //   "@openzeppelin/contracts-upgradeable": openzeppelinUpgradable.address,
    // },
  });

  await tenderly.persistArtifacts({
    network: "hardhat",
    name: "ERC20DforceStrategy",
    address: result.address,
  });

  await tenderly.verify({
    network: "hardhat",
    name: "ERC20DforceStrategy",
    address: result.address,
  });
};

export default func;
func.tags = ["ERC20DforceStrategy"];
