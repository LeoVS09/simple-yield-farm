# Stacking Delegator

dApp for delegating cryptocurrencies to Validator

## Requirements

* [Truffle](https://github.com/trufflesuite/truffle) - Solidity development tool suit, install by `npm install -g truffle`
* [Ganache](https://trufflesuite.com/ganache/) - a personal blockchain for Ethereum development you can use to deploy contracts, install by `npm install ganache --global`
* [Tenderly](https://github.com/Tenderly/tenderly-cli) - For debug transactions and smart contracts

## First Start Guide

* Install requirements
* Instal dependencies by `npm i`
* Start Ganache local blockchain by `ganache`
* Run `truffle compile && truffle migrate` for setup contracts
* Create `.env` with app configuration, by running `cp ./app/.env.template ./app/.env`
* Start dev server by `cd app && npm run start`

## Development

### Use wallet during local development

For test connection of wallet extension with local blockchain need disable direct connection to blockchain.

* Clear variable `REACT_APP_WEB3_URL` in `./app/.env`
* Configure crypto wallet for interact with application, [tutorial](https://trufflesuite.com/tutorial/index.html#interacting-with-the-dapp-in-a-browser)
  * Use chain id 1337
* Start dev server by `cd app && npm run start`

### Project Structure

Based on default Truffle directory structure:

* `contracts/`: Contains the Solidity source files for our smart contracts. There is an important contract in here called Migrations.sol, which we'll talk about later.
* `migrations/`: Truffle uses a migration system to handle smart contract deployments. A migration is an additional special smart contract that keeps track of changes.
* `test/`: Contains both JavaScript and Solidity tests for our smart contracts
* `truffle-config.js`: Truffle configuration file

## Enable tenderlit

`tenderly login` - login for local development

### Commands

* `truffle compile` - Compile
* `truffle migrate` - Migrate
* `truffle migrate --f <migration-number-prefix>` - Run from specific migration
* `truffle test` - Test contracts
* `npm run start` - Run dev server
* `truffle develop` - launch test blockchain with the Truffle Develop console
* `truffle create contract YourContractName` - scaffold a contract
* `truffle create test YourTestName` - scaffold a test
* `ganache` - start ganache server
* `ganache --fork https://data-seed-prebsc-1-s1.binance.org:8545` - start ganache fork of BSC test net, [full list available RPC](https://docs.binance.org/smart-chain/developer/rpc.html)
* `tenderly export <transaction hash>` - export transaction from ganache and send to dashboard, [open local transactions dashboard](https://dashboard.tenderly.co/LeoVS09/stacking-delegator/local-transactions/)
  
## Forks

* `https://data-seed-prebsc-1-s1.binance.org:8545` - Binance Smart Chain
* `https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161` - Etherium Mainnet

## Usefull links

* [Binance Smart Chain development with Truffle](https://docs.binance.org/smart-chain/developer/deploy/truffle-new.html)
* [RPC info](https://rpc.info/)
