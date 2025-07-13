# Timetable System Requirements

## Overview
Building a comprehensive timetable system for student scheduling with support for both module-based (Design Department default) and regular weekly recurring schedules.

## Core Features

### 1. Module vs Regular Scheduling
- **Module-based (Default for Design Department)**: Full semester duration subjects
- **Weekly Recurring**: Traditional weekly schedule for other departments
- **Toggle Setting**: Department-level setting to switch between modes
- **Flexible Duration Options**: 4-6 weeks, custom weeks, until hours completed

### 2. Time Slot Management
- **Regular Time Slots**: e.g., 09:45-10:30, 11:00-11:45, 12:00-13:00
- **Module Time Slots**: 
  - Full Day (e.g., 9:00-17:00) - blocks all individual slots
  - Half Day (e.g., 9:00-13:00)
  - Custom duration (e.g., 2 hours)
- **Break Management**: 
  - Lunch breaks (default included)
  - Short breaks between classes
  - Fully customizable in settings (name, duration, timing)
  - Display as separate entries with different visual styling

### 3. Calendar Views (Using shadcn-ui Full Calendar)
- **Day View**: Individual day schedule
- **Week View**: Weekly grid view
- **Month View**: Monthly overview
- **Year View**: Annual overview
- **Navigation**: Previous/Next/Today buttons, current date display

### 4. Filtering & Search
- **Primary Filters**: Batch, Specialization
- **Additional Filters**: Faculty, Subject, Date Range
- **Admin Panel**: Extended filter options

### 5. Faculty Management
- **Auto-fill**: Primary faculty from subject assignment
- **Override Options**: Select from all available faculty
- **Substitute Faculty**: Temporary changes for specific dates
- **Permanent Reassignment**: Mid-semester faculty changes
- **Guest Lectures**: External faculty support
- **Master Classes**: Online workshops and special sessions

## Academic Calendar Integration

### 1. Semester Management
- **Semester Boundaries**: Configurable semester start/end dates per department
- **Academic Holidays**: Structured storage with holiday name, type (national/university/department)
- **Exam Periods**: Block regular classes by default, allow special exam review classes
- **Exam Types**: Different types (internal/external/practical) with different restrictions
- **Multiple Semesters**: Support 2 semesters per year (e.g., Jan-Apr/May, Aug-Dec)
- **Holiday Handling**: Auto-skip recurring classes on holidays, show "Holiday - No Class"

### 2. Cross-Semester Support
- **Academic Year Overlap**: Different academic years running simultaneously
- **Department-Level Configuration**: Each department can have different calendar settings

## Advanced Features

### 1. Conflict Detection & Resolution
- **Same Batch Conflicts**: Prevent double-booking time slots
- **Faculty Conflicts**: Prevent faculty teaching multiple classes simultaneously
- **Module Conflicts**: Block other entries when full-day module scheduled
- **Conflict UI**: Show popup with conflict details, highlight in red
- **Alternative Suggestions**: Show only empty slots for batch, suggest different days
- **Mass Conflict Resolution**: Batch conflict resolution interface with auto-resolve option
- **Override System**: Allow "Force Save" with warnings
- **Substitute Classes**: Create makeup/replacement class types

### 2. Recurrence Logic
- **Recurring Patterns**: Daily, weekly, monthly options
- **End Conditions**:
  - Specific end date
  - Total subject hours completion
  - End of semester/academic year
- **Change Scope**: Apply changes to "All future" vs "This occurrence only"
- **Credit Hours Alignment**: Consider credit hours vs allocated hours
- **Extra Hours**: Support cases where faculty needs more than allocated hours

### 3. Time Slot Intelligence
- **Overlapping Classes**: Handle 2-hour lectures spanning multiple 1-hour slots
- **Adjacent Merging**: Merge consecutive slots for same subject/faculty
- **Odd Duration Support**: Handle 1.5 hour classes and custom durations
- **Break Integration**: Show lunch breaks within full-day modules, allow custom breaks

### 3. Bulk Creation & Templates
- **One-by-one Creation**: Individual entry creation
- **Template-based**: Select subjects, auto-assign time slots
- **Drag & Drop**: Time slot assignment interface
- **Batch Operations**: Multiple entries creation
- **NO Excel/CSV Import**: Not implementing for now
- **NO Copy Previous Semester**: Not implementing for now

### 4. Visual Design & UX
- **Color Coding**: By subject/faculty/batch
- **Display Format**: Subject name + Faculty name
- **Click to Edit**: Inline editing functionality
- **Responsive Design**: Mobile and desktop compatibility
- **Theme Support**: Light/dark mode

## Data Storage Strategy

### Template Implementation
- **Immediate Generation**: Create all specific date entries for semester when template is created
- **Exception Handling**: Modify template + create skip entry for specific date changes
- **Batch Separation**: Separate TimetableEntry for each batch (even for shared subjects)
- **Performance**: Manageable entry count (not thousands), optimized for current semester

### Time Slot Merging Logic
- **Merge Criteria**: Only same subject + same faculty
- **Visual Display**: Show as single block (e.g., "Physics 10:00-12:00")
- **Break Integration**: Merged slot → Break → Merged slot pattern
- **Team Teaching**: Different faculty = separate blocks (no merging)

## User Access & Filtering

### Role-Based Views
- **Students**: Auto-filter to their own batch only, can't see other batches
- **Admin**: Full access to all batches with comprehensive filtering options
- **Faculty**: Personal teaching schedule (to be implemented later)

### Default Landing Behavior
- **Students**: Automatically show their batch timetable
- **Admin**: Show batch selection interface first
- **Mobile Priority**: Day view for mobile users, full features for desktop admin

## Mobile User Experience

### Touch Interactions
- **Drag & Drop**: Long-press to start dragging, optimized touch handling
- **Navigation**: Vertical scrollable week view, swipe gestures
- **Simplified Interface**: Mobile-optimized calendar views

## Performance & Scalability

### Loading Strategy
- **Initial Load**: Display current month only
- **Caching**: Implement caching strategy for frequently accessed data
- **Real-time Updates**: All changes sync in real-time across users
- **Optimization**: Focus on fast loading and smooth user experience

## Settings & Customization

### Multi-Level Settings Hierarchy
- **Department Level**: Overall scheduling mode, academic calendar, holiday management
- **Program Level**: Time slot definitions, exam period configurations
- **Batch Level**: Specific break timings (default same as department, customizable)

### Settings Access Points
- **Gear Icon**: Quick access settings on timetable pages
- **Main Settings Page**: Comprehensive settings in overall settings section

### Department Settings (Gear Icon)
- **Scheduling Mode**: Module vs Weekly toggle
- **Academic Calendar**: Semester boundaries, holidays, exam periods
- **Module Duration Options**: Full semester, 4-6 weeks, custom
- **Break Configuration**:
  - Number of breaks, types, names, duration, timing
  - Default lunch break settings
  - Custom breaks within modules
- **Time Slot Management**:
  - Custom time slot creation, different sets for different days
  - Overlapping slot handling, adjacent merging rules
- **Class Types**: 
  - Regular, Makeup, Extra, Special classes
  - Master classes, Workshops, Online sessions
  - Fully customizable via settings

### Time Slot Builder
- **Separate Page**: Dedicated interface for time slot management
- **Bulk Creation**: Create multiple time slots efficiently
- **Template Import**: Import from existing configurations

### Faculty Preferences
- **Preferred Time Slots**: Faculty can set preferred teaching times
- **Blackout Periods**: Mark unavailable times
- **Maximum Daily Hours**: Teaching hour limits
- **Workload Tracking**: Credit hour calculations (guest faculty excluded for now)

## Technical Implementation

### Database Structure (Existing)
- `TimetableEntry`: Core timetable records
- `TimeSlot`: Configurable time periods
- `Subject`: With credit hours and faculty assignment
- `Batch`: Student groups
- `DayOfWeek`: Monday-Sunday enum
- `EntryType`: Regular/Makeup/Extra/Special enum

### Calendar Component
- **Source**: https://github.com/dninomiya/full-calendar-for-shadcn-ui
- **Dependencies**: date-fns, react-hotkeys-hook
- **Features**: Multiple views, keyboard shortcuts, shadcn/ui base

### Integration Features (Future Implementation)
- **Attendance Auto-Creation**: Automatically create attendance sessions for each scheduled class
- **Attendance Linking**: Quick access to attendance records from calendar view
- **Status Display**: Show attendance completion status in timetable

### Permission Levels
- **Admin**: Full timetable management, settings configuration
- **Faculty**: View assigned schedules, limited editing
- **Students**: View-only access with filtering

## Navigation Structure

### Timetable Section Access
- **Timetable View**: Student/faculty calendar view
- **Manage Timetable**: Admin creation and editing interface
- **Time Slots**: Time slot builder and management
- **Integration**: Accessible from main navigation timetable section

## Special Cases & Constraints

### Supported Scenarios
- **Guest Lectures**: Special classes with no credit hours
- **Master Classes**: Online workshops and sessions
- **Workshops**: Special events with custom scheduling

### Not Supported (Out of Scope)
- **Midnight Crossing Classes**: No classes spanning across midnight
- **Zero-Credit Classes**: Regular classes must have credits
- **Guest Faculty Workload**: No workload calculation for guest faculty

## User Workflows

### Admin Timetable Creation
1. Select batch and specialization
2. Choose time slot and day
3. Auto-fill subject's primary faculty (with override option)
4. Set recurrence pattern
5. Handle conflicts with warnings
6. Save with validation

### Student Timetable Viewing
1. Filter by batch/specialization
2. Select preferred view (day/week/month)
3. Navigate through dates
4. View subject and faculty details

### Faculty Schedule Management
1. View assigned classes
2. Request substitutes for specific dates
3. Add guest lectures/workshops
4. View workload and credit hours

## Success Metrics
- Fast timetable creation (improved UX)
- Conflict-free scheduling
- Flexible module and weekly support
- Intuitive calendar navigation
- Comprehensive customization options