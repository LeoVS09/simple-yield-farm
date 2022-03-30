import * as ERC20ABI from "./ERC20.json";
import { ethers } from "hardhat";
import { IERC20 } from "../../typechain";

// based on https://stackoverflow.com/questions/71106843/check-balance-of-erc20-token-in-hardhat-using-ethers-js
export const getERC20Contract = (address: string): IERC20 => {
  const Contract = new ethers.Contract(address, ERC20ABI, ethers.provider);

  return Contract as IERC20;
};
