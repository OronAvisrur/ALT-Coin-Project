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
        this.signature = null; 
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
        // Signature stored separately for SegWit
        this.signature = sig.toDER('hex'); 
    }

    /**
     * Validates the transaction.
     * @returns {boolean} True if the transaction is valid, false otherwise.
     */
    isValid() {
        if (this.fromAddress === null) return true;
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
        this.previousHash = previousHash; // Hash of the previous block
        this.timestamp = timestamp; // Timestamp of block creation
        this.transactions = transactions; // Transactions included in the block
        this.hash = this.calculateHash(); // Hash of the current block
        this.nonce = 0; // Nonce used for mining
        this.merkleTree = this.createMerkleTree(); // Add Merkle Tree for transactions
        this.witnessData = this.extractWitnessData(); // SegWit: Store witness data separately
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
     * Validates all transactions in the block.
     * @returns {boolean} True if all transactions are valid, false otherwise.
     */
    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
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

    /**
     * Extracts witness data (signatures) from transactions for SegWit.
     * @returns {Array<string|null>} List of signatures or null for unsigned transactions.
     */
    extractWitnessData() {
        return this.transactions.map(tx => tx.signature || null);
    }

    /**
     * Retrieves the witness data (signatures) stored in the block.
     * @returns {Array<string|null>} List of signatures or null for unsigned transactions.
     */
    getWitnessData() {
        return this.witnessData;
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
        this.baseFee = 2; // Base fee for burning
        this.minerFee = 3; // Miner reward fee

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

        // Create a new block
        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash); 
         // Mine the block
        block.mineBlock(this.difficulty);
        console.log('Block successfully mined');

        // Add the mined block to the chain
        this.chain.push(block); 

        // Add transactions to Bloom Filter
        for (const tx of block.transactions) {
            this.bloomFilter.insert(tx.calculateHash());
        }
        
        // Reset the pending transactions
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
            throw new Error('Cannot add invalid transaction to the chain');
        }

        // Verify sender has enough balance
        const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
        const totalCost = transaction.amount + this.baseFee + this.minerFee;
        if (senderBalance < totalCost) {
            throw new Error('Insufficient balance for this transaction');
        }

        // Take off base fee and miner fee from sender's balance
        transaction.amount -= this.baseFee; // Burn base fee
        console.log(`Base fee of ${this.baseFee} coins burned.`);

        this.pendingTransactions.push(transaction);
    }

    /**
     * Retrieves the balance of a specific address.
     * @param {string} address - The address to check the balance for.
     * @returns {number} The balance of the address.
     */
    getBalanceOfAddress(address) {
        let balance = 300; 
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    
                    balance -= trans.amount + this.baseFee + this.minerFee; 
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

            if (!currentBlock.hasValidTransactions()) {
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

/**
 * Represents a full wallet (full node) in the blockchain.
 */
class FullWallet {
     /**
     * Creates a new FullWallet.
     * @param {string} privateKey - The private key of the wallet.
     */
    constructor(privateKey) {
        this.key = ec.keyFromPrivate(privateKey);
        this.address = this.key.getPublic('hex');
        this.blockchain = new BlockChain(); // Full blockchain
    }

     /**
     * Creates a new transaction from this wallet.
     * @param {string} toAddress - The recipient's address.
     * @param {number} amount - The amount to transfer.
     */
    createTransaction(toAddress, amount) {
        const tx = new Transaction(this.address, toAddress, amount);
        tx.signTransaction(this.key);
        this.blockchain.addTransaction(tx);
    }

    /**
     * Mines the pending transactions in the blockchain.
     */
    mineTransactions() {
        this.blockchain.minePendingTransactions(this.address);
    }

    /**
     * Retrieves the balance of this wallet.
     * @returns {number} The balance of the wallet.
     */
    getBalance() {
        return this.blockchain.getBalanceOfAddress(this.address);
    }
}

/**
 * Represents a light wallet in the blockchain.
 * A light wallet only stores relevant transactions and does not maintain the full blockchain.
 */
class LightWallet {
    /**
     * Creates a new LightWallet.
     * @param {string} privateKey - The private key of the wallet.
     */
    constructor(privateKey) {
        this.key = ec.keyFromPrivate(privateKey); 
        this.address = this.key.getPublic('hex'); 
        this.transactions = []; 
    }

    /**
     * Receives a transaction and stores it if it is relevant to this wallet.
     * @param {Transaction} transaction - The transaction to be received.
     */
    receiveTransaction(transaction) {
        if (transaction.toAddress === this.address || transaction.fromAddress === this.address) {
            // Store the transaction if it involves this wallet
            this.transactions.push(transaction); 
        }
    }

    /**
     * Retrieves the balance of this wallet based on stored transactions.
     * @returns {number} The balance of the wallet.
     */
    getBalance() {
        let balance = 0;

        for (const tx of this.transactions) {
            if (tx.toAddress === this.address) {
                // Add received amount
                balance += tx.amount; 
            }
            if (tx.fromAddress === this.address) {
                // Take off sent amount and fees (base fee + miner fee)
                balance -= tx.amount + 2 + 3; 
            }
        }

        return balance;
    }

    /**
     * Creates a new transaction from this wallet.
     * @param {string} toAddress - The recipient's address.
     * @param {number} amount - The amount to transfer.
     * @returns {Transaction} The signed transaction.
     */
    createTransaction(toAddress, amount) {
        // Create a new transaction
        const tx = new Transaction(this.address, toAddress, amount); 
        // Sign the transaction with the wallet's private key
        tx.signTransaction(this.key); 
        // Return the signed transaction
        return tx; 
    }
}

module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
module.exports.FullWallet = FullWallet;
module.exports.LightWallet = LightWallet;