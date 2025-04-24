const SHA256 = require("crypto-js/sha256");

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
            this.nonce++; // Increment the nonce until the hash meets the difficulty
            this.hash = this.calculateHash(); // Recalculate the hash
        }
        console.log('Block Mined: ' + this.hash + ' nonce number ' + this.nonce);
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
        this.difficulty = 5; // Difficulty level for mining
        this.pendingTransactions = []; // List of pending transactions
        this.miningReward = 200; // Reward for mining a block
    }

    /**
     * Creates the genesis block (the first block in the chain).
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        return new Block("01/09/2009", "Genesis block", 0); // Hardcoded genesis block
    }

    /**
     * Retrieves the latest block in the chain.
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1]; // Return the last block in the chain
    }

    /**
     * Mines the pending transactions and adds a new block to the blockchain.
     * @param {string} miningRewardAddress - The address of the miner to receive the reward.
     */
    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward); // Create a reward transaction
        this.pendingTransactions.push(rewardTx); // Add the reward transaction to pending transactions

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash); // Create a new block
        block.mineBlock(this.difficulty); // Mine the block
        console.log('Block successfully mined');

        this.chain.push(block); // Add the mined block to the chain
        this.pendingTransactions = []; // Reset the pending transactions
    }

    /**
     * Adds a new transaction to the list of pending transactions.
     * @param {Transaction} transaction - The transaction to be added.
     */
    createTransaction(transaction) {
        this.pendingTransactions.push(transaction);
    }

    /**
     * Retrieves the balance of a specific address.
     * @param {string} address - The address to check the balance for.
     * @returns {number} The balance of the address.
     */
    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount; // Deduct the amount sent
                }
                if (trans.toAddress === address) {
                    balance += trans.amount; // Add the amount received
                }
            }
        }

        return balance;
    }

    /**
     * Validates the blockchain by checking the hashes and links between blocks.
     * @returns {boolean} True if the blockchain is valid, false otherwise.
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Check if the current block's hash is valid
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            // Check if the current block's previous hash matches the previous block's hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true; // Blockchain is valid
    }
}

// Export the BlockChain, Block, and Transaction classes for use in other files
module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;