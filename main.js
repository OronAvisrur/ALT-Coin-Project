// Import the BlockChain, Block, and Transaction classes from blockchain4.js
const { BlockChain, Block, Transaction } = require('./blockChain4.js');

// Import elliptic for key generation and signing
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate a key pair and derive the wallet address
const myKey = ec.keyFromPrivate('bb5343b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de783'); // Private key
const myWalletAddress = myKey.getPublic('hex'); // Public key (wallet address)

// Create a new blockchain instance
const micaNet = new BlockChain();

// Create the first transaction, sign it, and add it to the blockchain
const tx1 = new Transaction(myWalletAddress, 'address2', 100); // Transaction from my wallet to address2
tx1.signTransaction(myKey); // Sign the transaction with the private key
micaNet.addTransaction(tx1); // Add the transaction to the blockchain
micaNet.minePendingTransactions(myWalletAddress); // Mine the pending transactions

// Create the second transaction, sign it, and add it to the blockchain
const tx2 = new Transaction(myWalletAddress, 'address1', 50); // Transaction from my wallet to address1
tx2.signTransaction(myKey); // Sign the transaction with the private key
micaNet.addTransaction(tx2); // Add the transaction to the blockchain
micaNet.minePendingTransactions(myWalletAddress); // Mine the pending transactions

// Check the balance of my wallet
console.log('\nMy Wallet Balance: ', micaNet.getBalanceOfAddress(myWalletAddress)); // Display my wallet balance

// Uncomment the following line to print the entire blockchain in a formatted JSON string
// console.log(JSON.stringify(micaNet, null, 4));