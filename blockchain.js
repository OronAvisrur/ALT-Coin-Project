const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec;
const { MerkleTree } = require('merkletreejs'); 
const BloomFilter = require('bloom-filter'); 
const ec = new EC('secp256k1');

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
}

/**
 * Represents a single block in the blockchain.
 */
class Block {
    /**
     * Creates a new Block.
     * @param {string} timestamp - The timestamp of when the block was created.
     * @param {Transaction[]} transactions - The list of transactions in the block.
     * @param {string} [previousHash=""] - The hash of the previous block in the chain.
     */
    constructor(timestamp, transactions, previousHash = "") {
        this.previousHash = previousHash; // Hash of the previous block
        this.timestamp = timestamp; // Timestamp of block creation
        this.transactions = transactions; // Transactions included in the block
        this.hash = this.calculateHash(); // Hash of the current block
        this.nonce = 0; // Nonce used for mining
        this.merkleTree = this.createMerkleTree(); // Add Merkle Tree for transactions
    }

    /**
     * Calculates the hash of the block using its properties.
     * @returns {string} The SHA256 hash of the block.
     */
    calculateHash() {
        return SHA256(
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.transactions) +
            this.nonce
        ).toString();
    }

    /**
     * Mines the block by finding a hash that satisfies the difficulty level.
     * @param {number} difficulty - The number of leading zeros required in the hash.
     */
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            // Increment the nonce until the hash meets the difficulty
            this.nonce++; 
            // Recalculate the hash
            this.hash = this.calculateHash(); 
        }
        console.log('Block Mined: ' + this.hash);
    }

    /**
     * Creates a Merkle Tree for the transactions in the block.
     * @returns {MerkleTree} The Merkle Tree instance.
     */
    createMerkleTree() {
        const transactionHashes = this.transactions.map(tx => tx.calculateHash());
        return new MerkleTree(transactionHashes, SHA256);
    }

    /**
     * Retrieves the Merkle Root of the block's transactions.
     * @returns {string} The Merkle Root in hexadecimal format.
     */
    getMerkleRoot() {
        return this.merkleTree.getRoot().toString('hex');
    }
}

/**
 * Represents the blockchain.
 */
class BlockChain {
    /**
     * Creates a new Blockchain.
     */
    constructor() {
        this.chain = [this.createGenesisBlock()]; // Initialize the chain with the genesis block
        this.difficulty = 2; // Difficulty level for mining
        this.pendingTransactions = []; // List of pending transactions
        this.miningReward = 50; // Reward for mining a block

        // Initialize Bloom Filter
        this.bloomFilter = BloomFilter.create(1000, 0.01); 
    }

    /**
     * Creates the genesis block (the first block in the chain).
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        // Genesis block with no transactions
        return new Block("01/09/2009", [], "0"); 
    }

    /**
     * Retrieves the latest block in the chain.
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        // Return the last block in the chain
        return this.chain[this.chain.length - 1]; 
    }

    /**
     * Mines the pending transactions and adds a new block to the blockchain.
     * @param {string} miningRewardAddress - The address of the miner to receive the reward.
     */
    minePendingTransactions(miningRewardAddress) {
        // Create a reward transaction
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward); 
        // Add the reward transaction to pending transactions
        this.pendingTransactions.push(rewardTx); 

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash); // Create a new block
        // Mine the block
        block.mineBlock(this.difficulty); 
        console.log('Block successfully mined');

        // Add the mined block to the chain
        this.chain.push(block); 

        // Add transactions to Bloom Filter
        for (const tx of block.transactions) {
            this.bloomFilter.insert(tx.calculateHash());
        }

        this.pendingTransactions = []; // Reset the pending transactions
    }

    /**
     * Adds a new transaction to the list of pending transactions.
     * @param {Transaction} transaction - The transaction to be added.
     */
    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address');
        }
        this.pendingTransactions.push(transaction);
    }

    /**
     * Searches for a transaction in the blockchain using the Bloom Filter.
     * @param {string} hash - The hash of the transaction to search for.
     * @returns {Transaction|null} The transaction if found, or null if not found.
     */
    searchTransaction(hash) {
        // Use Bloom Filter for quick search
        if (!this.bloomFilter.test(hash)) {
            // Transaction not found
            return null; 
        }

        // If Bloom Filter indicates presence, search the chain
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.calculateHash() === hash) {
                    return tx;
                }
            }
        }
        return null;
    }
}

// Export the BlockChain, Block, and Transaction classes for use in other files
module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;