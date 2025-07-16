"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users,
  BookOpen,
  Save,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SimpleDragDropBuilder } from './simple-drag-drop-builder'

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: 'THEORY' | 'PRACTICAL' | 'JURY' | 'PROJECT' | 'VIVA'
  subjectType: 'CORE' | 'ELECTIVE'
  batch: {
    id: string
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
  }
  primaryFaculty?: {
    id: string
    name: string
    email: string
  } | null
  coFaculty?: {
    id: string
    name: string
    email: string
  } | null
}

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  status: 'ACTIVE' | 'INACTIVE'
  currentWorkload: {
    totalCredits: number
    teachingCredits: number
    nonTeachingCredits: number
    maxCredits: number
    utilization: number
    status: 'underutilized' | 'balanced' | 'overloaded'
  }
  assignedSubjects: Subject[]
}

interface WorkloadSummary {
  totalFaculty: number
  totalSubjects: number
  totalCredits: number
  averageWorkload: number
  facultyDistribution: {
    overloaded: number
    balanced: number
    underutilized: number
  }
}

export function SubjectAllotmentContent() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data states
  const [unassignedSubjects, setUnassignedSubjects] = useState<Subject[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [workloadSummary, setWorkloadSummary] = useState<WorkloadSummary | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load unassigned subjects
      const subjectsResponse = await fetch('/api/subjects/unassigned')
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        setUnassignedSubjects(subjectsData.subjects || [])
      } else {
        setUnassignedSubjects([])
      }

      // Load faculty with current workloads
      const facultyResponse = await fetch('/api/faculty/workload-summary')
      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json()
        setFacultyList(facultyData.faculty || [])
        setWorkloadSummary(facultyData.summary || null)
      } else {
        setFacultyList([])
        setWorkloadSummary(null)
      }

      toast({
        title: "Data Loaded",
        description: "Subject allotment data loaded successfully",
      })
    } catch (error) {
      console.error('Error loading data:', error)
      
      // Ensure arrays are set even on error to prevent map errors
      setUnassignedSubjects([])
      setFacultyList([])
      setWorkloadSummary(null)
      
      toast({
        title: "Error",
        description: "Failed to load subject allotment data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAllotment = async (allotmentData?: any) => {
    try {
      setSaving(true)
      
      // If builder has its own save method, use it
      if (typeof window !== 'undefined' && window.handleBuilderSave && !allotmentData) {
        await window.handleBuilderSave()
        return
      }
      
      // Otherwise use passed data or current state
      const dataToSave = allotmentData || {
        assignments: facultyList.map(faculty => ({
          facultyId: faculty.id,
          subjectIds: faculty.assignedSubjects.map(s => s.id)
        }))
      }

      const response = await fetch('/api/faculty/allotment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        setHasUnsavedChanges(false)
        toast({
          title: "Success",
          description: "Subject allotment saved successfully",
        })
        // Reload data to reflect changes
        await loadInitialData()
      } else {
        throw new Error('Failed to save allotment')
      }
    } catch (error) {
      console.error('Error saving allotment:', error)
      toast({
        title: "Error",
        description: "Failed to save subject allotment",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subject Allotment</h1>
            <p className="text-sm text-muted-foreground">
              Manage faculty-subject assignments with drag-and-drop interface
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subject Allotment</h1>
          <p className="text-sm text-muted-foreground">
            Manage faculty-subject assignments with smart workload distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadInitialData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSaveAllotment}
            disabled={saving || !hasUnsavedChanges}
          >
            <Save className={`mr-2 h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Allotment'}
          </Button>
        </div>
      </div>


      {/* Main Content */}
      <div className="w-full max-w-full overflow-hidden min-w-0">
        <SimpleDragDropBuilder
          unassignedSubjects={unassignedSubjects}
          facultyList={facultyList}
          onSave={handleSaveAllotment}
          onDataChange={loadInitialData}
          onReset={loadInitialData}
          hasUnsavedChanges={hasUnsavedChanges}
          setHasUnsavedChanges={setHasUnsavedChanges}
        />
      </div>
    </div>
  )
}