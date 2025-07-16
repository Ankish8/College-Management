"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw,
  Calendar,
  Clock,
  Users,
  FileText,
  Play,
  AlertTriangle,
  CheckCircle,
  Plus,
  Eye,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BulkOperation {
  id: string
  type: string
  status: string
  startTime: string
  endTime?: string
  summary: string
  affectedCount: number
  successCount: number
  failedCount: number
  progress: number
  parameters?: any
  results?: any
}

interface BulkOperationOptions {
  operation: 'clone' | 'reschedule' | 'faculty_replace' | 'batch_assign' | 'template_apply'
  sourceData?: {
    batchId?: string
    facultyId?: string
    dateRange?: { start: string; end: string }
    templateId?: string
  }
  targetData?: {
    batchId?: string
    facultyId?: string
    dateRange?: { start: string; end: string }
    dayOffset?: number
  }
  options?: {
    preserveConflicts?: boolean
    updateExisting?: boolean
    createBackup?: boolean
    validateOnly?: boolean
    dryRun?: boolean
    showConflictVisualization?: boolean
  }
}

interface OperationResult {
  success: boolean
  affected: number
  successful: number
  failed: number
  errors: string[]
  warnings: string[]
  summary: string
  operationId: string
  dryRun?: boolean
  conflictVisualization?: any
  previewResults?: any
}

export default function BulkOperationsPage() {
  const { toast } = useToast()
  const [operations, setOperations] = useState<BulkOperation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<string>('')
  const [activeTab, setActiveTab] = useState('operations')
  
  // Form states for different operations
  
  const [facultyReplaceForm, setFacultyReplaceForm] = useState({
    currentFacultyId: '',
    newFacultyId: '',
    effectiveDate: '',
    maintainWorkload: true,
    replacementType: 'permanent' as 'permanent' | 'temporary' | 'partial',
    reason: ''
  })
  

  // Load operation history on mount
  useEffect(() => {
    loadOperationHistory()
  }, [])

  const loadOperationHistory = async () => {
    try {
      const response = await fetch('/api/timetable/bulk-operations?history=true&limit=20')
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
      }
    } catch (error) {
      console.error('Error loading operation history:', error)
    }
  }

  // Execute bulk operation
  const executeOperation = async (operationData: BulkOperationOptions, isDryRun = false) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/timetable/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: operationData.operation,
          options: {
            ...operationData,
            options: {
              ...operationData.options,
              dryRun: isDryRun
            }
          }
        })
      })

      const result: OperationResult = await response.json()

      if (response.ok) {
        if (isDryRun) {
          toast({
            title: "Dry-run completed",
            description: result.summary,
          })
          // Show preview results
          console.log('Dry-run results:', result)
        } else {
          toast({
            title: "Operation started",
            description: result.summary,
          })
          loadOperationHistory() // Refresh the list
        }
        return result
      } else {
        throw new Error(result.errors?.[0] || 'Operation failed')
      }
    } catch (error) {
      toast({
        title: "Operation failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }


  // Faculty replace operation
  const handleFacultyReplaceOperation = async (isDryRun = false) => {
    if (!facultyReplaceForm.currentFacultyId || !facultyReplaceForm.newFacultyId) {
      toast({
        title: "Missing information",
        description: "Please select both current and new faculty",
        variant: "destructive"
      })
      return
    }

    const operationData: BulkOperationOptions = {
      operation: 'faculty_replace',
      sourceData: {
        facultyId: facultyReplaceForm.currentFacultyId,
        ...(facultyReplaceForm.effectiveDate && {
          dateRange: { start: facultyReplaceForm.effectiveDate, end: '' }
        })
      },
      targetData: {
        facultyId: facultyReplaceForm.newFacultyId
      }
    }

    return executeOperation(operationData, isDryRun)
  }


  const operationTypes = [
    {
      type: 'faculty_replace',
      icon: Users,
      title: 'Faculty Replacement',
      description: 'Replace faculty across all their assigned classes',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      type: 'template_apply',
      icon: FileText,
      title: 'Apply Template',
      description: 'Apply saved template to multiple batches',
      color: 'bg-orange-50 border-orange-200'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Operations</h1>
          <p className="text-gray-600">Manage timetable operations and templates</p>
        </div>
        <Button onClick={loadOperationHistory} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Operation Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {operationTypes.map((op) => {
              const IconComponent = op.icon
              return (
                <Card key={op.type} className={`cursor-pointer transition-all hover:shadow-md ${op.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/70">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{op.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">{op.description}</p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => setActiveTab(op.type)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Faculty Replace Operation Tab */}
        <TabsContent value="faculty_replace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Faculty Replacement
              </CardTitle>
              <CardDescription>
                Replace faculty across all their assigned classes with comprehensive conflict detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Faculty</Label>
                  <Select value={facultyReplaceForm.currentFacultyId} onValueChange={(value) => 
                    setFacultyReplaceForm(prev => ({ ...prev, currentFacultyId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select current faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faculty1">Prof. Ankish Khatri</SelectItem>
                      <SelectItem value="faculty2">Prof. Sarah Johnson</SelectItem>
                      <SelectItem value="faculty3">Prof. John Doe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>New Faculty</Label>
                  <Select value={facultyReplaceForm.newFacultyId} onValueChange={(value) => 
                    setFacultyReplaceForm(prev => ({ ...prev, newFacultyId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faculty1">Prof. Ankish Khatri</SelectItem>
                      <SelectItem value="faculty2">Prof. Sarah Johnson</SelectItem>
                      <SelectItem value="faculty3">Prof. John Doe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Effective Date</Label>
                  <Input 
                    type="date" 
                    value={facultyReplaceForm.effectiveDate}
                    onChange={(e) => setFacultyReplaceForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Replacement Type</Label>
                  <Select 
                    value={facultyReplaceForm.replacementType}
                    onValueChange={(value: 'permanent' | 'temporary' | 'partial') => 
                      setFacultyReplaceForm(prev => ({ ...prev, replacementType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent Replacement</SelectItem>
                      <SelectItem value="temporary">Temporary Replacement</SelectItem>
                      <SelectItem value="partial">Partial Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Replacement</Label>
                <Input 
                  placeholder="e.g., Medical leave, Resignation, Sabbatical..."
                  value={facultyReplaceForm.reason}
                  onChange={(e) => setFacultyReplaceForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="maintainWorkload"
                    checked={facultyReplaceForm.maintainWorkload}
                    onChange={(e) => setFacultyReplaceForm(prev => ({ ...prev, maintainWorkload: e.target.checked }))}
                  />
                  <Label htmlFor="maintainWorkload">Check for workload conflicts</Label>
                </div>
              </div>

              {(facultyReplaceForm.currentFacultyId && facultyReplaceForm.newFacultyId) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Replacement Preview:</div>
                      <div className="text-sm">
                        All assignments from {facultyReplaceForm.currentFacultyId} will be transferred to {facultyReplaceForm.newFacultyId}
                        {facultyReplaceForm.effectiveDate && ` starting from ${new Date(facultyReplaceForm.effectiveDate).toLocaleDateString()}`}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleFacultyReplaceOperation(true)} variant="outline" disabled={isLoading}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Changes
                </Button>
                <Button onClick={() => handleFacultyReplaceOperation(false)} disabled={isLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Replacement
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operation History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operation History
              </CardTitle>
              <CardDescription>
                Track the status and results of your bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {operations.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {operation.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {operation.status === 'running' && (
                          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        )}
                        {operation.status === 'failed' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant="outline">{operation.type}</Badge>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{operation.summary}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(operation.startTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {operation.status === 'running' && (
                        <div className="text-xs text-muted-foreground">
                          {operation.progress}%
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {operation.successCount}/{operation.affectedCount} successful
                      </div>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
                
                {operations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent operations</p>
                    <p className="text-xs">Bulk operations will appear here once started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Management
              </CardTitle>
              <CardDescription>
                Create and manage timetable templates for reuse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Template management coming soon</p>
                <p className="text-xs">Create reusable timetable templates</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{operations.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {operations.length > 0 
                    ? Math.round((operations.filter(op => op.status === 'completed').length / operations.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Completed operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Entries Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {operations.reduce((sum, op) => sum + op.affectedCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Timetable entries</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}