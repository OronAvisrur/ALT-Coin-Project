// Importing required libraries
const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec;
const { MerkleTree } = require('merkletreejs');
const BloomFilter = require('bloom-filter');
const ec = new EC('secp256k1');
const fs = require('fs');
const path = require('path');

/**
 * Represents a transaction in the blockchain.
 */
class Transaction {
     /**
     * Creates a new Transaction.
     * @param {string} fromAddress - The sender's address.
     * @param {string} toAddress - The recipient's address.
     * @param {number} amount - The amount to transfer.
     */
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    /**
     * Calculates the hash of the transaction.
     * @returns {string} The SHA256 hash of the transaction.
     */
    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString();
    }

    /**
     * Validates the transaction.
     * @returns {boolean} True if the transaction is valid, false otherwise.
     */
    isValid(signature) {
        if (this.fromAddress === null) return true;

        if (!signature || signature === 0) {
            throw new Error('No signature in this transaction ');
        }

        const hash = this.calculateHash();

        // Recover the public key from the private key 
        const senderKey = ec.keyFromPublic(this.fromAddress, 'hex'); 
        // Verify the signature with the correct public key
        return senderKey.verify(hash, signature);
    }
}

/**
 * Represents a signature to store the block hash and signatures.
 * This is used to implement SegWit (Segregated Witness) in the blockchain.
 */
class Signature {
    /**
     * Creates a new Signature.
     * @param {string} blockHash - The hash of the block.
     * @param {Array<string>} signatures - The list of signatures for the block.
     */
    constructor(blockHash = "", signatures = []) {
        this.blockHash = blockHash;
        this.signatures = signatures;
    }
}

/**
 * Represents a single block in the blockchain.
 */
class Block {
    /**
     * Creates a new Block.
     * @param {string} timestamp - The timestamp of when the block was created.
     * @param {Transaction[]} transactions - The list of transactions in the block.
     * @param {Array<string>} txSignatures - The list of transaction signatures.
     * @param {string} [previousHash=""] - The hash of the previous block in the chain.
     */
    constructor(timestamp, transactions = [], txSignatures = [], previousHash = "") {
        this.previousHash = previousHash;
        this.timestamp = timestamp;

        // Store transaction data without signatures for hashing and storage
        this.transactions = transactions;

        this.nonce = 0;
        this.merkleTree = this.createMerkleTree();
        this.bloomFilter = this.createBloomFilter();
        this.hash = SHA256(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + JSON.stringify(txSignatures + this.nonce)).toString();

        // Path to signatures file to implement SegWit
        this.signaturesPath = path.join(__dirname, 'signatures.json'); 
        
        // Load signatures from file
        const signaturesPool = this.loadMSignatures();
        // Filter out null signatures
        txSignatures = txSignatures.filter(item => item !== null)
        // Create a new Signature object to store the block hash and signatures
        const signaturesToInclude = new Signature(this.hash, txSignatures);
        
        // Save signatures outside of the block to the file
        signaturesPool.push(signaturesToInclude);
        this.saveSignatures(signaturesPool);
    }

    // Helper to load Signatures from file
    loadMSignatures() {
        try {
            // Read the signatures file and parse it as JSON
            const data = fs.readFileSync(this.signaturesPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            // If the file doesn't exist or is empty, return an empty array
            return [];
        }
    }

    // Helper to save Signatures to file
    saveSignatures(signatures) {
        // Write the signatures array to the file as JSON
        fs.writeFileSync(this.signaturesPath, JSON.stringify(signatures, null, 2));
    }

    // Returns the hash of the block 
    calculateHash() {
        // List of signature objects
        const signaturesPool = this.loadMSignatures();
        // Find the signature object that matches the current block hash
        const blockSignetures = signaturesPool.find(sig => sig.blockHash === this.hash);

        return SHA256(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + JSON.stringify(blockSignetures.signatures + this.nonce)).toString();
    }

    // Update the hash of the block with a new nonce
    UpadateHash(newNonce) {
        // List of signature objects
        const signaturesPool = this.loadMSignatures();
        // Find the signature object that matches the current block hash
        const blockSignetures = signaturesPool.find(sig => sig.blockHash === this.hash);

        // Update the hash with the new nonce
        this.hash = SHA256(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + JSON.stringify(blockSignetures.signatures + newNonce)).toString();
        
        // Upadte the hash of the blockSignetures object
        blockSignetures.blockHash = this.hash;

        // Save the updated signatures to the file
        this.saveSignatures(signaturesPool);
        
    }

    // Proof of work to mine a block
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            // Update the hash with the current nonce
            this.UpadateHash(this.nonce + 1);
            // Increment the nonce for the next iteration
            this.nonce++;
        }
        console.log('Block Mined: ' + this.hash);
    }

    // Builds a Merkle Tree from transaction hashes
    createMerkleTree() {
        // Create a Merkle Tree using SHA256 hashing 
        const transactionHashes = this.transactions.map(tx =>
            SHA256(tx.fromAddress + tx.toAddress + tx.amount + tx.timestamp).toString()
        );
        return new MerkleTree(transactionHashes, SHA256);
    }

    // Returns the root hash of the Merkle Tree
    getMerkleRoot() {
        return this.merkleTree.getRoot().toString('hex');
    }

    // Creates a Bloom Filter for the transactions in the block
    createBloomFilter() {
        const bloomFilter = BloomFilter.create(1000, 0.01); // Initialize Bloom Filter
        for (const tx of this.transactions) {
            bloomFilter.insert(tx.calculateHash()); // Add transaction hash to the Bloom Filter
        }
        return bloomFilter;
    }

    // Checks if a transaction exists in the block 
    hasTransaction(fromAddress, toAddress, amount, timestamp) {

        // Create a new transaction object with the provided details
        tx = new Transaction(fromAddress, toAddress, amount, timestamp);

        // Converts the transaction hash into a binary buffer (required by the Merkle Tree)
        const txHashBuffer = Buffer.from(tx.calculateHash(), 'hex');

        // Check if the transaction hash exists in the Merkle Tree
        const leafIndex = this.merkleTree.getLeafIndex(txHashBuffer);

        // Return true if the transaction exists in the Merkle Tree, otherwise false
        return leafIndex !== -1;
    }
}

/**
 * Represents the blockchain.
 */
class BlockChain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 1;
        this.miningReward = 50;
        this.baseFee = 2;
        this.minerFee = 3;
        this.mempoolPath = path.join(__dirname, 'transactions.json'); // Path to mempool file
    }

    // Create the first block of the blockchain
    createGenesisBlock() {
        return new Block("01/09/2009", [], [], "0");
    }

    // Get the most recently added block
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Helper to load mempool from file
    loadMempool() {
        try {
            const data = fs.readFileSync(this.mempoolPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return { transactions: [], signatures: [] };
        }
    }

    // Helper to save mempool to file
    saveMempool(mempool) {
        fs.writeFileSync(this.mempoolPath, JSON.stringify(mempool, null, 2));
    }

    // Add a transaction and its signature to the pending pool
    addTransaction(transaction, senderKey) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error("Transaction must include from and to address");
        }
    
        const hash = transaction.calculateHash();
        const signature = senderKey.sign(hash, 'base64').toDER('hex');
    
        if (!transaction.isValid(signature)) {
            throw new Error("Cannot add invalid transaction to the chain");
        }
    
        const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
        const totalCost = transaction.amount + this.baseFee + this.minerFee;
    
        if (senderBalance < totalCost) {
            throw new Error("Insufficient balance for this transaction " + senderBalance + " < " + totalCost);
        }
    
        // Load current mempool
        const mempool = this.loadMempool();
    
        // Serialize transaction (custom if needed)
        const txData = {
            fromAddress: transaction.fromAddress,
            toAddress: transaction.toAddress,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            hash: transaction.calculateHash()
        };
    
        mempool.transactions.push(txData);
        mempool.signatures.push(signature);
    
        // Save updated mempool
        this.saveMempool(mempool);
    }

    // Mine the pending transactions and create a new block
    minePendingTransactions(miningRewardAddress) {
        const mempool = this.loadMempool();
        
        // Take up to 3 transactions and signatures

        const transactionsToMine = mempool.transactions.slice(0, 3).map(tx =>
            tx instanceof Transaction
                ? tx
                : new Transaction(tx.fromAddress, tx.toAddress, tx.amount, tx.timestamp)
        );
        const signaturesToInclude = mempool.signatures.slice(0, 3);
    
        let totalPriorityFees = 0;
        for (const tx of transactionsToMine) {
            totalPriorityFees += this.minerFee;
        }
    
        const minerReward = this.miningReward + totalPriorityFees;
        const rewardTx = new Transaction(null, miningRewardAddress, minerReward);
        transactionsToMine.push(rewardTx);
        signaturesToInclude.push(null);
        
        const block = new Block(Date.now(), transactionsToMine, signaturesToInclude, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);
    
        console.log("Block successfully mined!");
        this.chain.push(block);
    
        // Remove mined transactions from mempool
        mempool.transactions = mempool.transactions.slice(3);
        mempool.signatures = mempool.signatures.slice(3);
        this.saveMempool(mempool);
    
        return block;
    }

    // Get current balance of an address
    getBalanceOfAddress(address) {
        // starting balance
        let balance = 300; 
    
        // Process all confirmed transactions in the chain
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.fromAddress === address) {
                    balance -= tx.amount + this.baseFee + this.minerFee;
                }
                if (tx.toAddress === address) {
                    balance += tx.amount;
                }
            }
        }
    
        // Process all pending transactions in the mempool
        // loads mempool.json
        const mempool = this.loadMempool(); 

        if(mempool !== null) {           
            for (const tx of mempool.transactions) {
                if (tx.fromAddress === address) {
                    balance -= tx.amount + this.baseFee + this.minerFee;
                }
                if (tx.toAddress === address) {
                    balance += tx.amount;
                }
            }
        }
    
        return balance;
    }

    // Validate the entire blockchain
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            const fullTransactions = this.getFullTransactions(currentBlock);

            if (!currentBlock.hasValidTransactions(fullTransactions)) return false;
            if (currentBlock.hash !== currentBlock.calculateHash()) return false;
            if (currentBlock.previousHash !== previousBlock.hash) return false;
        }

        return true;
    }

    // Use Bloom filter to find a transaction in the blockchain
    searchTransaction(hash) {
        for (const block of this.chain) {
            // Check if the transaction might exist in the block using the Bloom Filter
            if (block.bloomFilter.test(hash)) {
                
                for (const tx of block.transactions) {
                    if (tx.calculateHash() === hash) {
                        // Found the transaction
                        return tx; 
                    }
                }
            }
        }

        // Transaction not found
        return null; 
    }

    // Get all pending transactions
    getPendingTransactions() {
        const mempool = this.loadMempool();
        return mempool.transactions;
    }
}

/**
 * Represents a full wallet (full node) in the blockchain.
 */
class FullWallet {
    constructor(privateKey, blockchain) {
        this.key = ec.keyFromPrivate(privateKey);
        this.address = this.key.getPublic('hex');
        this.blockchain = blockchain;
    }

    makeTransaction(toAddress, amount) {
        const transaction = new Transaction(this.address, toAddress, amount);
        this.blockchain.addTransaction(transaction, this.key);
    }

    getBalanceOf(address) {
        return this.blockchain.getBalanceOfAddress(address);
    }

    receiveTransactionFromLightWallet(transaction, senderKey) {

        const balance = this.blockchain.getBalanceOfAddress(transaction.fromAddress);
        const totalCost = transaction.amount + 2 + 3;

        console.log(`Transaction from ${transaction.fromAddress} to ${transaction.toAddress} for ${totalCost}`);

        if (balance < totalCost) {
            console.log(`Insufficient funds: Has ${balance}, needs ${totalCost}`);
            return;
        }

        this.blockchain.addTransaction(transaction, senderKey);
        console.log("Transaction from light wallet accepted.");
    }

    minePendingTransactions() {
        this.blockchain.minePendingTransactions(this.address);
    }

    getBalance() {
        return this.blockchain.getBalanceOfAddress(this.address);
    }
}

/**
 * Represents a light wallet in the blockchain.
 */
class LightWallet {
    constructor(privateKey) {
        this.key = ec.keyFromPrivate(privateKey);
        this.address = this.key.getPublic('hex');
        this.transactions = []; 
    }

    sendTransactionViaFullWallet(toAddress, amount, fullWallet) {
        fullWallet.receiveTransactionFromLightWallet(new Transaction(this.address, toAddress, amount), this.key);
    }

    syncTransaction(transaction) {
        this.transactions.push(transaction);
    }

    hasTransaction(transaction) {
        for (const tx of this.transactions) {
            if (tx.calculateHash() === transaction.calculateHash()) {
                return true;
            }
        }
        return false;
    }

    valideteWalletTransactions(fullWallet) {
        // Load the mempool from the full wallet
        const signaturePool = fullWallet.blockchain.loadMempool();
        for (const tx of this.transactions) {
            const txSignature = signaturePool.signatures.find(sig => sig === tx.calculateHash());
            // Check if the transaction exists in the full wallet's blockchain
            if (!tx.isValid(sig)) {
                console.log("Invalid transaction found in light wallet: ", tx);
                return false;
            }
        }
        return true;
    }
}

module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
module.exports.FullWallet = FullWallet;
module.exports.LightWallet = LightWallet;