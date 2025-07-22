import { ethers } from 'ethers';
import { SAFE_TX_POOL_REGISTRY_ABI, NETWORK_CONFIGS, isSafeTxPoolRegistryConfigured, getSafeTxPoolRegistryAddress } from '../contracts/abis';
import { getProviderForNetwork } from '../utils/ens';

export interface SafeMessagePoolMessage {
  messageHash: string;
  safe: string;
  message: string;
  proposer: string;
  msgId: number;
  dAppTopic: string;
  dAppRequestId: number;
  signatures: Array<{ signature: string; signer: string }>;
}

export class SafeMessagePoolService {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private contract?: ethers.Contract;
  private network: string;

  constructor(network: string) {
    this.network = network;
    this.provider = getProviderForNetwork(network);
    this.initializeContract();
  }

  private initializeContract(): void {
    if (!isSafeTxPoolRegistryConfigured(this.network)) {
      console.warn(`SafeTxPoolRegistry not configured for network: ${this.network}`);
      return;
    }

    const contractAddress = getSafeTxPoolRegistryAddress(this.network);
    this.contract = new ethers.Contract(
      contractAddress,
      SAFE_TX_POOL_REGISTRY_ABI,
      this.provider
    );
  }

  /**
   * Set the signer for transaction operations
   */
  setSigner(signer: ethers.Signer): void {
    this.signer = signer;
    if (this.contract) {
      this.contract = this.contract.connect(signer);
    }
  }

  /**
   * Generate Safe message hash for EIP-1271 signing (compliant with Safe wallet format)
   *
   * This implementation follows the official Safe wallet EIP-712 message format:
   * - Type: "SafeMessage(bytes message)"
   * - Type Hash: 0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca
   * - Domain: EIP712Domain(uint256 chainId,address verifyingContract)
   * - Final Hash: keccak256("\x19\x01" + domainSeparator + structHash)
   *
   * @param safeAddress The Safe contract address
   * @param message The message to be signed
   * @param chainId The chain ID where the Safe is deployed
   * @returns The Safe-compliant message hash
   */
  generateSafeMessageHash(safeAddress: string, message: string, chainId: number): string {
    // Safe message type hash: keccak256("SafeMessage(bytes message)")
    // This is the correct and verified type hash used by Safe wallets
    const SAFE_MSG_TYPEHASH = '0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca';

    console.log('🔐 Generating Safe message hash...');
    console.log('📋 Safe address:', safeAddress);
    console.log('📋 Message:', message);
    console.log('📋 Chain ID:', chainId);
    console.log('📋 Type hash:', SAFE_MSG_TYPEHASH);

    // EIP-712 domain separator for the Safe (using Safe's domain format)
    const domainSeparator = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint256', 'address'],
        [
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EIP712Domain(uint256 chainId,address verifyingContract)')),
          chainId,
          safeAddress
        ]
      )
    );

    console.log('📋 Domain separator:', domainSeparator);

    // Safe message struct hash (using Safe's format)
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const messageHash = ethers.utils.keccak256(messageBytes);
    const safeMessageStructHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32'],
        [SAFE_MSG_TYPEHASH, messageHash]
      )
    );

    console.log('📋 Message hash:', messageHash);
    console.log('📋 Struct hash:', safeMessageStructHash);

    // Final Safe message hash (EIP-712 format compatible with Safe wallet)
    const finalHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ['string', 'bytes32', 'bytes32'],
        ['\x19\x01', domainSeparator, safeMessageStructHash]
      )
    );

    console.log('✅ Final Safe message hash:', finalHash);
    return finalHash;
  }

  /**
   * Propose a message for signing
   */
  async proposeMessage(params: {
    safe: string;
    message: string;
    dAppTopic: string;
    dAppRequestId: number;
  }, chainId: number): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    console.log('🔐 Proposing Safe message for signing...');
    console.log('📋 Message params:', params);

    // Generate message hash
    const messageHash = this.generateSafeMessageHash(params.safe, params.message, chainId);
    console.log('📋 Generated message hash:', messageHash);

    // Convert message to bytes
    const messageBytes = ethers.utils.toUtf8Bytes(params.message);

    try {
      const tx = await this.contract.proposeMessage(
        messageHash,
        params.safe,
        messageBytes,
        params.dAppTopic,
        params.dAppRequestId
      );

      console.log('📋 Message proposal transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Message proposed successfully');

      return messageHash;
    } catch (error: any) {
      console.error('❌ Error proposing message:', error);
      throw new Error(`Failed to propose message: ${error.message}`);
    }
  }

  /**
   * Sign a proposed message
   */
  async signMessage(messageHash: string, signature: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    console.log('✍️ Signing message in pool...');
    console.log('📋 Message hash:', messageHash);
    console.log('📋 Signature:', signature);

    try {
      const tx = await this.contract.signMessage(messageHash, signature);
      console.log('📋 Message signing transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Message signed successfully');
    } catch (error: any) {
      console.error('❌ Error signing message:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Mark a message as executed
   */
  async markMessageAsExecuted(messageHash: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.markMessageAsExecuted(messageHash);
      await tx.wait();
      console.log('✅ Message marked as executed');
    } catch (error: any) {
      console.error('❌ Error marking message as executed:', error);
      throw new Error(`Failed to mark message as executed: ${error.message}`);
    }
  }

  /**
   * Get message details
   */
  async getMessageDetails(messageHash: string): Promise<SafeMessagePoolMessage | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await this.contract.getMessageDetails(messageHash);
      const [safe, messageBytes, proposer, msgId, dAppTopic, dAppRequestId] = result;

      if (proposer === ethers.constants.AddressZero) {
        return null; // Message not found
      }

      // Get signatures
      const signatures = await this.contract.getMessageSignatures(messageHash);
      
      // Convert signatures to the expected format
      const formattedSignatures = signatures.map((sig: string, index: number) => ({
        signature: sig,
        signer: `signer_${index}` // We'd need to recover the actual signer address
      }));

      return {
        messageHash,
        safe,
        message: ethers.utils.toUtf8String(messageBytes),
        proposer,
        msgId: msgId.toNumber(),
        dAppTopic,
        dAppRequestId: dAppRequestId.toNumber(),
        signatures: formattedSignatures
      };
    } catch (error: any) {
      console.error('❌ Error getting message details:', error);
      return null;
    }
  }

  /**
   * Get pending messages for a Safe
   */
  async getPendingMessages(safeAddress: string): Promise<SafeMessagePoolMessage[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const messageHashes = await this.contract.getPendingMessages(safeAddress);
      const messages: SafeMessagePoolMessage[] = [];

      for (const messageHash of messageHashes) {
        const messageDetails = await this.getMessageDetails(messageHash);
        if (messageDetails) {
          messages.push(messageDetails);
        }
      }

      return messages;
    } catch (error: any) {
      console.error('❌ Error getting pending messages:', error);
      return [];
    }
  }

  /**
   * Get all messages for a Safe (including executed ones for history)
   */
  async getAllMessages(safeAddress: string): Promise<SafeMessagePoolMessage[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const messageHashes = await this.contract.getAllMessages(safeAddress);
      const messages: SafeMessagePoolMessage[] = [];

      for (const messageHash of messageHashes) {
        const messageDetails = await this.getMessageDetails(messageHash);
        if (messageDetails) {
          messages.push(messageDetails);
        }
      }

      return messages;
    } catch (error: any) {
      console.error('❌ Error getting all messages:', error);
      return [];
    }
  }

  /**
   * Check if an address has signed a message
   */
  async hasSignedMessage(messageHash: string, signerAddress: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      return await this.contract.hasSignedMessage(messageHash, signerAddress);
    } catch (error: any) {
      console.error('❌ Error checking message signature:', error);
      return false;
    }
  }

  /**
   * Get signature count for a message
   */
  async getMessageSignatureCount(messageHash: string): Promise<number> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const count = await this.contract.getMessageSignatureCount(messageHash);
      return count.toNumber();
    } catch (error: any) {
      console.error('❌ Error getting message signature count:', error);
      return 0;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageHash: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.deleteMessage(messageHash);
      await tx.wait();
      console.log('✅ Message deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}
