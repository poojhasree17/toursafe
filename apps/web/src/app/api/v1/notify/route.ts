import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
  sendNotificationToTourist,
  sendNotificationToOperators,
  NotificationTemplates,
  NotificationPayload
} from '../../../../lib/notifications';

const RegisterTokenSchema = z.object({
  token: z.string(),
  platform: z.enum(['web', 'android', 'ios']),
  touristId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

const SendNotificationSchema = z.object({
  type: z.enum(['tourist', 'operators']),
  touristId: z.string().uuid().optional(), // Required for tourist notifications
  template: z.enum(['RESTRICTED_ZONE_WARNING', 'IMMOBILE_WARNING', 'NEW_INCIDENT', 'SOS_ALERT']),
  custom: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    tag: z.string().optional(),
  }).optional(),
});

// POST /api/v1/notify/register - Register device token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, platform, touristId, userId } = RegisterTokenSchema.parse(body);

    // Validate that either touristId or userId is provided
    if (!touristId && !userId) {
      return NextResponse.json(
        { error: 'Either touristId or userId must be provided' },
        { status: 400 }
      );
    }

    // Check if token already exists
    const { data: existing } = await supabaseAdmin
      .from('device_tokens')
      .select('id')
      .eq(touristId ? 'tourist_id' : 'user_id', touristId || userId)
      .eq('token', token)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Token already registered' });
    }

    // Insert or update device token
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .upsert({
        tourist_id: touristId || null,
        user_id: userId || null,
        token,
        platform,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'token'
      });

    if (error) {
      console.error('Error registering device token:', error);
      return NextResponse.json(
        { error: 'Failed to register device token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Device token registered successfully' });

  } catch (error) {
    console.error('Error in notification register endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    );
  }
}

// GET /api/v1/notify/templates - Get available notification templates
export async function GET() {
  return NextResponse.json({
    templates: Object.keys(NotificationTemplates).map(key => ({
      id: key,
      ...NotificationTemplates[key as keyof typeof NotificationTemplates],
    }))
  });
}
