import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as IssuePost } from '../vc/issue/route';
import { POST as VerifyPost } from '../vc/verify/route';

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    insert: vi.fn(() => Promise.resolve({
      data: { id: 'tourist-uuid' },
      error: null
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { chain_tx_hash: '0x123', display_name: 'Test User', active: true },
          error: null
        }))
      }))
    })) as any
  }))
};

// Mock ChainService
const mockChainService = {
  anchorVC: vi.fn(() => Promise.resolve({
    vcSha256: 'test-hash',
    txHash: '0x123',
    blockNumber: 12345,
    timestamp: new Date()
  })),
  verifyVC: vi.fn(() => Promise.resolve({
    onChainProof: {
      matched: true,
      blockNumber: 12345,
      timestamp: new Date()
    }
  }))
};

describe('VC Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    global.supabaseAdmin = mockSupabaseAdmin;
  });

  describe('POST /api/v1/vc/issue', () => {
    it('should issue a valid VC', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          displayName: 'Test Tourist',
          emergencyContact: '+1234567890'
        })
      };

      // Mock successful blockchain anchoring
      mockChainService.anchorVC.mockResolvedValue({
        vcSha256: 'test-hash',
        txHash: '0x123',
        blockNumber: 12345,
        timestamp: new Date()
      });

      const response = await IssuePost(mockRequest as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.vcJwt).toBeDefined();
      expect(data.vcSha256).toBeDefined();
      expect(data.chainTxHash).toBe('0x123');
    });

    it('should require display name', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          emergencyContact: '+1234567890'
        })
      };

      const response = await IssuePost(mockRequest as any);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/vc/verify', () => {
    it('should verify a valid VC', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          vcJwt: 'test.jwt.token'
        })
      };

      // Mock database lookup
      mockSupabaseAdmin.from.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({
          data: { id: 'tourist-uuid' },
          error: null
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                chain_tx_hash: '0x123',
                display_name: 'Test Tourist',
                active: true
              },
              error: null
            }))
          }))
        }))
      });

      // Mock blockchain verification
      mockChainService.verifyVC.mockResolvedValue({
        onChainProof: {
          matched: true,
          blockNumber: 12345,
          timestamp: new Date()
        }
      });

      const response = await IssuePost(mockRequest as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.onChainProof.matched).toBe(true);
    });

    it('should handle invalid VC', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          vcJwt: 'invalid.jwt.token'
        })
      };

      const response = await IssuePost(mockRequest as any);
      expect(response.status).toBe(400);
    });
  });
});

// Import the actual handlers
import { POST as IssuePOST } from '../vc/issue/route';
import { POST as VerifyPOST } from '../vc/verify/route';
