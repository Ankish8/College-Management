import { DayOfWeek, EntryType } from '@prisma/client'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  className?: string
  extendedProps?: {
    timetableEntryId: string
    batchId: string
    batchName: string
    subjectId: string
    subjectName: string
    subjectCode: string
    facultyId: string
    facultyName: string
    timeSlotId: string
    timeSlotName: string
    dayOfWeek: DayOfWeek
    entryType: EntryType
    notes?: string
    credits: number
    specialization?: {
      name: string
      shortName: string
    }
    program?: {
      name: string
      shortName: string
    }
  }
}

export interface TimetableEntry {
  id: string
  batchId: string
  subjectId: string
  facultyId: string
  timeSlotId: string
  dayOfWeek: DayOfWeek
  date: Date | null
  entryType: EntryType
  isActive: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
  batch: {
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
    specialization: {
      name: string
      shortName: string
    }
  }
  subject: {
    name: string
    code: string
    credits: number
  }
  faculty: {
    name: string
    email: string
  }
  timeSlot: {
    name: string
    startTime: string
    endTime: string
    duration: number
  }
}

export interface TimetableFilters {
  batchId?: string
  specializationId?: string
  facultyId?: string
  subjectId?: string
  dateFrom?: string
  dateTo?: string
  dayOfWeek?: DayOfWeek
  entryType?: EntryType
  view?: CalendarView
}

export interface CalendarViewState {
  currentDate: Date
  view: CalendarView
  selectedEvent?: CalendarEvent
  filters: TimetableFilters
}

export interface TimeSlotMergeGroup {
  startTime: string
  endTime: string
  events: CalendarEvent[]
  duration: number
  isConsecutive: boolean
}

export interface ConflictInfo {
  type: 'BATCH_DOUBLE_BOOKING' | 'FACULTY_CONFLICT' | 'MODULE_OVERLAP' | 'HOLIDAY_SCHEDULING' | 'EXAM_PERIOD_CONFLICT'
  message: string
  details: any[]
}

export interface CreateTimetableEntryData {
  batchId: string
  subjectId: string
  facultyId: string
  timeSlotId: string
  dayOfWeek: DayOfWeek
  date?: string
  entryType?: EntryType
  notes?: string
}

export type CalendarView = 'day' | 'week' | 'month' | 'year'

// Re-export from Prisma for consistency
export { DayOfWeek, EntryType } from '@prisma/client'

export interface CalendarEventColors {
  subject: { [key: string]: string }
  faculty: { [key: string]: string }
  batch: { [key: string]: string }
  entryType: { [key in EntryType]: string }
}

export interface TimetableViewProps {
  events: CalendarEvent[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  onEventDrop?: (eventId: string, newDate: Date, newTimeSlot: string, newDayOfWeek: string) => void
  filters: TimetableFilters
  onFiltersChange: (filters: TimetableFilters) => void
  isLoading?: boolean
  conflicts?: ConflictInfo[]
}

export interface CalendarHeaderProps {
  currentDate: Date
  view: CalendarView
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  showFilters?: boolean
  onFiltersToggle?: () => void
}

export interface CalendarFiltersProps {
  filters: TimetableFilters
  onFiltersChange: (filters: TimetableFilters) => void
  onReset: () => void
  availableOptions: {
    batches: Array<{ id: string; name: string; specialization: { name: string } }>
    specializations: Array<{ id: string; name: string }>
    faculty: Array<{ id: string; name: string }>
    subjects: Array<{ id: string; name: string; code: string }>
  }
}