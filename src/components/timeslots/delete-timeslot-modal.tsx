"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertTriangle, 
  Trash2, 
  Info, 
  Shield, 
  Users, 
  Calendar,
  Database,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  isActive: boolean
  sortOrder: number
  usageCount: number
  inUse: boolean
  _count: {
    timetableEntries: number
    timetableTemplates: number
  }
}

interface DeleteTimeSlotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeSlot: TimeSlot | null
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour12 = parseInt(hours) % 12 || 12
  const ampm = parseInt(hours) < 12 ? 'AM' : 'PM'
  return `${hour12}:${minutes} ${ampm}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function DeleteTimeSlotModal({ open, onOpenChange, timeSlot }: DeleteTimeSlotModalProps) {
  const queryClient = useQueryClient()

  // Delete time slot mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!timeSlot) throw new Error('No time slot provided')
      
      const response = await fetch(`/api/timeslots/${timeSlot.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete time slot')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      
      if (data.soft_deleted) {
        toast.success('Time slot deactivated due to existing usage')
      } else {
        toast.success('Time slot deleted permanently')
      }
      
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete time slot')
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  if (!timeSlot) return null

  const isInUse = timeSlot.inUse || timeSlot.usageCount > 0
  const willBeSoftDeleted = isInUse

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {willBeSoftDeleted ? 'Deactivate' : 'Delete'} Time Slot
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to {willBeSoftDeleted ? 'deactivate' : 'permanently delete'} the time slot "{timeSlot.name}".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Time Slot Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {timeSlot.name}
                <Badge variant={timeSlot.isActive ? "default" : "secondary"}>
                  {timeSlot.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)} • {formatDuration(timeSlot.duration)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium">{timeSlot.usageCount}</div>
                  <div className="text-muted-foreground">Total Usage</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{timeSlot._count.timetableEntries}</div>
                  <div className="text-muted-foreground">Active Entries</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{timeSlot._count.timetableTemplates}</div>
                  <div className="text-muted-foreground">Templates</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Type and Consequences */}
          {willBeSoftDeleted ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">This time slot will be deactivated (soft delete)</div>
                <p className="text-sm mb-3">
                  Because this time slot is currently in use, it cannot be permanently deleted. 
                  Instead, it will be deactivated to preserve existing schedules.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">What happens next:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Time slot will be marked as inactive</li>
                    <li>Existing schedule entries remain unchanged</li>
                    <li>Will not appear in new timetable creation</li>
                    <li>Can be reactivated later if needed</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">This time slot will be permanently deleted</div>
                <p className="text-sm mb-3">
                  Since this time slot is not currently in use, it will be completely removed 
                  from the system. This action cannot be undone.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">What happens next:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Time slot will be completely removed</li>
                    <li>All references will be deleted</li>
                    <li>This action cannot be undone</li>
                    <li>Sort order of other slots may be affected</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Details (if in use) */}
          {isInUse && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Usage
                </CardTitle>
                <CardDescription>
                  This time slot is being used in the following ways:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeSlot._count.timetableEntries > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Active Timetable Entries</div>
                        <div className="text-sm text-muted-foreground">
                          Current class schedules using this slot
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{timeSlot._count.timetableEntries}</Badge>
                  </div>
                )}
                
                {timeSlot._count.timetableTemplates > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Template References</div>
                        <div className="text-sm text-muted-foreground">
                          Recurring schedule templates
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{timeSlot._count.timetableTemplates}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Safety Check for Unused Slots */}
          {!isInUse && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Safe to delete</div>
                <p className="text-sm">
                  This time slot is not currently being used in any schedules or templates. 
                  It can be safely deleted without affecting existing timetables.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending 
              ? 'Processing...' 
              : willBeSoftDeleted 
                ? 'Deactivate Time Slot' 
                : 'Delete Permanently'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}