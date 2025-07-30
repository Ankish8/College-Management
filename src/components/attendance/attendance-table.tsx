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
import { StudentAvatar } from "./student-avatar"
import { AttendanceStatusButton } from "./attendance-status-button"
import { AttendanceHistory } from "./attendance-history"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { AttendanceMode } from "./attendance-mode-toggle"
import type { Student, Session, AttendanceStatus, AttendancePrediction, PredictionSummary } from "@/types/attendance"

interface AttendanceTableProps {
  students: Student[]
  sessions: Session[]
  searchTerm: string
  onAttendanceChange: (studentId: string, sessionId: string | 'full-day', status: AttendanceStatus) => void
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  attendanceMode: AttendanceMode
  predictions?: PredictionSummary
  onPredictionConfirm?: (studentId: string, sessionId: string | 'full-day', prediction: AttendancePrediction) => void
  focusedStudentId?: string | null
}

export function AttendanceTable({
  students,
  sessions,
  searchTerm,
  onAttendanceChange,
  attendanceData,
  attendanceMode,
  predictions,
  onPredictionConfirm,
  focusedStudentId
}: AttendanceTableProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [focusedCell, setFocusedCell] = useState<{ studentIndex: number; sessionIndex: number } | null>(null)

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

  const filteredStudents = students.filter(student => {
    // If no search term, return all students (respect smart filter)
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.studentId.toLowerCase().includes(searchLower)
    )
  })

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
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const handleFullDayAttendance = (studentId: string, status: AttendanceStatus) => {
    // Apply status to all sessions for this student
    sessions.forEach(session => {
      onAttendanceChange(studentId, session.id, status)
    })
    onAttendanceChange(studentId, 'full-day', status)
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!focusedCell) return

    const totalSessions = sessions.length + 1 // +1 for full-day column
    const maxStudentIndex = filteredStudents.length - 1
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
          const student = filteredStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          if (attendanceMode === 'predictive') {
            // In predictive mode, space toggles between present/absent
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
          } else {
            // Original behavior for detailed/fast modes
            if (isFullDay) {
              const currentStatus = attendanceData[student.id]?.['full-day']
              const newStatus = attendanceMode === 'fast' 
                ? (currentStatus === 'present' ? 'absent' : 'present')
                : (currentStatus === 'present' ? 'absent' : 'present')
              handleFullDayAttendance(student.id, newStatus)
            } else {
              const session = sessions[focusedCell.sessionIndex]
              const currentStatus = attendanceData[student.id]?.[session.id]
              const newStatus = currentStatus === 'present' ? 'absent' : 'present'
              onAttendanceChange(student.id, session.id, newStatus)
            }
          }
        }
        break
      case 'M':
      case 'm':
        event.preventDefault()
        if (focusedCell) {
          const student = filteredStudents[focusedCell.studentIndex]
          const isFullDay = focusedCell.sessionIndex === sessions.length
          
          if (isFullDay) {
            handleFullDayAttendance(student.id, 'medical')
          } else {
            const session = sessions[focusedCell.sessionIndex]
            onAttendanceChange(student.id, session.id, 'medical')
          }
        }
        break
    }
  }, [focusedCell, filteredStudents, sessions, attendanceData, attendanceMode, onAttendanceChange])

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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
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
            {filteredStudents.map((student) => (
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
                  <AttendanceHistory history={student.attendanceHistory} />
                </TableCell>
                
                {sessions.map((session, sessionIndex) => {
                  const studentIndex = filteredStudents.findIndex(s => s.id === student.id)
                  const isFocused = focusedCell?.studentIndex === studentIndex && focusedCell?.sessionIndex === sessionIndex
                  const isInFastMode = attendanceMode === 'fast'
                  const isInPredictiveMode = attendanceMode === 'predictive'
                  const prediction = getPrediction(student.id, session.id)
                  
                  const handleCellClick = () => {
                    setFocusedCell({ studentIndex, sessionIndex })
                    
                    // In fast mode, handle the status change directly
                    if (isInFastMode) {
                      const currentStatus = attendanceData[student.id]?.[session.id]
                      const newStatus = currentStatus === 'present' ? 'absent' : 'present'
                      onAttendanceChange(student.id, session.id, newStatus)
                    } else if (isInPredictiveMode && prediction && onPredictionConfirm) {
                      // In predictive mode, clicking confirms the prediction
                      onPredictionConfirm(student.id, session.id, prediction)
                    }
                  }
                  
                  return (
                    <ContextMenu key={`session-${session.id}`}>
                      <ContextMenuTrigger asChild>
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
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => onAttendanceChange(student.id, session.id, 'medical')}>
                          Mark as Medical
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )
                })}
                
                {(() => {
                  const studentIndex = filteredStudents.findIndex(s => s.id === student.id)
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
                  
                  const handleCellClick = () => {
                    setFocusedCell({ studentIndex, sessionIndex })
                    
                    // In fast mode, handle the status change directly
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
                  }
                  
                  return (
                    <ContextMenu key={`fullday-${student.id}`}>
                      <ContextMenuTrigger asChild>
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
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleFullDayAttendance(student.id, 'medical')}>
                          Mark as Medical
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
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