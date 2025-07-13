# Timetable System - Product Requirements Document (PRD)

## Executive Summary

### Project Overview
Comprehensive timetable management system for JLU Design Department supporting both module-based and traditional weekly scheduling with advanced conflict detection, real-time collaboration, and mobile-optimized user experience.

### Key Objectives
- **Performance**: Fast loading, real-time updates, optimized user experience
- **Flexibility**: Support module-based and weekly recurring schedules
- **Usability**: Intuitive interface for students, faculty, and administrators
- **Integration**: Seamless integration with existing dashboard and future attendance system

## Product Scope

### Core Features
1. **Timetable Viewing** - Multi-view calendar with filtering
2. **Timetable Management** - Admin creation and editing interface  
3. **Time Slot Management** - Configurable time periods and breaks
4. **Academic Calendar** - Semester boundaries, holidays, exam periods
5. **Conflict Detection** - Advanced validation and resolution system

### Target Users
- **Students**: View personal batch timetables (auto-filtered)
- **Faculty**: View teaching schedules, manage preferences
- **Administrators**: Full timetable management and configuration

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **UI Library**: Shadcn/UI components with Tailwind CSS
- **Calendar Component**: Full Calendar for shadcn/ui (github.com/dninomiya/full-calendar-for-shadcn-ui)
- **State Management**: React Query for server state, React hooks for client state
- **Real-time**: WebSocket integration for live updates

### Backend Integration
- **Database**: Existing Prisma schema with SQLite
- **API Routes**: Next.js API routes with type safety
- **Authentication**: NextAuth v4 integration
- **Permissions**: Role-based access control

### Database Models (Utilizing Existing Schema)
```typescript
// Core Models
TimetableEntry {
  id, batchId, subjectId, facultyId, timeSlotId
  dayOfWeek, date, entryType, isActive, notes
}

TimeSlot {
  id, name, startTime, endTime, duration
  isActive, sortOrder
}

// New Models Required
AcademicCalendar {
  id, departmentId, semesterStart, semesterEnd
  holidays, examPeriods
}

TimetableTemplate {
  id, batchId, subjectId, facultyId, timeSlotId
  dayOfWeek, recurrencePattern, endCondition
}
```

## Feature Specifications

### 1. Timetable Viewing Interface

#### Calendar Views
- **Day View**: Single day detailed schedule
- **Week View**: Weekly grid with time slots × days
- **Month View**: Monthly overview with class indicators
- **Year View**: Annual semester overview

#### Filtering System
- **Primary Filters**: Batch, Specialization (required)
- **Secondary Filters**: Faculty, Subject, Date Range
- **Auto-filtering**: Students see only their batch
- **Filter Persistence**: Remember user preferences

#### Visual Design
- **Color Coding**: By subject/faculty/batch
- **Entry Display**: "Subject Name + Faculty Name"
- **Merged Slots**: Single block for adjacent same subject/faculty
- **Break Indicators**: Visual breaks between time slots
- **Responsive**: Mobile-first design with touch optimization

### 2. Timetable Management (Admin)

#### Creation Workflow
1. **Batch Selection**: Choose target batch and specialization
2. **Time Slot Selection**: Pick from available time slots
3. **Subject Assignment**: Auto-fill primary faculty with override
4. **Recurrence Configuration**: Daily/weekly/monthly patterns
5. **Conflict Resolution**: Real-time validation with suggestions
6. **Bulk Operations**: Template-based creation and drag & drop

#### Conflict Detection Engine
```typescript
ConflictTypes {
  BATCH_DOUBLE_BOOKING    // Same batch, same time
  FACULTY_CONFLICT        // Faculty teaching multiple classes
  MODULE_OVERLAP         // Full-day module conflicts
  HOLIDAY_SCHEDULING     // Classes on holidays
  EXAM_PERIOD_CONFLICT   // Regular classes during exams
}

ConflictResolution {
  WARNING_POPUP          // Show conflict details
  ALTERNATIVE_SUGGESTIONS // Empty slots for batch
  BATCH_RESOLUTION       // Mass conflict handling
  AUTO_RESOLVE          // Find next available slot
  FORCE_OVERRIDE        // Admin override with warning
}
```

#### Template System
- **Immediate Generation**: Create specific date entries when template is created
- **Exception Handling**: Modify template + skip entry for date changes
- **Recurrence Patterns**: Until semester end, specific date, or hour completion
- **Change Scope**: "Apply to all future" vs "This occurrence only"

### 3. Time Slot Management

#### Time Slot Builder Interface
- **Visual Time Picker**: Drag-based time selection
- **Bulk Creation**: Generate multiple slots (e.g., 9 AM - 5 PM)
- **Break Integration**: Automatic break insertion
- **Validation**: Prevent overlapping slots
- **Sorting**: Auto-sort by start time

#### Break Management
- **Default Breaks**: Lunch break (12:30-1:15)
- **Custom Breaks**: Name, duration, timing configuration
- **Break Types**: Short (15 min), Lunch (45-60 min), Custom
- **Visual Integration**: Show breaks in timetable views
- **Module Breaks**: Custom breaks within full-day modules

#### Time Slot Intelligence
- **Merging Logic**: Adjacent slots with same subject + faculty
- **Odd Durations**: Support 1.5 hour classes, custom lengths
- **Overlap Handling**: 2-hour lectures spanning multiple slots
- **Module Slots**: Special full-day and half-day time slots

### 4. Academic Calendar Management

#### Semester Configuration
- **Boundaries**: Configurable start/end dates per department
- **Multiple Semesters**: 2 semesters per year support
- **Academic Years**: Overlapping year management

#### Holiday Management
```typescript
Holiday {
  id, name, date, type, departmentId
  isRecurring, description
}

HolidayTypes {
  NATIONAL,    // National holidays
  UNIVERSITY,  // University-wide holidays  
  DEPARTMENT,  // Department-specific holidays
  LOCAL        // Custom local holidays
}
```

#### Exam Period Management
- **Exam Types**: Internal, External, Practical exams
- **Class Restrictions**: Block regular classes by default
- **Special Classes**: Allow exam review sessions
- **Custom Rules**: Department-specific exam configurations

### 5. Mobile User Experience

#### Touch Interactions
- **Long Press**: Start drag & drop operations
- **Swipe Navigation**: Navigate between dates/views
- **Pinch Zoom**: Zoom in/out on weekly view
- **Touch Targets**: Minimum 44px touch targets

#### Mobile-Optimized Views
- **Priority**: Day view as default for mobile
- **Vertical Scrolling**: Week view scrolls vertically
- **Simplified Month**: Show class count per day
- **Responsive Breakpoints**: < 768px mobile, >= 768px desktop

## Performance Requirements

### Loading Performance
- **Initial Load**: < 2 seconds for current month
- **Navigation**: < 500ms for view transitions
- **Caching**: 30-day cache for timetable data
- **Lazy Loading**: Load additional months on demand

### Real-time Updates
- **WebSocket**: Live updates for all connected users
- **Conflict Resolution**: Real-time validation during editing
- **Optimistic Updates**: Immediate UI feedback
- **Error Handling**: Graceful fallback for connection issues

### Scalability Targets
- **Concurrent Users**: 100+ simultaneous users
- **Data Volume**: 10,000+ timetable entries per semester
- **Response Time**: < 100ms for API responses
- **Uptime**: 99.9% availability

## Settings & Configuration

### Multi-Level Settings Hierarchy
```
Department Level
├── Scheduling Mode (Module vs Weekly)
├── Academic Calendar Settings
├── Default Time Slots
└── Holiday Calendar

Program Level  
├── Time Slot Definitions
├── Exam Period Rules
└── Credit Hour Policies

Batch Level
├── Custom Break Timings
├── Special Class Types
└── Schedule Overrides
```

### Settings Access Points
- **Gear Icon**: Quick settings on timetable pages
- **Main Settings**: Comprehensive configuration in settings section
- **Context Settings**: Batch/program specific settings

### Faculty Preferences
- **Preferred Time Slots**: Faculty teaching preferences
- **Blackout Periods**: Unavailable time periods
- **Maximum Hours**: Daily teaching limits
- **Notification Settings**: Schedule change alerts

## Integration Points

### Navigation Integration
```
Main Navigation > Timetable
├── Timetable View     (Students, Faculty, Admin)
├── Manage Timetable   (Admin only)
└── Time Slots         (Admin only)
```

### Future Integration (Prepared)
- **Attendance Auto-Creation**: Generate attendance sessions
- **Attendance Linking**: Quick access to attendance records
- **Status Display**: Show attendance completion in calendar

### API Endpoints Structure
```
/api/timetable
├── GET /entries          # Get timetable entries with filters
├── POST /entries         # Create new timetable entry
├── PUT /entries/[id]     # Update specific entry
├── DELETE /entries/[id]  # Delete entry
├── POST /bulk-create     # Bulk creation operations
└── GET /conflicts        # Check for conflicts

/api/timeslots
├── GET /                 # Get all time slots
├── POST /                # Create new time slot
├── PUT /[id]             # Update time slot
└── DELETE /[id]          # Delete time slot

/api/academic-calendar
├── GET /holidays         # Get holidays for department
├── POST /holidays        # Add new holiday
├── GET /exam-periods     # Get exam periods
└── POST /exam-periods    # Create exam period
```

## Success Metrics

### User Experience Metrics
- **Task Completion Rate**: 95%+ for common tasks
- **User Satisfaction**: 4.5+ rating
- **Error Rate**: < 2% for timetable operations
- **Support Tickets**: < 5% of active users

### Performance Metrics  
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 100ms average
- **Uptime**: 99.9%
- **Cache Hit Rate**: > 85%

### Business Metrics
- **Admin Productivity**: 50% faster timetable creation
- **Conflict Reduction**: 80% fewer scheduling conflicts
- **Mobile Usage**: 30%+ of traffic from mobile devices
- **Feature Adoption**: 90%+ of users using filters

## Development Timeline & Milestones

### Phase 1: Foundation (Week 1-2)
- Database schema updates
- Basic API endpoints
- Calendar component integration
- Authentication integration

### Phase 2: Core Features (Week 3-4)
- Timetable viewing interface
- Basic CRUD operations
- Time slot management
- Filter system

### Phase 3: Advanced Features (Week 5-6)
- Conflict detection engine
- Template system
- Bulk operations
- Mobile optimization

### Phase 4: Polish & Integration (Week 7-8)
- Performance optimization
- Real-time updates
- Settings interface
- Testing & bug fixes

## Risk Assessment & Mitigation

### Technical Risks
- **Calendar Component Complexity**: Mitigation - Use proven shadcn calendar
- **Real-time Performance**: Mitigation - Implement efficient WebSocket handling
- **Mobile Responsiveness**: Mitigation - Mobile-first design approach

### User Experience Risks
- **Learning Curve**: Mitigation - Intuitive interface design, contextual help
- **Conflict Resolution**: Mitigation - Clear visual feedback, guided resolution
- **Data Loss**: Mitigation - Auto-save, version control, backup systems

### Business Risks
- **Performance Issues**: Mitigation - Load testing, caching strategy
- **Adoption Resistance**: Mitigation - Gradual rollout, training materials
- **Integration Complexity**: Mitigation - API-first design, modular architecture

## Conclusion

This PRD defines a comprehensive timetable system that balances powerful functionality with user-friendly design. The phased approach ensures rapid iteration while maintaining code quality and user experience standards. Success will be measured through user adoption, performance metrics, and business value delivery.