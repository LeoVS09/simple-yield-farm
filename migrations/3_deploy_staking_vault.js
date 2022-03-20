const StakingVault = artifacts.require("StakingVault");

module.exports = (deployer) => {
  deployer.deploy(StakingVault);
};
