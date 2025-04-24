// Import the BlockChain, Block, and Transaction classes from blockchain3.js
const { BlockChain, Block, Transaction } = require('./blockChain3.js'); // Updated to use blockChain3.js

// Create a new blockchain instance
let micaNet = new BlockChain();

// Create transactions and add them to the blockchain
micaNet.createTransaction(new Transaction('address1', "Bob wallet", 100)); // Transaction from address1 to Bob's wallet
micaNet.createTransaction(new Transaction("Bob wallet", 'address2', 50)); // Transaction from Bob's wallet to address2

// Mine the pending transactions
console.log('Mining Block .....'); // Notify that the pending transactions are being mined
micaNet.minePendingTransactions("Bob wallet"); // Specify the miner's wallet address

// Check the balance of Bob's wallet
console.log('\nBalance of Bob: ', micaNet.getBalanceOfAddress("Bob wallet")); // Display Bob's balance

// Print the entire blockchain in a formatted JSON string
console.log(JSON.stringify(micaNet, null, 4));