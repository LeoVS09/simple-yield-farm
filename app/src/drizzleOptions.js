import Web3 from "web3";
import ComplexStorage from "./contracts/ComplexStorage.json";
import SimpleStorage from "./contracts/SimpleStorage.json";
import TutorialToken from "./contracts/TutorialToken.json";


const web3 = process.env.REACT_APP_WEB3_URL && {
  block: false,
  customProvider: new Web3(`ws://${process.env.REACT_APP_WEB3_URL}`),
}

if(web3) {
  console.log('Will use custom provider for web3', web3);
} else {
  console.log('Will use default provider for web3, please login in your wallet...');
}

const options = {
  web3,
  contracts: [SimpleStorage, ComplexStorage, TutorialToken],
  events: {
    SimpleStorage: ["StorageSet"],
  },
};

export default options;
