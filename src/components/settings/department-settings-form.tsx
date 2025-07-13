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
import { Building2, Calculator, Clock, Users, AlertCircle, Calendar, Settings2, Target, Workflow } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const departmentSettingsSchema = z.object({
  // Existing faculty settings
  creditHoursRatio: z.number().min(1).max(30),
  maxFacultyCredits: z.number().min(1).max(50),
  coFacultyWeight: z.number().min(0).max(1),
  
  // Timetable settings
  schedulingMode: z.enum(["MODULE_BASED", "WEEKLY_RECURRING"]),
  autoCreateAttendance: z.boolean(),
  
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

type DepartmentSettingsFormData = z.infer<typeof departmentSettingsSchema>

interface Department {
  id: string
  name: string
  shortName: string
}

interface DepartmentSettings {
  id: string
  creditHoursRatio: number
  maxFacultyCredits: number
  coFacultyWeight: number
  schedulingMode: "MODULE_BASED" | "WEEKLY_RECURRING"
  autoCreateAttendance: boolean
  breakConfiguration?: any
  classTypes?: any
  moduleDurations?: any
  conflictRules?: any
}

interface DepartmentSettingsFormProps {
  department: Department
  settings: DepartmentSettings
}

export function DepartmentSettingsForm({ department, settings }: DepartmentSettingsFormProps) {
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
  } = useForm<DepartmentSettingsFormData>({
    resolver: zodResolver(departmentSettingsSchema),
    defaultValues: {
      creditHoursRatio: settings.creditHoursRatio,
      maxFacultyCredits: settings.maxFacultyCredits,
      coFacultyWeight: settings.coFacultyWeight,
      schedulingMode: settings.schedulingMode || "MODULE_BASED",
      autoCreateAttendance: settings.autoCreateAttendance ?? true,
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

  const currentValues = watch()

  const onSubmit = async (data: DepartmentSettingsFormData) => {
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
        description: "Department settings have been updated successfully.",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Department Information</CardTitle>
              <CardDescription>
                {department.name} ({department.shortName})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="faculty" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faculty" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Faculty
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timetable
            </TabsTrigger>
            <TabsTrigger value="breaks" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Breaks & Timing
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Rules & Validation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faculty" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Credit System Configuration</CardTitle>
                <CardDescription>
                  Configure how credits are calculated and converted to hours
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="creditHoursRatio">
                  Credit Hours Ratio
                  <span className="text-xs text-muted-foreground ml-1">(hours per credit)</span>
                </Label>
                <Input
                  id="creditHoursRatio"
                  type="number"
                  min="1"
                  max="30"
                  {...register("creditHoursRatio", { valueAsNumber: true })}
                />
                {errors.creditHoursRatio && (
                  <p className="text-sm text-destructive">{errors.creditHoursRatio.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Standard at JLU: 15 hours = 1 credit
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Calculated Hours</Label>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="space-y-1 text-sm">
                    <div>2 Credits = {currentValues.creditHoursRatio * 2} hours</div>
                    <div>4 Credits = {currentValues.creditHoursRatio * 4} hours</div>
                    <div>6 Credits = {currentValues.creditHoursRatio * 6} hours</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Faculty Workload Configuration</CardTitle>
                <CardDescription>
                  Set limits and weightings for faculty workload calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxFacultyCredits">
                  Maximum Faculty Credits
                  <span className="text-xs text-muted-foreground ml-1">(per semester)</span>
                </Label>
                <Input
                  id="maxFacultyCredits"
                  type="number"
                  min="1"
                  max="50"
                  {...register("maxFacultyCredits", { valueAsNumber: true })}
                />
                {errors.maxFacultyCredits && (
                  <p className="text-sm text-destructive">{errors.maxFacultyCredits.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum credits a faculty member can teach per semester
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coFacultyWeight">
                  Co-Faculty Weight
                  <span className="text-xs text-muted-foreground ml-1">(0.0 - 1.0)</span>
                </Label>
                <Input
                  id="coFacultyWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  {...register("coFacultyWeight", { valueAsNumber: true })}
                />
                {errors.coFacultyWeight && (
                  <p className="text-sm text-destructive">{errors.coFacultyWeight.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Weight for co-faculty workload (0.5 = 50%, 1.0 = 100%)
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                With current settings: Maximum workload = {currentValues.maxFacultyCredits} credits 
                ({currentValues.maxFacultyCredits * currentValues.creditHoursRatio} hours). 
                Co-faculty gets {Math.round(currentValues.coFacultyWeight * 100)}% weight in workload calculations.
              </AlertDescription>
            </Alert>
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Scheduling Mode</CardTitle>
                    <CardDescription>
                      Choose how classes are scheduled in your department
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
                  <Label>Module Duration Options</Label>
                  <div className="grid gap-2">
                    {watch("moduleDurations")?.map((duration: any, index: number) => (
                      <div key={duration.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{duration.name}</span>
                          {duration.weeks && (
                            <span className="text-sm text-muted-foreground ml-2">({duration.weeks} weeks)</span>
                          )}
                        </div>
                        <Switch
                          checked={!duration.isCustom}
                          onCheckedChange={(checked) => {
                            const modules = [...watch("moduleDurations")]
                            modules[index] = { ...modules[index], isCustom: !checked }
                            setValue("moduleDurations", modules, { shouldDirty: true })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <div className="space-y-3">
                  {watch("classTypes")?.map((classType: any, index: number) => (
                    <div key={classType.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{classType.name}</span>
                          {classType.isDefault && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Default</span>
                          )}
                        </div>
                        {classType.description && (
                          <p className="text-sm text-muted-foreground">{classType.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={true} // All are enabled by default
                        disabled
                      />
                    </div>
                  ))}
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
                      onClick={() => {
                        const config = { ...watch("breakConfiguration") }
                        const newBreak = {
                          id: `break_${Date.now()}`,
                          name: "Short Break",
                          duration: 15,
                          timing: "BETWEEN_SLOTS"
                        }
                        config.shortBreaks = [...(config.shortBreaks || []), newBreak]
                        setValue("breakConfiguration", config, { shouldDirty: true })
                      }}
                    >
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
                          onClick={() => {
                            const config = { ...watch("breakConfiguration") }
                            config.shortBreaks = config.shortBreaks.filter((_: any, i: number) => i !== index)
                            setValue("breakConfiguration", config, { shouldDirty: true })
                          }}
                        >
                          Remove
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
    </div>
  )
}