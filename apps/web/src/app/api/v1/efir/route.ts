import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EFIRRequest {
  touristId: string;
  incidentId?: string;
  incidentType: 'MISSING_PERSON' | 'THEFT' | 'ASSAULT' | 'ACCIDENT' | 'OTHER';
  incidentDescription: string;
  incidentLocation?: string;
  incidentDateTime: string;
  witnesses?: Array<{
    name: string;
    phone?: string;
    address?: string;
    statement?: string;
  }>;
  complainantName: string;
  complainantAddress?: string;
  complainantPhone?: string;
}

// Generate FIR number (format: FIR/YYYY/XXXXX)
function generateFIRNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `FIR/${year}/${random}`;
}

// Create blockchain hash for FIR verification
function createFIRHash(firData: any): string {
  const dataString = JSON.stringify({
    firNumber: firData.fir_number,
    touristId: firData.tourist_id,
    incidentType: firData.incident_type,
    incidentDescription: firData.incident_description,
    incidentDateTime: firData.incident_datetime,
    createdAt: firData.created_at
  });

  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// POST /api/v1/efir - Create new E-FIR
export async function POST(request: NextRequest) {
  try {
    const body: EFIRRequest = await request.json();
    const {
      touristId,
      incidentId,
      incidentType,
      incidentDescription,
      incidentLocation,
      incidentDateTime,
      witnesses = [],
      complainantName,
      complainantAddress,
      complainantPhone
    } = body;

    if (!touristId || !incidentType || !incidentDescription || !complainantName) {
      return NextResponse.json(
        { error: 'Tourist ID, incident type, description, and complainant name are required' },
        { status: 400 }
      );
    }

    // Verify tourist exists
    const { data: tourist, error: touristError } = await supabase
      .from('tourists')
      .select('id, display_name, emergency_contact')
      .eq('id', touristId)
      .single();

    if (touristError || !tourist) {
      return NextResponse.json(
        { error: 'Tourist not found' },
        { status: 404 }
      );
    }

    // Generate FIR number and check for uniqueness
    let firNumber: string;
    let attempts = 0;
    do {
      firNumber = generateFIRNumber();
      attempts++;

      if (attempts > 10) {
        return NextResponse.json(
          { error: 'Failed to generate unique FIR number' },
          { status: 500 }
        );
      }
    } while (
      await supabase
        .from('efirs')
        .select('id')
        .eq('fir_number', firNumber)
        .single()
        .then(({ data }) => !!data)
    );

    // Create E-FIR record
    const firData = {
      tourist_id: touristId,
      incident_id: incidentId || null,
      fir_number: firNumber,
      complainant_name: complainantName,
      complainant_address: complainantAddress || null,
      complainant_phone: complainantPhone || null,
      incident_type: incidentType,
      incident_description: incidentDescription,
      incident_location: incidentLocation || null,
      incident_datetime: new Date(incidentDateTime).toISOString(),
      witnesses: JSON.stringify(witnesses),
      status: 'DRAFT',
      created_at: new Date().toISOString()
    };

    const { data: efir, error: efirError } = await supabase
      .from('efirs')
      .insert(firData)
      .select('*')
      .single();

    if (efirError) {
      console.error('Error creating E-FIR:', efirError);
      return NextResponse.json(
        { error: 'Failed to create E-FIR' },
        { status: 500 }
      );
    }

    // Create blockchain hash
    const blockchainHash = createFIRHash(efir);

    // Update with blockchain hash
    const { error: updateError } = await supabase
      .from('efirs')
      .update({ blockchain_hash: blockchainHash })
      .eq('id', efir.id);

    if (updateError) {
      console.error('Error updating E-FIR hash:', updateError);
    }

    // If this is related to a missing person incident, update incident status
    if (incidentId && incidentType === 'MISSING_PERSON') {
      await supabase
        .from('incidents')
        .update({
          status: 'ACK',
          meta: {
            ...((await supabase.from('incidents').select('meta').eq('id', incidentId).single()).data?.meta || {}),
            efir_generated: true,
            efir_number: firNumber
          }
        })
        .eq('id', incidentId);
    }

    return NextResponse.json({
      success: true,
      efir: {
        id: efir.id,
        firNumber: efir.fir_number,
        status: efir.status,
        createdAt: efir.created_at,
        blockchainHash
      }
    });

  } catch (error) {
    console.error('E-FIR creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/v1/efir?touristId=xxx - Get E-FIRs for a tourist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const touristId = searchParams.get('touristId');

    if (!touristId) {
      return NextResponse.json(
        { error: 'Tourist ID is required' },
        { status: 400 }
      );
    }

    const { data: efirs, error } = await supabase
      .from('efirs')
      .select('*')
      .eq('tourist_id', touristId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching E-FIRs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch E-FIRs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      efirs: efirs || []
    });

  } catch (error) {
    console.error('E-FIR fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/efir - Update E-FIR status or details
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { efirId, status, updates } = body;

    if (!efirId) {
      return NextResponse.json(
        { error: 'E-FIR ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'SUBMITTED') {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    if (updates) {
      Object.assign(updateData, updates);
    }

    const { data: efir, error } = await supabase
      .from('efirs')
      .update(updateData)
      .eq('id', efirId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating E-FIR:', error);
      return NextResponse.json(
        { error: 'Failed to update E-FIR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      efir
    });

  } catch (error) {
    console.error('E-FIR update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
