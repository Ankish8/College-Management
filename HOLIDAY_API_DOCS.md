# Holiday API Documentation

## Overview
The Holiday API provides endpoints for managing holidays in the college management system. Holidays are all-day events that appear across the entire day column in the timetable.

## API Endpoints

### GET /api/holidays
Retrieve holidays with optional date filtering.

**Parameters:**
- `dateFrom` (optional): Start date filter (ISO string)
- `dateTo` (optional): End date filter (ISO string)

**Response:**
```json
[
  {
    "id": "cmdzl4qgo0001ngme16mzagdy",
    "name": "Independence Day",
    "date": "2025-08-15T00:00:00.000Z",
    "type": "NATIONAL",
    "description": "National Holiday",
    "isRecurring": false,
    "departmentId": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/holidays
Create a new holiday.

**Request Body:**
```json
{
  "name": "Independence Day",
  "date": "2025-08-15",
  "type": "NATIONAL",
  "description": "National Holiday",
  "isRecurring": false,
  "departmentId": null
}
```

**Holiday Types:**
- `NATIONAL`: National holidays (e.g., Independence Day)
- `UNIVERSITY`: University-specific holidays
- `DEPARTMENT`: Department-specific holidays
- `LOCAL`: Local/Festival holidays

## Authentication
All endpoints require authentication via session cookies.

## Holiday Display in Timetable

### Day Headers
- Holiday days show red background
- Display holiday name: "🎊 Independence Day"

### Time Slots
- All time slots in holiday column show red background
- Subtle "Holiday" text instead of + buttons
- No classes can be scheduled on holiday days

## Database Schema

```sql
model Holiday {
  id                 String   @id @default(cuid())
  name               String
  date               DateTime
  type               String   // NATIONAL, UNIVERSITY, DEPARTMENT, LOCAL
  description        String?
  isRecurring        Boolean  @default(false)
  departmentId       String?
  academicCalendarId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

## Usage Examples

### Fetch holidays for current month:
```javascript
const holidays = await fetch('/api/holidays?dateFrom=2025-08-01&dateTo=2025-08-31', {
  credentials: 'include'
}).then(res => res.json())
```

### Create a holiday:
```javascript
const holiday = await fetch('/api/holidays', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Independence Day',
    date: '2025-08-15',
    type: 'NATIONAL',
    description: 'National Holiday'
  })
})
```

## Integration with Calendar

Holidays are automatically:
1. Fetched with calendar events
2. Displayed as all-day events
3. Rendered across entire day columns
4. Prevent class scheduling on those days

## Notes
- Holidays are all-day events (allDay: true)
- University-wide holidays have departmentId: null
- Department-specific holidays filter by user's department
- Authentication required for all operations