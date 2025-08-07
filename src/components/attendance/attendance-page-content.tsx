"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { AttendancePageProduction } from '@/components/attendance/attendance-page-production'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  batch: {
    id: string
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
    specialization: {
      name: string
      shortName: string
    } | null
  }
  faculty: {
    primary: {
      name: string | null
      email: string
    } | null
    co: {
      name: string | null
      email: string
    } | null
  }
  timetableEntries: Array<{
    id: string
    dayOfWeek: string
    timeSlotId: string
    isActive: boolean
  }>
  attendanceSessionsCount: number
}

interface Batch {
  id: string
  name: string
  semester: number
  program: {
    name: string
    shortName: string
  }
  specialization: {
    name: string
    shortName: string
  } | null
}

interface AttendancePageContentProps {
  subjects: Subject[]
  currentUser: any
  department: {
    id: string
    name: string
    shortName: string
  } | null
  breadcrumbItems?: Array<{
    label: string
    href?: string
    current?: boolean
  }>
}

// Helper function to get day of week from date
const getDayOfWeekFromDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
}

// Helper function to filter subjects by selected date
const filterSubjectsByDate = (subjects: Subject[], selectedDate: string): Subject[] => {
  const dayOfWeek = getDayOfWeekFromDate(selectedDate)
  
  return subjects.filter(subject => 
    subject.timetableEntries && subject.timetableEntries.some(entry => 
      entry.isActive && entry.dayOfWeek === dayOfWeek
    )
  )
}

export function AttendancePageContent({ 
  subjects, 
  currentUser, 
  department,
  breadcrumbItems 
}: AttendancePageContentProps) {
  const searchParams = useSearchParams()
  
  // Get initial values from URL parameters if available
  const initialBatch = searchParams.get('batch') || ''
  const initialSubject = searchParams.get('subject') || ''
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatch)
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)

  // Get unique batches from all subjects (don't filter by date for batches)
  const availableBatches = useMemo(() => {
    const batchMap = new Map<string, Batch>()
    subjects.forEach(subject => {
      if (!batchMap.has(subject.batch.id)) {
        batchMap.set(subject.batch.id, subject.batch)
      }
    })
    return Array.from(batchMap.values()).sort((a, b) => a.semester - b.semester)
  }, [subjects])

  // Filter subjects by selected batch AND selected date
  const availableSubjects = useMemo(() => {
    if (!selectedBatch) return []
    const batchSubjects = subjects.filter(subject => subject.batch.id === selectedBatch)
    return filterSubjectsByDate(batchSubjects, selectedDate)
  }, [subjects, selectedBatch, selectedDate])

  // Reset selections when date changes (but not if we have URL parameters)
  useEffect(() => {
    // Only reset if we don't have URL parameters
    if (!initialBatch && !initialSubject) {
      setSelectedBatch('')
      setSelectedSubject('')
    }
  }, [selectedDate, initialBatch, initialSubject])

  // Auto-select first batch if none selected (but not if we have URL parameters)
  useEffect(() => {
    if (!selectedBatch && availableBatches.length > 0 && !initialBatch) {
      setSelectedBatch(availableBatches[0].id)
    }
  }, [availableBatches, selectedBatch, initialBatch])

  // Auto-select first subject when batch changes (but not if we have URL parameters)
  useEffect(() => {
    if (selectedBatch && availableSubjects.length > 0 && !initialSubject) {
      setSelectedSubject(availableSubjects[0].id)
    }
  }, [selectedBatch, availableSubjects, initialSubject])

  // Reset subject when batch changes (but not if we have URL parameters)
  useEffect(() => {
    if (!initialSubject) {
      setSelectedSubject('')
    }
  }, [selectedBatch, initialSubject])

  const handleError = (error: { message: string; code?: string; details?: any }) => {
    console.error('Attendance Error:', error)
    toast.error(error.message, {
      description: error.code ? `Error Code: ${error.code}` : undefined,
    })
  }

  const handleLoadingChange = (loading: boolean) => {
    console.log('Attendance loading state:', loading)
  }

  return (
    <>
      {/* Main attendance interface */}
      <AttendancePageProduction 
        courseId={selectedSubject}
        batchId={selectedBatch}
        initialDate={selectedDate}
        onError={handleError}
        onLoadingChange={handleLoadingChange}
        hasSelection={!!(selectedBatch && selectedSubject)}
        // Enhanced selectors with better styling and information
        dateSelector={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
          </div>
        }
        batchSelector={
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-56 h-10">
              <SelectValue placeholder="Choose batch" />
            </SelectTrigger>
            <SelectContent>
              {availableBatches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  <span className="font-medium">
                    {batch.name} • {batch.program.shortName}
                    {batch.specialization && ` - ${batch.specialization.shortName}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        subjectSelector={
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-56 h-10">
              <SelectValue placeholder="Choose subject">
                {selectedSubject && (
                  <span className="font-medium">
                    {availableSubjects.find(s => s.id === selectedSubject)?.name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {subject.code} • {subject.credits} credits
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        // Pass additional context for better UX
        availableBatches={availableBatches}
        availableSubjects={availableSubjects}
        subjects={subjects}
        department={department}
        breadcrumb={breadcrumbItems ? <Breadcrumb items={breadcrumbItems} /> : undefined}
      />
    </>
  )
}