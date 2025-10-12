import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'incidents'; // incidents, tourists, zones
    const timeRange = searchParams.get('timeRange') || '7d';
    
    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (type === 'incidents') {
      // Fetch incidents with location data
      const { data: incidents, error } = await supabaseAdmin
        .from('incidents')
        .select('lat, lng, severity, type, ts')
        .gte('ts', startTime.toISOString())
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) throw error;

      // Calculate heat map points with intensity
      const heatMapData = incidents?.map((incident: any) => ({
        lat: incident.lat,
        lng: incident.lng,
        intensity: 
          incident.severity === 'HIGH' ? 10 :
          incident.severity === 'MEDIUM' ? 5 : 2,
        type: incident.type,
        timestamp: incident.ts
      })) || [];

      // Calculate density clusters
      const gridSize = 0.005; // ~500m grid
      const clusters: { [key: string]: any } = {};

      heatMapData.forEach((point: any) => {
        const gridKey = `${Math.floor(point.lat / gridSize)}_${Math.floor(point.lng / gridSize)}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            lat: point.lat,
            lng: point.lng,
            count: 0,
            totalIntensity: 0,
            types: {}
          };
        }
        
        clusters[gridKey].count++;
        clusters[gridKey].totalIntensity += point.intensity;
        clusters[gridKey].types[point.type] = (clusters[gridKey].types[point.type] || 0) + 1;
      });

      // Convert to array and calculate risk levels
      const clusterArray = Object.values(clusters).map((cluster: any) => ({
        ...cluster,
        avgIntensity: cluster.totalIntensity / cluster.count,
        riskLevel: 
          cluster.totalIntensity >= 30 ? 'CRITICAL' :
          cluster.totalIntensity >= 15 ? 'HIGH' :
          cluster.totalIntensity >= 5 ? 'MEDIUM' : 'LOW'
      }));

      return NextResponse.json({
        type: 'incidents',
        points: heatMapData,
        clusters: clusterArray,
        summary: {
          totalPoints: heatMapData.length,
          highRiskClusters: clusterArray.filter((c: any) => c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH').length,
          mediumRiskClusters: clusterArray.filter((c: any) => c.riskLevel === 'MEDIUM').length,
          lowRiskClusters: clusterArray.filter((c: any) => c.riskLevel === 'LOW').length
        },
        timeRange,
        timestamp: new Date().toISOString()
      });

    } else if (type === 'tourists') {
      // Fetch latest tourist locations from pings table
      const { data: locations, error } = await supabaseAdmin
        .from('pings')
        .select('tourist_id, lat, lng, ts')
        .gte('ts', startTime.toISOString())
        .order('ts', { ascending: false });

      if (error) throw error;

      // Get unique latest locations per tourist
      const latestLocations: { [key: string]: any } = {};
      locations?.forEach((loc: any) => {
        if (!latestLocations[loc.tourist_id]) {
          latestLocations[loc.tourist_id] = loc;
        }
      });

      const touristPoints = Object.values(latestLocations).map((loc: any) => ({
        lat: loc.lat,
        lng: loc.lng,
        intensity: 1,
        type: 'tourist',
        timestamp: loc.ts
      }));

      // Calculate tourist density clusters
      const gridSize = 0.01; // ~1km grid
      const clusters: { [key: string]: any } = {};

      touristPoints.forEach((point: any) => {
        const gridKey = `${Math.floor(point.lat / gridSize)}_${Math.floor(point.lng / gridSize)}`;
        
        if (!clusters[gridKey]) {
          clusters[gridKey] = {
            lat: point.lat,
            lng: point.lng,
            touristCount: 0,
            tourists: []
          };
        }
        
        clusters[gridKey].touristCount++;
      });

      return NextResponse.json({
        type: 'tourists',
        points: touristPoints,
        clusters: Object.values(clusters),
        summary: {
          totalTourists: touristPoints.length,
          clusters: Object.keys(clusters).length
        },
        timeRange,
        timestamp: new Date().toISOString()
      });

    } else if (type === 'zones') {
      // Fetch safety zones
      const { data: zones, error } = await supabaseAdmin
        .from('zones')
        .select('*');

      if (error) throw error;

      return NextResponse.json({
        type: 'zones',
        zones: zones || [],
        summary: {
          totalZones: zones?.length || 0,
          safeZones: zones?.filter((z: any) => z.type === 'SAFE').length || 0,
          restrictedZones: zones?.filter((z: any) => z.type === 'RESTRICTED').length || 0,
          alertZones: zones?.filter((z: any) => z.type === 'ALERT').length || 0
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      error: 'Invalid type parameter. Use: incidents, tourists, or zones'
    }, { status: 400 });

  } catch (error) {
    console.error('Heatmap error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

