# Police & Tourism Department Dashboard

## Overview

The Police & Tourism Department Dashboard is a comprehensive real-time monitoring and management system designed for law enforcement and tourism authorities to track tourist safety, manage incidents, and respond to emergencies effectively.

## Access

**URL**: `/admin/dashboard`

**Requirements**: Admin authentication required

**Entry Point**: Available from main admin page as "Police Dashboard" card

## Features

### 1. Real-time Visualizations

#### Statistics Dashboard
- **Active Tourists**: Real-time count of tourists currently in the system
- **Open Incidents**: Current unresolved incidents requiring attention
- **Missing Persons**: Active missing person cases
- **24h Activity**: Incident count in the last 24 hours

#### View Modes
The dashboard offers four specialized view modes:

1. **Overview** - High-level summary with tourist clusters and recent incidents
2. **Digital IDs** - Complete tourist ID management and tracking
3. **Incidents & Alerts** - Comprehensive incident log with automated E-FIR
4. **Risk Heat Map** - Geographic visualization of high-risk zones

### 2. Tourist Clusters & Heat Maps

#### Tourist Clustering
- **Grid-based clustering**: Automatically groups tourists in ~1km radius
- **Density classification**: High, Medium, and Low density clusters
- **Real-time updates**: Refreshes every 30 seconds
- **Visual indicators**: Color-coded density levels

**API Endpoint**: `GET /api/v1/clusters`

Response includes:
```json
{
  "clusters": [
    {
      "location": [18.9220, 72.8347],
      "count": 5,
      "tourists": [...],
      "density": "high"
    }
  ],
  "summary": {
    "totalClusters": 3,
    "totalTourists": 12,
    "highDensityClusters": 1,
    "mediumDensityClusters": 1,
    "lowDensityClusters": 1
  }
}
```

#### Risk Heat Map
- **Incident-based heat mapping**: Visualizes incident hotspots
- **Risk level calculation**:
  - **CRITICAL**: Total intensity ≥ 30
  - **HIGH**: Total intensity ≥ 15
  - **MEDIUM**: Total intensity ≥ 5
  - **LOW**: Total intensity < 5
- **Intensity weights**:
  - High severity incidents: 10 points
  - Medium severity incidents: 5 points
  - Low severity incidents: 2 points
- **Interactive clusters**: Click clusters for detailed information
- **Layer controls**: Toggle between clusters and individual points
- **Time range filtering**: 24h, 7d, or 30d views

**API Endpoint**: `GET /api/v1/heatmap?type=incidents&timeRange=7d`

Response includes:
```json
{
  "type": "incidents",
  "points": [...],
  "clusters": [
    {
      "lat": 18.9220,
      "lng": 72.8347,
      "count": 5,
      "totalIntensity": 25,
      "riskLevel": "HIGH",
      "types": {
        "RESTRICTED": 3,
        "SOS": 2
      }
    }
  ],
  "summary": {
    "totalPoints": 15,
    "highRiskClusters": 2,
    "mediumRiskClusters": 3,
    "lowRiskClusters": 1
  }
}
```

### 3. Digital ID Records

#### Search & Filtering
- **Full-text search**: Search by name, email, phone, or nationality
- **Status filtering**: Active, Inactive, or All tourists
- **Real-time results**: Instant search with no lag

#### Tourist Information Display
Each record shows:
- Full name and tourist ID
- Contact information (email, phone)
- Nationality
- **Last Known Location**: 
  - GPS coordinates with 6 decimal precision
  - Timestamp of last update
  - Visual indicator on map
- Active/Inactive status
- Registration date

#### Detailed Tourist View
Click "View" on any tourist to see:
- Complete personal information
- **Last known location** with timestamp
- **Emergency contacts** (name, phone, relation)
- **Trip itinerary** (duration, purpose)
- Tourist ID and verification status

**Data Source**: 
- Tourist data from `tourists` table
- Location data from `iot_data` table (latest entry per tourist)

### 4. Alert History & Last Known Locations

#### Incident Log
Comprehensive incident tracking with:
- **Status badges**: OPEN, ACK, ASSIGNED, CLOSED
- **Severity indicators**: HIGH, MEDIUM, LOW
- **Incident types**: SOS, RESTRICTED, MISSING_PERSON, etc.
- **Tourist information**: Name and ID linked to incident
- **Timestamps**: Precise incident time
- **Location coordinates**: GPS location of incident
- **E-FIR status**: Shows if E-FIR has been generated

#### Last Known Locations
- Automatically tracked from IoT data
- Updates in real-time as tourists move
- Displayed in tourist records table
- Shows timestamp of last update
- Critical for missing person cases

#### Real-time Updates
- WebSocket-based real-time updates via Supabase
- Fallback polling every 30 seconds
- Instant notification of new incidents
- Automatic dashboard refresh

### 5. Automated E-FIR Generation

#### Automatic Detection
The system automatically identifies missing person incidents that require E-FIR:
- Monitors incidents with type `MISSING_PERSON`
- Shows "Auto E-FIR" button for eligible cases
- One-click E-FIR generation

#### E-FIR Details
Automatically populated with:
- Tourist ID and personal information
- Incident ID and type
- Last known location (GPS coordinates)
- Incident timestamp
- Tourist contact information
- Emergency contact details
- System-generated FIR number (format: FIR/YYYY/XXXXX)
- Blockchain hash for verification

#### Generation Process
1. Click "Generate E-FIR" on missing person incident
2. Review incident details in modal
3. Confirm generation
4. System creates E-FIR with:
   - Unique FIR number
   - Complainant: System or logged-in user
   - Incident description with full details
   - Location data
   - Timestamp
   - Blockchain hash for tamper-proof verification
5. Incident automatically marked with E-FIR details
6. Success notification with FIR number

**API Endpoint**: `POST /api/v1/efir`

Request body:
```json
{
  "touristId": "uuid",
  "incidentId": "uuid",
  "incidentType": "MISSING_PERSON",
  "incidentDescription": "Auto-generated description",
  "incidentLocation": "Lat, Lng",
  "incidentDateTime": "ISO timestamp",
  "complainantName": "System or User",
  "complainantPhone": "Emergency contact"
}
```

Response:
```json
{
  "success": true,
  "efir": {
    "id": "uuid",
    "firNumber": "FIR/2025/12345",
    "status": "DRAFT",
    "createdAt": "ISO timestamp",
    "blockchainHash": "sha256 hash"
  }
}
```

### 6. Additional Features

#### Data Export
- Export complete dashboard data as JSON
- Includes:
  - Current statistics
  - All filtered tourists
  - All incidents
  - Cluster data
  - Timestamp of export
- One-click download button

#### Analytics API
**Endpoint**: `GET /api/v1/analytics?timeRange=24h`

Provides comprehensive analytics:
- Total and active tourist counts
- Incident statistics by type, severity, and status
- Time-based trends (hourly for 24h, daily for longer periods)
- Real-time calculations

#### Refresh Functionality
- Manual refresh button for immediate data update
- Refreshes all components:
  - Statistics
  - Tourist list
  - Incident log
  - Heat map data
  - Cluster data

## Technical Implementation

### Components

1. **Dashboard Page**: `apps/web/src/app/admin/dashboard/page.tsx`
   - Main dashboard component
   - State management for all views
   - Real-time data updates
   - Modal management

2. **Heat Map Visualizer**: `apps/web/src/components/heat-map-visualizer.tsx`
   - Interactive Leaflet-based map
   - Risk zone visualization
   - Layer controls
   - Cluster interaction

3. **Map Component**: `apps/web/src/components/toursafe-map-leaflet.tsx`
   - Tourist location display
   - Zone overlay
   - Navigation controls

### API Endpoints

1. **Analytics**: `/api/v1/analytics`
   - Real-time statistics
   - Trend analysis
   - Time-range filtering

2. **Heat Map**: `/api/v1/heatmap`
   - Incident heat map data
   - Tourist location heat map
   - Zone information
   - Risk calculations

3. **Clusters**: `/api/v1/clusters`
   - Tourist clustering
   - Density analysis
   - Grid-based grouping

4. **E-FIR**: `/api/v1/efir`
   - Automated E-FIR generation
   - FIR number generation
   - Blockchain verification

### Database Integration

- **Real-time subscriptions**: Supabase real-time for instant updates
- **Efficient queries**: Optimized joins and filtering
- **Location tracking**: IoT data integration
- **Relationship mapping**: Tourist-Incident linking

## Usage Guide

### For Police Officers

1. **Monitoring Active Tourists**:
   - Navigate to "Digital IDs" tab
   - Use search to find specific tourists
   - Click "View" to see full details including last known location

2. **Responding to Incidents**:
   - Check "Incidents & Alerts" tab
   - Review open incidents (red badge)
   - Click "Details" for full incident information
   - For missing persons, use "Generate E-FIR" button

3. **Identifying High-Risk Areas**:
   - Switch to "Risk Heat Map" tab
   - Observe red/orange zones (high risk)
   - Click clusters to see incident details
   - Use layer controls to toggle views

### For Tourism Department

1. **Tourist Safety Overview**:
   - Use "Overview" tab for quick summary
   - Monitor tourist clusters for density issues
   - Track recent incidents

2. **Tourist Tracking**:
   - Access "Digital IDs" for complete tourist list
   - Search by nationality to filter international tourists
   - Export data for reports

3. **Incident Analytics**:
   - Review 24h activity statistics
   - Monitor incident trends
   - Track resolution rates

## Security Features

- **Authentication required**: Admin-only access
- **Session management**: Automatic logout on expiry
- **Blockchain verification**: E-FIR tamper-proof hashing
- **Data sanitization**: Sensitive information filtered in API responses
- **Audit trail**: All actions logged with timestamps

## Performance Optimizations

- **Dynamic imports**: Map components loaded on-demand
- **Efficient clustering**: Grid-based algorithm (O(n))
- **Paginated queries**: Large datasets handled efficiently
- **Real-time optimization**: Fallback to polling if WebSocket fails
- **Memoized calculations**: Statistics computed only on data change

## Future Enhancements

- **Predictive analytics**: ML-based risk prediction
- **Patrol route optimization**: Suggested routes for police patrols
- **Multi-language support**: Internationalization
- **Mobile app**: Native mobile dashboard
- **Advanced filtering**: Date ranges, custom queries
- **Automated alerts**: SMS/Email notifications for critical incidents
- **Report generation**: PDF reports for authorities
- **Integration with local police systems**: Two-way data sync

## Support

For technical issues or feature requests, contact the development team.

## License

Part of TourSafe MVP - SIH 2025 PS-25002

