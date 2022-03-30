import { ethers } from "hardhat";
import { IERC20 } from "../../typechain";
// TODO: use this plugin instaed save API https://www.npmjs.com/package/hardhat-etherscan-abi
import { WETHABI } from "./WETH";
import { PayableOverrides, ContractTransaction } from "ethers";

export interface IWETH extends IERC20 {
  deposit(
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;
}

// based on https://stackoverflow.com/questions/71106843/check-balance-of-erc20-token-in-hardhat-using-ethers-js
// https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code

export const getWETHContract = (address: string): IWETH => {
  const Contract = new ethers.Contract(address, WETHABI, ethers.provider);

  return Contract as IWETH;
};
