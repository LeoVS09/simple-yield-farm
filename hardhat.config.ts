/* eslint-disable no-unused-vars */
import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-tracer";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/** Binance Smart Chain Mainnet */
const binanceSmartChainFork = {
  url: "https://data-seed-prebsc-1-s1.binance.org:8545",
  blockNumber: 16349556, // 24.3.2022
};

/** Etherium Mainnet */
const etheriumFork = {
  url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  // blockNumber: 12964900, // Apr-07-2021
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      // for smock support
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    hardhat: {
      // forking: binanceSmartChainFork,
      forking: etheriumFork,
      accounts: {
        accountsBalance: "1000000000000000000000000", // 1 mil ether,
      },
      // gas: 30000000,
      // gasPrice: 30582625255,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
