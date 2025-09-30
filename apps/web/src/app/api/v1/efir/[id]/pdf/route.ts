import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/v1/efir/[id]/pdf - Generate PDF for E-FIR
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const efirId = params.id;

    if (!efirId) {
      return NextResponse.json(
        { error: 'E-FIR ID is required' },
        { status: 400 }
      );
    }

    // Get E-FIR details
    const { data: efir, error } = await supabase
      .from('efirs')
      .select(`
        *,
        tourists (
          display_name,
          emergency_contact,
          vc_jwt
        ),
        incidents (
          lat,
          lng,
          meta
        )
      `)
      .eq('id', efirId)
      .single();

    if (error || !efir) {
      return NextResponse.json(
        { error: 'E-FIR not found' },
        { status: 404 }
      );
    }

    // Generate simple HTML for PDF (in production, use a proper PDF library)
    const htmlContent = generateEFIRHTML(efir);

    // For now, return HTML that can be printed as PDF
    // In production, you'd use a library like Puppeteer or jsPDF
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="FIR-${efir.fir_number}.html"`
      }
    });

  } catch (error) {
    console.error('E-FIR PDF generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateEFIRHTML(efir: any): string {
  const witnesses = Array.isArray(efir.witnesses) ? efir.witnesses : [];
  const evidence = Array.isArray(efir.evidence) ? efir.evidence : [];

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>E-FIR ${efir.fir_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { font-weight: bold; background-color: #f5f5f5; padding: 8px; margin-bottom: 10px; }
        .row { display: flex; margin-bottom: 10px; }
        .label { font-weight: bold; width: 150px; }
        .value { flex: 1; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        .signature { margin-top: 30px; }
        .qr-code { width: 100px; height: 100px; background: #f0f0f0; text-align: center; line-height: 100px; margin: 10px auto; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Electronic First Information Report (E-FIR)</h1>
        <h2>FIR Number: ${efir.fir_number}</h2>
    </div>

    <div class="section">
        <div class="section-title">Complainant Information</div>
        <div class="row">
            <div class="label">Name:</div>
            <div class="value">${efir.complainant_name}</div>
        </div>
        ${efir.complainant_address ? `
        <div class="row">
            <div class="label">Address:</div>
            <div class="value">${efir.complainant_address}</div>
        </div>
        ` : ''}
        ${efir.complainant_phone ? `
        <div class="row">
            <div class="label">Phone:</div>
            <div class="value">${efir.complainant_phone}</div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">Victim/Tourist Information</div>
        <div class="row">
            <div class="label">Name:</div>
            <div class="value">${efir.tourists?.display_name || 'Not Available'}</div>
        </div>
        <div class="row">
            <div class="label">Emergency Contact:</div>
            <div class="value">${efir.tourists?.emergency_contact || 'Not Available'}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Incident Details</div>
        <div class="row">
            <div class="label">Type:</div>
            <div class="value">${efir.incident_type.replace('_', ' ').toUpperCase()}</div>
        </div>
        <div class="row">
            <div class="label">Date & Time:</div>
            <div class="value">${new Date(efir.incident_datetime).toLocaleString()}</div>
        </div>
        ${efir.incident_location ? `
        <div class="row">
            <div class="label">Location:</div>
            <div class="value">${efir.incident_location}</div>
        </div>
        ` : ''}
        <div class="row">
            <div class="label">Description:</div>
            <div class="value">${efir.incident_description}</div>
        </div>
    </div>

    ${witnesses.length > 0 ? `
    <div class="section">
        <div class="section-title">Witnesses</div>
        ${witnesses.map((witness: any, index: number) => `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <strong>Witness ${index + 1}:</strong> ${witness.name}
            ${witness.phone ? `<br>Phone: ${witness.phone}` : ''}
            ${witness.address ? `<br>Address: ${witness.address}` : ''}
            ${witness.statement ? `<br>Statement: ${witness.statement}` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${evidence.length > 0 ? `
    <div class="section">
        <div class="section-title">Evidence</div>
        ${evidence.map((item: any, index: number) => `
        <div style="margin-bottom: 10px;">
            ${index + 1}. ${item.description || item.name || 'Evidence Item'}
            ${item.reference ? `<br>Reference: ${item.reference}` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Investigation Details</div>
        <div class="row">
            <div class="label">Status:</div>
            <div class="value">${efir.status.replace('_', ' ').toUpperCase()}</div>
        </div>
        ${efir.police_station ? `
        <div class="row">
            <div class="label">Police Station:</div>
            <div class="value">${efir.police_station}</div>
        </div>
        ` : ''}
        ${efir.investigating_officer ? `
        <div class="row">
            <div class="label">Investigating Officer:</div>
            <div class="value">${efir.investigating_officer}</div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">Digital Verification</div>
        <div class="row">
            <div class="label">Blockchain Hash:</div>
            <div class="value" style="font-family: monospace; font-size: 12px;">${efir.blockchain_hash}</div>
        </div>
        <div class="row">
            <div class="label">Generated:</div>
            <div class="value">${new Date(efir.created_at).toLocaleString()}</div>
        </div>
        ${efir.submitted_at ? `
        <div class="row">
            <div class="label">Submitted:</div>
            <div class="value">${new Date(efir.submitted_at).toLocaleString()}</div>
        </div>
        ` : ''}
    </div>

    <div class="qr-code">
        QR Code<br>
        (Blockchain Verification)
    </div>

    <div class="signature">
        <div style="border-bottom: 1px solid #333; width: 200px; margin: 40px auto;"></div>
        <p>Complainant Signature</p>
    </div>

    <div class="footer">
        <p>This is an electronically generated FIR. Verify authenticity using the blockchain hash above.</p>
        <p>TourSafe Digital Investigation System - Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
}
