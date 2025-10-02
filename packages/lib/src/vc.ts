import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { createHash, randomBytes } from 'crypto';

export interface KYCInfo {
  type: 'aadhaar' | 'passport' | 'other';
  number: string;
  country?: string;
  expiryDate?: string;
}

export interface TripItinerary {
  arrivalDate: string;
  departureDate: string;
  destinations: string[];
  purpose?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface EntryPoint {
  type: 'airport' | 'hotel' | 'check-post' | 'other';
  name: string;
  location: string;
  timestamp: string;
}

export interface VCClaim {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  nationality: string;
  kycInfo?: KYCInfo;
  tripItinerary: TripItinerary;
  emergencyContacts: EmergencyContact[];
  entryPoint: EntryPoint;
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
    nationality: string;
    kycInfo?: KYCInfo;
    tripItinerary: TripItinerary;
    emergencyContacts: EmergencyContact[];
    entryPoint: EntryPoint;
  };
}

export class VCService {
  private issuerPrivateKey: string;
  private issuerPublicKey: string;
  private issuerId: string;
  private demoMode: boolean;

  constructor() {
    // For demo purposes, we'll generate a key pair
    // In production, this should be loaded from secure environment
    this.issuerId = 'did:web:toursafe.app';
    this.demoMode = process.env.NODE_ENV === 'development' || !process.env.VC_PRIVATE_KEY;
    
    // These would be loaded from environment variables
    this.issuerPrivateKey = process.env.VC_PRIVATE_KEY || this.generatePrivateKey();
    this.issuerPublicKey = process.env.VC_PUBLIC_KEY || this.generatePublicKey();
  }

  /**
   * Issue a new Verifiable Credential as JWT
   */
  async issueVC(claim: Omit<VCClaim, 'id' | 'issuedAt' | 'expiresAt' | 'issuer'>): Promise<{
    vcJwt: string;
    vcSha256: string;
    credential: VerifiableCredential;
  }> {
    const credentialId = `urn:uuid:${randomBytes(16).toString('hex')}`;
    const issuanceDate = new Date().toISOString();

    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://toursafe.app/contexts/v1'
      ],
      type: ['VerifiableCredential', 'TouristIdentityCredential'],
      id: credentialId,
      issuer: this.issuerId,
      issuanceDate,
      expirationDate: claim.tripItinerary.departureDate,
      credentialSubject: {
        id: `did:tourist:${randomBytes(8).toString('hex')}`,
        displayName: claim.displayName,
        email: claim.email,
        phone: claim.phone,
        nationality: claim.nationality,
        kycInfo: claim.kycInfo,
        tripItinerary: claim.tripItinerary,
        emergencyContacts: claim.emergencyContacts,
        entryPoint: claim.entryPoint
      }
    };

    // In demo mode, create a simple mock JWT
    if (this.demoMode) {
      const payload = {
        iss: this.issuerId,
        sub: credential.credentialSubject.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(new Date(claim.tripItinerary.departureDate).getTime() / 1000), // Expires on departure date
        vc: credential
      };

      // Create a simple base64-encoded mock JWT for demo
      const header = Buffer.from(JSON.stringify({ alg: 'DEMO', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = Buffer.from('demo-signature').toString('base64url');
      const vcJwt = `${header}.${payloadB64}.${signature}`;

      const vcSha256 = createHash('sha256').update(vcJwt).digest('hex');

      return {
        vcJwt,
        vcSha256,
        credential
      };
    }

    // Production mode - use actual crypto
    try {
      const privateKey = await this.getPrivateKey();
      
      const vcJwt = await new SignJWT({
        iss: this.issuerId,
        sub: credential.credentialSubject.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(new Date(claim.tripItinerary.departureDate).getTime() / 1000), // Expires on departure date
        vc: credential
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .sign(privateKey);

      const vcSha256 = createHash('sha256').update(vcJwt).digest('hex');

      return {
        vcJwt,
        vcSha256,
        credential
      };
    } catch (error) {
      console.warn('Crypto operation failed, falling back to demo mode:', error);
      // Fallback to demo mode if crypto fails
      const payload = {
        iss: this.issuerId,
        sub: credential.credentialSubject.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(new Date(claim.tripItinerary.departureDate).getTime() / 1000), // Expires on departure date
        vc: credential
      };

      const header = Buffer.from(JSON.stringify({ alg: 'DEMO', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = Buffer.from('demo-signature').toString('base64url');
      const vcJwt = `${header}.${payloadB64}.${signature}`;

      const vcSha256 = createHash('sha256').update(vcJwt).digest('hex');

      return {
        vcJwt,
        vcSha256,
        credential
      };
    }
  }

  /**
   * Verify a VC JWT
   */
  async verifyVC(vcJwt: string): Promise<{
    isValid: boolean;
    credential?: VerifiableCredential;
    error?: string;
  }> {
    try {
      // Check if this is a demo JWT
      if (vcJwt.includes('.')) {
        const [headerB64, payloadB64, signature] = vcJwt.split('.');
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
        
        if (header.alg === 'DEMO') {
          // Demo mode - just decode the payload
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
          
          if (!payload.vc) {
            return {
              isValid: false,
              error: 'No VC found in JWT payload'
            };
          }

          return {
            isValid: true,
            credential: payload.vc as VerifiableCredential
          };
        }
      }

      // Production mode - use actual crypto verification
      const publicKey = await this.getPublicKey();
      
      const { payload } = await jwtVerify(vcJwt, publicKey, {
        issuer: this.issuerId
      });

      if (!payload.vc) {
        return {
          isValid: false,
          error: 'No VC found in JWT payload'
        };
      }

      return {
        isValid: true,
        credential: payload.vc as VerifiableCredential
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Extract tourist ID from VC JWT
   */
  async extractTouristId(vcJwt: string): Promise<string | null> {
    try {
      // Check if this is a demo JWT
      if (vcJwt.includes('.')) {
        const [headerB64, payloadB64, signature] = vcJwt.split('.');
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
        
        if (header.alg === 'DEMO') {
          // Demo mode - just decode the payload
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
          return payload.sub || null;
        }
      }

      // Production mode - use actual crypto verification
      const publicKey = await this.getPublicKey();
      const { payload } = await jwtVerify(vcJwt, publicKey);
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate QR code data for VC
   */
  generateQRCodeData(vcJwt: string): string {
    return `toursafe://credential/${encodeURIComponent(vcJwt)}`;
  }

  /**
   * Check if a VC is expired
   */
  isVCExpired(vcJwt: string): boolean {
    try {
      const payload = this.extractVCPayload(vcJwt);
      if (!payload || !payload.exp) return true;

      return Date.now() / 1000 > payload.exp;
    } catch {
      return true;
    }
  }

  /**
   * Get days until VC expires
   */
  getDaysUntilExpiry(vcJwt: string): number | null {
    try {
      const payload = this.extractVCPayload(vcJwt);
      if (!payload || !payload.exp) return null;

      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const daysUntilExpiry = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

      return Math.max(0, daysUntilExpiry);
    } catch {
      return null;
    }
  }

  /**
   * Extract VC payload (for both demo and production JWTs)
   */
  private extractVCPayload(vcJwt: string): any {
    if (vcJwt.includes('.')) {
      const [headerB64, payloadB64] = vcJwt.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      if (header.alg === 'DEMO') {
        return JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      }
    }

    // For production JWTs, this would need proper verification
    // For now, return null to indicate we need full verification
    return null;
  }

  private generatePrivateKey(): string {
    // In demo mode, we don't need actual keys - return empty string
    return '';
  }

  private generatePublicKey(): string {
    // In demo mode, we don't need actual keys - return empty string
    return '';
  }

  private async getPrivateKey(): Promise<CryptoKey> {
    return await importPKCS8(this.issuerPrivateKey, 'RS256');
  }

  private async getPublicKey(): Promise<CryptoKey> {
    return await importSPKI(this.issuerPublicKey, 'RS256');
  }
}
