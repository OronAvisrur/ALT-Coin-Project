const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec;
const { MerkleTree } = require('merkletreejs'); 
const BloomFilter = require('bloom-filter'); 
const ec = new EC('secp256k1');

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString();
    }
}

class Block {
    constructor(timestamp, transactions, previousHash = "") {
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = this.calculateHash();
        this.nonce = 0;
        // Add Merkle Tree for transactions
        this.merkleTree = this.createMerkleTree(); 
    }

    calculateHash() {
        return SHA256(
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.transactions) +
            this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
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

class BlockChain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 50;

        // Initialize Bloom Filter
        this.bloomFilter = BloomFilter.create(1000, 0.01); 
    }

    createGenesisBlock() {
         // Genesis block with no transactions
        return new Block("01/09/2009", [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);

        console.log('Block successfully mined');
        this.chain.push(block);

        // Add transactions to Bloom Filter
        for (const tx of block.transactions) {
            this.bloomFilter.insert(tx.calculateHash());
        }

        this.pendingTransactions = [];
    }

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

module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;