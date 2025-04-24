// Import the BlockChain and Block classes from blockchain.js
const { BlockChain, Block } = require('./blockChain1.js'); // Updated to use blockChain1.js

// Create a new blockchain instance
let micaNet = new BlockChain();

// Add blocks to the blockchain
micaNet.addBlock(new Block(1, "24/3/2025", { amount: 4 })); // Block with index 1 and data { amount: 4 }
micaNet.addBlock(new Block(2, "24/3/2025", { amount: 8 })); // Block with index 2 and data { amount: 8 }

// Check if the blockchain is valid and print the result
console.log('blockChain Valid? ' + micaNet.isChainValid()); // Should return true if the chain is valid

// Simulate tampering with the blockchain
console.log('Changing the Block'); 
micaNet.chain[1].data = { amount: 100 }; 

// Check if the blockchain is still valid after tampering
console.log('blockChain Valid? ' + micaNet.isChainValid()); // Should return false if the chain is invalid