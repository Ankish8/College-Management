"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Settings, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  SortAsc,
  SortDesc,
  BarChart3,
  Download,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { isAdmin } from '@/lib/utils/permissions'
import { AddTimeSlotModal } from '@/components/timeslots/add-timeslot-modal'
import { EditTimeSlotModal } from '@/components/timeslots/edit-timeslot-modal'
import { DeleteTimeSlotModal } from '@/components/timeslots/delete-timeslot-modal'

interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  usageCount: number
  inUse: boolean
  _count: {
    timetableEntries: number
    timetableTemplates: number
  }
}

interface TimeSlotFilters {
  search?: string
  isActive?: boolean | 'all'
  sortBy: 'startTime' | 'sortOrder' | 'createdAt' | 'name' | 'duration' | 'usageCount'
  sortOrder: 'asc' | 'desc'
}

export default function TimeSlotsPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingTimeSlotId, setEditingTimeSlotId] = useState<string | null>(null)
  const [deletingTimeSlot, setDeletingTimeSlot] = useState<TimeSlot | null>(null)
  const [filters, setFilters] = useState<TimeSlotFilters>({
    search: '',
    isActive: 'all',
    sortBy: 'sortOrder',
    sortOrder: 'asc'
  })

  // Check permissions
  if (status === 'authenticated' && !isAdmin(session?.user as any)) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Fetch time slots
  const { data: timeSlotsData, isLoading, error } = useQuery({
    queryKey: ['timeSlots', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.isActive !== 'all') params.append('isActive', String(filters.isActive))
      params.append('sortBy', filters.sortBy)
      params.append('sortOrder', filters.sortOrder)

      const response = await fetch(`/api/timeslots?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch time slots')
      }
      return response.json()
    },
    enabled: status === 'authenticated' && isAdmin(session?.user as any)
  })

  const timeSlots: TimeSlot[] = timeSlotsData?.timeSlots || []

  // Toggle time slot status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const response = await fetch(`/api/timeslots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })
      if (!response.ok) throw new Error('Failed to update time slot status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      toast.success('Time slot status updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update time slot status')
    }
  })

  const handleToggleStatus = (timeSlot: TimeSlot) => {
    toggleStatusMutation.mutate({ 
      id: timeSlot.id, 
      isActive: !timeSlot.isActive 
    })
  }

  const handleDelete = (timeSlot: TimeSlot) => {
    setDeletingTimeSlot(timeSlot)
    setShowDeleteModal(true)
  }

  const handleDuplicate = (timeSlot: TimeSlot) => {
    // This will be implemented in the next task
    toast.info('Duplicate functionality will be implemented next')
  }

  const handleEdit = (timeSlot: TimeSlot) => {
    setEditingTimeSlotId(timeSlot.id)
    setShowEditModal(true)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) < 12 ? 'AM' : 'PM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const getUsageColor = (usageCount: number) => {
    if (usageCount === 0) return 'bg-gray-100 text-gray-600'
    if (usageCount < 5) return 'bg-blue-100 text-blue-600'
    if (usageCount < 10) return 'bg-yellow-100 text-yellow-600'
    return 'bg-red-100 text-red-600'
  }

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Slots Management</h1>
          <p className="text-muted-foreground">
            Configure and manage time slots for your timetable system
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search time slots..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              <Select 
                value={String(filters.isActive)} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isActive: value === 'all' ? 'all' : value === 'true' 
                }))}
              >
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-') as [TimeSlotFilters['sortBy'], 'asc' | 'desc']
                  setFilters(prev => ({ ...prev, sortBy, sortOrder }))
                }}
              >
                <SelectTrigger className="w-48">
                  {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortOrder-asc">Sort Order (A-Z)</SelectItem>
                  <SelectItem value="sortOrder-desc">Sort Order (Z-A)</SelectItem>
                  <SelectItem value="startTime-asc">Start Time (Early)</SelectItem>
                  <SelectItem value="startTime-desc">Start Time (Late)</SelectItem>
                  <SelectItem value="duration-asc">Duration (Short)</SelectItem>
                  <SelectItem value="duration-desc">Duration (Long)</SelectItem>
                  <SelectItem value="usageCount-asc">Usage (Low)</SelectItem>
                  <SelectItem value="usageCount-desc">Usage (High)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeSlots.length}</div>
            <p className="text-xs text-muted-foreground">
              {timeSlots.filter(ts => ts.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeSlots.filter(ts => ts.inUse).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeSlots.length > 0 
                ? formatDuration(Math.round(timeSlots.reduce((sum, ts) => sum + ts.duration, 0) / timeSlots.length))
                : '0m'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average time slot length
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeSlots.length > 0 
                ? Math.max(...timeSlots.map(ts => ts.usageCount))
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Most used time slot
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Slots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Slots ({timeSlots.length})</CardTitle>
          <CardDescription>
            Manage your time slots, their usage, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load time slots. Please try again.
              </AlertDescription>
            </Alert>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time slots found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first time slot.</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map((timeSlot) => (
                  <TableRow key={timeSlot.id}>
                    <TableCell className="font-medium">
                      {timeSlot.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeSlot.startTime} - {timeSlot.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDuration(timeSlot.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={timeSlot.isActive ? "default" : "secondary"}>
                          {timeSlot.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {timeSlot.inUse && (
                          <Badge variant="outline" className="text-blue-600">
                            In Use
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getUsageColor(timeSlot.usageCount)}>
                        {timeSlot.usageCount} uses
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {timeSlot.sortOrder}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(timeSlot)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(timeSlot)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(timeSlot)}>
                            {timeSlot.isActive ? (
                              <ToggleLeft className="h-4 w-4 mr-2" />
                            ) : (
                              <ToggleRight className="h-4 w-4 mr-2" />
                            )}
                            {timeSlot.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(timeSlot)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {timeSlot.inUse ? 'Deactivate' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Time Slot Modal */}
      <AddTimeSlotModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      {/* Edit Time Slot Modal */}
      <EditTimeSlotModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open)
          if (!open) {
            setEditingTimeSlotId(null)
          }
        }}
        timeSlotId={editingTimeSlotId}
      />

      {/* Delete Time Slot Modal */}
      <DeleteTimeSlotModal
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open)
          if (!open) {
            setDeletingTimeSlot(null)
          }
        }}
        timeSlot={deletingTimeSlot}
      />
    </div>
  )
}