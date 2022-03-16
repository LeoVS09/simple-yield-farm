const { BncClient, encodeAddress, crypto} = require("@binance-chain/javascript-sdk")
const { formatsByName, formatsByCoinType } = require('@ensdomains/address-encoder');

const fs = require("fs");

const bech32  = require('bech32-buffer')

const ACCOUNT_FILENAME = './account.json'

const client = new BncClient("https://data-seed-prebsc-1-s1.binance.org:8545/")


let validatorAddress = formatsByName['ETH'].decoder('0xA2959D3F95eAe5dC7D70144Ce1b73b403b7EB6E0')
console.log(validatorAddress)
// validatorAddress = formatsByName['BNB'].encoder(validatorAddress)
validatorAddress = bech32.encode('bva', validatorAddress)
console.log(validatorAddress)
// console.log(bech32.decode('bva1lrzg56jhtkqu7fmca3394vdx00r7apx4gjdzy2'))
console.log(crypto.checkAddress(validatorAddress, "bva"))

const converEth2BscAddress = (prefix, ethHexAddress) => {
    const address = formatsByName['ETH'].decoder(ethHexAddress)
    return bech32.encode(prefix, address)
}

console.log('address', 'tbnb1qx30wrw57udmfgeh46x8sl9q9p6pwgfm2hrcrk')

console.log('converEth2BscAddress', converEth2BscAddress('tbnb', '0xB6c1A4dA75e550C167B7910421dAA211f06e8930'))

const converBsc2EthAddress = (bscAddress) => {
    const address = bech32.decode(bscAddress)
    return formatsByName['ETH'].encoder(Buffer.from(address.data))
}

console.log('converBsc2EthAddress', converBsc2EthAddress('tbnb1qx30wrw57udmfgeh46x8sl9q9p6pwgfm2hrcrk'))

async function main(){

    client.chooseNetwork("testnet")
    // console.log(process.env.PRIVATE_KEY)
    // client.setPrivateKey(process.env.PRIVATE_KEY)
    console.log(await client.initChain())

    // console.log(await client.getClientKeyAddress())

    // await createAccount()
    const account = await readAccount()
    console.log(account)

    console.log(await client.getBalance(account.address))
}

// main()


async function createAccount() {
    const account = await client.createAccount()
    console.log(account)
    await save(ACCOUNT_FILENAME, account)
}

async function readAccount(){
    return read(ACCOUNT_FILENAME)
}


async function delegate(){

    // based on https://testnet.bscscan.com/validators
    console.log(await client.stake.bscDelegate({
        delegateAddress: converEth2BscAddress('tbnb', process.env.ADDRESS), 
        validatorAddress: converEth2BscAddress('bva', '0xA2959D3F95eAe5dC7D70144Ce1b73b403b7EB6E0'), 
        amount: 1, 
        sideChainId: "chapel" // "bsc"
    }))
}

function save(filename, object){
    return new Promise((resolve, reject) => fs.writeFile(filename, JSON.stringify(object), error => {
        if(error) return reject(error)

        resolve()
    }))
}

function read(filename){
    return new Promise((resolve, reject) => fs.readFile(filename, 'utf8', (error, data) => {
        if(error) return reject(error)

        return resolve(data)
    }))
}