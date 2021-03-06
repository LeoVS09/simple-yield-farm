import { ethers } from "hardhat";
import { IERC20Upgradeable } from "../../typechain";
// TODO: use this plugin instaed save API https://www.npmjs.com/package/hardhat-etherscan-abi
import { WETHABI } from "./WETH";
import { USDTABI } from './USDT';
import { PayableOverrides, ContractTransaction } from "ethers";

export { WETHABI, USDTABI };

export interface IWETH extends IERC20Upgradeable {
  deposit(
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;
}

export type IUSDT = IERC20Upgradeable;

// based on https://stackoverflow.com/questions/71106843/check-balance-of-erc20-token-in-hardhat-using-ethers-js
// https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code

export const getWETHContract = (address: string): IWETH => {
  const Contract = new ethers.Contract(address, WETHABI, ethers.provider);

  return Contract as IWETH;
};
