# Simple Yield Farm

PoC of simple earning yield farm implementation. 
Protocol consist of multiple contracts, which together works as basic implementation of yield farming for ERC20 based tokens.
Developlet with extensability in mind and as simple as possible.

## Contracts

* SimpleVault - abstract vault contract, can store some ERC20 token as assets. Give minimal implementation for safe trasfer of assets
* EquityFund - implementation of equity fund based on SimpleVault. Allow anyone deposit tokens in exchange of shares and withdraw tokens in exchange of shares.
* Lender - implement ILender interface and based on SimpleVault. Allow whitelabeled strategy to borrow assets. Can return assets from strategy when required to. Expect possible losses when try to withdraw tokens from strategy. Expect strategy to imeplement IBorrower interface.
* ERC20DforceStrategy - investing strategy which implement IBorrower interface. Can borrow money from ILender and return assets (with percents) to Lender when he requesed. Invest borrowed tokens to [dForce](https://dforce.network/) lending protocol.
* InvestmentVault - merge EquityFund and Lender together. In simple words core earning farm contract. Allow deposit tokens, which can be borrowed by strategy. Allow withdraw tokens, if not have enough availble will return tokens from strategy.

## Architecture

![Architecture Overview](https://github.com/LeoVS09/simple-yield-farm/blob/main/assets/Yield_Farm_Architecture.png?raw=true)

## Development

### Requirements

* [Hardhat](https://hardhat.org/getting-started/#installation) - development environment to compile, deploy, test, and debug your Ethereum software

### First Start Guide

* Install requirements
* Instal dependencies by `npm i`
* Compile contracts by `npx hardhat compile`
* Run tests `npx hardhat test`

### Commands

* `npx hardhat compile` - Compile contracts
* `npx hardhat accounts` - List development accounts
* `npx hardhat test` - Run test
* `npm run dev` - Run tests in watch mode
* `npx hardhat test --trace` - shows logs + calls
* `npx hardhat test --fulltrace` - shows logs + calls + sloads + sstores

#### Rest of commands

```shell
npx hardhat clean
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

## Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).


## Local Server

For start local server with contracts (for example for dApp development) need start local node by command

```bash
npx hardhat node
```

After that need deploy contracts by command

```bash
npx hardhat run --network localhost scripts/deploy.js
```
