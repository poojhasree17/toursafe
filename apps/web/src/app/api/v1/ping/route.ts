import { NextRequest, NextResponse } from 'next/server';
import { CreatePingSchema, type Ping } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
  sendNotificationToTourist,
  sendNotificationToOperators,
  NotificationTemplates
} from '../../../../lib/notifications';

// Type for zone intersection result from RPC
type ZoneIntersection = {
  zone_id: string;
  zone_name: string;
  zone_type: 'SAFE' | 'RESTRICTED' | 'ALERT';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourist_id, lat, lng, speed, bearing } = CreatePingSchema.parse(body);

    // Insert the ping
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .insert({
        tourist_id,
        lat,
        lng,
        speed: speed || null,
        bearing: bearing || null,
        ts: new Date().toISOString()
      })
      .select()
      .single();

    if (pingError) {
      console.error('Ping insertion failed:', pingError);
      throw new Error('Failed to record ping');
    }

    // Check for geofence intersections
    const { data: zones, error: zoneError } = await supabaseAdmin
      .rpc('get_intersecting_zones', { lat, lng });

    if (zoneError) {
      console.error('Zone intersection check failed:', zoneError);
    }

    const zonesHit = zones || [];
    
    // Check for restricted zones and create incidents
    let incidentCreated = null;
    const restrictedZones = zonesHit.filter((z: ZoneIntersection) => z.zone_type === 'RESTRICTED');
    
    if (restrictedZones.length > 0) {
      const restrictedZone = restrictedZones[0];
      
      // Create a RESTRICTED incident
      const { data: incident, error: incidentError } = await supabaseAdmin
        .from('incidents')
        .insert({
          tourist_id,
          type: 'RESTRICTED',
          severity: 'MEDIUM',
          lat,
          lng,
          status: 'OPEN',
          meta: {
            zone_id: restrictedZone.zone_id,
            zone_name: restrictedZone.zone_name,
            auto_generated: true
          }
        })
        .select()
        .single();

      if (incidentError) {
        console.error('Incident creation failed:', incidentError);
      } else {
        incidentCreated = incident;

        // Send notification to tourist about restricted zone
        await sendNotificationToTourist(
          tourist_id,
          NotificationTemplates.RESTRICTED_ZONE_WARNING
        );

        // Send notification to operators about new incident
        await sendNotificationToOperators({
          ...NotificationTemplates.NEW_INCIDENT,
          body: `Tourist entered restricted zone. Incident #${incident.id} created.`,
          data: {
            incidentId: incident.id,
            touristId: tourist_id,
            type: 'RESTRICTED'
          }
        });

        // Publish to realtime channel for dashboard
        await supabaseAdmin
          .channel('incidents')
          .send({
            type: 'broadcast',
            event: 'new_incident',
            payload: incident
          });
      }
    }

    // Get recent pings for AI analysis
    const { data: recentPings, error: recentError } = await supabaseAdmin
      .rpc('get_recent_pings', {
        tourist_uuid: tourist_id,
        minutes_back: 10
      });

    if (!recentError && recentPings && recentPings.length >= 5) {
      // Call AI service for anomaly detection
      try {
        const aiResponse = await fetch(process.env.AI_SERVICE_URL || 'http://localhost:8000/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pings: recentPings.map((p: Ping) => ({
              ts: p.ts,
              lat: p.lat,
              lng: p.lng,
              speed: p.speed,
              bearing: p.bearing
            }))
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          
          // Create incidents for AI-detected anomalies
          if (aiResult.verdict !== 'OK' && !incidentCreated) {
            const { data: aiIncident, error: aiIncidentError } = await supabaseAdmin
              .from('incidents')
              .insert({
                tourist_id,
                type: aiResult.verdict, // 'IMMOBILE' or 'DEVIATION'
                severity: aiResult.score > 0.7 ? 'HIGH' : 'MEDIUM',
                lat,
                lng,
                status: 'OPEN',
                meta: {
                  ai_score: aiResult.score,
                  ai_reason: aiResult.reason,
                  auto_generated: true
                }
              })
              .select()
              .single();

            if (aiIncidentError) {
              console.error('AI incident creation failed:', aiIncidentError);
            } else {
              incidentCreated = aiIncident;

              // Send notification to tourist about AI-detected anomaly
              const notificationTemplate = aiResult.verdict === 'IMMOBILE'
                ? NotificationTemplates.IMMOBILE_WARNING
                : NotificationTemplates.NEW_INCIDENT;

              await sendNotificationToTourist(
                tourist_id,
                {
                  ...notificationTemplate,
                  body: `AI detected ${aiResult.verdict.toLowerCase()}: ${aiResult.reason}`,
                  data: {
                    incidentId: aiIncident.id,
                    touristId: tourist_id,
                    type: aiResult.verdict,
                    aiScore: aiResult.score
                  }
                }
              );

              // Send notification to operators
              await sendNotificationToOperators({
                ...NotificationTemplates.NEW_INCIDENT,
                body: `AI detected ${aiResult.verdict} for tourist. Incident #${aiIncident.id} created.`,
                data: {
                  incidentId: aiIncident.id,
                  touristId: tourist_id,
                  type: aiResult.verdict,
                  aiScore: aiResult.score
                }
              });

              // Publish to realtime channel for dashboard
              await supabaseAdmin
                .channel('incidents')
                .send({
                  type: 'broadcast',
                  event: 'new_incident',
                  payload: aiIncident
                });
            }
          }
        }
      } catch (aiError) {
        console.error('AI service call failed:', aiError);
        // Continue without AI analysis
      }
    }

    return NextResponse.json({
      ping: {
        id: ping.id,
        ts: ping.ts
      },
      zonesHit: zonesHit.map((z: ZoneIntersection) => ({
        id: z.zone_id,
        name: z.zone_name,
        type: z.zone_type
      })),
      incidentCreated: incidentCreated ? {
        id: incidentCreated.id,
        type: incidentCreated.type,
        severity: incidentCreated.severity
      } : null
    });

  } catch (error) {
    console.error('Ping processing error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
