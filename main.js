// Import the BlockChain and Block classes from blockchain.js
const { BlockChain, Block } = require('./blockchain.js');

// Create a new blockchain instance
let micaNet = new BlockChain();

// Add blocks to the blockchain
micaNet.addBlock(new Block(1, "24/3/2025", { amount: 4 })); // Block with index 1 and data { amount: 4 }
micaNet.addBlock(new Block(2, "24/3/2025", { amount: 8 })); // Block with index 2 and data { amount: 8 }

// Print the entire blockchain to the console in a formatted JSON string
console.log(JSON.stringify(micaNet, null, 4));