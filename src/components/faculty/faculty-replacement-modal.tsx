"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Utility functions for date formatting
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Users,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Info,
  Target,
  RefreshCw,
  Eye
} from "lucide-react"

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  status: "ACTIVE" | "INACTIVE"
  primarySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
    batch: {
      id: string
      name: string
      program: {
        name: string
        shortName: string
      }
    }
  }>
  coFacultySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
    batch: {
      id: string
      name: string
      program: {
        name: string
        shortName: string
      }
    }
  }>
}

interface ReplacementScope {
  subjectIds: string[]
  batchIds: string[]
  isPermanent: boolean
  effectiveDate: string
  endDate?: string
  reason: string
  replacementType: 'full' | 'partial' | 'temporary'
}

interface ConflictInfo {
  hasConflicts: boolean
  conflictDetails: string[]
  warnings: string[]
  workloadImpact: {
    currentCredits: number
    newCredits: number
    percentageIncrease: number
  }
  timeSlotConflicts?: Array<{
    day: string
    timeSlot: string
    conflictingSubject: string
    conflictingBatch: string
  }>
}

interface FacultyReplacementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReplacementComplete: () => void
}

export function FacultyReplacementModal({ 
  open, 
  onOpenChange, 
  onReplacementComplete 
}: FacultyReplacementModalProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedCurrentFaculty, setSelectedCurrentFaculty] = useState<Faculty | null>(null)
  const [selectedNewFaculty, setSelectedNewFaculty] = useState<string>('')
  const [replacementScope, setReplacementScope] = useState<ReplacementScope>({
    subjectIds: [],
    batchIds: [],
    isPermanent: true,
    effectiveDate: formatDateForInput(new Date()),
    reason: '',
    replacementType: 'full'
  })
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)
  const [isDryRun, setIsDryRun] = useState(false)
  const [loadingFaculty, setLoadingFaculty] = useState(false)
  const [facultyData, setFacultyData] = useState<Faculty[]>([])
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [lastDataRefresh, setLastDataRefresh] = useState<Date>(new Date())
  const [dataStale, setDataStale] = useState(false)

  // Load faculty data when modal opens
  useEffect(() => {
    if (open && facultyData.length === 0) {
      loadFacultyData()
    }
  }, [open])

  const loadFacultyData = async () => {
    setLoadingFaculty(true)
    try {
      const response = await fetch('/api/faculty')
      if (response.ok) {
        const data = await response.json()
        setFacultyData(data)
        setLastDataRefresh(new Date())
        setDataStale(false)
        
        // Check if currently selected faculty is still valid
        if (selectedCurrentFaculty) {
          const updatedCurrentFaculty = data.find((f: any) => f.id === selectedCurrentFaculty.id)
          if (!updatedCurrentFaculty) {
            toast({
              title: "Faculty No Longer Available",
              description: "The selected faculty is no longer available. Please select another faculty member.",
              variant: "destructive"
            })
            setSelectedCurrentFaculty(null)
            setSelectedNewFaculty('')
            setCurrentStep(1)
          } else if (updatedCurrentFaculty.status !== 'ACTIVE') {
            toast({
              title: "Faculty Status Changed",
              description: "The selected faculty is no longer active. Please select another faculty member.",
              variant: "destructive"
            })
            setSelectedCurrentFaculty(null)
            setSelectedNewFaculty('')
            setCurrentStep(1)
          } else {
            // Update the selected faculty with fresh data
            setSelectedCurrentFaculty(updatedCurrentFaculty)
          }
        }
        
        // Check if selected new faculty is still valid
        if (selectedNewFaculty) {
          const updatedNewFaculty = data.find((f: any) => f.id === selectedNewFaculty)
          if (!updatedNewFaculty || updatedNewFaculty.status !== 'ACTIVE') {
            toast({
              title: "Replacement Faculty No Longer Available",
              description: "The selected replacement faculty is no longer available. Please select another faculty member.",
              variant: "destructive"
            })
            setSelectedNewFaculty('')
            if (currentStep === 3) {
              setCurrentStep(2)
            }
          }
        }
        
      } else {
        toast({
          title: "Error",
          description: "Failed to load faculty data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading faculty:', error)
      toast({
        title: "Error",
        description: "Failed to load faculty data",
        variant: "destructive"
      })
    } finally {
      setLoadingFaculty(false)
    }
  }

  // Check for data staleness (warn if data is older than 5 minutes)
  useEffect(() => {
    const checkDataStaleness = () => {
      const now = new Date()
      const timeDiff = now.getTime() - lastDataRefresh.getTime()
      const fiveMinutes = 5 * 60 * 1000
      
      if (timeDiff > fiveMinutes && facultyData.length > 0) {
        setDataStale(true)
      }
    }

    const interval = setInterval(checkDataStaleness, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [lastDataRefresh, facultyData.length])

  // Validation functions
  const validateStep1 = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!selectedCurrentFaculty) {
      errors.currentFaculty = "Please select a faculty member to replace"
    }

    if (selectedCurrentFaculty && 
        selectedCurrentFaculty.primarySubjects.length === 0 && 
        selectedCurrentFaculty.coFacultySubjects.length === 0) {
      errors.currentFaculty = "Selected faculty has no active subject assignments"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (replacementScope.subjectIds.length === 0) {
      errors.subjects = "Please select at least one subject to transfer"
    }

    if (!replacementScope.effectiveDate) {
      errors.effectiveDate = "Please select an effective date"
    } else {
      const effectiveDate = new Date(replacementScope.effectiveDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (effectiveDate < today) {
        errors.effectiveDate = "Effective date cannot be in the past"
      }
    }

    if (replacementScope.replacementType === 'temporary' && !replacementScope.endDate) {
      errors.endDate = "End date is required for temporary replacements"
    }

    if (replacementScope.endDate && replacementScope.effectiveDate) {
      const startDate = new Date(replacementScope.effectiveDate)
      const endDate = new Date(replacementScope.endDate)
      
      if (endDate <= startDate) {
        errors.endDate = "End date must be after effective date"
      }
    }

    if (!replacementScope.reason.trim()) {
      errors.reason = "Please provide a reason for the replacement"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep3 = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!selectedNewFaculty) {
      errors.newFaculty = "Please select a replacement faculty member"
    }

    if (selectedNewFaculty === selectedCurrentFaculty?.id) {
      errors.newFaculty = "Replacement faculty cannot be the same as current faculty"
    }

    // Check if selected new faculty is still available (not deleted or deactivated)
    const newFaculty = availableFaculty.find(f => f.id === selectedNewFaculty)
    if (selectedNewFaculty && !newFaculty) {
      errors.newFaculty = "Selected faculty is no longer available. Please refresh and try again."
    }

    if (newFaculty && newFaculty.status !== 'ACTIVE') {
      errors.newFaculty = "Selected faculty is not active. Please choose another faculty member."
    }

    if (conflictInfo?.hasConflicts) {
      errors.conflicts = "Please resolve conflicts before proceeding with the replacement"
    }

    // Additional validation for edge cases
    if (selectedCurrentFaculty && replacementScope.subjectIds.length > 0) {
      const currentFacultySubjects = [
        ...selectedCurrentFaculty.primarySubjects,
        ...selectedCurrentFaculty.coFacultySubjects
      ]
      
      const invalidSubjects = replacementScope.subjectIds.filter(
        subjectId => !currentFacultySubjects.find(s => s.id === subjectId)
      )
      
      if (invalidSubjects.length > 0) {
        errors.subjects = "Some selected subjects are no longer available. Please refresh and try again."
      }
    }

    // Validate date range again (in case user changed system date)
    if (replacementScope.effectiveDate) {
      const effectiveDate = new Date(replacementScope.effectiveDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (effectiveDate < today) {
        errors.effectiveDate = "Effective date cannot be in the past"
      }
    }

    if (replacementScope.endDate && replacementScope.effectiveDate) {
      const startDate = new Date(replacementScope.effectiveDate)
      const endDate = new Date(replacementScope.endDate)
      
      if (endDate <= startDate) {
        errors.endDate = "End date must be after effective date"
      }
      
      // Warn about very long temporary replacements
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (replacementScope.replacementType === 'temporary' && diffDays > 365) {
        errors.endDate = "Temporary replacement cannot exceed 1 year. Consider permanent replacement instead."
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Get available replacement faculty (active faculty excluding current)
  const availableFaculty = facultyData.filter(f => 
    f.status === 'ACTIVE' && 
    f.id !== selectedCurrentFaculty?.id
  )

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
      setSelectedCurrentFaculty(null)
      setSelectedNewFaculty('')
      setReplacementScope({
        subjectIds: [],
        batchIds: [],
        isPermanent: true,
        effectiveDate: formatDateForInput(new Date()),
        reason: '',
        replacementType: 'full'
      })
      setConflictInfo(null)
      setIsDryRun(false)
    }
  }, [open])

  // When current faculty is selected, auto-select all their subjects
  useEffect(() => {
    if (selectedCurrentFaculty) {
      const allSubjectIds = [
        ...selectedCurrentFaculty.primarySubjects.map(s => s.id),
        ...selectedCurrentFaculty.coFacultySubjects.map(s => s.id)
      ]
      setReplacementScope(prev => ({
        ...prev,
        subjectIds: allSubjectIds,
        batchIds: []
      }))
    }
  }, [selectedCurrentFaculty])

  // Check for conflicts when new faculty is selected
  useEffect(() => {
    if (selectedNewFaculty && selectedCurrentFaculty && replacementScope.subjectIds.length > 0) {
      checkForConflicts()
    }
  }, [selectedNewFaculty, replacementScope])

  const checkForConflicts = async () => {
    if (!selectedNewFaculty || !selectedCurrentFaculty || replacementScope.subjectIds.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/faculty/conflict-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newFacultyId: selectedNewFaculty,
          subjectIds: replacementScope.subjectIds,
          effectiveDate: replacementScope.effectiveDate,
          endDate: replacementScope.endDate,
          replacementType: replacementScope.replacementType
        })
      })

      if (response.ok) {
        const conflictData = await response.json()
        setConflictInfo(conflictData)
      } else {
        const error = await response.json()
        console.error('Conflict check error:', error)
        toast({
          title: "Conflict Check Failed",
          description: error.error || "Failed to check for conflicts",
          variant: "destructive"
        })
        
        // Fallback to basic workload calculation
        const newFaculty = availableFaculty.find(f => f.id === selectedNewFaculty)
        if (newFaculty) {
          const currentCredits = newFaculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                               newFaculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)
          
          const additionalCredits = replacementScope.subjectIds.reduce((sum, subjectId) => {
            const subject = [...selectedCurrentFaculty.primarySubjects, ...selectedCurrentFaculty.coFacultySubjects]
              .find(s => s.id === subjectId)
            return sum + (subject?.credits || 0)
          }, 0)

          const newCredits = currentCredits + additionalCredits
          const percentageIncrease = currentCredits > 0 ? ((additionalCredits / currentCredits) * 100) : 100

          setConflictInfo({
            hasConflicts: false,
            conflictDetails: [],
            warnings: [`Basic workload check: ${percentageIncrease.toFixed(1)}% increase (${additionalCredits} additional credits)`],
            workloadImpact: {
              currentCredits,
              newCredits,
              percentageIncrease
            },
            timeSlotConflicts: []
          })
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
      toast({
        title: "Conflict Check Error",
        description: "An error occurred while checking for conflicts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    setReplacementScope(prev => ({
      ...prev,
      subjectIds: checked 
        ? [...prev.subjectIds, subjectId]
        : prev.subjectIds.filter(id => id !== subjectId)
    }))
  }

  const handleExecuteReplacement = async (dryRun = false) => {
    // Pre-execution validation
    if (!validateStep3()) {
      toast({
        title: "Validation Failed",
        description: "Please fix the validation errors before proceeding",
        variant: "destructive"
      })
      return
    }

    if (!selectedCurrentFaculty || !selectedNewFaculty || replacementScope.subjectIds.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setIsDryRun(dryRun)

    try {
      // Refresh conflict check before execution to ensure data is current
      await checkForConflicts()
      
      // If conflicts exist after refresh, block execution
      if (conflictInfo?.hasConflicts && !dryRun) {
        toast({
          title: "Conflicts Detected",
          description: "Please resolve conflicts before proceeding with the replacement",
          variant: "destructive"
        })
        setIsLoading(false)
        setIsDryRun(false)
        return
      }

      const response = await fetch('/api/timetable/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'faculty_replace',
          options: {
            sourceData: {
              facultyId: selectedCurrentFaculty.id,
              subjectIds: replacementScope.subjectIds,
              batchIds: replacementScope.batchIds,
              dateRange: { 
                start: replacementScope.effectiveDate, 
                end: replacementScope.endDate 
              }
            },
            targetData: {
              facultyId: selectedNewFaculty
            },
            options: {
              dryRun,
              replacementType: replacementScope.replacementType,
              reason: replacementScope.reason,
              isPermanent: replacementScope.isPermanent
            }
          }
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (dryRun) {
          toast({
            title: "Preview Completed",
            description: result.summary || "Faculty replacement preview generated successfully",
          })
          // Could show detailed preview results here
        } else {
          toast({
            title: "Faculty Replacement Started",
            description: result.summary || "Faculty replacement has been initiated",
          })
          onReplacementComplete()
          onOpenChange(false)
        }
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          toast({
            title: "Conflict Detected",
            description: result.error || "A scheduling conflict was detected during execution",
            variant: "destructive"
          })
          // Refresh data to show updated conflicts
          await loadFacultyData()
          await checkForConflicts()
        } else if (response.status === 404) {
          toast({
            title: "Data Not Found",
            description: "Some faculty or subjects may have been modified. Please refresh and try again.",
            variant: "destructive"
          })
          await loadFacultyData()
        } else if (response.status === 403) {
          toast({
            title: "Permission Denied",
            description: result.error || "You don't have permission to perform this operation",
            variant: "destructive"
          })
        } else {
          throw new Error(result.error || 'Faculty replacement failed')
        }
      }
    } catch (error) {
      console.error('Faculty replacement error:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Please check your connection and try again",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Operation Failed",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
      setIsDryRun(false)
    }
  }

  const canProceedToStep2 = selectedCurrentFaculty !== null && Object.keys(validationErrors).length === 0
  const canProceedToStep3 = canProceedToStep2 && replacementScope.subjectIds.length > 0 && Object.keys(validationErrors).length === 0
  const canExecute = canProceedToStep3 && selectedNewFaculty && replacementScope.effectiveDate && Object.keys(validationErrors).length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0" style={{ width: '60vw', maxWidth: '60vw', maxHeight: '90vh' }}>
        <DialogHeader className="space-y-2 pb-3 px-6 pt-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Faculty Replacement
              </DialogTitle>
              <DialogDescription className="text-sm">
                Replace faculty assignments with comprehensive conflict detection and scheduling management
              </DialogDescription>
            </div>
            {dataStale && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 text-xs">
                Data may be outdated
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6">
          {/* Stepper Navigation */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            {[1, 2, 3].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep === step
                        ? "bg-primary text-primary-foreground"
                        : currentStep > step
                        ? "bg-green-100 text-green-800 border-2 border-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-sm font-medium ${
                      currentStep >= step ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step === 1 ? "Select Faculty" : step === 2 ? "Choose Scope" : "Assign & Execute"}
                    </div>
                  </div>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step + 1 ? "bg-green-500" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="overflow-y-auto pb-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {/* Step 1: Select Current Faculty */}
            {currentStep === 1 && (
              <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select Faculty to Replace</CardTitle>
                <CardDescription className="text-sm">
                  Choose the faculty member whose assignments need to be transferred
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Faculty Member</Label>
                  <Select
                    value={selectedCurrentFaculty?.id || ''}
                    onValueChange={(value) => {
                      const facultyMember = facultyData.find(f => f.id === value)
                      setSelectedCurrentFaculty(facultyMember || null)
                    }}
                    disabled={loadingFaculty}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={loadingFaculty ? "Loading faculty..." : "Select current faculty member"} />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyData.filter(f => f.status === 'ACTIVE').map((facultyMember) => (
                        <SelectItem key={facultyMember.id} value={facultyMember.id}>
                          <div className="flex items-center justify-between w-full min-w-[350px] max-w-[400px]">
                            <span className="font-medium truncate flex-1">{facultyMember.name}</span>
                            <span className="text-sm text-muted-foreground ml-2 shrink-0">
                              {facultyMember.primarySubjects.length + facultyMember.coFacultySubjects.length} subjects
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCurrentFaculty && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Current Assignments for {selectedCurrentFaculty.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(selectedCurrentFaculty.primarySubjects.length > 0 || selectedCurrentFaculty.coFacultySubjects.length > 0) && (
                        <div className="space-y-2">
                          <div className="rounded-md border overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left p-3 font-medium w-[80px]">Type</th>
                                  <th className="text-left p-3 font-medium min-w-[200px]">Subject</th>
                                  <th className="text-left p-3 font-medium w-[80px]">Code</th>
                                  <th className="text-left p-3 font-medium w-[70px]">Credits</th>
                                  <th className="text-left p-3 font-medium min-w-[150px]">Batch</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedCurrentFaculty.primarySubjects.map((subject) => (
                                  <tr key={subject.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                    <td className="p-3">
                                      <Badge variant="default" className="text-xs">Primary</Badge>
                                    </td>
                                    <td className="p-3 font-medium">{subject.name}</td>
                                    <td className="p-3 text-muted-foreground">{subject.code}</td>
                                    <td className="p-3">{subject.credits}</td>
                                    <td className="p-3 text-muted-foreground">{subject.batch.name}</td>
                                  </tr>
                                ))}
                                {selectedCurrentFaculty.coFacultySubjects.map((subject) => (
                                  <tr key={subject.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                    <td className="p-3">
                                      <Badge variant="secondary" className="text-xs">Co-Faculty</Badge>
                                    </td>
                                    <td className="p-3 font-medium">{subject.name}</td>
                                    <td className="p-3 text-muted-foreground">{subject.code}</td>
                                    <td className="p-3">{subject.credits}</td>
                                    <td className="p-3 text-muted-foreground">{subject.batch.name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-between items-center pt-1 text-sm">
                            <span className="text-muted-foreground">
                              {selectedCurrentFaculty.primarySubjects.length + selectedCurrentFaculty.coFacultySubjects.length} subjects total
                            </span>
                            <span className="font-medium">
                              Total Credits: {
                                selectedCurrentFaculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                                selectedCurrentFaculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => {
                  if (validateStep1()) {
                    setCurrentStep(2)
                  }
                }}
                disabled={!selectedCurrentFaculty}
                className="px-6"
              >
                Next: Choose Scope
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {validationErrors.currentFaculty && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationErrors.currentFaculty}</AlertDescription>
              </Alert>
            )}
              </div>
            )}

            {/* Step 2: Choose Replacement Scope */}
            {currentStep === 2 && (
              <div className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Replacement Scope</CardTitle>
                  <CardDescription className="text-sm">
                    Select which subjects and assignments to transfer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Replacement Type and Effective Date side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Replacement Type</Label>
                      <Select
                        value={replacementScope.replacementType}
                        onValueChange={(value: 'full' | 'partial' | 'temporary') => 
                          setReplacementScope(prev => ({ ...prev, replacementType: value }))
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Replacement</SelectItem>
                          <SelectItem value="partial">Partial Replacement</SelectItem>
                          <SelectItem value="temporary">Temporary Replacement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Effective Date</Label>
                    <Input
                      type="date"
                      value={replacementScope.effectiveDate}
                      onChange={(e) => {
                        setReplacementScope(prev => ({ 
                          ...prev, 
                          effectiveDate: e.target.value 
                        }))
                        // Clear error when user makes changes
                        if (validationErrors.effectiveDate) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors.effectiveDate
                            return newErrors
                          })
                        }
                      }}
                      className={validationErrors.effectiveDate ? 'border-red-500 h-10' : 'h-10'}
                    />
                      {validationErrors.effectiveDate && (
                        <p className="text-xs text-red-500">{validationErrors.effectiveDate}</p>
                      )}
                    </div>
                  </div>

                  {/* End Date (only for temporary replacements) */}
                  {replacementScope.replacementType === 'temporary' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date</Label>
                      <Input
                        type="date"
                        value={replacementScope.endDate || ''}
                        onChange={(e) => {
                          setReplacementScope(prev => ({ 
                            ...prev, 
                            endDate: e.target.value 
                          }))
                          // Clear error when user makes changes
                          if (validationErrors.endDate) {
                            setValidationErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.endDate
                              return newErrors
                            })
                          }
                        }}
                        className={validationErrors.endDate ? 'border-red-500 h-10' : 'h-10'}
                      />
                      {validationErrors.endDate && (
                        <p className="text-xs text-red-500">{validationErrors.endDate}</p>
                      )}
                    </div>
                  )}

                  {/* Reason for Replacement */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reason for Replacement</Label>
                    <Input
                      placeholder="e.g., Medical leave, Resignation, Sabbatical..."
                      value={replacementScope.reason}
                      onChange={(e) => {
                        setReplacementScope(prev => ({ 
                          ...prev, 
                          reason: e.target.value 
                        }))
                        // Clear error when user makes changes
                        if (validationErrors.reason) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors.reason
                            return newErrors
                          })
                        }
                      }}
                      className={validationErrors.reason ? 'border-red-500 h-10' : 'h-10'}
                    />
                    {validationErrors.reason && (
                      <p className="text-xs text-red-500">{validationErrors.reason}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select Subjects</CardTitle>
                  <CardDescription className="text-sm">
                    Choose which subjects to include in the replacement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedCurrentFaculty && (
                    <div className="space-y-3">
                      <div className="rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 w-12"></th>
                              <th className="text-left p-2 font-medium">Type</th>
                              <th className="text-left p-2 font-medium">Subject</th>
                              <th className="text-left p-2 font-medium">Code</th>
                              <th className="text-left p-2 font-medium">Credits</th>
                              <th className="text-left p-2 font-medium">Batch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCurrentFaculty.primarySubjects.map((subject) => (
                              <tr key={subject.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                <td className="p-2">
                                  <Checkbox
                                    id={`primary-${subject.id}`}
                                    checked={replacementScope.subjectIds.includes(subject.id)}
                                    onCheckedChange={(checked) => 
                                      handleSubjectToggle(subject.id, checked as boolean)
                                    }
                                  />
                                </td>
                                <td className="p-2">
                                  <Badge variant="default" className="text-xs">Primary</Badge>
                                </td>
                                <td className="p-2 font-medium">{subject.name}</td>
                                <td className="p-2 text-muted-foreground">{subject.code}</td>
                                <td className="p-2">{subject.credits}</td>
                                <td className="p-2 text-muted-foreground">{subject.batch.name}</td>
                              </tr>
                            ))}
                            {selectedCurrentFaculty.coFacultySubjects.map((subject) => (
                              <tr key={subject.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                <td className="p-2">
                                  <Checkbox
                                    id={`co-${subject.id}`}
                                    checked={replacementScope.subjectIds.includes(subject.id)}
                                    onCheckedChange={(checked) => 
                                      handleSubjectToggle(subject.id, checked as boolean)
                                    }
                                  />
                                </td>
                                <td className="p-2">
                                  <Badge variant="secondary" className="text-xs">Co-Faculty</Badge>
                                </td>
                                <td className="p-2 font-medium">{subject.name}</td>
                                <td className="p-2 text-muted-foreground">{subject.code}</td>
                                <td className="p-2">{subject.credits}</td>
                                <td className="p-2 text-muted-foreground">{subject.batch.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {replacementScope.subjectIds.length} of {selectedCurrentFaculty.primarySubjects.length + selectedCurrentFaculty.coFacultySubjects.length} subjects selected
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="px-6">
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (validateStep2()) {
                    setCurrentStep(3)
                  }
                }}
                disabled={replacementScope.subjectIds.length === 0}
                className="px-6"
              >
                Next: Assign Faculty
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {(validationErrors.subjects || validationErrors.effectiveDate || validationErrors.endDate || validationErrors.reason) && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the following errors:
                  <ul className="mt-2 space-y-1">
                    {validationErrors.subjects && <li>• {validationErrors.subjects}</li>}
                    {validationErrors.effectiveDate && <li>• {validationErrors.effectiveDate}</li>}
                    {validationErrors.endDate && <li>• {validationErrors.endDate}</li>}
                    {validationErrors.reason && <li>• {validationErrors.reason}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
              </div>
            )}

            {/* Step 3: Assign New Faculty & Execute */}
            {currentStep === 3 && (
              <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select Replacement Faculty</CardTitle>
                  <CardDescription className="text-sm">
                    Choose the new faculty member for the selected assignments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">New Faculty Member</Label>
                    <Select
                      value={selectedNewFaculty}
                      onValueChange={setSelectedNewFaculty}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select replacement faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFaculty.map((facultyMember) => (
                          <SelectItem key={facultyMember.id} value={facultyMember.id}>
                            <div className="flex items-center justify-between w-full min-w-[350px] max-w-[400px]">
                              <span className="font-medium truncate flex-1">{facultyMember.name}</span>
                              <span className="text-sm text-muted-foreground ml-2 shrink-0">
                                {facultyMember.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                                 facultyMember.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)} credits
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {conflictInfo && (
                    <div className="space-y-3">
                      {conflictInfo.hasConflicts && (
                        <Alert className="border-red-200 py-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div className="font-medium text-red-800 text-sm">Conflicts Detected:</div>
                              {conflictInfo.conflictDetails.map((detail, index) => (
                                <div key={index} className="text-xs text-red-700">{detail}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {conflictInfo.timeSlotConflicts && conflictInfo.timeSlotConflicts.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-red-800">Time Slot Conflicts:</div>
                          <div className="space-y-1">
                            {conflictInfo.timeSlotConflicts.map((conflict, index) => (
                              <div key={index} className="bg-red-50 p-2 rounded text-xs border-l-2 border-red-500">
                                <div className="font-medium">{conflict.day} - {conflict.timeSlot}</div>
                                <div className="text-red-600">
                                  Conflicts with: {conflict.conflictingSubject} ({conflict.conflictingBatch})
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {conflictInfo.warnings.length > 0 && !conflictInfo.hasConflicts && (
                        <Alert className="border-yellow-200 py-2">
                          <Info className="h-4 w-4 text-yellow-600" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div className="font-medium text-yellow-800 text-sm">Warnings:</div>
                              {conflictInfo.warnings.map((warning, index) => (
                                <div key={index} className="text-xs text-yellow-700">{warning}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Workload Impact</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-muted-foreground">Current</div>
                              <div className="font-medium">{conflictInfo.workloadImpact.currentCredits}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground">New</div>
                              <div className="font-medium">{conflictInfo.workloadImpact.newCredits}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground">Increase</div>
                              <div className={`font-bold ${
                                conflictInfo.workloadImpact.percentageIncrease > 50 
                                  ? 'text-red-600' 
                                  : conflictInfo.workloadImpact.percentageIncrease > 25
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}>
                                +{conflictInfo.workloadImpact.percentageIncrease.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Replacement Summary</CardTitle>
                  <CardDescription className="text-sm">
                    Review the changes before execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedCurrentFaculty && selectedNewFaculty && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {selectedCurrentFaculty.name}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="default" className="text-xs">
                          {availableFaculty.find(f => f.id === selectedNewFaculty)?.name}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Subjects ({replacementScope.subjectIds.length}):</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {replacementScope.subjectIds.map(subjectId => {
                            const subject = [
                              ...selectedCurrentFaculty.primarySubjects,
                              ...selectedCurrentFaculty.coFacultySubjects
                            ].find(s => s.id === subjectId)
                            return subject ? (
                              <div key={subjectId} className="flex items-center gap-2 p-2 bg-white rounded border text-xs">
                                <BookOpen className="h-3 w-3 text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{subject.code} - {subject.name}</span>
                                  <span className="text-muted-foreground ml-1">({subject.credits} credits)</span>
                                </div>
                              </div>
                            ) : null
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded">
                          <Calendar className="h-3 w-3 text-blue-600" />
                          <span><strong>Effective:</strong> {formatDateForDisplay(replacementScope.effectiveDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-green-50 rounded">
                          <Clock className="h-3 w-3 text-green-600" />
                          <span><strong>Type:</strong> {replacementScope.replacementType.charAt(0).toUpperCase() + replacementScope.replacementType.slice(1)}</span>
                        </div>
                        {replacementScope.reason && (
                          <div className="flex items-start gap-2 p-1.5 bg-gray-50 rounded">
                            <Info className="h-3 w-3 text-gray-600 mt-0.5 shrink-0" />
                            <span><strong>Reason:</strong> {replacementScope.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="px-6">
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExecuteReplacement(true)}
                  disabled={!canExecute || isLoading}
                  className="px-4"
                >
                  {isLoading && isDryRun ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Preview
                </Button>
                <Button
                  onClick={() => handleExecuteReplacement(false)}
                  disabled={!canExecute || isLoading || conflictInfo?.hasConflicts}
                  className="px-4"
                >
                  {isLoading && !isDryRun ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Execute
                </Button>
              </div>
            </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}