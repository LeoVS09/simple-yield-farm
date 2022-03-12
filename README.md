# Stacking Delegator

dApp for delegating cryptocurrencies to Validator

## Requirements

* [Truffle](https://github.com/trufflesuite/truffle) - Solidity development tool suit, install by `npm install -g truffle`
* [Ganache](https://trufflesuite.com/ganache/) - a personal blockchain for Ethereum development you can use to deploy contracts, [tip to install](https://gist.github.com/GoodnessEzeokafor/e3a2665bb482addbb603269428424967)

## First Start Guide

* Install requirements
* Instal dependencies by `npm i`
* Start Ganache local blockchain
* Run `truffle compile && truffle migrate` for setup contracts
* Start dev server by `cd app && npm run start`
* Configure crypto wallet for interact with application, [tutorial](https://trufflesuite.com/tutorial/index.html#interacting-with-the-dapp-in-a-browser)
  * Use chain id 1337

## Development

### Project Structure

Based on default Truffle directory structure:

* `contracts/`: Contains the Solidity source files for our smart contracts. There is an important contract in here called Migrations.sol, which we'll talk about later.
* `migrations/`: Truffle uses a migration system to handle smart contract deployments. A migration is an additional special smart contract that keeps track of changes.
* `test/`: Contains both JavaScript and Solidity tests for our smart contracts
* `truffle-config.js`: Truffle configuration file

### Commands

* `truffle compile` - Compile
* `truffle migrate` - Migrate
* `truffle test` - Test contracts
* `npm run start` - Run dev server
* `truffle develop` - launch test blockchain with the Truffle Develop console
* `truffle create contract YourContractName` - scaffold a contract
* `truffle create test YourTestName` - scaffold a test
