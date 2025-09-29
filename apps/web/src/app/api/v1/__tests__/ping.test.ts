import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { id: 1, ts: new Date().toISOString() },
          error: null
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({
      data: [],
      error: null
    }))
  })),
  channel: vi.fn(() => ({
    send: vi.fn(() => Promise.resolve())
  }))
};

// Mock environment
process.env.AI_SERVICE_URL = 'http://localhost:8000';

// Mock fetch for AI service
global.fetch = vi.fn();

describe('POST /api/v1/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    global.supabaseAdmin = mockSupabaseAdmin;
  });

  it('should accept valid ping data', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        tourist_id: '33333333-3333-3333-3333-333333333333',
        lat: 18.92,
        lng: 72.83,
        speed: 1.0,
        bearing: 45
      })
    };

    // Mock successful database operations
    mockSupabaseAdmin.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 1, ts: new Date().toISOString() },
            error: null
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({
        data: [],
        error: null
      }))
    });

    // Mock AI service response
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({
        verdict: 'OK',
        score: 0.1,
        reason: 'Normal movement pattern'
      }), { status: 200, statusText: 'OK' }))
    ) as any;

    const response = await POST(mockRequest as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ping).toBeDefined();
    expect(data.zonesHit).toBeDefined();
  });

  it('should handle geofence violations', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        tourist_id: '33333333-3333-3333-3333-333333333333',
        lat: 18.9250, // Restricted zone coordinate
        lng: 72.8380,
        speed: 1.0,
        bearing: 45
      })
    };

    // Mock geofence detection
    mockSupabaseAdmin.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 1, ts: new Date().toISOString() },
            error: null
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({
        data: [
          { zone_id: '1', zone_name: 'Test Restricted Zone', zone_type: 'RESTRICTED' }
        ] as any,
        error: null
      }))
    });

    const response = await POST(mockRequest as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.zonesHit).toHaveLength(1);
    expect(data.zonesHit[0].type).toBe('RESTRICTED');
    expect(data.incidentCreated).toBeDefined();
  });

  it('should validate input data', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        tourist_id: 'invalid-uuid',
        lat: 91, // Invalid latitude
        lng: 72.83
      })
    };

    const response = await POST(mockRequest as any);
    expect(response.status).toBe(400);
  });
});

// Import the actual handler
import { POST } from '../ping/route';
