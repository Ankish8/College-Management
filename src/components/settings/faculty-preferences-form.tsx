"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { User, Clock, CalendarX, Bell, Settings, Plus, Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

const facultyPreferencesSchema = z.object({
  maxDailyHours: z.number().min(1).max(24),
  maxWeeklyHours: z.number().min(1).max(168),
  preferredTimeSlots: z.array(z.string()).optional(),
  notificationSettings: z.object({
    scheduleChanges: z.boolean(),
    newAssignments: z.boolean(),
    conflictAlerts: z.boolean(),
    reminderNotifications: z.boolean(),
    emailDigest: z.enum(["never", "daily", "weekly"]),
  }),
})

const blackoutPeriodSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
})

type FacultyPreferencesFormData = z.infer<typeof facultyPreferencesSchema>
type BlackoutPeriodFormData = z.infer<typeof blackoutPeriodSchema>

interface User {
  id: string
  name: string
  email: string
  role: string
  department?: {
    name: string
  }
}

interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
}

interface BlackoutPeriod {
  id: string
  startDate: Date
  endDate: Date
  reason?: string
  isRecurring: boolean
}

interface FacultyPreferences {
  id: string
  maxDailyHours: number
  maxWeeklyHours: number
  preferredTimeSlots?: any
  notificationSettings?: any
  blackoutPeriods: BlackoutPeriod[]
}

interface FacultyPreferencesFormProps {
  user: User
  preferences: FacultyPreferences
  timeSlots: TimeSlot[]
}

export function FacultyPreferencesForm({ user, preferences, timeSlots }: FacultyPreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showNewBlackoutForm, setShowNewBlackoutForm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FacultyPreferencesFormData>({
    resolver: zodResolver(facultyPreferencesSchema),
    defaultValues: {
      maxDailyHours: preferences.maxDailyHours,
      maxWeeklyHours: preferences.maxWeeklyHours,
      preferredTimeSlots: preferences.preferredTimeSlots || [],
      notificationSettings: preferences.notificationSettings || {
        scheduleChanges: true,
        newAssignments: true,
        conflictAlerts: true,
        reminderNotifications: true,
        emailDigest: "daily",
      },
    },
  })

  const newBlackoutForm = useForm<BlackoutPeriodFormData>({
    resolver: zodResolver(blackoutPeriodSchema) as any,
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      isRecurring: false,
    },
  })

  const onSubmit = async (data: FacultyPreferencesFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/faculty-preferences/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update preferences")
      }

      toast({
        title: "Preferences updated",
        description: "Your faculty preferences have been updated successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update preferences",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onCreateBlackoutPeriod = async (data: BlackoutPeriodFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/faculty-preferences/${user.id}/blackout-periods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create blackout period")
      }

      toast({
        title: "Blackout period created",
        description: "Your blackout period has been created successfully.",
      })

      setShowNewBlackoutForm(false)
      newBlackoutForm.reset()
      router.refresh()
    } catch (error) {
      console.error("Error creating blackout period:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create blackout period",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteBlackoutPeriod = async (blackoutId: string) => {
    try {
      const response = await fetch(`/api/faculty-preferences/${user.id}/blackout-periods/${blackoutId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete blackout period")
      }

      toast({
        title: "Blackout period deleted",
        description: "The blackout period has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting blackout period:", error)
      toast({
        title: "Error",
        description: "Failed to delete blackout period",
        variant: "destructive",
      })
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) < 12 ? 'AM' : 'PM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const toggleTimeSlotPreference = (timeSlotId: string) => {
    const currentPreferences = watch("preferredTimeSlots") || []
    const newPreferences = currentPreferences.includes(timeSlotId)
      ? currentPreferences.filter(id => id !== timeSlotId)
      : [...currentPreferences, timeSlotId]
    
    setValue("preferredTimeSlots", newPreferences, { shouldDirty: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Faculty Information</CardTitle>
              <CardDescription>
                {user.name} • {user.email} • {user.department?.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="availability" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Time Preferences
          </TabsTrigger>
          <TabsTrigger value="blackouts" className="flex items-center gap-2">
            <CalendarX className="h-4 w-4" />
            Blackout Periods
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Teaching Hour Limits</CardTitle>
                  <CardDescription>
                    Set your maximum daily and weekly teaching hours
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxDailyHours">Maximum Daily Hours</Label>
                  <Input
                    id="maxDailyHours"
                    type="number"
                    min="1"
                    max="24"
                    {...register("maxDailyHours", { valueAsNumber: true })}
                  />
                  {errors.maxDailyHours && (
                    <p className="text-sm text-destructive">{errors.maxDailyHours.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum hours you're willing to teach per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxWeeklyHours">Maximum Weekly Hours</Label>
                  <Input
                    id="maxWeeklyHours"
                    type="number"
                    min="1"
                    max="168"
                    {...register("maxWeeklyHours", { valueAsNumber: true })}
                  />
                  {errors.maxWeeklyHours && (
                    <p className="text-sm text-destructive">{errors.maxWeeklyHours.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum hours you're willing to teach per week
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Current settings: Up to {watch("maxDailyHours")} hours per day, 
                  {watch("maxWeeklyHours")} hours per week. The system will use these limits 
                  when scheduling your classes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Preferred Time Slots</CardTitle>
                  <CardDescription>
                    Select your preferred teaching time slots
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {timeSlots.map((timeSlot) => {
                    const isPreferred = watch("preferredTimeSlots")?.includes(timeSlot.id)
                    return (
                      <div
                        key={timeSlot.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isPreferred 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleTimeSlotPreference(timeSlot.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{timeSlot.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.floor(timeSlot.duration / 60)}h {timeSlot.duration % 60}m
                            </div>
                          </div>
                          <Checkbox
                            checked={isPreferred}
                            onChange={() => toggleTimeSlotPreference(timeSlot.id)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-sm text-muted-foreground">
                  Selected {watch("preferredTimeSlots")?.length || 0} of {timeSlots.length} time slots as preferred
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blackouts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Blackout Periods</CardTitle>
                  <CardDescription>
                    Manage periods when you're unavailable for teaching
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowNewBlackoutForm(true)}
                  disabled={showNewBlackoutForm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blackout Period
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewBlackoutForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Blackout Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newBlackoutForm.handleSubmit(onCreateBlackoutPeriod)} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="blackoutStartDate">Start Date</Label>
                          <Input
                            id="blackoutStartDate"
                            type="date"
                            {...newBlackoutForm.register("startDate")}
                          />
                          {newBlackoutForm.formState.errors.startDate && (
                            <p className="text-sm text-destructive">
                              {newBlackoutForm.formState.errors.startDate.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="blackoutEndDate">End Date</Label>
                          <Input
                            id="blackoutEndDate"
                            type="date"
                            {...newBlackoutForm.register("endDate")}
                          />
                          {newBlackoutForm.formState.errors.endDate && (
                            <p className="text-sm text-destructive">
                              {newBlackoutForm.formState.errors.endDate.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="blackoutReason">Reason (Optional)</Label>
                          <Input
                            id="blackoutReason"
                            placeholder="Conference, vacation, etc."
                            {...newBlackoutForm.register("reason")}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="blackoutRecurring"
                            checked={newBlackoutForm.watch("isRecurring")}
                            onCheckedChange={(checked) => 
                              newBlackoutForm.setValue("isRecurring", !!checked)
                            }
                          />
                          <Label htmlFor="blackoutRecurring">Recurring annually</Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Creating..." : "Create Blackout Period"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewBlackoutForm(false)
                            newBlackoutForm.reset()
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {preferences.blackoutPeriods?.map((blackout) => (
                  <Card key={blackout.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(blackout.startDate), "MMM dd, yyyy")} - {format(new Date(blackout.endDate), "MMM dd, yyyy")}
                            </span>
                            {blackout.isRecurring && (
                              <Badge variant="outline">Recurring</Badge>
                            )}
                          </div>
                          {blackout.reason && (
                            <p className="text-sm text-muted-foreground">{blackout.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBlackoutPeriod(blackout.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(preferences.blackoutPeriods?.length || 0) === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No blackout periods configured yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure how you receive schedule and assignment notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Schedule Changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your teaching schedule changes
                    </p>
                  </div>
                  <Switch
                    checked={watch("notificationSettings.scheduleChanges")}
                    onCheckedChange={(checked) => 
                      setValue("notificationSettings.scheduleChanges", checked, { shouldDirty: true })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>New Assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when assigned to new subjects or batches
                    </p>
                  </div>
                  <Switch
                    checked={watch("notificationSettings.newAssignments")}
                    onCheckedChange={(checked) => 
                      setValue("notificationSettings.newAssignments", checked, { shouldDirty: true })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Conflict Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about scheduling conflicts
                    </p>
                  </div>
                  <Switch
                    checked={watch("notificationSettings.conflictAlerts")}
                    onCheckedChange={(checked) => 
                      setValue("notificationSettings.conflictAlerts", checked, { shouldDirty: true })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Reminder Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders about upcoming classes
                    </p>
                  </div>
                  <Switch
                    checked={watch("notificationSettings.reminderNotifications")}
                    onCheckedChange={(checked) => 
                      setValue("notificationSettings.reminderNotifications", checked, { shouldDirty: true })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Email Digest Frequency</Label>
                <Select
                  value={watch("notificationSettings.emailDigest")}
                  onValueChange={(value) => 
                    setValue("notificationSettings.emailDigest", value as any, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often you receive summary emails of your teaching activities
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isDirty ? "You have unsaved changes" : "All changes saved"}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || isLoading}
          >
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </form>
  )
}