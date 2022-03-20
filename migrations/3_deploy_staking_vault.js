const StakingVault = artifacts.require("StakingVault");

module.exports = (deployer) => {
  deployer.deploy(StakingVault, '0xd57E1425837567F74A35d07669B23Bfb67aA4A93');
};
