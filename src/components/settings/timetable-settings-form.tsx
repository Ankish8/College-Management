"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Settings2, Target, Workflow, Clock, Plus, Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const timetableSettingsSchema = z.object({
  // Timetable settings
  schedulingMode: z.enum(["MODULE_BASED", "WEEKLY_RECURRING"]),
  autoCreateAttendance: z.boolean(),
  
  // Display settings
  displaySettings: z.object({
    timeFormat: z.enum(["12hour", "24hour"]),
    showWeekends: z.boolean(),
    classStartTime: z.string(),
    classEndTime: z.string(),
    defaultSlotDuration: z.number(), // in minutes
    workingDays: z.array(z.string()),
  }),
  
  // Break configuration
  breakConfiguration: z.object({
    lunchBreak: z.object({
      enabled: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
      name: z.string(),
    }),
    shortBreaks: z.array(z.object({
      id: z.string(),
      name: z.string(),
      duration: z.number(), // in minutes
      timing: z.string(), // "BETWEEN_SLOTS" | "AFTER_HOUR"
    })),
  }),
  
  // Class types
  classTypes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    isDefault: z.boolean(),
  })),
  
  // Module duration options
  moduleDurations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weeks: z.number().optional(),
    isCustom: z.boolean(),
  })),
  
  // Conflict resolution rules
  conflictRules: z.object({
    allowFacultyOverlap: z.boolean(),
    allowBatchOverlap: z.boolean(),
    requireApprovalForOverride: z.boolean(),
    autoResolveConflicts: z.boolean(),
  }),
})

type TimetableSettingsFormData = z.infer<typeof timetableSettingsSchema>

interface Department {
  id: string
  name: string
  shortName: string
}

interface DepartmentSettings {
  id: string
  schedulingMode: "MODULE_BASED" | "WEEKLY_RECURRING"
  autoCreateAttendance: boolean
  breakConfiguration?: any
  classTypes?: any
  moduleDurations?: any
  conflictRules?: any
}

interface TimetableSettingsFormProps {
  department: Department
  settings: DepartmentSettings
}

export function TimetableSettingsForm({ department, settings }: TimetableSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<TimetableSettingsFormData>({
    resolver: zodResolver(timetableSettingsSchema),
    defaultValues: {
      schedulingMode: settings.schedulingMode || "MODULE_BASED",
      autoCreateAttendance: settings.autoCreateAttendance ?? true,
      displaySettings: (settings as any).displaySettings || {
        timeFormat: "12hour",
        showWeekends: false,
        classStartTime: "10:00",
        classEndTime: "16:00",
        defaultSlotDuration: 90,
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      },
      breakConfiguration: settings.breakConfiguration || {
        lunchBreak: {
          enabled: true,
          startTime: "12:30",
          endTime: "13:15",
          name: "Lunch Break",
        },
        shortBreaks: [],
      },
      classTypes: settings.classTypes || [
        { id: "regular", name: "Regular", description: "Standard classes", isDefault: true },
        { id: "makeup", name: "Makeup", description: "Makeup classes for missed sessions", isDefault: false },
        { id: "extra", name: "Extra", description: "Additional classes", isDefault: false },
        { id: "special", name: "Special", description: "Special events and workshops", isDefault: false },
      ],
      moduleDurations: settings.moduleDurations || [
        { id: "full_semester", name: "Full Semester", isCustom: false },
        { id: "4_weeks", name: "4 Weeks", weeks: 4, isCustom: false },
        { id: "6_weeks", name: "6 Weeks", weeks: 6, isCustom: false },
        { id: "8_weeks", name: "8 Weeks", weeks: 8, isCustom: false },
      ],
      conflictRules: settings.conflictRules || {
        allowFacultyOverlap: false,
        allowBatchOverlap: false,
        requireApprovalForOverride: true,
        autoResolveConflicts: false,
      },
    },
  })

  const onSubmit = async (data: TimetableSettingsFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/settings/department/${department.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update settings")
      }

      toast({
        title: "Settings updated",
        description: "Timetable settings have been updated successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addShortBreak = () => {
    const config = { ...watch("breakConfiguration") }
    const newBreak = {
      id: `break_${Date.now()}`,
      name: "Short Break",
      duration: 15,
      timing: "BETWEEN_SLOTS"
    }
    config.shortBreaks = [...(config.shortBreaks || []), newBreak]
    setValue("breakConfiguration", config, { shouldDirty: true })
  }

  const removeShortBreak = (index: number) => {
    const config = { ...watch("breakConfiguration") }
    config.shortBreaks = config.shortBreaks.filter((_: any, i: number) => i !== index)
    setValue("breakConfiguration", config, { shouldDirty: true })
  }

  const addClassType = () => {
    const types = [...watch("classTypes")]
    const newType = {
      id: `type_${Date.now()}`,
      name: "",
      description: "",
      isDefault: false
    }
    types.push(newType)
    setValue("classTypes", types, { shouldDirty: true })
  }

  const removeClassType = (index: number) => {
    const types = watch("classTypes").filter((_: any, i: number) => i !== index)
    setValue("classTypes", types, { shouldDirty: true })
  }

  const addModuleDuration = () => {
    const durations = [...watch("moduleDurations")]
    const newDuration = {
      id: `duration_${Date.now()}`,
      name: "",
      weeks: 1,
      isCustom: true
    }
    durations.push(newDuration)
    setValue("moduleDurations", durations, { shouldDirty: true })
  }

  const removeModuleDuration = (index: number) => {
    const durations = watch("moduleDurations").filter((_: any, i: number) => i !== index)
    setValue("moduleDurations", durations, { shouldDirty: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Scheduling
          </TabsTrigger>
          <TabsTrigger value="breaks" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Breaks & Timing
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Class Types
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Rules & Validation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Display Settings</CardTitle>
                  <CardDescription>
                    Configure how timetables are displayed to users
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select 
                    value={watch("displaySettings")?.timeFormat || "12hour"}
                    onValueChange={(value) => {
                      const settings = { ...watch("displaySettings") }
                      settings.timeFormat = value as "12hour" | "24hour"
                      setValue("displaySettings", settings, { shouldDirty: true })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12hour">12-hour (10:00 AM)</SelectItem>
                      <SelectItem value="24hour">24-hour (10:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Slot Duration</Label>
                  <Select 
                    value={watch("displaySettings")?.defaultSlotDuration?.toString() || "90"}
                    onValueChange={(value) => {
                      const settings = { ...watch("displaySettings") }
                      settings.defaultSlotDuration = parseInt(value)
                      setValue("displaySettings", settings, { shouldDirty: true })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select slot duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour (60 minutes)</SelectItem>
                      <SelectItem value="90">1.5 hours (90 minutes)</SelectItem>
                      <SelectItem value="120">2 hours (120 minutes)</SelectItem>
                      <SelectItem value="180">3 hours (180 minutes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Classes Start Time</Label>
                  <Input 
                    type="time" 
                    value={watch("displaySettings")?.classStartTime || "10:00"}
                    onChange={(e) => {
                      const settings = { ...watch("displaySettings") }
                      settings.classStartTime = e.target.value
                      setValue("displaySettings", settings, { shouldDirty: true })
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Classes End Time</Label>
                  <Input 
                    type="time" 
                    value={watch("displaySettings")?.classEndTime || "16:00"}
                    onChange={(e) => {
                      const settings = { ...watch("displaySettings") }
                      settings.classEndTime = e.target.value
                      setValue("displaySettings", settings, { shouldDirty: true })
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Weekends</Label>
                  <p className="text-sm text-muted-foreground">
                    Display Saturday and Sunday in timetable views
                  </p>
                </div>
                <Switch
                  checked={watch("displaySettings")?.showWeekends || false}
                  onCheckedChange={(checked) => {
                    const settings = { ...watch("displaySettings") }
                    settings.showWeekends = checked
                    setValue("displaySettings", settings, { shouldDirty: true })
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Working Days</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'MONDAY', label: 'Monday' },
                    { key: 'TUESDAY', label: 'Tuesday' },
                    { key: 'WEDNESDAY', label: 'Wednesday' },
                    { key: 'THURSDAY', label: 'Thursday' },
                    { key: 'FRIDAY', label: 'Friday' },
                    { key: 'SATURDAY', label: 'Saturday' },
                    { key: 'SUNDAY', label: 'Sunday' }
                  ].map((day) => (
                    <div key={day.key} className="flex items-center space-x-2">
                      <Switch 
                        checked={watch("displaySettings")?.workingDays?.includes(day.key) || false}
                        onCheckedChange={(checked) => {
                          const settings = { ...watch("displaySettings") }
                          if (checked) {
                            settings.workingDays = [...(settings.workingDays || []), day.key]
                          } else {
                            settings.workingDays = settings.workingDays?.filter(d => d !== day.key) || []
                          }
                          setValue("displaySettings", settings, { shouldDirty: true })
                        }}
                      />
                      <Label className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  These settings control how timetables are displayed. Time format affects all time displays, 
                  and class hours define the default range shown in timetable views.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Scheduling Mode</CardTitle>
                  <CardDescription>
                    Configure how classes are scheduled in your department
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Module-based Scheduling</Label>
                    <p className="text-sm text-muted-foreground">
                      Subjects run for full/half days over multiple continuous days (Design Department default)
                    </p>
                  </div>
                  <Switch
                    checked={watch("schedulingMode") === "MODULE_BASED"}
                    onCheckedChange={(checked) => 
                      setValue("schedulingMode", checked ? "MODULE_BASED" : "WEEKLY_RECURRING", { shouldDirty: true })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-create Attendance Sessions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create attendance sessions for scheduled classes
                    </p>
                  </div>
                  <Switch
                    checked={watch("autoCreateAttendance")}
                    onCheckedChange={(checked) => 
                      setValue("autoCreateAttendance", checked, { shouldDirty: true })
                    }
                  />
                </div>
              </div>

              <Alert>
                <Target className="h-4 w-4" />
                <AlertDescription>
                  {watch("schedulingMode") === "MODULE_BASED" 
                    ? "Module-based mode is ideal for design departments with intensive project-based learning."
                    : "Weekly recurring mode follows traditional academic scheduling patterns."
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Module Duration Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addModuleDuration}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Duration
                  </Button>
                </div>
                <div className="grid gap-2">
                  {watch("moduleDurations")?.map((duration: any, index: number) => (
                    <div key={duration.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Input
                        value={duration.name}
                        onChange={(e) => {
                          const durations = [...watch("moduleDurations")]
                          durations[index] = { ...durations[index], name: e.target.value }
                          setValue("moduleDurations", durations, { shouldDirty: true })
                        }}
                        placeholder="Duration name"
                        className="flex-1"
                      />
                      {duration.isCustom && (
                        <Input
                          type="number"
                          value={duration.weeks || 1}
                          onChange={(e) => {
                            const durations = [...watch("moduleDurations")]
                            durations[index] = { ...durations[index], weeks: parseInt(e.target.value) }
                            setValue("moduleDurations", durations, { shouldDirty: true })
                          }}
                          placeholder="Weeks"
                          className="w-24"
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeModuleDuration(index)}
                        disabled={!duration.isCustom}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Break Configuration</CardTitle>
                  <CardDescription>
                    Configure lunch breaks and short breaks between classes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Lunch Break</Label>
                    <p className="text-sm text-muted-foreground">
                      Show lunch break in timetable views
                    </p>
                  </div>
                  <Switch
                    checked={watch("breakConfiguration")?.lunchBreak?.enabled}
                    onCheckedChange={(checked) => {
                      const config = { ...watch("breakConfiguration") }
                      config.lunchBreak.enabled = checked
                      setValue("breakConfiguration", config, { shouldDirty: true })
                    }}
                  />
                </div>
                
                {watch("breakConfiguration")?.lunchBreak?.enabled && (
                  <div className="grid gap-4 md:grid-cols-3 ml-6 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label>Break Name</Label>
                      <Input
                        value={watch("breakConfiguration")?.lunchBreak?.name || ""}
                        onChange={(e) => {
                          const config = { ...watch("breakConfiguration") }
                          config.lunchBreak.name = e.target.value
                          setValue("breakConfiguration", config, { shouldDirty: true })
                        }}
                        placeholder="Lunch Break"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={watch("breakConfiguration")?.lunchBreak?.startTime || ""}
                        onChange={(e) => {
                          const config = { ...watch("breakConfiguration") }
                          config.lunchBreak.startTime = e.target.value
                          setValue("breakConfiguration", config, { shouldDirty: true })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={watch("breakConfiguration")?.lunchBreak?.endTime || ""}
                        onChange={(e) => {
                          const config = { ...watch("breakConfiguration") }
                          config.lunchBreak.endTime = e.target.value
                          setValue("breakConfiguration", config, { shouldDirty: true })
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Short Breaks</Label>
                    <p className="text-sm text-muted-foreground">
                      Configure short breaks between time slots
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addShortBreak}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Break
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {watch("breakConfiguration")?.shortBreaks?.map((breakItem: any, index: number) => (
                    <div key={breakItem.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Input
                        value={breakItem.name}
                        onChange={(e) => {
                          const config = { ...watch("breakConfiguration") }
                          config.shortBreaks[index].name = e.target.value
                          setValue("breakConfiguration", config, { shouldDirty: true })
                        }}
                        placeholder="Break name"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={breakItem.duration}
                        onChange={(e) => {
                          const config = { ...watch("breakConfiguration") }
                          config.shortBreaks[index].duration = parseInt(e.target.value)
                          setValue("breakConfiguration", config, { shouldDirty: true })
                        }}
                        placeholder="Minutes"
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeShortBreak(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Class Types</CardTitle>
                  <CardDescription>
                    Configure available class types for scheduling
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Available Class Types</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addClassType}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Type
                  </Button>
                </div>
                <div className="space-y-3">
                  {watch("classTypes")?.map((classType: any, index: number) => (
                    <div key={classType.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Input
                        value={classType.name}
                        onChange={(e) => {
                          const types = [...watch("classTypes")]
                          types[index] = { ...types[index], name: e.target.value }
                          setValue("classTypes", types, { shouldDirty: true })
                        }}
                        placeholder="Class type name"
                        className="flex-1"
                      />
                      <Input
                        value={classType.description || ""}
                        onChange={(e) => {
                          const types = [...watch("classTypes")]
                          types[index] = { ...types[index], description: e.target.value }
                          setValue("classTypes", types, { shouldDirty: true })
                        }}
                        placeholder="Description"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={classType.isDefault}
                          onCheckedChange={(checked) => {
                            const types = [...watch("classTypes")]
                            // If setting as default, unset others
                            if (checked) {
                              types.forEach((t, i) => {
                                if (i !== index) t.isDefault = false
                              })
                            }
                            types[index] = { ...types[index], isDefault: checked }
                            setValue("classTypes", types, { shouldDirty: true })
                          }}
                        />
                        <Label className="text-xs">Default</Label>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeClassType(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Conflict Resolution Rules</CardTitle>
                  <CardDescription>
                    Configure how the system handles scheduling conflicts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Faculty Overlap</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow faculty to teach multiple classes at the same time
                    </p>
                  </div>
                  <Switch
                    checked={watch("conflictRules")?.allowFacultyOverlap}
                    onCheckedChange={(checked) => {
                      const rules = { ...watch("conflictRules") }
                      rules.allowFacultyOverlap = checked
                      setValue("conflictRules", rules, { shouldDirty: true })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Batch Overlap</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow batches to have multiple classes scheduled simultaneously
                    </p>
                  </div>
                  <Switch
                    checked={watch("conflictRules")?.allowBatchOverlap}
                    onCheckedChange={(checked) => {
                      const rules = { ...watch("conflictRules") }
                      rules.allowBatchOverlap = checked
                      setValue("conflictRules", rules, { shouldDirty: true })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Approval for Override</Label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval when forcing conflict override
                    </p>
                  </div>
                  <Switch
                    checked={watch("conflictRules")?.requireApprovalForOverride}
                    onCheckedChange={(checked) => {
                      const rules = { ...watch("conflictRules") }
                      rules.requireApprovalForOverride = checked
                      setValue("conflictRules", rules, { shouldDirty: true })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-resolve Conflicts</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically suggest alternative time slots for conflicts
                    </p>
                  </div>
                  <Switch
                    checked={watch("conflictRules")?.autoResolveConflicts}
                    onCheckedChange={(checked) => {
                      const rules = { ...watch("conflictRules") }
                      rules.autoResolveConflicts = checked
                      setValue("conflictRules", rules, { shouldDirty: true })
                    }}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These rules determine how the timetable system validates and handles conflicts. 
                  More restrictive rules ensure cleaner schedules but may limit flexibility.
                </AlertDescription>
              </Alert>
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
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </form>
  )
}