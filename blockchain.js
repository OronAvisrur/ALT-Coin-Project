const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec;
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
        this.timestamp = Date.now(); // Timestamp of the transaction
    }

    /**
     * Calculates the hash of the transaction.
     * @returns {string} The SHA256 hash of the transaction.
     */
    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString();
    }

    /**
     * Signs the transaction with the given signing key.
     * @param {Object} signingKey - The elliptic key pair used to sign the transaction.
     */
    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cannot sign transactions for other wallets');
        }
        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    /**
     * Validates the transaction.
     * @returns {boolean} True if the transaction is valid, false otherwise.
     */
    isValid() {
        if (this.fromAddress === null) return true; // Reward transactions are valid
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
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
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = this.calculateHash();
        this.nonce = 0;
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
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log('Block Mined: ' + this.hash + ' nonce number ' + this.nonce);
    }

    /**
     * Validates all transactions in the block.
     * @returns {boolean} True if all transactions are valid, false otherwise.
     */
    hasValidTransaction() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
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
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 5;
        this.pendingTransactions = [];
        this.miningReward = 200;
    }

    /**
     * Creates the genesis block (the first block in the chain).
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        return new Block("01/09/2009", "Genesis block", 0);
    }

    /**
     * Retrieves the latest block in the chain.
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Mines the pending transactions and adds a new block to the blockchain.
     * @param {string} miningRewardAddress - The address of the miner to receive the reward.
     */
    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);
        console.log('Block successfully mined');

        this.chain.push(block);
        this.pendingTransactions = [];
    }

    /**
     * Adds a new transaction to the list of pending transactions.
     * @param {Transaction} transaction - The transaction to be added.
     */
    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address');
        }
        if (!transaction.isValid()) {
            throw new Error('Cannot add an invalid transaction to the chain');
        }
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
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
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

            if (!currentBlock.hasValidTransaction()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

// Export the BlockChain, Block, and Transaction classes for use in other files
module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;