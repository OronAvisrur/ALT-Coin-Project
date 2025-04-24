// Import the BlockChain and Block classes from blockchain2.js
const { BlockChain, Block } = require('./blockChain2.js'); // Updated to use blockChain2.js

// Create a new blockchain instance
let micaNet = new BlockChain();

// Mine and add the first block to the blockchain
console.log('Mining Block .....'); // Notify that the first block is being mined
micaNet.addBlock(new Block(1, "24/3/2025", { amount: 4 })); // Block with index 1 and data { amount: 4 }

// Mine and add the second block to the blockchain
console.log('Mining Block .....'); // Notify that the second block is being mined
micaNet.addBlock(new Block(2, "24/3/2025", { amount: 8 })); // Block with index 2 and data { amount: 8 }