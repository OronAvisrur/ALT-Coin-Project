const { FullWallet, LightWallet, Transaction } = require('./blockchain.js');
const EC = require('elliptic').ec;
const fs = require('fs'); // For reading the JSON file
const ec = new EC('secp256k1');

// Full Wallet (Full Node)
const fullWalletKey = ec.keyFromPrivate('bb5343b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de783');
const fullWallet = new FullWallet(fullWalletKey.getPrivate('hex'));

// Light Wallets
const lightWallet1Key = ec.keyFromPrivate('c1a3b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de784');
const lightWallet1 = new LightWallet(lightWallet1Key.getPrivate('hex'));

const lightWallet2Key = ec.keyFromPrivate('d2b4b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de785');
const lightWallet2 = new LightWallet(lightWallet2Key.getPrivate('hex'));

// Load transactions from JSON file
const transactions = JSON.parse(fs.readFileSync('./transactions.json', 'utf8'));

// Add transactions to the Mem-Pool
for (const txData of transactions) {
    const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount);

    // Sign the transaction if it has a valid sender address
    if (txData.fromAddress) {
        const senderKey = ec.keyFromPrivate(getPrivateKeyForAddress(txData.fromAddress));
        tx.signTransaction(senderKey);
    }

    fullWallet.blockchain.addTransaction(tx);
}

// Mine transactions in blocks
while (fullWallet.blockchain.pendingTransactions.length > 0) {
    fullWallet.mineTransactions();
}

// Light Wallets receive transactions
console.log('\n--- Light Wallets receive transactions ---');
for (const block of fullWallet.blockchain.chain) {
    for (const tx of block.transactions) {
        lightWallet1.receiveTransaction(tx);
        lightWallet2.receiveTransaction(tx);
    }
}

// Display Balances
console.log('\n--- Wallet Balances ---');
console.log('Full Wallet Balance:', fullWallet.getBalance());
console.log('Light Wallet 1 Balance:', lightWallet1.getBalance());
console.log('Light Wallet 2 Balance:', lightWallet2.getBalance());

// Calculate and display final parameters
const totalCoinsInNetwork = calculateTotalCoins(fullWallet.blockchain);
const totalCoinsMined = calculateTotalMined(fullWallet.blockchain);
const totalCoinsBurned = calculateTotalBurned(fullWallet.blockchain);

console.log('\n--- Final Parameters ---');
console.log('Total Coins in Network:', totalCoinsInNetwork);
console.log('Total Coins Mined:', totalCoinsMined);
console.log('Total Coins Burned:', totalCoinsBurned);

console.log('\n--- Wallet Address ---\n');
console.log('Full Wallet Address:', fullWallet.address);
console.log('Light Wallet 1 Address:', lightWallet1.address);
console.log('Light Wallet 2 Address:', lightWallet2.address);

// Helper function to get the private key for a given address
function getPrivateKeyForAddress(address) {
    if (address === fullWallet.address) {
        return 'bb5343b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de783';
    } else if (address === lightWallet1.address) {
        return 'c1a3b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de784';
    } else if (address === lightWallet2.address) {
        return 'd2b4b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de785';
    } else {
        throw new Error(`No private key found for address: ${address}`);
    }
}

// Calculate total coins in the network
function calculateTotalCoins(blockchain) {
    let totalCoins = 0;
    const addresses = new Set();

    // Collect all unique addresses
    for (const block of blockchain.chain) {
        for (const tx of block.transactions) {
            addresses.add(tx.fromAddress);
            addresses.add(tx.toAddress);
        }
    }

    // Sum balances of all addresses
    for (const address of addresses) {
        if (address) {
            totalCoins += blockchain.getBalanceOfAddress(address);
        }
    }

    return totalCoins;
}

// Calculate total coins mined in the network
function calculateTotalMined(blockchain) {
    let totalMined = 0;

    for (const block of blockchain.chain) {
        for (const tx of block.transactions) {
            if (tx.fromAddress === null) {
                totalMined += tx.amount; // Mining reward
            }
        }
    }

    return totalMined;
}

// Calculate total coins burned in the network
function calculateTotalBurned(blockchain) {
    let totalBurned = 0;

    for (const block of blockchain.chain) {
        for (const tx of block.transactions) {
            if (tx.fromAddress !== null) {
                totalBurned += blockchain.baseFee; // Base fee is burned
            }
        }
    }

    return totalBurned;
}