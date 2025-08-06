# Timetable Import API Documentation

## Overview

The Timetable Import API provides a comprehensive system for importing timetable data from standardized JSON format into the college management system. This API is designed to work with any batch (Batch 3, Batch 5, etc.) without modification.

## Workflow

1. **Convert Excel → JSON**: Convert your Excel timetable data to the standardized JSON format
2. **Validate JSON**: Use the validation endpoint to check format and business logic
3. **Import Data**: Use the import endpoint to process and store the data
4. **Monitor Progress**: Track import status using the status endpoint

## API Endpoints

### 1. Validate JSON Format

**Endpoint**: `POST /api/timetable/validate`

Validates JSON format and business logic without importing data into the database.

```bash
curl -X POST https://your-domain.com/api/timetable/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d @timetable-data.json
```

**Response Examples**:

✅ **Success Response**:
```json
{
  "success": true,
  "message": "Validation successful",
  "errors": [],
  "warnings": [
    "Batch 'B.Des UX Batch 3' already exists. Import will use existing batch."
  ],
  "summary": {
    "totalEntries": 150,
    "subjectEntries": 120,
    "customEventEntries": 25,
    "holidayEntries": 5,
    "timeSlots": 4,
    "dateRange": "2025-07-28 to 2025-09-05",
    "batch": "B.Des UX Batch 3",
    "department": "Design",
    "validationPassed": true
  },
  "validation": {
    "schemaValid": true,
    "businessLogicValid": true,
    "warningsCount": 1
  }
}
```

❌ **Error Response**:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "entries[0].subject.code",
      "message": "Subject code is required for SUBJECT type entries",
      "value": "invalid_type",
      "code": "invalid_type"
    },
    {
      "field": "batch.department",
      "message": "Department 'Graphics' does not exist in the system",
      "value": "Graphics",
      "code": "not_found"
    }
  ],
  "summary": {
    "totalEntries": 150,
    "subjectEntries": 120,
    "customEventEntries": 25,
    "holidayEntries": 5,
    "validationPassed": false
  }
}
```

### 2. Import Timetable Data

**Endpoint**: `POST /api/timetable/import`

Imports validated JSON data into the database.

```bash
curl -X POST https://your-domain.com/api/timetable/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d @timetable-data.json
```

**Response**:
```json
{
  "success": true,
  "message": "Import initiated successfully",
  "importId": "batch3-week3-7-import",
  "statusUrl": "/api/timetable/import/batch3-week3-7-import/status"
}
```

### 3. Check Import Status

**Endpoint**: `GET /api/timetable/import/{importId}/status`

Monitor the progress of an import operation.

```bash
curl -X GET https://your-domain.com/api/timetable/import/batch3-week3-7-import/status \
  -H "Authorization: Bearer your-token"
```

**Response Examples**:

🔄 **Processing**:
```json
{
  "importId": "batch3-week3-7-import",
  "status": "PROCESSING",
  "progress": 65,
  "timeElapsed": {
    "minutes": 2,
    "seconds": 30,
    "totalMs": 150000
  },
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:02:30.000Z",
  "estimation": {
    "totalTimeMs": 230769,
    "remainingTimeMs": 80769,
    "remainingSeconds": 81,
    "expectedCompletion": "2025-01-06T10:03:51.000Z"
  }
}
```

✅ **Completed**:
```json
{
  "importId": "batch3-week3-7-import",
  "status": "COMPLETED",
  "progress": 100,
  "timeElapsed": {
    "minutes": 3,
    "seconds": 45,
    "totalMs": 225000
  },
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:03:45.000Z",
  "results": {
    "batchesCreated": 0,
    "subjectsCreated": 8,
    "facultyCreated": 3,
    "timeSlotsCreated": 2,
    "entriesCreated": 138,
    "holidaysCreated": 2,
    "customEventsCreated": 15,
    "warnings": [
      "Created new specialization: User Experience Design",
      "Duplicate entry skipped: FRIDAY 10:15-11:05 on 2025-08-01"
    ]
  },
  "summary": {
    "success": true,
    "message": "Import completed successfully",
    "batchesCreated": 0,
    "subjectsCreated": 8,
    "facultyCreated": 3,
    "timeSlotsCreated": 2,
    "entriesCreated": 138,
    "holidaysCreated": 2,
    "customEventsCreated": 15
  }
}
```

❌ **Failed**:
```json
{
  "importId": "batch3-week3-7-import",
  "status": "FAILED",
  "progress": 100,
  "timeElapsed": {
    "minutes": 1,
    "seconds": 15,
    "totalMs": 75000
  },
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:01:15.000Z",
  "errors": [
    {
      "message": "Department 'Graphics' not found. Please create the department first."
    }
  ],
  "summary": {
    "success": false,
    "message": "Import failed",
    "errorCount": 1
  }
}
```

### 4. Delete Import Status

**Endpoint**: `DELETE /api/timetable/import/{importId}/status`

Remove import status from tracking (only for completed/failed imports).

```bash
curl -X DELETE https://your-domain.com/api/timetable/import/batch3-week3-7-import/status \
  -H "Authorization: Bearer your-token"
```

## Complete Usage Example

### Step 1: Prepare JSON Data

Create a file `batch3-weeks3-7.json`:

```json
{
  "metadata": {
    "importId": "batch3-weeks3-7-2025",
    "createdAt": "2025-01-06T10:00:00Z",
    "description": "B.Des UX Batch 3 Weeks 3-7 Timetable"
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
      "notes": "Special session on sustainability"
    },
    {
      "type": "CUSTOM_EVENT",
      "date": "2025-07-29",
      "dayOfWeek": "TUESDAY",
      "timeSlot": "11:15-12:05",
      "title": "University Level Clubs",
      "description": "Student club activities and orientation",
      "color": "#3b82f6",
      "recurring": false
    },
    {
      "type": "HOLIDAY",
      "date": "2025-08-15",
      "name": "Independence Day",
      "description": "National Holiday - India's Independence Day",
      "holidayType": "NATIONAL",
      "isRecurring": false
    }
  ]
}
```

### Step 2: Validate Before Import

```bash
# Validate the JSON first
curl -X POST http://localhost:3000/api/timetable/validate \
  -H "Content-Type: application/json" \
  -d @batch3-weeks3-7.json

# Check the response for any errors or warnings
```

### Step 3: Import Data

```bash
# If validation passes, import the data
curl -X POST http://localhost:3000/api/timetable/import \
  -H "Content-Type: application/json" \
  -d @batch3-weeks3-7.json
```

### Step 4: Monitor Progress

```bash
# Monitor import progress
curl -X GET http://localhost:3000/api/timetable/import/batch3-weeks3-7-2025/status

# Keep checking until status is COMPLETED or FAILED
```

## Batch-Agnostic Usage

The same API works for any batch. Just change the batch information:

### For Batch 5:
```json
{
  "metadata": {
    "importId": "batch5-semester1-2025",
    "description": "B.Des Graphics Batch 5 Complete Semester"
  },
  "batch": {
    "name": "B.Des Graphics Batch 5",
    "semester": "ODD",
    "year": 2025,
    "department": "Design",
    "specialization": "Graphic Design"
  },
  // ... rest of the data follows same format
}
```

### For Any Department:
```json
{
  "metadata": {
    "importId": "engineering-batch2-2025",
    "description": "Computer Science Batch 2"
  },
  "batch": {
    "name": "CSE Batch 2",
    "semester": "EVEN",
    "year": 2025,
    "department": "Computer Science",
    "specialization": "Artificial Intelligence"
  },
  // ... same entry format works
}
```

## Error Handling

### Common Validation Errors

1. **Department Not Found**:
   ```json
   {
     "field": "batch.department",
     "message": "Department 'Graphics' does not exist in the system",
     "code": "not_found"
   }
   ```
   **Solution**: Create the department first or use correct department name.

2. **Invalid Date Format**:
   ```json
   {
     "field": "entries[5].date",
     "message": "Date must be YYYY-MM-DD format",
     "code": "invalid_string"
   }
   ```
   **Solution**: Use YYYY-MM-DD format (e.g., "2025-08-15").

3. **Missing Required Fields**:
   ```json
   {
     "field": "entries[0].subject.code",
     "message": "Subject code is required for SUBJECT type entries",
     "code": "invalid_type"
   }
   ```
   **Solution**: Ensure all required fields are provided.

4. **Invalid Email**:
   ```json
   {
     "field": "entries[2].faculty.email",
     "message": "Faculty email must be valid",
     "code": "invalid_string"
   }
   ```
   **Solution**: Use valid email format (e.g., "faculty@jlu.edu.in").

### Import Errors

1. **Database Connection Issues**: Retry after some time
2. **Constraint Violations**: Check for existing conflicting data
3. **Permission Issues**: Ensure proper authentication

## Best Practices

### 1. Always Validate First
```bash
# Always validate before importing
curl -X POST /api/timetable/validate -d @data.json
# Only proceed with import if validation passes
curl -X POST /api/timetable/import -d @data.json
```

### 2. Use Meaningful Import IDs
```json
{
  "metadata": {
    "importId": "batch3-week3-7-2025-jan06",  // Good: descriptive and unique
    "importId": "import123"                    // Bad: generic
  }
}
```

### 3. Monitor Large Imports
```bash
# For large imports (>100 entries), monitor progress
while true; do
  STATUS=$(curl -s /api/timetable/import/your-id/status | jq -r '.status')
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  sleep 5
done
```

### 4. Handle Warnings Appropriately
- Review all warnings in validation response
- Warnings don't prevent import but indicate potential issues
- Common warnings:
  - Existing batch will be used
  - Different faculty assigned to same subject
  - Time slot format inconsistencies

### 5. Clean Up Import Status
```bash
# Delete completed import status to save memory
curl -X DELETE /api/timetable/import/batch3-week3-7-2025/status
```

## Schema Reference

For complete JSON schema specification, see: [TIMETABLE_JSON_SCHEMA.md](./TIMETABLE_JSON_SCHEMA.md)

## Authentication

All endpoints require authentication:
- Include session cookies for web requests
- Use proper Authorization headers for API calls
- Ensure user has appropriate permissions (Admin/Faculty)

## Rate Limits

- Validation: 10 requests per minute
- Import: 2 concurrent imports per user
- Status: 30 requests per minute

## Support

For additional help:
1. Check the JSON schema documentation
2. Use the validation endpoint to identify issues
3. Review error messages and codes
4. Monitor import status for detailed progress

## Changelog

- **v1.0.0**: Initial release with basic import functionality
- **v1.1.0**: Added comprehensive validation and status tracking
- **v1.2.0**: Added support for custom events and holidays
- **v1.3.0**: Enhanced error handling and progress estimation