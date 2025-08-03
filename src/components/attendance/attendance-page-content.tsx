"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { AttendancePageProduction } from '@/components/attendance/attendance-page-production'
import { CommandPaletteProvider } from '@/components/attendance/command-palette-provider'

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
  }
}

export function AttendancePageContent({ 
  subjects, 
  currentUser, 
  department 
}: AttendancePageContentProps) {
  console.log('🔵 Current user for attendance:', currentUser)
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')

  // Get unique batches from subjects
  const availableBatches = React.useMemo(() => {
    const batchMap = new Map<string, Batch>()
    subjects.forEach(subject => {
      if (!batchMap.has(subject.batch.id)) {
        batchMap.set(subject.batch.id, subject.batch)
      }
    })
    return Array.from(batchMap.values()).sort((a, b) => a.semester - b.semester)
  }, [subjects])

  // Filter subjects by selected batch
  const availableSubjects = React.useMemo(() => {
    if (!selectedBatch) return []
    return subjects.filter(subject => subject.batch.id === selectedBatch)
  }, [subjects, selectedBatch])

  // Auto-select first batch if none selected
  useEffect(() => {
    if (!selectedBatch && availableBatches.length > 0) {
      setSelectedBatch(availableBatches[0].id)
    }
  }, [availableBatches, selectedBatch])

  // Auto-select first subject when batch changes
  useEffect(() => {
    if (selectedBatch) {
      const batchSubjects = subjects.filter(s => s.batch.id === selectedBatch)
      if (batchSubjects.length > 0) {
        setSelectedSubject(batchSubjects[0].id)
      }
    }
  }, [selectedBatch, subjects])

  // Reset subject when batch changes
  useEffect(() => {
    setSelectedSubject('')
  }, [selectedBatch])

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
    <CommandPaletteProvider>
      {/* Always show the main attendance interface */}
      <AttendancePageProduction 
        courseId={selectedSubject}
        batchId={selectedBatch}
        onError={handleError}
        onLoadingChange={handleLoadingChange}
        hasSelection={!!(selectedBatch && selectedSubject)}
        // Enhanced selectors with better styling and information
        batchSelector={
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-56 h-10">
              <SelectValue placeholder="Choose batch" />
            </SelectTrigger>
            <SelectContent>
              {availableBatches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{batch.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {batch.program.shortName}
                      {batch.specialization && ` - ${batch.specialization.shortName}`}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        subjectSelector={
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-56 h-10">
              <SelectValue placeholder="Choose subject" />
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
      />
    </CommandPaletteProvider>
  )
}