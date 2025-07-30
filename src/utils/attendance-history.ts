import type { 
  Student, 
  Session, 
  AttendanceStatus, 
  SessionAttendanceRecord, 
  AttendancePrediction, 
  PredictionConfidence,
  PredictionSummary 
} from "@/types/attendance"

export class AttendanceHistoryManager {
  private students: Student[]
  private sessions: Session[]
  
  constructor(students: Student[], sessions: Session[]) {
    this.students = students
    this.sessions = sessions
  }

  /**
   * Analyzes attendance pattern for a specific student and session
   */
  analyzeStudentSessionPattern(studentId: string, sessionId: string, targetDate: string): {
    consistency: number
    recentTrend: number
    dayOfWeekPattern: number
  } {
    const student = this.students.find(s => s.id === studentId)
    if (!student) {
      return { consistency: 0, recentTrend: 0, dayOfWeekPattern: 0 }
    }

    // Get session attendance for last 7 days
    const sessionRecords = student.sessionAttendanceHistory
      .filter(record => record.sessionId === sessionId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7) // Last 7 days

    if (sessionRecords.length === 0) {
      return { consistency: 0, recentTrend: 0, dayOfWeekPattern: 0 }
    }

    // Calculate consistency (how often they attend this session)
    const presentCount = sessionRecords.filter(r => r.status === 'present' || r.status === 'medical').length
    const consistency = presentCount / sessionRecords.length

    // Calculate recent trend (last 3 days vs previous 4 days)
    const recentRecords = sessionRecords.slice(-3)
    const earlierRecords = sessionRecords.slice(0, -3)
    
    const recentPresent = recentRecords.filter(r => r.status === 'present' || r.status === 'medical').length
    const earlierPresent = earlierRecords.filter(r => r.status === 'present' || r.status === 'medical').length
    
    const recentRate = recentRecords.length > 0 ? recentPresent / recentRecords.length : 0
    const earlierRate = earlierRecords.length > 0 ? earlierPresent / earlierRecords.length : 0
    const recentTrend = recentRate - earlierRate

    // Calculate day of week pattern
    const targetDayOfWeek = new Date(targetDate).getDay()
    const sameDayRecords = sessionRecords.filter(record => {
      return new Date(record.date).getDay() === targetDayOfWeek
    })
    
    const dayOfWeekPattern = sameDayRecords.length > 0 
      ? sameDayRecords.filter(r => r.status === 'present' || r.status === 'medical').length / sameDayRecords.length
      : consistency

    return { consistency, recentTrend, dayOfWeekPattern }
  }

  /**
   * Determines prediction confidence based on pattern analysis
   */
  calculatePredictionConfidence(pattern: {
    consistency: number
    recentTrend: number
    dayOfWeekPattern: number
  }): PredictionConfidence {
    const { consistency, dayOfWeekPattern } = pattern
    
    // High confidence: consistent pattern (>80% consistency or strong day pattern)
    if (consistency >= 0.8 || dayOfWeekPattern >= 0.8 || 
        (consistency >= 0.7 && Math.abs(pattern.recentTrend) <= 0.2)) {
      return 'high'
    }
    
    // Low confidence: very inconsistent pattern (<40% consistency)
    if (consistency < 0.4 && dayOfWeekPattern < 0.4) {
      return 'low'
    }
    
    // Medium confidence: everything else
    return 'medium'
  }

  /**
   * Predicts attendance status based on historical patterns
   */
  predictAttendanceStatus(pattern: {
    consistency: number
    recentTrend: number
    dayOfWeekPattern: number
  }): AttendanceStatus {
    const { consistency, recentTrend, dayOfWeekPattern } = pattern
    
    // Use the strongest indicator
    const indicators = [consistency, dayOfWeekPattern]
    const adjustedConsistency = consistency + (recentTrend * 0.3) // Weight recent trend
    
    // If day-of-week pattern is stronger, use it
    const finalProbability = dayOfWeekPattern > consistency ? dayOfWeekPattern : adjustedConsistency
    
    return finalProbability >= 0.5 ? 'present' : 'absent'
  }

  /**
   * Generates reasoning text for the prediction
   */
  generatePredictionReasoning(pattern: {
    consistency: number
    recentTrend: number
    dayOfWeekPattern: number
  }, status: AttendanceStatus): string {
    const { consistency, recentTrend, dayOfWeekPattern } = pattern
    
    const consistencyPercentage = Math.round(consistency * 100)
    const dayPatternPercentage = Math.round(dayOfWeekPattern * 100)
    
    if (status === 'present') {
      if (dayOfWeekPattern > consistency) {
        return `Usually present on this day (${dayPatternPercentage}% attendance)`
      } else if (recentTrend > 0.2) {
        return `Improving attendance trend (${consistencyPercentage}% overall)`
      } else {
        return `Consistent attendance pattern (${consistencyPercentage}% present)`
      }
    } else {
      if (dayOfWeekPattern < consistency) {
        return `Often absent on this day (${dayPatternPercentage}% attendance)`
      } else if (recentTrend < -0.2) {
        return `Declining attendance trend (${consistencyPercentage}% overall)`
      } else {
        return `Inconsistent attendance pattern (${consistencyPercentage}% present)`
      }
    }
  }

  /**
   * Generates predictions for all students and sessions for a given date
   */
  generatePredictions(targetDate: string): PredictionSummary {
    const predictions: AttendancePrediction[] = []
    
    this.students.forEach(student => {
      this.sessions.forEach(session => {
        const pattern = this.analyzeStudentSessionPattern(student.id, session.id, targetDate)
        const confidence = this.calculatePredictionConfidence(pattern)
        const predictedStatus = this.predictAttendanceStatus(pattern)
        const reasoning = this.generatePredictionReasoning(pattern, predictedStatus)
        
        predictions.push({
          studentId: student.id,
          sessionId: session.id,
          predictedStatus,
          confidence,
          reasoning,
          historicalPattern: pattern
        })
      })
    })

    // Calculate summary statistics
    const totalPredictions = predictions.length
    const highConfidence = predictions.filter(p => p.confidence === 'high').length
    const mediumConfidence = predictions.filter(p => p.confidence === 'medium').length
    const lowConfidence = predictions.filter(p => p.confidence === 'low').length

    return {
      totalPredictions,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      predictions
    }
  }

  /**
   * Gets predictions for a specific student
   */
  getStudentPredictions(studentId: string, targetDate: string): AttendancePrediction[] {
    const summary = this.generatePredictions(targetDate)
    return summary.predictions.filter(p => p.studentId === studentId)
  }

  /**
   * Gets predictions for a specific session
   */
  getSessionPredictions(sessionId: string, targetDate: string): AttendancePrediction[] {
    const summary = this.generatePredictions(targetDate)
    return summary.predictions.filter(p => p.sessionId === sessionId)
  }

  /**
   * Filters predictions by confidence level
   */
  getPredictionsByConfidence(targetDate: string, confidence: PredictionConfidence): AttendancePrediction[] {
    const summary = this.generatePredictions(targetDate)
    return summary.predictions.filter(p => p.confidence === confidence)
  }
}