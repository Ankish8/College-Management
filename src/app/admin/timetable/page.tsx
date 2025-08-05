"use client"

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Download, 
  Upload, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Filter
} from 'lucide-react'
import { FullCalendar } from '@/components/ui/full-calendar'
import dynamic from 'next/dynamic'

const CreateTimetableEntryModal = dynamic(() => import('@/components/timetable/create-timetable-entry-modal').then(mod => ({ default: mod.CreateTimetableEntryModal })))

const ConflictResolutionModal = dynamic(() => import('@/components/timetable/conflict-resolution-modal').then(mod => ({ default: mod.ConflictResolutionModal })))
import { AlternativeSuggestions } from '@/components/timetable/alternative-suggestions'
import { AutoResolveWizard } from '@/components/timetable/auto-resolve-wizard'
import { CalendarFilters } from '@/components/timetable/calendar-filters'
import { CalendarEvent, TimetableFilters, ConflictInfo } from '@/types/timetable'
import { isAdmin } from '@/lib/utils/permissions'
import { toast } from 'sonner'

interface TimetableStats {
  totalEntries: number
  activeConflicts: number
  pendingApprovals: number
  schedulingEfficiency: number
  batchCoverage: {
    total: number
    scheduled: number
    percentage: number
  }
  facultyWorkload: {
    overloaded: number
    balanced: number
    underutilized: number
  }
}

// API functions
const fetchTimetableEntries = async (filters: TimetableFilters): Promise<CalendarEvent[]> => {
  const searchParams = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.append(key, value.toString())
  })
  
  const response = await fetch(`/api/timetable/entries?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch timetable entries')
  const data = await response.json()
  return data.entries || []
}

const fetchTimetableStats = async (): Promise<TimetableStats> => {
  const response = await fetch('/api/timetable/stats')
  if (!response.ok) throw new Error('Failed to fetch timetable statistics')
  return response.json()
}

const fetchActiveConflicts = async (): Promise<ConflictInfo[]> => {
  const response = await fetch('/api/timetable/conflicts/active')
  if (!response.ok) throw new Error('Failed to fetch active conflicts')
  return response.json()
}

export default function AdminTimetablePage() {
  const { data: session, status } = useSession()
  const [filters, setFilters] = useState<TimetableFilters>({})
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [showAutoResolve, setShowAutoResolve] = useState(false)
  const [currentConflicts, setCurrentConflicts] = useState<ConflictInfo[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>()

  // Check if user is admin
  const user = session?.user as any
  const isUserAdmin = user && isAdmin(user)

  // Fetch data
  const { data: timetableEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['admin-timetable-entries', filters],
    queryFn: () => fetchTimetableEntries(filters),
    enabled: isUserAdmin,
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['timetable-stats'],
    queryFn: fetchTimetableStats,
    enabled: isUserAdmin,
  })

  const { data: activeConflicts = [], isLoading: loadingConflicts } = useQuery({
    queryKey: ['active-conflicts'],
    queryFn: fetchActiveConflicts,
    enabled: isUserAdmin,
  })

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    console.log('Event clicked:', event)
  }

  const handleEventCreate = (date: Date, timeSlot?: string) => {
    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    setShowCreateModal(true)
  }

  const handleCreateSuccess = (entry: any) => {
    toast.success('Timetable entry created successfully')
    refetchEntries()
    setShowCreateModal(false)
  }

  const handleCreateError = (conflicts: ConflictInfo[]) => {
    setCurrentConflicts(conflicts)
    setShowConflictModal(true)
  }

  const handleConflictResolve = () => {
    setShowConflictModal(false)
    setShowAutoResolve(true)
  }

  const handleAutoResolveComplete = (resolvedEntry: any) => {
    toast.success('Conflicts resolved automatically')
    refetchEntries()
    setShowAutoResolve(false)
  }

  const handleFiltersChange = (newFilters: TimetableFilters) => {
    setFilters(newFilters)
  }

  const handleExportTimetable = () => {
    toast.info('Exporting timetable data...')
    // Implementation for export functionality
  }

  const handleImportTimetable = () => {
    toast.info('Import functionality coming soon...')
    // Implementation for import functionality
  }

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only accessible to administrators.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and optimize class schedules
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportTimetable}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportTimetable}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled classes this semester
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.activeConflicts}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batch Coverage</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.batchCoverage.percentage}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.batchCoverage.scheduled} of {stats.batchCoverage.total} batches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.schedulingEfficiency}%</div>
              <p className="text-xs text-muted-foreground">
                Resource utilization
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Conflicts Alert */}
      {activeConflicts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium">{activeConflicts.length} active conflicts detected</span>
              <p className="text-sm">Review and resolve scheduling conflicts to ensure smooth operations.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAutoResolve(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Auto-Resolve
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conflicts ({activeConflicts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onReset={() => setFilters({})}
                availableOptions={{
                  batches: [], // Would be fetched from API
                  specializations: [], // Would be fetched from API
                  faculty: [], // Would be fetched from API
                  subjects: [], // Would be fetched from API
                }}
              />
            </CardContent>
          </Card>

          {/* Calendar Component */}
          <Card className="min-h-[600px]">
            <CardContent className="p-0">
              <FullCalendar
                events={timetableEntries}
                initialView="week"
                onEventClick={handleEventClick}
                onEventCreate={handleEventCreate}
                isLoading={loadingEntries}
                conflicts={activeConflicts}
                filters={{}}
                onFiltersChange={() => {}}
                showWeekends={false}
                className="h-[600px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <div className="grid gap-4">
            {activeConflicts.map((conflict, index) => (
              <Card key={index} className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    {conflict.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    <Badge variant="outline">{conflict.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{conflict.message}</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button size="sm">
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {activeConflicts.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <div className="text-lg font-medium text-green-700 mb-2">No Active Conflicts</div>
                  <p className="text-muted-foreground">
                    All timetable entries are properly scheduled without conflicts.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faculty Workload Distribution */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Faculty Workload Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overloaded</span>
                      <Badge variant="destructive">{stats.facultyWorkload.overloaded}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Balanced</span>
                      <Badge variant="default">{stats.facultyWorkload.balanced}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Underutilized</span>
                      <Badge variant="secondary">{stats.facultyWorkload.underutilized}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Optimize Time Slots
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Balance Faculty Workload
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateTimetableEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={currentConflicts}
        proposedEntry={{
          batchName: 'Sample Batch',
          subjectName: 'Sample Subject',
          facultyName: 'Sample Faculty',
          timeSlotName: selectedTimeSlot || '',
          dayOfWeek: selectedDate?.toLocaleDateString('en', { weekday: 'long' }) || '',
          date: selectedDate?.toISOString(),
        }}
        onForceCreate={() => {
          setShowConflictModal(false)
          toast.success('Entry created with conflicts')
        }}
        onModifyEntry={() => {
          setShowConflictModal(false)
          setShowCreateModal(true)
        }}
        onAutoResolve={handleConflictResolve}
      />

      <AutoResolveWizard
        isOpen={showAutoResolve}
        onClose={() => setShowAutoResolve(false)}
        conflicts={currentConflicts}
        originalEntry={{
          batchId: '',
          subjectId: '',
          facultyId: '',
          timeSlotId: '',
          dayOfWeek: '',
        }}
        onResolutionComplete={handleAutoResolveComplete}
      />
    </div>
  )
}