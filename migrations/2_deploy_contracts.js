// migrations/2_deploy_contracts.js
const ERC20Token = artifacts.require("ERC20Token");
const Vesting = artifacts.require("Vesting");

module.exports = async function (deployer) {
  await deployer.deploy(ERC20Token, 10000);
  const tokenInstance = await ERC20Token.deployed();

  await deployer.deploy(Vesting, tokenInstance.address);
};
