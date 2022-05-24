/* eslint-disable camelcase */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers/lib/utils";
// import {ethers } from 'hardhat'

// Binance Smart Chain
// const iETH_address = "0xd57E1425837567F74A35d07669B23Bfb67aA4A93";
// const iUSDT_address = "0x0BF8C72d618B5d46b055165e21d661400008fa0F";
// const USDT_address = "0x55d398326f99059fF775485246999027B3197955"; // BUSD-T actually
// Etherium Mainnet
// const iETH_address = "0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0";
// const iUSDT_address = "0x1180c114f7fAdCB6957670432a3Cf8Ef08Ab5354";
const USDT_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const NULL_ADDDRESS = "0x0000000000000000000000000000000000000000";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers, tenderly } = hre;
  const { deploy } = deployments;

  // const owners = await ethers.getSigners()

  const { deployer } = await getNamedAccounts();

  const ERC20DforceStrategyDeploy = await deployments.get(
    "ERC20DforceStrategy"
  );
  const ERC20DforceStrategy = await ethers.getContractAt(
    "ERC20DforceStrategy",
    ERC20DforceStrategyDeploy.address
  );

  const InvestmentVaultResult = await deploy("InvestmentVault", {
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
          "USDT Investment Vault Shares",
          "evsUSDT",
          USDT_address,
          ERC20DforceStrategyDeploy.address,
        ],
      },
    },
  });

  await ERC20DforceStrategy.setLender(InvestmentVaultResult.address);

  await tenderly.persistArtifacts({
    network: "hardhat",
    name: "InvestmentVault",
    address: InvestmentVaultResult.address,
  });

  await tenderly.verify({
    network: "hardhat",
    name: "InvestmentVault",
    address: InvestmentVaultResult.address,
  });
};

export default func;
func.tags = ["InvestmentVault"];
