import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h'; // 24h, 7d, 30d
    
    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch incidents in time range
    const { data: incidents, error: incidentsError } = await supabaseAdmin
      .from('incidents')
      .select('*')
      .gte('ts', startTime.toISOString())
      .order('ts', { ascending: false });

    if (incidentsError) throw incidentsError;

    // Fetch tourists
    const { data: tourists, error: touristsError } = await supabaseAdmin
      .from('tourists')
      .select('*');

    if (touristsError) throw touristsError;

    // Calculate statistics
    const stats = {
      totalTourists: tourists?.length || 0,
      activeTourists: tourists?.filter(t => t.active).length || 0,
      totalIncidents: incidents?.length || 0,
      openIncidents: incidents?.filter(i => i.status === 'OPEN').length || 0,
      highSeverityIncidents: incidents?.filter(i => i.severity === 'HIGH').length || 0,
      incidentsByType: incidents?.reduce((acc: any, inc: any) => {
        acc[inc.type] = (acc[inc.type] || 0) + 1;
        return acc;
      }, {}),
      incidentsBySeverity: incidents?.reduce((acc: any, inc: any) => {
        acc[inc.severity] = (acc[inc.severity] || 0) + 1;
        return acc;
      }, {}),
      incidentsByStatus: incidents?.reduce((acc: any, inc: any) => {
        acc[inc.status] = (acc[inc.status] || 0) + 1;
        return acc;
      }, {}),
    };

    // Calculate incident trend (hourly for 24h, daily for longer)
    const trend: { [key: string]: number } = {};
    incidents?.forEach((incident: any) => {
      const timestamp = new Date(incident.ts);
      let key: string;
      
      if (timeRange === '24h') {
        // Hourly buckets
        key = `${timestamp.getHours()}:00`;
      } else {
        // Daily buckets
        key = timestamp.toISOString().split('T')[0];
      }
      
      trend[key] = (trend[key] || 0) + 1;
    });

    return NextResponse.json({
      stats,
      trend,
      timeRange,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

