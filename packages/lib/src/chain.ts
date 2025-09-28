import { ethers } from 'ethers';
import { createHash } from 'crypto';

export interface ChainConfig {
  rpcUrl: string;
  privateKey: string;
}

export interface VCAnchor {
  vcSha256: string;
  txHash: string;
  blockNumber?: number;
  timestamp?: Date;
}

export class ChainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(config: ChainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  /**
   * Generate SHA256 hash of VC JWT
   */
  static hashVC(vcJwt: string): string {
    return createHash('sha256').update(vcJwt).digest('hex');
  }

  /**
   * Anchor a VC hash on chain by sending a transaction with the hash in the data field
   */
  async anchorVC(vcJwt: string): Promise<VCAnchor> {
    const vcSha256 = ChainService.hashVC(vcJwt);
    
    // Create transaction with hash as data
    const tx = await this.wallet.sendTransaction({
      to: this.wallet.address, // Self-transaction
      value: ethers.parseEther('0'), // No value transfer
      data: '0x' + Buffer.from(`TOURSAFE_VC:${vcSha256}`, 'utf8').toString('hex')
    });

    const receipt = await tx.wait();
    
    return {
      vcSha256,
      txHash: receipt!.hash,
      blockNumber: receipt!.blockNumber,
      timestamp: new Date()
    };
  }

  /**
   * Verify a VC against on-chain proof
   */
  async verifyVC(vcJwt: string, expectedTxHash: string): Promise<{
    isValid: boolean;
    onChainProof: {
      txHash: string;
      matched: boolean;
      blockNumber?: number;
      timestamp?: Date;
    };
  }> {
    try {
      const vcSha256 = ChainService.hashVC(vcJwt);
      const tx = await this.provider.getTransaction(expectedTxHash);
      
      if (!tx) {
        return {
          isValid: false,
          onChainProof: {
            txHash: expectedTxHash,
            matched: false
          }
        };
      }

      // Extract hash from transaction data
      const dataHex = tx.data;
      const dataBuffer = Buffer.from(dataHex.slice(2), 'hex');
      const dataString = dataBuffer.toString('utf8');
      
      const matched = dataString === `TOURSAFE_VC:${vcSha256}`;
      
      // Get block info for timestamp
      let timestamp: Date | undefined;
      if (tx.blockNumber) {
        const block = await this.provider.getBlock(tx.blockNumber);
        timestamp = block ? new Date(block.timestamp * 1000) : undefined;
      }

      return {
        isValid: matched,
        onChainProof: {
          txHash: expectedTxHash,
          matched,
          blockNumber: tx.blockNumber || undefined,
          timestamp
        }
      };
    } catch (error) {
      console.error('Error verifying VC on chain:', error);
      return {
        isValid: false,
        onChainProof: {
          txHash: expectedTxHash,
          matched: false
        }
      };
    }
  }

  /**
   * Anchor incident hash on chain
   */
  async anchorIncident(incidentId: string, incidentData: any): Promise<VCAnchor> {
    const incidentString = JSON.stringify({ id: incidentId, ...incidentData });
    const incidentSha256 = createHash('sha256').update(incidentString).digest('hex');
    
    const tx = await this.wallet.sendTransaction({
      to: this.wallet.address,
      value: ethers.parseEther('0'),
      data: '0x' + Buffer.from(`TOURSAFE_INCIDENT:${incidentSha256}`, 'utf8').toString('hex')
    });

    const receipt = await tx.wait();
    
    return {
      vcSha256: incidentSha256, // Reusing field name for consistency
      txHash: receipt!.hash,
      blockNumber: receipt!.blockNumber,
      timestamp: new Date()
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }
}
