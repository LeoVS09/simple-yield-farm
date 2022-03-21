const StakingVault = artifacts.require("StakingVault");

// Binance Smart Chain
const iETH_address = '0xd57E1425837567F74A35d07669B23Bfb67aA4A93'
// Etherium Mainnet
// const iETH_address = '0x5ACD75f21659a59fFaB9AEBAf350351a8bfaAbc0'

module.exports = (deployer) => {
  deployer.deploy(StakingVault, iETH_address);
};
