# Timetable JSON Import Schema

## Overview
This document defines the standardized JSON format for importing timetable data into the college management system. The API endpoints can process this format for any batch (Batch 3, Batch 5, etc.) without modification.

## JSON Structure

```json
{
  "metadata": {
    "importId": "unique-import-identifier",
    "createdAt": "2025-01-06T10:00:00Z",
    "description": "Week 3-7 timetable data for B.Des UX Batch 3"
  },
  "batch": {
    "name": "B.Des UX Batch 3",
    "semester": "ODD", 
    "year": 2025,
    "department": "Design",
    "specialization": "User Experience Design",
    "capacity": 30
  },
  "dateRange": {
    "startDate": "2025-07-28",
    "endDate": "2025-09-05",
    "description": "Weeks 3-7 of Odd Semester 2025"
  },
  "timeSlots": [
    {
      "name": "10:15-11:05",
      "startTime": "10:15",
      "endTime": "11:05", 
      "duration": 50,
      "isActive": true,
      "sortOrder": 1
    },
    {
      "name": "11:15-12:05",
      "startTime": "11:15",
      "endTime": "12:05",
      "duration": 50,
      "isActive": true,
      "sortOrder": 2
    }
  ],
  "entries": [
    {
      "type": "SUBJECT",
      "date": "2025-07-28",
      "dayOfWeek": "MONDAY",
      "timeSlot": "10:15-11:05",
      "subject": {
        "name": "Design for Social Innovation",
        "code": "DSI301",
        "credits": 3,
        "type": "THEORY"
      },
      "faculty": {
        "name": "Sushmita Shahi",
        "email": "sushmita.shahi@jlu.edu.in",
        "department": "Design"
      },
      "recurring": false,
      "notes": "Week 3 special session"
    },
    {
      "type": "CUSTOM_EVENT",
      "date": "2025-07-29", 
      "dayOfWeek": "TUESDAY",
      "timeSlot": "11:15-12:05",
      "title": "University Level Clubs",
      "description": "Student club activities",
      "color": "#3b82f6",
      "recurring": false
    },
    {
      "type": "HOLIDAY",
      "date": "2025-08-15",
      "name": "Independence Day",
      "description": "National Holiday",
      "holidayType": "NATIONAL",
      "isRecurring": false
    }
  ]
}
```

## Field Definitions

### Metadata Object
- `importId`: Unique identifier for this import operation
- `createdAt`: ISO timestamp when JSON was created
- `description`: Human-readable description of the import

### Batch Object
- `name`: Full batch name (e.g., "B.Des UX Batch 3")
- `semester`: "ODD" or "EVEN"
- `year`: Academic year (e.g., 2025)
- `department`: Department name
- `specialization`: Specialization name (optional)
- `capacity`: Maximum students in batch

### Date Range Object  
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format
- `description`: Description of the date range

### Time Slots Array
Each time slot object contains:
- `name`: Time slot identifier (e.g., "10:15-11:05")
- `startTime`: Start time in HH:MM format
- `endTime`: End time in HH:MM format
- `duration`: Duration in minutes
- `isActive`: Whether this time slot is currently active
- `sortOrder`: Display order (1, 2, 3, etc.)

### Entries Array
Each entry can be one of three types:

#### SUBJECT Entry
```json
{
  "type": "SUBJECT",
  "date": "2025-07-28",
  "dayOfWeek": "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY",
  "timeSlot": "10:15-11:05",
  "subject": {
    "name": "Subject Full Name",
    "code": "SUBJ301", 
    "credits": 3,
    "type": "THEORY|PRACTICAL|LAB|TUTORIAL"
  },
  "faculty": {
    "name": "Faculty Full Name",
    "email": "faculty@jlu.edu.in",
    "department": "Department Name"
  },
  "recurring": false,
  "notes": "Optional notes"
}
```

#### CUSTOM_EVENT Entry
```json
{
  "type": "CUSTOM_EVENT",
  "date": "2025-07-29",
  "dayOfWeek": "TUESDAY", 
  "timeSlot": "11:15-12:05",
  "title": "Event Title",
  "description": "Event description",
  "color": "#3b82f6",
  "recurring": false
}
```

#### HOLIDAY Entry
```json
{
  "type": "HOLIDAY",
  "date": "2025-08-15",
  "name": "Holiday Name",
  "description": "Holiday description",
  "holidayType": "NATIONAL|UNIVERSITY|DEPARTMENT|LOCAL",
  "isRecurring": false
}
```

## Valid Values

### Day of Week
- MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY

### Subject Types
- THEORY, PRACTICAL, LAB, TUTORIAL

### Holiday Types
- NATIONAL: National holidays (Independence Day, etc.)
- UNIVERSITY: University-specific holidays
- DEPARTMENT: Department-specific holidays  
- LOCAL: Local/festival holidays

### Color Formats
- Hex colors: #3b82f6, #ef4444, #10b981
- Named colors will be converted to hex

## Example Usage

### Batch 3 Import
```json
{
  "metadata": {
    "importId": "batch3-week3-7-import",
    "createdAt": "2025-01-06T10:00:00Z",
    "description": "B.Des UX Batch 3 Weeks 3-7"
  },
  "batch": {
    "name": "B.Des UX Batch 3",
    "semester": "ODD",
    "year": 2025,
    "department": "Design",
    "specialization": "User Experience Design"
  },
  "dateRange": {
    "startDate": "2025-07-28", 
    "endDate": "2025-09-05"
  },
  "timeSlots": [
    {
      "name": "10:15-11:05",
      "startTime": "10:15",
      "endTime": "11:05",
      "duration": 50,
      "isActive": true,
      "sortOrder": 1
    }
  ],
  "entries": [
    {
      "type": "SUBJECT",
      "date": "2025-07-28",
      "dayOfWeek": "MONDAY",
      "timeSlot": "10:15-11:05",
      "subject": {
        "name": "Design for Social Innovation",
        "code": "DSI301",
        "credits": 3,
        "type": "THEORY"
      },
      "faculty": {
        "name": "Sushmita Shahi",
        "email": "sushmita.shahi@jlu.edu.in"
      },
      "recurring": false
    }
  ]
}
```

### Batch 5 Import (Same Format)
```json
{
  "metadata": {
    "importId": "batch5-semester1-import",
    "createdAt": "2025-01-06T11:00:00Z", 
    "description": "B.Des Graphics Batch 5 Complete Semester"
  },
  "batch": {
    "name": "B.Des Graphics Batch 5",
    "semester": "ODD",
    "year": 2025,
    "department": "Design",
    "specialization": "Graphic Design"
  },
  "dateRange": {
    "startDate": "2025-07-01",
    "endDate": "2025-12-15"
  },
  "entries": [
    // Same entry format works for any batch
  ]
}
```

## Validation Rules

1. **Required Fields**: type, date, dayOfWeek are mandatory for all entries
2. **Date Format**: All dates must be in YYYY-MM-DD format
3. **Time Format**: All times must be in HH:MM format (24-hour)
4. **Unique Constraints**: No duplicate entries for same batch + date + timeSlot
5. **Faculty Email**: Must be valid email format
6. **Colors**: Must be valid hex colors (#rrggbb)
7. **Credits**: Must be positive integers
8. **Day of Week**: Must match the actual day of the provided date

## API Endpoints

### Import Timetable Data
```
POST /api/timetable/import
Content-Type: application/json

{
  // JSON data following above schema
}
```

### Validate JSON Before Import
```
POST /api/timetable/validate
Content-Type: application/json

{
  // JSON data following above schema
}
```

### Get Import Status
```
GET /api/timetable/import/{importId}/status
```

## Error Handling

The API will return detailed validation errors:

```json
{
  "success": false,
  "errors": [
    {
      "field": "entries[0].subject.code",
      "message": "Subject code is required for SUBJECT type entries",
      "value": null
    },
    {
      "field": "entries[5].date", 
      "message": "Date format must be YYYY-MM-DD",
      "value": "15/08/2025"
    }
  ],
  "summary": {
    "totalEntries": 150,
    "validEntries": 148,
    "invalidEntries": 2,
    "warnings": 3
  }
}
```

## Notes

- The system automatically creates batches, subjects, and faculty if they don't exist
- Time slots are created/updated as needed
- Duplicate entries are handled gracefully with warnings
- The same JSON format works for any batch - just change the batch object
- Supports both date-specific and recurring entries
- Comprehensive validation ensures data integrity