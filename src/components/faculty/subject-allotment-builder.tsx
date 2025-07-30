"use client"

import React, { useState, useEffect } from 'react'
import { Puck, type Data } from '@measured/puck'
import { puckConfig } from '@/components/template-builder/puck-config'
import '@measured/puck/dist/index.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RefreshCw, Layout, Users, BookOpen } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

interface SubjectAllotmentBuilderProps {
  unassignedSubjects: Subject[]
  facultyList: Faculty[]
  onSave: (allotmentData: any) => Promise<void>
  onDataChange: () => void
}

export function SubjectAllotmentBuilder({ 
  unassignedSubjects, 
  facultyList, 
  onSave,
  onDataChange 
}: SubjectAllotmentBuilderProps) {
  const { toast } = useToast()
  const [puckData, setPuckData] = useState<Data | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize Puck data with current state
  useEffect(() => {
    const initialData = {
      content: [
        // Summary Section
        {
          type: "AllotmentSummary",
          props: {
            totalFaculty: facultyList.length,
            totalSubjects: unassignedSubjects.length + facultyList.reduce((acc, f) => acc + (f.assignedSubjects?.length || 0), 0),
            unassignedSubjects: unassignedSubjects.length,
            overloadedFaculty: facultyList.filter(f => f.currentWorkload?.status === 'overloaded').length,
            balancedFaculty: facultyList.filter(f => f.currentWorkload?.status === 'balanced').length,
            underutilizedFaculty: facultyList.filter(f => f.currentWorkload?.status === 'underutilized').length,
            totalCredits: facultyList.reduce((acc, f) => acc + (f.currentWorkload?.totalCredits || 0), 0),
            averageWorkload: Math.round(facultyList.reduce((acc, f) => acc + (f.currentWorkload?.totalCredits || 0), 0) / Math.max(facultyList.length, 1))
          }
        },
        // Faculty Columns (limit to 3 for better layout)
        ...facultyList.slice(0, 3).map((faculty) => ({
          type: "FacultyColumn",
          props: {
            facultyId: faculty.id,
            facultyName: faculty.name,
            employeeId: faculty.employeeId,
            currentCredits: faculty.currentWorkload?.totalCredits || 0,
            maxCredits: faculty.currentWorkload?.maxCredits || 30,
            teachingCredits: faculty.currentWorkload?.teachingCredits || 0,
            nonTeachingCredits: faculty.currentWorkload?.nonTeachingCredits || 0,
            workloadStatus: faculty.currentWorkload?.status || 'balanced',
            assignedSubjects: (faculty.assignedSubjects || []).map(subject => ({
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code,
              credits: subject.credits,
              examType: subject.examType,
              subjectType: subject.subjectType,
              batchName: subject.batch?.name || 'Unknown Batch',
              priority: (subject.subjectType === 'CORE' ? 'high' : 'medium'),
              isDraggable: true
            })),
            isDropZone: true
          }
        })),
        // Unassigned Subjects (limit to 6 for better performance)
        ...unassignedSubjects.slice(0, 6).map(subject => ({
          type: "SubjectCard",
          props: {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            credits: subject.credits,
            examType: subject.examType,
            subjectType: subject.subjectType,
            batchName: subject.batch?.name || 'Unknown Batch',
            priority: (subject.subjectType === 'CORE' ? 'high' : 'medium'),
            isDraggable: true
          }
        }))
      ],
      root: {
        props: {
          title: "Subject Allotment Workspace"
        }
      }
    }

    setPuckData(initialData as any)
  }, [unassignedSubjects, facultyList])

  const handlePuckChange = (data: Data) => {
    setPuckData(data)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!puckData || !hasChanges) return

    try {
      setSaving(true)

      // Extract assignment data from Puck components
      const facultyColumns = puckData.content.filter(item => item.type === 'FacultyColumn')
      const assignments = facultyColumns.map(column => ({
        facultyId: column.props?.facultyId || '',
        subjectIds: (column.props?.assignedSubjects || []).map((s: any) => s.subjectId).filter(Boolean)
      })).filter(assignment => assignment.facultyId)

      await onSave({ assignments })
      setHasChanges(false)
      
      toast({
        title: "Success",
        description: "Subject allotment saved successfully",
      })

      // Refresh data
      onDataChange()
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

  const handleReset = () => {
    // Reset to initial state
    window.location.reload()
  }

  if (!puckData) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Builder Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Drag & Drop Builder</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="sm"
          >
            <Save className={`mr-2 h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <Layout className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your allotment before leaving.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedSubjects.length}</div>
            <p className="text-xs text-muted-foreground">subjects remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facultyList.length}</div>
            <p className="text-xs text-muted-foreground">available faculty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balanced</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {facultyList.filter(f => f.currentWorkload.status === 'balanced').length}
            </div>
            <p className="text-xs text-muted-foreground">optimal workload</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {facultyList.filter(f => f.currentWorkload.status === 'overloaded').length}
            </div>
            <p className="text-xs text-muted-foreground">need redistribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Puck Builder */}
      <Card>
        <CardContent className="p-0">
          <div className="min-h-[600px]">
            <Puck
              config={puckConfig}
              data={puckData}
              onPublish={handlePuckChange}
              onChange={handlePuckChange}
              headerTitle="Subject Allotment Workspace"
              headerPath="Faculty Management > Subject Allotment"
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <Layout className="h-4 w-4" />
        <AlertDescription>
          <strong>How to use:</strong> Drag subjects from the subject pool to faculty columns. 
          Real-time workload calculations show when faculty are overloaded. 
          Use the visual builder to rearrange assignments and optimize workload distribution.
        </AlertDescription>
      </Alert>
    </div>
  )
}