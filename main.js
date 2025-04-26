const { FullWallet, LightWallet, BlockChain } = require('./blockchain.js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// === Blockchain network ===
const network = new BlockChain()


// === Full Wallet ===
const fullWallet = new FullWallet('bb5343b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de783', network);

// === Light Wallets ===
const lightWallet1 = new LightWallet('c1a3b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de784');
const lightWallet2 = new LightWallet('d2b4b3b70388a19927e3c5cb0e1322eba50acd284f5476235487fd2c7c9de785');

// === Display Balances ===
console.log('\n--- Wallet Balances ---');
console.log('Full Wallet Balance:', fullWallet.getBalance());
console.log('Light Wallet 1 Balance:', fullWallet.getBalanceOf(lightWallet1.address));
console.log('Light Wallet 2 Balance:', fullWallet.getBalanceOf(lightWallet2.address));

// === Initilaize mem-pool JSON file ===
lightWallet1.sendTransactionViaFullWallet(lightWallet2.address, 10, fullWallet);
lightWallet2.sendTransactionViaFullWallet(fullWallet.address, 5, fullWallet);
fullWallet.makeTransaction(lightWallet1.address, 7);

lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 6, fullWallet);
lightWallet1.sendTransactionViaFullWallet(fullWallet.address, 1, fullWallet);
fullWallet.makeTransaction(lightWallet2.address, 5);

lightWallet1.sendTransactionViaFullWallet(lightWallet2.address, 9, fullWallet);
lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 5, fullWallet);
fullWallet.makeTransaction(lightWallet1.address, 8);

lightWallet1.sendTransactionViaFullWallet(fullWallet.address, 2, fullWallet);
lightWallet2.sendTransactionViaFullWallet(fullWallet.address, 1, fullWallet);
fullWallet.makeTransaction(lightWallet2.address, 3);

lightWallet1.sendTransactionViaFullWallet(lightWallet2.address, 8, fullWallet);
lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 11, fullWallet);
fullWallet.makeTransaction(lightWallet1.address, 6);

lightWallet1.sendTransactionViaFullWallet(lightWallet2.address, 7, fullWallet);
lightWallet2.sendTransactionViaFullWallet(fullWallet.address, 9, fullWallet);
fullWallet.makeTransaction(lightWallet2.address, 3);

lightWallet1.sendTransactionViaFullWallet(fullWallet.address, 13, fullWallet);
lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 11, fullWallet);
fullWallet.makeTransaction(lightWallet1.address, 2);

lightWallet1.sendTransactionViaFullWallet(lightWallet2.address, 16, fullWallet);
lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 14, fullWallet);
fullWallet.makeTransaction(lightWallet2.address, 1);

lightWallet1.sendTransactionViaFullWallet(fullWallet.address, 7, fullWallet);
lightWallet2.sendTransactionViaFullWallet(fullWallet.address, 6, fullWallet);
fullWallet.makeTransaction(lightWallet1.address, 1);

fullWallet.makeTransaction(lightWallet2.address, 14);
lightWallet1.sendTransactionViaFullWallet(fullWallet.address, 7, fullWallet);
lightWallet2.sendTransactionViaFullWallet(lightWallet1.address, 5, fullWallet);



// === Mine All Transactions ===
while (fullWallet.blockchain.getPendingTransactions().length > 0) {
    console.log('\n--- Mining Pending Transactions ---');
    fullWallet.minePendingTransactions();
}

// Light Wallets sync transactions
for (const block of fullWallet.blockchain.chain) {
    for (const tx of block.transactions) {
        if (tx.fromAddress === lightWallet1.address) {
            lightWallet1.syncTransaction(tx);
        } else if (tx.fromAddress === lightWallet2.address) {
            lightWallet2.syncTransaction(tx);
        }
    }
}

// === Display Balances ===
console.log('\n--- Wallet Balances ---');
console.log('Full Wallet Balance:', fullWallet.getBalance());
console.log('Light Wallet 1 Balance:', fullWallet.getBalanceOf(lightWallet1.address));
console.log('Light Wallet 2 Balance:', fullWallet.getBalanceOf(lightWallet2.address));

// === Display blockchain details ===
let totalCoinsInNetwork = 0;
let totalMinedCoins = 0;
let totalBurnedCoins = 0;

// Sum up from the blockchain
for (const block of network.chain) {
    for (const tx of block.transactions) {
        // If it's a miner reward transaction
        if (tx.fromAddress === null) {
            totalMinedCoins += tx.amount;
            totalCoinsInNetwork += tx.amount;
        } else {
            totalCoinsInNetwork -= network.baseFee; // Burn base fee
            totalBurnedCoins += network.baseFee;
        }
    }
}

console.log("\n=== Final Network Stats ===");
console.log(`Total coins in network: ${totalCoinsInNetwork}`);
console.log(`Total coins mined: ${totalMinedCoins}`);
console.log(`Total coins burned: ${totalBurnedCoins}`);
