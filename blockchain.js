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
    /**
     * Creates a new BlockChain.
     */
    constructor() {
        // Initialize the blockchain with the genesis block
        this.chain = [this.createGenesisBlock()];
        // Set the mining difficulty
        this.difficulty = 1;
        // Set the mining reward
        this.miningReward = 50;
        // Set the base fee for transactions
        this.baseFee = 2;
        // Set the miner fee for transactions
        this.minerFee = 3;
        // Path to the mempool file for storing pending transactions
        this.mempoolPath = path.join(__dirname, 'transactions.json');
    }

    /**
     * Creates the first block of the blockchain (genesis block).
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        // Return a new block with no transactions and a previous hash of "0"
        return new Block("01/09/2009", [], [], "0");
    }

    /**
     * Retrieves the most recently added block in the blockchain.
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        // Return the last block in the chain
        return this.chain[this.chain.length - 1];
    }

    /**
     * Loads the mempool from the file.
     * @returns {Object} The mempool containing pending transactions and signatures.
     */
    loadMempool() {
        try {
            // Read the mempool file and parse it as JSON
            const data = fs.readFileSync(this.mempoolPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            // Return an empty mempool if the file does not exist or is empty
            return { transactions: [], signatures: [] };
        }
    }

    /**
     * Saves the mempool to the file.
     * @param {Object} mempool - The mempool to save.
     */
    saveMempool(mempool) {
        // Write the mempool to the file as JSON
        fs.writeFileSync(this.mempoolPath, JSON.stringify(mempool, null, 2));
    }

    /**
     * Adds a transaction and its signature to the pending pool.
     * @param {Transaction} transaction - The transaction to add.
     * @param {Object} senderKey - The elliptic key pair of the sender.
     */
    addTransaction(transaction, senderKey) {
        // Ensure the transaction includes both from and to addresses
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error("Transaction must include from and to address");
        }

        // Calculate the hash of the transaction
        const hash = transaction.calculateHash();
        // Sign the transaction hash with the sender's private key
        const signature = senderKey.sign(hash, 'base64').toDER('hex');

        // Validate the transaction using the signature
        if (!transaction.isValid(signature)) {
            throw new Error("Cannot add invalid transaction to the chain");
        }

        // Get the sender's balance
        const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
        // Calculate the total cost of the transaction (amount + fees)
        const totalCost = transaction.amount + this.baseFee + this.minerFee;

        // Ensure the sender has sufficient balance for the transaction
        if (senderBalance < totalCost) {
            throw new Error("Insufficient balance for this transaction " + senderBalance + " < " + totalCost);
        }

        // Load the current mempool
        const mempool = this.loadMempool();

        // Serialize the transaction for storage in the mempool
        const txData = {
            fromAddress: transaction.fromAddress,
            toAddress: transaction.toAddress,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            hash: transaction.calculateHash()
        };

        // Add the transaction and its signature to the mempool
        mempool.transactions.push(txData);
        mempool.signatures.push(signature);

        // Save the updated mempool to the file
        this.saveMempool(mempool);
    }

    /**
     * Mines the pending transactions and creates a new block.
     * @param {string} miningRewardAddress - The address of the miner to receive the reward.
     * @returns {Block} The newly mined block.
     */
    minePendingTransactions(miningRewardAddress) {
        // Load the current mempool
        const mempool = this.loadMempool();

        // Take up to 3 transactions from the mempool
        const transactionsToMine = mempool.transactions.slice(0, 3).map(tx =>
            tx instanceof Transaction
                ? tx
                : new Transaction(tx.fromAddress, tx.toAddress, tx.amount, tx.timestamp)
        );
        // Take up to 3 signatures from the mempool
        const signaturesToInclude = mempool.signatures.slice(0, 3);

        // Calculate the total priority fees for the transactions
        let totalPriorityFees = 0;
        for (const tx of transactionsToMine) {
            totalPriorityFees += this.minerFee;
        }

        // Calculate the miner's reward (mining reward + priority fees)
        const minerReward = this.miningReward + totalPriorityFees;
        // Create a reward transaction for the miner
        const rewardTx = new Transaction(null, miningRewardAddress, minerReward);
        // Add the reward transaction to the transactions to mine
        transactionsToMine.push(rewardTx);
        // Add a null signature for the reward transaction
        signaturesToInclude.push(null);

        // Create a new block with the transactions and signatures
        const block = new Block(Date.now(), transactionsToMine, signaturesToInclude, this.getLatestBlock().hash);
        // Mine the block by solving the proof-of-work puzzle
        block.mineBlock(this.difficulty);

        console.log("Block successfully mined!");
        // Add the mined block to the blockchain
        this.chain.push(block);

        // Remove the mined transactions and signatures from the mempool
        mempool.transactions = mempool.transactions.slice(3);
        mempool.signatures = mempool.signatures.slice(3);
        // Save the updated mempool to the file
        this.saveMempool(mempool);

        return block;
    }

    /**
     * Retrieves the current balance of a specific address.
     * @param {string} address - The address to check the balance for.
     * @returns {number} The balance of the specified address.
     */
    getBalanceOfAddress(address) {
        // Initialize the balance with a starting value
        let balance = 300;

        // Process all confirmed transactions in the blockchain
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
        const mempool = this.loadMempool();
        if (mempool !== null) {
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

    /**
     * Validates the entire blockchain.
     * @returns {boolean} True if the blockchain is valid, false otherwise.
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Retrieve the full transactions for the current block
            const fullTransactions = this.getFullTransactions(currentBlock);

            // Validate the transactions and block hashes
            if (!currentBlock.hasValidTransactions(fullTransactions)) return false;
            if (currentBlock.hash !== currentBlock.calculateHash()) return false;
            if (currentBlock.previousHash !== previousBlock.hash) return false;
        }

        return true;
    }

    /**
     * Searches for a transaction in the blockchain using the Bloom Filter.
     * @param {string} hash - The hash of the transaction to search for.
     * @returns {Transaction|null} The transaction if found, or null if not found.
     */
    searchTransaction(hash) {
        for (const block of this.chain) {
            // Check if the transaction might exist in the block using the Bloom Filter
            if (block.bloomFilter.test(hash)) {
                for (const tx of block.transactions) {
                    if (tx.calculateHash() === hash) {
                        // Return the found transaction
                        return tx;
                    }
                }
            }
        }

        // Return null if the transaction is not found
        return null;
    }

    /**
     * Retrieves all pending transactions from the mempool.
     * @returns {Array<Object>} The list of pending transactions.
     */
    getPendingTransactions() {
        // Load the mempool and return the transactions
        const mempool = this.loadMempool();
        return mempool.transactions;
    }
}

/**
 * Represents a full wallet (full node) in the blockchain.
 * A full wallet maintains the entire blockchain and processes transactions.
 */
class FullWallet {
    /**
     * Creates a new FullWallet.
     * @param {string} privateKey - The private key of the wallet.
     * @param {BlockChain} blockchain - The blockchain instance associated with the wallet.
     */
    constructor(privateKey, blockchain) {
        this.key = ec.keyFromPrivate(privateKey); // Generate key pair from the private key
        this.address = this.key.getPublic('hex'); // Public key (wallet address)
        this.blockchain = blockchain; // The blockchain instance
    }

    /**
     * Creates and submits a transaction to the blockchain.
     * @param {string} toAddress - The recipient's address.
     * @param {number} amount - The amount to transfer.
     */
    makeTransaction(toAddress, amount) {
        // Create a new transaction
        const transaction = new Transaction(this.address, toAddress, amount); 
        // Add the transaction to the blockchain
        this.blockchain.addTransaction(transaction, this.key); 
    }

    /**
     * Retrieves the balance of a specific address.
     * @param {string} address - The address to check the balance for.
     * @returns {number} The balance of the specified address.
     */
    getBalanceOf(address) {
        return this.blockchain.getBalanceOfAddress(address); // Get the balance from the blockchain
    }

    /**
     * Processes a transaction received from a light wallet.
     * @param {Transaction} transaction - The transaction to process.
     * @param {Object} senderKey - The elliptic key pair of the sender.
     */
    receiveTransactionFromLightWallet(transaction, senderKey) {
        // Get the sender's balance
        const balance = this.blockchain.getBalanceOfAddress(transaction.fromAddress); 
        // Calculate the total cost (amount + fees)
        const totalCost = transaction.amount + 2 + 3; 

        if (balance < totalCost) {
            console.log(`Insufficient funds: Has ${balance}, needs ${totalCost}`);
            // Reject the transaction if the sender has insufficient funds
            return; 
        }

        // Add the transaction to the blockchain
        this.blockchain.addTransaction(transaction, senderKey); 
        console.log("Transaction from light wallet accepted.");
    }

    /**
     * Mines all pending transactions in the blockchain.
     */
    minePendingTransactions() {
        // Mine pending transactions and reward the wallet
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
 * A light wallet only stores relevant transactions and interacts with a full wallet for blockchain operations.
 */
class LightWallet {
    /**
     * Creates a new LightWallet.
     * @param {string} privateKey - The private key of the wallet.
     */
    constructor(privateKey) {
        this.key = ec.keyFromPrivate(privateKey); // Generate key pair from the private key
        this.address = this.key.getPublic('hex'); // Public key (wallet address)
        this.transactions = []; // Stores only relevant transactions
    }

    /**
     * Sends a transaction via a full wallet.
     * @param {string} toAddress - The recipient's address.
     * @param {number} amount - The amount to transfer.
     * @param {FullWallet} fullWallet - The full wallet to process the transaction.
     */
    sendTransactionViaFullWallet(toAddress, amount, fullWallet) {
        // Create a new transaction
        const transaction = new Transaction(this.address, toAddress, amount); 
        // Send the transaction to the full wallet
        fullWallet.receiveTransactionFromLightWallet(transaction, this.key); 
    }

    /**
     * Synchronizes a transaction with the light wallet.
     * @param {Transaction} transaction - The transaction to sync.
     */
    syncTransaction(transaction) {
        // Add the transaction to the wallet's transaction list
        this.transactions.push(transaction); 
    }

    /**
     * Checks if a specific transaction exists in the wallet.
     * @param {Transaction} transaction - The transaction to check.
     * @returns {boolean} True if the transaction exists, false otherwise.
     */
    hasTransaction(transaction) {
        for (const tx of this.transactions) {
            if (tx.calculateHash() === transaction.calculateHash()) {
                // Transaction found
                return true; 
            }
        }
        // Transaction not found
        return false; 
    }

    /**
     * Validates all transactions in the light wallet against the full wallet's blockchain.
     * @param {FullWallet} fullWallet - The full wallet to validate against.
     * @returns {boolean} True if all transactions are valid, false otherwise.
     */
    valideteWalletTransactions(fullWallet) {
        // Load the mempool from the full wallet
        const signaturePool = fullWallet.blockchain.loadMSignatures(); 

        for (const tx of this.transactions) {
            // Find the transaction signature
            const txSignature = signaturePool.signatures.find(sig => sig === tx.calculateHash()); 

            // Check if the transaction is valid in the full wallet's blockchain
            if (!tx.isValid(txSignature)) {
                // Invalid transaction found
                return false; 
            }
        }

        // All transactions are valid
        return true; 
    }
}

module.exports.BlockChain = BlockChain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
module.exports.FullWallet = FullWallet;
module.exports.LightWallet = LightWallet;