const { rpc } = require("@binance-chain/javascript-sdk")


const client = new rpc("https://data-seed-prebsc-1-s1.binance.org:8545/", 'testnet')


client.getAccount("tbnb1qx30wrw57udmfgeh46x8sl9q9p6pwgfm2hrcrk")
  .then((x) => console.log("", JSON.stringify(x)))