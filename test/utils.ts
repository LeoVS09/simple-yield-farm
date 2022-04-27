import { ethers, upgrades, network } from "hardhat";
import { etheriumFork } from "../forks";

const { url: jsonRpcUrl, blockNumber } = etheriumFork;

export async function resetFork() {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl,
          blockNumber,
        },
      },
    ],
  });
}
