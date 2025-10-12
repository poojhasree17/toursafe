# Police Dashboard - Quick Reference Guide

## Quick Access

**URL**: `/admin/dashboard`

**Login**: Use admin credentials at `/admin/login`

## Dashboard Views (Top Navigation)

### 📊 Overview
- **Purpose**: High-level summary of current situation
- **Key Metrics**: Active tourists, open incidents, missing persons, 24h activity
- **Features**: 
  - Tourist cluster map
  - Recent incidents list
  - Quick E-FIR generation for missing persons

### 👥 Digital IDs
- **Purpose**: Search and manage tourist records
- **Search**: By name, email, phone, or nationality
- **Filter**: Active/Inactive status
- **Info**: View full tourist details, last location, emergency contacts

### 🚨 Incidents & Alerts
- **Purpose**: Complete incident management
- **View**: All incidents with status, severity, and type
- **Filter**: By status (OPEN/ACK/ASSIGNED/CLOSED)
- **Actions**: 
  - View incident details
  - Generate E-FIR for missing persons
  - Link to incident page for updates

### 🗺️ Risk Heat Map
- **Purpose**: Geographic risk analysis
- **Features**:
  - Risk zone visualization (Critical/High/Medium/Low)
  - Interactive clusters with incident details
  - Toggle layers (points/clusters)
  - Time range selection (24h/7d/30d)

## Common Actions

### Finding a Tourist
1. Click "Digital IDs" tab
2. Type name/email/phone in search box
3. Click "View" for full details
4. Check "Last Known Location" section

### Responding to Missing Person
1. Check "Incidents & Alerts" tab
2. Find MISSING_PERSON incident (status: OPEN)
3. Click "Generate E-FIR" button
4. Review details in modal
5. Click "Generate E-FIR" to create official FIR
6. Note the FIR number (e.g., FIR/2025/12345)

### Identifying High-Risk Areas
1. Go to "Risk Heat Map" tab
2. Look for red/orange zones
3. Click on cluster circles for details
4. Note incident types and counts
5. Use info for patrol planning

### Exporting Data
1. Click "Export" button (top right)
2. File downloads as JSON
3. Contains: stats, tourists, incidents, clusters
4. Use for reports or further analysis

## Status Indicators

### Incident Status
- 🔴 **OPEN**: New, requires attention
- 🟡 **ACK**: Acknowledged, being reviewed
- 🔵 **ASSIGNED**: Team dispatched
- 🟢 **CLOSED**: Resolved

### Severity Levels
- 🔴 **HIGH**: Immediate action required
- 🟡 **MEDIUM**: Standard priority
- 🟢 **LOW**: Monitor situation

### Risk Levels (Heat Map)
- 🟥 **CRITICAL**: 30+ intensity points
- 🟧 **HIGH**: 15-29 intensity points
- 🟨 **MEDIUM**: 5-14 intensity points
- 🟩 **LOW**: <5 intensity points

### Tourist Status
- ✅ **Active**: Currently in system
- ❌ **Inactive**: Departed or expired

## Key Statistics

### Dashboard Metrics
- **Active Tourists**: Currently registered and active
- **Open Incidents**: Unresolved incidents
- **Missing Persons**: Active missing person cases
- **24h Activity**: Recent incident count

### Cluster Density
- **High**: 5+ tourists in area
- **Medium**: 3-4 tourists in area
- **Low**: 1-2 tourists in area

## E-FIR Generation

### When to Generate
- Missing person incidents
- Tourist not found after reasonable time
- Emergency contact unable to reach tourist

### Auto-Generated Information
✅ Tourist ID and personal info
✅ Last known location
✅ Incident timestamp
✅ Emergency contact details
✅ Unique FIR number
✅ Blockchain verification hash

### What to Do After
1. Note the FIR number
2. Share with investigating officers
3. Update incident status as needed
4. Monitor for updates

## Tips & Best Practices

### Daily Routine
1. Start with **Overview** for situation awareness
2. Check **Incidents & Alerts** for new cases
3. Review **Heat Map** to identify problem areas
4. Update incident statuses as cases progress

### Emergency Response
1. **Immediate**: Check incident severity and type
2. **Location**: Note GPS coordinates of incident
3. **Contact**: Use tourist details to reach family
4. **Documentation**: Generate E-FIR if needed
5. **Update**: Mark incident as ACK/ASSIGNED/CLOSED

### Monitoring Tourist Safety
1. **Regular checks**: Review Digital IDs for location updates
2. **Cluster analysis**: Watch for unusual groupings
3. **Risk zones**: Monitor heat map for emerging problems
4. **Trends**: Use 24h/7d/30d views for patterns

### Data Management
1. **Refresh**: Use refresh button for latest data
2. **Export**: Regular exports for records
3. **Search**: Use full-text search for quick lookup
4. **Filter**: Apply filters to focus on specific groups

## Troubleshooting

### No Location Data
- Tourist may not have IoT device active
- Check incident reports for last known location
- Contact tourist directly if urgent

### E-FIR Button Not Visible
- Only appears for MISSING_PERSON incidents
- Only shown if E-FIR not already generated
- Only for non-CLOSED incidents

### Heat Map Not Loading
- Check internet connection
- Click refresh button
- Try selecting different time range

### Real-time Updates Not Working
- System falls back to 30-second polling
- Manual refresh always available
- Check connection status indicator

## Keyboard Shortcuts

- **Ctrl+R**: Refresh dashboard
- **Escape**: Close any open modal
- **Tab**: Navigate between search/filter fields

## Contact Information

**Technical Support**: Check with IT department
**Emergency Coordination**: Use main control room
**System Updates**: Automatic, no action needed

## Version Information

**Current Version**: TourSafe MVP v1.0
**Last Updated**: October 2025
**Platform**: SIH 2025 PS-25002

---

**Remember**: This dashboard provides real-time critical information for tourist safety. Always verify critical information through multiple sources before taking action.

