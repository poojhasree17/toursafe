import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active tourists with their latest locations
    const { data: tourists, error: touristsError } = await supabaseAdmin
      .from('tourists')
      .select('id, display_name, active')
      .eq('active', true);

    if (touristsError) throw touristsError;

    // Fetch latest location for each tourist
    const touristLocations = await Promise.all(
      (tourists || []).map(async (tourist) => {
        const { data: location } = await supabaseAdmin
          .from('iot_data')
          .select('lat, lng, ts')
          .eq('tourist_id', tourist.id)
          .order('ts', { ascending: false })
          .limit(1)
          .single();

        return location ? {
          touristId: tourist.id,
          displayName: tourist.display_name,
          lat: location.lat,
          lng: location.lng,
          timestamp: location.ts
        } : null;
      })
    );

    // Filter out null locations
    const validLocations = touristLocations.filter(loc => loc !== null);

    // Calculate clusters using grid-based clustering
    const gridSize = 0.01; // ~1km grid
    const clusters: { [key: string]: any } = {};

    validLocations.forEach((location: any) => {
      const gridKey = `${Math.floor(location.lat / gridSize)}_${Math.floor(location.lng / gridSize)}`;
      
      if (!clusters[gridKey]) {
        clusters[gridKey] = {
          location: [location.lat, location.lng],
          count: 0,
          tourists: [],
          avgLat: 0,
          avgLng: 0
        };
      }
      
      clusters[gridKey].count++;
      clusters[gridKey].tourists.push({
        id: location.touristId,
        name: location.displayName,
        lat: location.lat,
        lng: location.lng,
        timestamp: location.timestamp
      });
    });

    // Calculate average positions and prepare cluster data
    const clusterArray = Object.values(clusters).map((cluster: any) => {
      const avgLat = cluster.tourists.reduce((sum: number, t: any) => sum + t.lat, 0) / cluster.count;
      const avgLng = cluster.tourists.reduce((sum: number, t: any) => sum + t.lng, 0) / cluster.count;
      
      return {
        location: [avgLat, avgLng],
        count: cluster.count,
        tourists: cluster.tourists,
        density: cluster.count >= 5 ? 'high' : cluster.count >= 3 ? 'medium' : 'low'
      };
    });

    // Sort by count descending
    clusterArray.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      clusters: clusterArray,
      summary: {
        totalClusters: clusterArray.length,
        totalTourists: validLocations.length,
        highDensityClusters: clusterArray.filter(c => c.density === 'high').length,
        mediumDensityClusters: clusterArray.filter(c => c.density === 'medium').length,
        lowDensityClusters: clusterArray.filter(c => c.density === 'low').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Clusters error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

