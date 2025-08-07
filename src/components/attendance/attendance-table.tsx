"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Heart, Check, X } from "lucide-react"
import { StudentAvatar } from "./student-avatar"
import { AttendanceStatusButton } from "./attendance-status-button"
import { AttendanceHistory } from "./attendance-history"
import type { AttendanceMode } from "./attendance-mode-toggle"
import type { Student, Session, AttendanceStatus, AttendancePrediction, PredictionSummary } from "@/types/attendance"

interface AttendanceTableProps {
  students: Student[]
  sessions: Session[]
  filteredStudents?: Student[] // Now accepts pre-filtered students
  onAttendanceChange: (studentId: string, sessionId: string | 'full-day', status: AttendanceStatus) => void
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  attendanceMode: AttendanceMode
  predictions?: PredictionSummary
  onPredictionConfirm?: (studentId: string, sessionId: string | 'full-day', prediction: AttendancePrediction) => void
  focusedStudentId?: string | null
  onBulkAction?: (action: 'present' | 'absent') => Promise<void>
  currentDate?: string
}

export function AttendanceTable({
  students,
  sessions,
  filteredStudents,
  onAttendanceChange,
  attendanceData,
  attendanceMode,
  predictions,
  onPredictionConfirm,
  focusedStudentId,
  onBulkAction,
  currentDate
}: AttendanceTableProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [focusedCell, setFocusedCell] = useState<{ studentIndex: number; sessionIndex: number } | null>(null)
  const [isBulkMarking, setIsBulkMarking] = useState(false)

  // Scroll focused student into view
  useEffect(() => {
    if (focusedStudentId) {
      const studentRow = document.querySelector(`[data-student-id="${focusedStudentId}"]`)
      if (studentRow) {
        studentRow.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }
  }, [focusedStudentId])

  // Use pre-filtered students if provided, otherwise use all students
  const displayStudents = filteredStudents || students

  // Helper function to get prediction for a specific student and session
  const getPrediction = (studentId: string, sessionId: string): AttendancePrediction | undefined => {
    return predictions?.predictions.find(p => p.studentId === studentId && p.sessionId === sessionId)
  }

  // PredictionBadge component
  const PredictionBadge = ({ prediction }: { prediction: AttendancePrediction }) => {
    const confidenceColors = {
      high: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-red-100 text-red-800 border-red-200'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs px-1 py-0 ${confidenceColors[prediction.confidence]}`}
        title={prediction.reasoning}
      >
        {prediction.confidence}
      </Badge>
    )
  }

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const toggleAllStudents = () => {
    if (selectedStudents.size === displayStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(displayStudents.map(s => s.id)))
    }
  }

  const handleFullDayAttendance = (studentId: string, status: AttendanceStatus) => {
    // Apply status to all sessions for this student
    sessions.forEach(session => {
      onAttendanceChange(studentId, session.id, status)
    })
    onAttendanceChange(studentId, 'full-day', status)
  }

  // Bulk marking handlers
  const handleMarkAllStudents = async (status: 'present' | 'absent') => {
    if (!onBulkAction) return
    
    setIsBulkMarking(true)
    try {
      await onBulkAction(status)
    } catch (error) {
      console.error('Bulk marking failed:', error)
    } finally {
      setIsBulkMarking(false)
    }
  }

  const handleBulkMarkSelected = async (status: AttendanceStatus) => {
    if (selectedStudents.size === 0) return
    
    setIsBulkMarking(true)
    try {
      // Mark all selected students
      for (const studentId of selectedStudents) {
        for (const session of sessions) {
          await onAttendanceChange(studentId, session.id, status)
        }
      }
      setSelectedStudents(new Set()) // Clear selection after marking
    } catch (error) {
      console.error('Bulk marking failed:', error)
    } finally {
      setIsBulkMarking(false)
    }
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!focusedCell) return

    const totalSessions = sessions.length + 1 // +1 for full-day column
    const maxStudentIndex = displayStudents.length - 1
    const maxSessionIndex = totalSessions - 1

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        setFocusedCell(prev => prev ? {
          ...prev,
          studentIndex: Math.max(0, prev.studentIndex - 1)
        } : null)
        break
      case 'ArrowDown':
        event.preventDefault()
        setFocusedCell(prev => prev ? {
          ...prev,
          studentIndex: Math.min(maxStudentIndex, prev.studentIndex + 1)
        } : null)
        break
      case 'ArrowLeft':
        event.preventDefault()
        setFocusedCell(prev => prev ? {
          ...prev,
          sessionIndex: Math.max(0, prev.sessionIndex - 1)
        } : null)
        break
      case 'ArrowRight':
        event.preventDefault()
        setFocusedCell(prev => prev ? {
          ...prev,
          sessionIndex: Math.min(maxSessionIndex, prev.sessionIndex + 1)
        } : null)
        break
      case ' ':
        event.preventDefault()
        if (focusedCell) {
          const student = displayStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          // Space bar toggles between present and absent
          if (isFullDay) {
            const currentStatus = attendanceData[student.id]?.['full-day']
            const newStatus = currentStatus === 'present' ? 'absent' : 'present'
            handleFullDayAttendance(student.id, newStatus)
          } else {
            const session = sessions[focusedCell.sessionIndex]
            const currentStatus = attendanceData[student.id]?.[session.id]
            const newStatus = currentStatus === 'present' ? 'absent' : 'present'
            onAttendanceChange(student.id, session.id, newStatus)
          }
        }
        break
      case 'Shift':
        event.preventDefault()
        if (focusedCell) {
          const student = displayStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          // Shift marks as absent
          if (isFullDay) {
            handleFullDayAttendance(student.id, 'absent')
          } else {
            const session = sessions[focusedCell.sessionIndex]
            onAttendanceChange(student.id, session.id, 'absent')
          }
        }
        break
      case 'Control':
      case 'Meta': // Command key on Mac
        event.preventDefault()
        if (focusedCell) {
          const student = displayStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          // Control/Command marks as absent (alternative)
          if (isFullDay) {
            handleFullDayAttendance(student.id, 'absent')
          } else {
            const session = sessions[focusedCell.sessionIndex]
            onAttendanceChange(student.id, session.id, 'absent')
          }
        }
        break
      case 'M':
      case 'm':
        event.preventDefault()
        if (focusedCell) {
          const student = displayStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          // M key marks as medical
          if (isFullDay) {
            handleFullDayAttendance(student.id, 'medical')
          } else {
            const session = sessions[focusedCell.sessionIndex]
            onAttendanceChange(student.id, session.id, 'medical')
          }
        }
        break
    }
  }, [focusedCell, displayStudents, sessions, attendanceData, attendanceMode, onAttendanceChange])

  // Add keyboard event listener
  useEffect(() => {
    if (focusedCell) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, focusedCell])

  // Auto-scroll focused cell into view
  useEffect(() => {
    if (focusedCell) {
      const cellElement = document.querySelector(`[data-cell-id="${focusedCell.studentIndex}-${focusedCell.sessionIndex}"]`)
      if (cellElement) {
        cellElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      }
    }
  }, [focusedCell])

  return (
    <Card className="overflow-hidden">
      {/* Bulk Action Toolbar */}
      {onBulkAction && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllStudents('present')}
                  disabled={isBulkMarking || displayStudents.length === 0}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllStudents('absent')}
                  disabled={isBulkMarking || displayStudents.length === 0}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Mark All Absent
                </Button>
              </div>
              
              {/* Selection Actions */}
              {selectedStudents.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <span className="text-sm text-gray-600">
                    {selectedStudents.size} selected
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleBulkMarkSelected('present')}
                      disabled={isBulkMarking}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkMarkSelected('absent')}
                      disabled={isBulkMarking}
                      className="border-gray-300 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Absent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkMarkSelected('medical')}
                      disabled={isBulkMarking}
                      className="border-gray-300 hover:bg-gray-100"
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      Medical
                    </Button>
                  </div>
                </>
              )}
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                Total: <span className="font-medium text-gray-900">{displayStudents.length}</span>
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedStudents.size === displayStudents.length && displayStudents.length > 0}
                  onCheckedChange={toggleAllStudents}
                />
              </TableHead>
              <TableHead className="w-24">Photo</TableHead>
              <TableHead className="min-w-[280px]">Student</TableHead>
              <TableHead className="w-40">Student ID</TableHead>
              <TableHead className="w-56">Attendance History</TableHead>
              
              {sessions.map((session) => (
                <TableHead key={session.id} className="text-center w-40">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-muted-foreground">
                      {session.startTime}-{session.endTime}
                    </div>
                    <div className="text-sm font-medium">
                      {session.name}
                    </div>
                  </div>
                </TableHead>
              ))}
              
              <TableHead className="text-center w-48 bg-primary/3 border-l-2 border-primary/10">
                <div className="flex flex-col items-center gap-1">
                  <div className="text-sm font-semibold text-primary">
                    Full Day
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    All Sessions
                  </div>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {displayStudents.map((student) => (
              <TableRow 
                key={student.id} 
                data-student-id={student.id} 
                className={`hover:bg-muted/30 transition-all duration-200 ${
                  focusedStudentId === student.id 
                    ? 'bg-blue-50 border-l-4 border-blue-500 shadow-md' 
                    : ''
                }`}
              >
                <TableCell className="py-6">
                  <Checkbox
                    checked={selectedStudents.has(student.id)}
                    onCheckedChange={() => toggleStudentSelection(student.id)}
                  />
                </TableCell>
                
                <TableCell className="py-6">
                  <StudentAvatar name={student.name} photo={student.photo} />
                </TableCell>
                
                <TableCell className="py-6">
                  <div className="space-y-1">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                  </div>
                </TableCell>
                
                <TableCell className="py-6">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {student.studentId}
                  </code>
                </TableCell>
                
                <TableCell className="py-6">
                  <AttendanceHistory history={student.attendanceHistory} currentDate={currentDate} />
                </TableCell>
                
                {sessions.map((session, sessionIndex) => {
                  const studentIndex = displayStudents.findIndex(s => s.id === student.id)
                  const isFocused = focusedCell?.studentIndex === studentIndex && focusedCell?.sessionIndex === sessionIndex
                  const isInFastMode = attendanceMode === 'fast'
                  const isInPredictiveMode = attendanceMode === 'predictive'
                  const prediction = getPrediction(student.id, session.id)
                  
                  const handleCellClick = (e: React.MouseEvent) => {
                    // Only handle cell clicks in fast mode or predictive mode
                    if (isInFastMode || isInPredictiveMode) {
                      setFocusedCell({ studentIndex, sessionIndex })
                      
                      if (isInFastMode) {
                        const currentStatus = attendanceData[student.id]?.[session.id]
                        const newStatus = currentStatus === 'present' ? 'absent' : 'present'
                        onAttendanceChange(student.id, session.id, newStatus)
                      } else if (isInPredictiveMode && prediction && onPredictionConfirm) {
                        onPredictionConfirm(student.id, session.id, prediction)
                      }
                    } else {
                      // In regular mode, just focus the cell but don't handle status changes
                      // Let the AttendanceStatusButton handle the clicks
                      setFocusedCell({ studentIndex, sessionIndex })
                    }
                  }
                  
                  return (
                    <TableCell 
                      key={session.id} 
                      className={`text-center py-6 ${isFocused ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${
                        isInPredictiveMode ? 'cursor-pointer hover:bg-blue-50' : 
                        isInFastMode ? 'cursor-pointer hover:bg-gray-50' : 'cursor-pointer'
                      }`}
                      onClick={handleCellClick}
                      data-cell-id={`${studentIndex}-${sessionIndex}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AttendanceStatusButton
                          status={attendanceData[student.id]?.[session.id] || null}
                          onStatusChange={(status) => onAttendanceChange(student.id, session.id, status)}
                          isFullDay={false}
                          attendanceMode={attendanceMode}
                          disableClick={isInFastMode}
                        />
                        {isInPredictiveMode && prediction && (
                          <PredictionBadge prediction={prediction} />
                        )}
                      </div>
                    </TableCell>
                  )
                })}
                
                {(() => {
                  const studentIndex = displayStudents.findIndex(s => s.id === student.id)
                  const sessionIndex = sessions.length // Full-day is the last column
                  const isFocused = focusedCell?.studentIndex === studentIndex && focusedCell?.sessionIndex === sessionIndex
                  const isInFastMode = attendanceMode === 'fast'
                  const isInPredictiveMode = attendanceMode === 'predictive'
                  
                  // For full-day prediction, use the most common predicted status
                  const studentPredictions = predictions?.predictions.filter(p => p.studentId === student.id) || []
                  const fullDayPrediction = studentPredictions.length > 0 ? {
                    predictedStatus: studentPredictions.filter(p => p.predictedStatus === 'present').length > studentPredictions.length / 2 
                      ? 'present' as AttendanceStatus
                      : 'absent' as AttendanceStatus,
                    confidence: studentPredictions.some(p => p.confidence === 'high') ? 'high' as const : 
                               studentPredictions.some(p => p.confidence === 'medium') ? 'medium' as const : 'low' as const,
                    reasoning: `Based on ${studentPredictions.length} session predictions`
                  } : null
                  
                  const handleCellClick = (e: React.MouseEvent) => {
                    // Only handle cell clicks in fast mode or predictive mode
                    if (isInFastMode || isInPredictiveMode) {
                      setFocusedCell({ studentIndex, sessionIndex })
                      
                      if (isInFastMode) {
                        const currentStatus = attendanceData[student.id]?.['full-day']
                        const newStatus = currentStatus === 'present' ? 'absent' : 'present'
                        handleFullDayAttendance(student.id, newStatus)
                      } else if (isInPredictiveMode && fullDayPrediction) {
                        // In predictive mode, confirm all session predictions
                        sessions.forEach(session => {
                          const prediction = getPrediction(student.id, session.id)
                          if (prediction && onPredictionConfirm) {
                            onPredictionConfirm(student.id, session.id, prediction)
                          }
                        })
                      }
                    } else {
                      // In regular mode, just focus the cell but don't handle status changes
                      // Let the AttendanceStatusButton handle the clicks
                      setFocusedCell({ studentIndex, sessionIndex })
                    }
                  }
                  
                  return (
                    <TableCell 
                      className={`text-center py-6 bg-primary/3 border-l-2 border-primary/10 ${isFocused ? 'ring-2 ring-blue-500 bg-blue-100' : ''} ${
                        isInPredictiveMode ? 'cursor-pointer hover:bg-blue-100' : 
                        isInFastMode ? 'cursor-pointer hover:bg-blue-50' : 'cursor-pointer'
                      }`}
                      onClick={handleCellClick}
                      data-cell-id={`${studentIndex}-${sessionIndex}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AttendanceStatusButton
                          status={attendanceData[student.id]?.['full-day'] || null}
                          onStatusChange={(status) => handleFullDayAttendance(student.id, status)}
                          isFullDay={true}
                          attendanceMode={attendanceMode}
                          disableClick={isInFastMode}
                        />
                        {isInPredictiveMode && fullDayPrediction && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-1 py-0 ${
                              fullDayPrediction.confidence === 'high' ? 'bg-green-100 text-green-800 border-green-200' :
                              fullDayPrediction.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-red-100 text-red-800 border-red-200'
                            }`}
                            title={fullDayPrediction.reasoning}
                          >
                            {fullDayPrediction.confidence}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )
                })()}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}