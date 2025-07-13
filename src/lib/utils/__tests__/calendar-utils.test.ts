import { 
  formatDateForCalendar,
  getWeekDates,
  getDayOfWeekNumber,
  isWeekend,
  getMonthDates,
  isSameDay,
  isToday,
  addDays,
  getWeekStart,
  getWeekEnd,
  formatTimeSlot
} from '../calendar-utils'

describe('Calendar Utilities Tests', () => {
  const testDate = new Date('2024-01-15T10:30:00Z') // Monday, January 15, 2024
  const testDate2 = new Date('2024-01-16T14:45:00Z') // Tuesday, January 16, 2024
  
  beforeEach(() => {
    // Mock current date for consistent testing
    jest.useFakeTimers()
    jest.setSystemTime(testDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('formatDateForCalendar', () => {
    it('should format date correctly', () => {
      expect(formatDateForCalendar(testDate)).toBe('2024-01-15')
    })

    it('should handle different date formats', () => {
      expect(formatDateForCalendar('2024-01-15')).toBe('2024-01-15')
      expect(formatDateForCalendar(1705318200000)).toBe('2024-01-15')
    })

    it('should pad single digit months and days', () => {
      const date = new Date('2024-03-05')
      expect(formatDateForCalendar(date)).toBe('2024-03-05')
    })
  })

  describe('getWeekDates', () => {
    it('should return correct week dates starting from Monday', () => {
      const weekDates = getWeekDates(testDate)
      expect(weekDates).toHaveLength(7)
      expect(formatDateForCalendar(weekDates[0])).toBe('2024-01-15') // Monday
      expect(formatDateForCalendar(weekDates[6])).toBe('2024-01-21') // Sunday
    })

    it('should handle date in middle of week', () => {
      const wednesday = new Date('2024-01-17')
      const weekDates = getWeekDates(wednesday)
      expect(formatDateForCalendar(weekDates[0])).toBe('2024-01-15') // Monday
      expect(formatDateForCalendar(weekDates[6])).toBe('2024-01-21') // Sunday
    })

    it('should handle year boundaries', () => {
      const yearEnd = new Date('2023-12-31') // Sunday
      const weekDates = getWeekDates(yearEnd)
      expect(formatDateForCalendar(weekDates[0])).toBe('2023-12-25') // Monday
      expect(formatDateForCalendar(weekDates[6])).toBe('2023-12-31') // Sunday
    })
  })

  describe('getDayOfWeekNumber', () => {
    it('should return correct day numbers (0=Monday)', () => {
      expect(getDayOfWeekNumber('MONDAY')).toBe(0)
      expect(getDayOfWeekNumber('TUESDAY')).toBe(1)
      expect(getDayOfWeekNumber('WEDNESDAY')).toBe(2)
      expect(getDayOfWeekNumber('THURSDAY')).toBe(3)
      expect(getDayOfWeekNumber('FRIDAY')).toBe(4)
      expect(getDayOfWeekNumber('SATURDAY')).toBe(5)
      expect(getDayOfWeekNumber('SUNDAY')).toBe(6)
    })

    it('should handle invalid day names', () => {
      expect(getDayOfWeekNumber('INVALID' as any)).toBe(0)
    })

    it('should be case sensitive', () => {
      expect(getDayOfWeekNumber('monday' as any)).toBe(0)
    })
  })

  describe('isWeekend', () => {
    it('should identify weekend correctly', () => {
      const saturday = new Date('2024-01-20')
      const sunday = new Date('2024-01-21')
      const monday = new Date('2024-01-15')
      
      expect(isWeekend(saturday)).toBe(true)
      expect(isWeekend(sunday)).toBe(true)
      expect(isWeekend(monday)).toBe(false)
    })
  })

  describe('getMonthDates', () => {
    it('should return all dates in a month', () => {
      const monthDates = getMonthDates(2024, 1) // January 2024
      expect(monthDates).toHaveLength(31)
      expect(formatDateForCalendar(monthDates[0])).toBe('2024-01-01')
      expect(formatDateForCalendar(monthDates[30])).toBe('2024-01-31')
    })

    it('should handle February in leap year', () => {
      const monthDates = getMonthDates(2024, 2) // February 2024 (leap year)
      expect(monthDates).toHaveLength(29)
    })

    it('should handle February in non-leap year', () => {
      const monthDates = getMonthDates(2023, 2) // February 2023
      expect(monthDates).toHaveLength(28)
    })

    it('should handle different month lengths', () => {
      expect(getMonthDates(2024, 4)).toHaveLength(30) // April
      expect(getMonthDates(2024, 12)).toHaveLength(31) // December
    })
  })

  describe('isSameDay', () => {
    it('should correctly identify same day', () => {
      const date1 = new Date('2024-01-15T10:30:00')
      const date2 = new Date('2024-01-15T16:45:00')
      const date3 = new Date('2024-01-16T10:30:00')
      
      expect(isSameDay(date1, date2)).toBe(true)
      expect(isSameDay(date1, date3)).toBe(false)
    })

    it('should handle string dates', () => {
      expect(isSameDay('2024-01-15', '2024-01-15')).toBe(true)
      expect(isSameDay('2024-01-15', '2024-01-16')).toBe(false)
    })
  })

  describe('isToday', () => {
    it('should correctly identify today', () => {
      expect(isToday(testDate)).toBe(true)
      expect(isToday(testDate2)).toBe(false)
    })

    it('should handle different times on same day', () => {
      const sameDay = new Date('2024-01-15T23:59:59')
      expect(isToday(sameDay)).toBe(true)
    })
  })

  describe('addDays', () => {
    it('should add days correctly', () => {
      const result = addDays(testDate, 5)
      expect(formatDateForCalendar(result)).toBe('2024-01-20')
    })

    it('should subtract days with negative input', () => {
      const result = addDays(testDate, -5)
      expect(formatDateForCalendar(result)).toBe('2024-01-10')
    })

    it('should handle month boundaries', () => {
      const endOfMonth = new Date('2024-01-31')
      const result = addDays(endOfMonth, 1)
      expect(formatDateForCalendar(result)).toBe('2024-02-01')
    })

    it('should handle year boundaries', () => {
      const endOfYear = new Date('2024-12-31')
      const result = addDays(endOfYear, 1)
      expect(formatDateForCalendar(result)).toBe('2025-01-01')
    })
  })

  describe('getWeekStart and getWeekEnd', () => {
    it('should get correct week start (Monday)', () => {
      const weekStart = getWeekStart(testDate)
      expect(formatDateForCalendar(weekStart)).toBe('2024-01-15')
    })

    it('should get correct week end (Sunday)', () => {
      const weekEnd = getWeekEnd(testDate)
      expect(formatDateForCalendar(weekEnd)).toBe('2024-01-21')
    })

    it('should handle date in middle of week', () => {
      const wednesday = new Date('2024-01-17')
      const weekStart = getWeekStart(wednesday)
      const weekEnd = getWeekEnd(wednesday)
      
      expect(formatDateForCalendar(weekStart)).toBe('2024-01-15')
      expect(formatDateForCalendar(weekEnd)).toBe('2024-01-21')
    })
  })

  describe('formatTimeSlot', () => {
    it('should format time slot correctly', () => {
      expect(formatTimeSlot('09:15', '10:05')).toBe('09:15 - 10:05')
      expect(formatTimeSlot('14:30', '15:20')).toBe('14:30 - 15:20')
    })

    it('should handle 12-hour format conversion', () => {
      expect(formatTimeSlot('09:15', '10:05', true)).toBe('9:15 AM - 10:05 AM')
      expect(formatTimeSlot('14:30', '15:20', true)).toBe('2:30 PM - 3:20 PM')
      expect(formatTimeSlot('00:00', '01:00', true)).toBe('12:00 AM - 1:00 AM')
      expect(formatTimeSlot('12:00', '13:00', true)).toBe('12:00 PM - 1:00 PM')
    })

    it('should handle edge cases', () => {
      expect(formatTimeSlot('23:59', '00:15')).toBe('23:59 - 00:15')
      expect(formatTimeSlot('', '')).toBe(' - ')
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid')
      expect(() => formatDateForCalendar(invalidDate)).not.toThrow()
    })

    it('should handle extreme dates', () => {
      const extremeDate = new Date('1900-01-01')
      expect(() => getWeekDates(extremeDate)).not.toThrow()
      
      const futureDate = new Date('2100-12-31')
      expect(() => getMonthDates(2100, 12)).not.toThrow()
    })

    it('should handle timezone considerations', () => {
      const utcDate = new Date('2024-01-15T00:00:00Z')
      const localDate = new Date('2024-01-15T00:00:00')
      
      // Both should format to same date regardless of timezone
      expect(formatDateForCalendar(utcDate)).toMatch(/2024-01-1[45]/)
      expect(formatDateForCalendar(localDate)).toBe('2024-01-15')
    })
  })
})