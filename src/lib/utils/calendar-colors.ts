import { CalendarEvent, CalendarEventColors, EntryType } from '@/types/timetable'

// Predefined color palette for subjects
const SUBJECT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-sky-500'
]

// Faculty colors (lighter variants)
const FACULTY_COLORS = [
  'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400',
  'bg-cyan-400', 'bg-yellow-400', 'bg-red-400', 'bg-indigo-400', 'bg-teal-400',
  'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-violet-400', 'bg-sky-400'
]

// Batch colors (darker variants)
const BATCH_COLORS = [
  'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-yellow-600', 'bg-red-600', 'bg-indigo-600', 'bg-teal-600',
  'bg-rose-600', 'bg-amber-600', 'bg-emerald-600', 'bg-violet-600', 'bg-sky-600'
]

// Entry type specific colors
const ENTRY_TYPE_COLORS: { [key in EntryType]: string } = {
  REGULAR: 'bg-blue-500',
  MAKEUP: 'bg-orange-500',
  EXTRA: 'bg-green-500',
  SPECIAL: 'bg-purple-500'
}

// Text color variants for contrast
const TEXT_COLORS = {
  'bg-blue-500': 'text-white',
  'bg-green-500': 'text-white',
  'bg-purple-500': 'text-white',
  'bg-orange-500': 'text-white',
  'bg-pink-500': 'text-white',
  'bg-cyan-500': 'text-white',
  'bg-yellow-500': 'text-black',
  'bg-red-500': 'text-white',
  'bg-indigo-500': 'text-white',
  'bg-teal-500': 'text-white',
  'bg-rose-500': 'text-white',
  'bg-amber-500': 'text-black',
  'bg-emerald-500': 'text-white',
  'bg-violet-500': 'text-white',
  'bg-sky-500': 'text-white',
  // Lighter variants
  'bg-blue-400': 'text-white',
  'bg-green-400': 'text-white',
  'bg-purple-400': 'text-white',
  'bg-orange-400': 'text-white',
  'bg-pink-400': 'text-white',
  'bg-cyan-400': 'text-white',
  'bg-yellow-400': 'text-black',
  'bg-red-400': 'text-white',
  'bg-indigo-400': 'text-white',
  'bg-teal-400': 'text-white',
  'bg-rose-400': 'text-white',
  'bg-amber-400': 'text-black',
  'bg-emerald-400': 'text-white',
  'bg-violet-400': 'text-white',
  'bg-sky-400': 'text-white',
  // Darker variants
  'bg-blue-600': 'text-white',
  'bg-green-600': 'text-white',
  'bg-purple-600': 'text-white',
  'bg-orange-600': 'text-white',
  'bg-pink-600': 'text-white',
  'bg-cyan-600': 'text-white',
  'bg-yellow-600': 'text-white',
  'bg-red-600': 'text-white',
  'bg-indigo-600': 'text-white',
  'bg-teal-600': 'text-white',
  'bg-rose-600': 'text-white',
  'bg-amber-600': 'text-white',
  'bg-emerald-600': 'text-white',
  'bg-violet-600': 'text-white',
  'bg-sky-600': 'text-white'
}

/**
 * Generate a consistent hash for a string to map to colors
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get color for a subject based on its ID or name
 */
export function getSubjectColor(subjectId: string, subjectName?: string): string {
  const hash = hashString(subjectId + (subjectName || ''))
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length]
}

/**
 * Get color for a faculty based on their ID or name
 */
export function getFacultyColor(facultyId: string, facultyName?: string): string {
  const hash = hashString(facultyId + (facultyName || ''))
  return FACULTY_COLORS[hash % FACULTY_COLORS.length]
}

/**
 * Get color for a batch based on its ID or name
 */
export function getBatchColor(batchId: string, batchName?: string): string {
  const hash = hashString(batchId + (batchName || ''))
  return BATCH_COLORS[hash % BATCH_COLORS.length]
}

/**
 * Get color for an entry type
 */
export function getEntryTypeColor(entryType: EntryType): string {
  return ENTRY_TYPE_COLORS[entryType]
}

/**
 * Get appropriate text color for background color
 */
export function getTextColor(backgroundColor: string): string {
  return TEXT_COLORS[backgroundColor as keyof typeof TEXT_COLORS] || 'text-white'
}

/**
 * Get event color based on color coding preference
 */
export function getEventColor(
  event: CalendarEvent,
  colorBy: 'subject' | 'faculty' | 'batch' | 'entryType' = 'subject'
): { background: string; text: string } {
  let backgroundColor: string

  switch (colorBy) {
    case 'subject':
      backgroundColor = getSubjectColor(
        event.extendedProps?.subjectId || '',
        event.extendedProps?.subjectName
      )
      break
    case 'faculty':
      backgroundColor = getFacultyColor(
        event.extendedProps?.facultyId || '',
        event.extendedProps?.facultyName
      )
      break
    case 'batch':
      backgroundColor = getBatchColor(
        event.extendedProps?.batchId || '',
        event.extendedProps?.batchName
      )
      break
    case 'entryType':
      backgroundColor = getEntryTypeColor(
        event.extendedProps?.entryType || 'REGULAR'
      )
      break
    default:
      backgroundColor = 'bg-blue-500'
  }

  return {
    background: backgroundColor,
    text: getTextColor(backgroundColor)
  }
}

/**
 * Get border color variant for a background color
 */
export function getBorderColor(backgroundColor: string): string {
  return backgroundColor.replace('bg-', 'border-').replace('-500', '-600')
}

/**
 * Get hover color variant for a background color
 */
export function getHoverColor(backgroundColor: string): string {
  return backgroundColor.replace('-500', '-600')
    .replace('-400', '-500')
    .replace('-600', '-700')
}

/**
 * Generate color legend for UI display
 */
export function generateColorLegend(
  events: CalendarEvent[],
  colorBy: 'subject' | 'faculty' | 'batch' | 'entryType' = 'subject'
): Array<{ id: string; name: string; color: string }> {
  const uniqueItems = new Map<string, { name: string; color: string }>()

  events.forEach(event => {
    let id: string
    let name: string

    switch (colorBy) {
      case 'subject':
        id = event.extendedProps?.subjectId || ''
        name = event.extendedProps?.subjectName || ''
        break
      case 'faculty':
        id = event.extendedProps?.facultyId || ''
        name = event.extendedProps?.facultyName || ''
        break
      case 'batch':
        id = event.extendedProps?.batchId || ''
        name = event.extendedProps?.batchName || ''
        break
      case 'entryType':
        id = event.extendedProps?.entryType || 'REGULAR'
        name = event.extendedProps?.entryType || 'REGULAR'
        break
      default:
        return
    }

    if (!uniqueItems.has(id)) {
      const { background } = getEventColor(event, colorBy)
      uniqueItems.set(id, { name, color: background })
    }
  })

  return Array.from(uniqueItems.entries()).map(([id, { name, color }]) => ({
    id,
    name,
    color
  }))
}