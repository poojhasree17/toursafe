import { z } from 'zod';

// Common types
export const ZoneType = z.enum(['SAFE', 'RESTRICTED', 'ALERT']);
export const IncidentType = z.enum(['SOS', 'IMMOBILE', 'RESTRICTED', 'DEVIATION']);
export const IncidentSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const IncidentStatus = z.enum(['OPEN', 'ACK', 'CLOSED']);
export const UserRole = z.enum(['ADMIN', 'OPERATOR']);

// Database schemas
export const TouristSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  vc_jwt: z.string(),
  vc_sha256: z.string(),
  chain_tx_hash: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  lang: z.string().default('en'),
  active: z.boolean().default(true),
  created_at: z.string()
});

export const ZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: ZoneType,
  polygon_geojson: z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(z.array(z.number()))))
  }),
  created_by: z.string().uuid().nullable(),
  created_at: z.string()
});

export const PingSchema = z.object({
  id: z.number(),
  tourist_id: z.string().uuid(),
  ts: z.string(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().nullable(),
  bearing: z.number().nullable()
});

export const IncidentSchema = z.object({
  id: z.string().uuid(),
  tourist_id: z.string().uuid().nullable(),
  type: IncidentType,
  severity: IncidentSeverity,
  ts: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  status: IncidentStatus,
  responder: z.string().uuid().nullable(),
  chain_tx_hash: z.string().nullable(),
  meta: z.record(z.any()).default({})
});

export const AppUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRole,
  created_at: z.string()
});

// API Schemas
export const CreatePingSchema = z.object({
  tourist_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  bearing: z.number().min(0).max(360).optional()
});

export const CreateIncidentSchema = z.object({
  tourist_id: z.string().uuid(),
  type: IncidentType,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  severity: IncidentSeverity.optional().default('MEDIUM')
});

export const UpdateIncidentSchema = z.object({
  status: IncidentStatus.optional(),
  responder: z.string().uuid().optional()
});

export const CreateZoneSchema = z.object({
  name: z.string().min(1),
  type: ZoneType,
  polygon_geojson: z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(z.array(z.number()))))
  })
});

export const IssueVCSchema = z.object({
  displayName: z.string().min(1),
  emergencyContact: z.string().optional()
});

export const VerifyVCSchema = z.object({
  vcJwt: z.string()
});

// AI Service schemas
export const AIPingSchema = z.object({
  ts: z.string(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().nullable(),
  bearing: z.number().nullable()
});

export const AIScoreRequestSchema = z.object({
  pings: z.array(AIPingSchema).min(1)
});

export const AIScoreResponseSchema = z.object({
  verdict: z.enum(['OK', 'IMMOBILE', 'DEVIATION']),
  score: z.number().min(0).max(1),
  reason: z.string()
});

// Type exports
export type Tourist = z.infer<typeof TouristSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Ping = z.infer<typeof PingSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type AppUser = z.infer<typeof AppUserSchema>;
export type CreatePing = z.infer<typeof CreatePingSchema>;
export type CreateIncident = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncident = z.infer<typeof UpdateIncidentSchema>;
export type CreateZone = z.infer<typeof CreateZoneSchema>;
export type IssueVC = z.infer<typeof IssueVCSchema>;
export type VerifyVC = z.infer<typeof VerifyVCSchema>;
export type AIPing = z.infer<typeof AIPingSchema>;
export type AIScoreRequest = z.infer<typeof AIScoreRequestSchema>;
export type AIScoreResponse = z.infer<typeof AIScoreResponseSchema>;
