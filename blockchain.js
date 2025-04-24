const SHA256 = require("crypto-js/sha256");

/**
 * Represents a single block in the blockchain.
 */
class Block {
    /**
     * Creates a new Block.
     * @param {number} index - The index of the block in the chain.
     * @param {string} timestamp - The timestamp of when the block was created.
     * @param {Object} data - The data stored in the block.
     * @param {string} [previousHash=""] - The hash of the previous block in the chain.
     */
    constructor(index, timestamp, data, previousHash = "") {
        this.index = index; // Index of the block in the chain
        this.previousHash = previousHash; // Hash of the previous block
        this.timestamp = timestamp; // Timestamp of block creation
        this.data = data; // Data stored in the block
        this.hash = this.calculateHash(); // Hash of the current block
    }

    /**
     * Calculates the hash of the block using its properties.
     * @returns {string} The SHA256 hash of the block.
     */
    calculateHash() {
        return SHA256(
            this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)
        ).toString();
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
    }

    /**
     * Creates the genesis block (the first block in the chain).
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        return new Block(0, "01/09/2009", "Genesis block", 0); // Hardcoded genesis block
    }

    /**
     * Retrieves the latest block in the chain.
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1]; // Return the last block in the chain
    }

    /**
     * Adds a new block to the blockchain.
     * @param {Block} newBlock - The new block to be added.
     */
    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash; // Set the previous hash to the hash of the latest block
        newBlock.hash = newBlock.calculateHash(); // Calculate the hash of the new block
        this.chain.push(newBlock); // Add the new block to the chain
    }
}

// Export the BlockChain and Block classes for use in other files
module.exports.BlockChain = BlockChain;
module.exports.Block = Block;