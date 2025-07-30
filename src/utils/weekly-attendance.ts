import { format, subDays, addDays, startOfDay, isWeekend } from 'date-fns'
import type { 
  Student, 
  Session, 
  AttendanceStatus, 
  WeeklyViewData, 
  WeeklyStudentData, 
  WeeklyDayData, 
  WeeklySessionInfo 
} from '@/types/attendance'

export class WeeklyAttendanceProcessor {
  constructor(
    private students: Student[],
    private sessions: Session[]
  ) {}

  generateWeeklyData(
    endDate: string, // The "anchor" date (usually today or selected date)
    attendanceData: Record<string, Record<string, AttendanceStatus>>,
    includeWeekends: boolean = true
  ): WeeklyViewData {
    const end = startOfDay(new Date(endDate))
    
    // Generate last 7 WORKING days + any weekends in between
    const dates: string[] = []
    const workingDays: string[] = []
    let currentDate = end
    let workingDayCount = 0
    
    // Go backwards until we have 7 working days
    while (workingDayCount < 7) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      dates.unshift(dateStr) // Add to beginning
      
      if (!isWeekend(currentDate)) {
        workingDays.unshift(dateStr)
        workingDayCount++
      }
      
      currentDate = subDays(currentDate, 1)
    }
    
    // If we want to include weekends that fall within this range, add them
    if (includeWeekends) {
      const startDate = new Date(dates[0])
      const endDateObj = new Date(dates[dates.length - 1])
      const allDates: string[] = []
      
      let current = startDate
      while (current <= endDateObj) {
        allDates.push(format(current, 'yyyy-MM-dd'))
        current = addDays(current, 1)
      }
      
      // Replace dates array with complete date range including weekends
      dates.splice(0, dates.length, ...allDates)
    }

    const dateRange = {
      start: dates[0],
      end: dates[dates.length - 1],
      workingDays
    }

    const studentsData = this.students.map(student => 
      this.processStudentWeeklyData(student, dates, attendanceData, endDate)
    )

    const overallStats = this.calculateOverallStats(studentsData, workingDays.length)

    return {
      dateRange,
      students: studentsData,
      overallStats
    }
  }

  private processStudentWeeklyData(
    student: Student,
    dates: string[],
    attendanceData: Record<string, Record<string, AttendanceStatus>>,
    currentDate: string
  ): WeeklyStudentData {
    const days = dates.map(date => 
      this.processStudentDayData(student, date, attendanceData, currentDate)
    )

    const workingDays = days.filter(day => !day.isWeekend)
    const presentDays = workingDays.filter(day => day.overallStatus === 'present' || day.overallStatus === 'medical').length
    const weeklyAttendancePercentage = workingDays.length > 0 ? Math.round((presentDays / workingDays.length) * 100) : 0

    return {
      studentId: student.id,
      studentName: student.name,
      studentCode: student.studentId,
      days,
      weeklyAttendancePercentage
    }
  }

  private processStudentDayData(
    student: Student,
    date: string,
    attendanceData: Record<string, Record<string, AttendanceStatus>>,
    currentDate: string
  ): WeeklyDayData {
    const dateObj = new Date(date)
    const dayName = format(dateObj, 'EEEE') // "Monday", "Tuesday", etc.
    const isWeekend = this.isWeekend(dateObj)
    const isToday = date === currentDate

    // Get sessions for this day
    const sessions: WeeklySessionInfo[] = this.sessions.map(session => {
      // Always check current attendance data first (for any date being modified)
      let status: AttendanceStatus = 'absent'
      
      // Check current attendance data first (works just like session view)
      if (attendanceData[student.id]?.[session.id]) {
        status = attendanceData[student.id][session.id]
      } else {
        // Fallback to historical data for this specific date and session
        const historicalSession = student.sessionAttendanceHistory.find(
          record => record.date === date && record.sessionId === session.id
        )
        if (historicalSession) {
          status = historicalSession.status
        } else {
          // Check if there's overall day attendance for this date
          const dayAttendance = student.attendanceHistory.find(
            record => record.date === date
          )
          if (dayAttendance) {
            status = dayAttendance.status
          }
        }
      }

      return {
        sessionId: session.id,
        sessionName: session.name,
        status,
        timeSlot: `${session.startTime}-${session.endTime}`
      }
    })

    // Determine overall day status: Present if ANY session is present
    const overallStatus = this.calculateDayStatus(sessions)

    return {
      date,
      dayName,
      isWeekend,
      isToday,
      overallStatus,
      sessions
    }
  }

  private calculateDayStatus(sessions: WeeklySessionInfo[]): AttendanceStatus | null {
    if (sessions.length === 0) return null

    // If any session is medical, prioritize that
    if (sessions.some(s => s.status === 'medical')) {
      return 'medical'
    }

    // If any session is present, mark day as present
    if (sessions.some(s => s.status === 'present')) {
      return 'present'
    }

    // If all sessions are absent, mark day as absent
    if (sessions.every(s => s.status === 'absent')) {
      return 'absent'
    }

    return null
  }

  private calculateOverallStats(studentsData: WeeklyStudentData[], workingDaysCount: number) {
    const totalPossibleDays = studentsData.length * workingDaysCount
    
    let presentDays = 0
    studentsData.forEach(student => {
      const workingDays = student.days.filter(day => !day.isWeekend)
      presentDays += workingDays.filter(day => 
        day.overallStatus === 'present' || day.overallStatus === 'medical'
      ).length
    })

    const averageAttendance = totalPossibleDays > 0 
      ? Math.round((presentDays / totalPossibleDays) * 100) 
      : 0

    return {
      totalWorkingDays: workingDaysCount,
      averageAttendance,
      presentDays,
      totalPossibleDays
    }
  }

  private isWeekend(date: Date): boolean {
    return isWeekend(date)
  }

  // Helper method to get navigation dates
  static getNavigationDates(currentEndDate: string) {
    const current = new Date(currentEndDate)
    
    return {
      previousWeek: format(subDays(current, 7), 'yyyy-MM-dd'),
      nextWeek: format(addDays(current, 7), 'yyyy-MM-dd'),
      today: format(new Date(), 'yyyy-MM-dd')
    }
  }
}