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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, Plus, Edit, Trash2, AlertCircle, CalendarDays, GraduationCap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

const academicCalendarSchema = z.object({
  semesterName: z.string().min(1, "Semester name is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  semesterStart: z.string().min(1, "Start date is required"),
  semesterEnd: z.string().min(1, "End date is required"),
})

const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["NATIONAL", "UNIVERSITY", "DEPARTMENT", "LOCAL"]),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
})

const examPeriodSchema = z.object({
  name: z.string().min(1, "Exam period name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  examType: z.enum(["INTERNAL", "EXTERNAL", "PRACTICAL", "VIVA", "PROJECT"]),
  blockRegularClasses: z.boolean().default(true),
  allowReviewClasses: z.boolean().default(true),
  description: z.string().optional(),
})

type AcademicCalendarFormData = z.infer<typeof academicCalendarSchema>
type HolidayFormData = z.infer<typeof holidaySchema>
type ExamPeriodFormData = z.infer<typeof examPeriodSchema>

interface Department {
  id: string
  name: string
  shortName: string
}

interface AcademicCalendar {
  id: string
  semesterName: string
  academicYear: string
  semesterStart: Date
  semesterEnd: Date
  isActive: boolean
  holidays: Holiday[]
  examPeriods: ExamPeriod[]
}

interface Holiday {
  id: string
  name: string
  date: Date
  type: string
  description?: string
  isRecurring: boolean
}

interface ExamPeriod {
  id: string
  name: string
  startDate: Date
  endDate: Date
  examType: string
  blockRegularClasses: boolean
  allowReviewClasses: boolean
  description?: string
}

interface AcademicCalendarSettingsProps {
  department: Department
  academicCalendars: AcademicCalendar[]
  departmentHolidays: Holiday[]
}

export function AcademicCalendarSettings({ 
  department, 
  academicCalendars = [], 
  departmentHolidays = [] 
}: AcademicCalendarSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null)
  const [showNewCalendarForm, setShowNewCalendarForm] = useState(false)
  const [showNewHolidayForm, setShowNewHolidayForm] = useState(false)
  const [showNewExamPeriodForm, setShowNewExamPeriodForm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const newCalendarForm = useForm<AcademicCalendarFormData>({
    resolver: zodResolver(academicCalendarSchema),
    defaultValues: {
      semesterName: "",
      academicYear: "",
      semesterStart: "",
      semesterEnd: "",
    },
  })

  const newHolidayForm = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
      type: "UNIVERSITY",
      description: "",
      isRecurring: false,
    },
  })

  const newExamPeriodForm = useForm<ExamPeriodFormData>({
    resolver: zodResolver(examPeriodSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      examType: "INTERNAL",
      blockRegularClasses: true,
      allowReviewClasses: true,
      description: "",
    },
  })

  const onCreateCalendar = async (data: AcademicCalendarFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/academic-calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          departmentId: department.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create academic calendar")
      }

      toast({
        title: "Calendar created",
        description: "Academic calendar has been created successfully.",
      })

      setShowNewCalendarForm(false)
      newCalendarForm.reset()
      router.refresh()
    } catch (error) {
      console.error("Error creating calendar:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create calendar",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onCreateHoliday = async (data: HolidayFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/holidays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          departmentId: department.id,
          academicCalendarId: selectedCalendar,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create holiday")
      }

      toast({
        title: "Holiday created",
        description: "Holiday has been created successfully.",
      })

      setShowNewHolidayForm(false)
      newHolidayForm.reset()
      router.refresh()
    } catch (error) {
      console.error("Error creating holiday:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create holiday",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onCreateExamPeriod = async (data: ExamPeriodFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/exam-periods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          academicCalendarId: selectedCalendar,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create exam period")
      }

      toast({
        title: "Exam period created",
        description: "Exam period has been created successfully.",
      })

      setShowNewExamPeriodForm(false)
      newExamPeriodForm.reset()
      router.refresh()
    } catch (error) {
      console.error("Error creating exam period:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create exam period",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case "NATIONAL": return "bg-red-100 text-red-800"
      case "UNIVERSITY": return "bg-blue-100 text-blue-800"
      case "DEPARTMENT": return "bg-green-100 text-green-800"
      case "LOCAL": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case "INTERNAL": return "bg-yellow-100 text-yellow-800"
      case "EXTERNAL": return "bg-purple-100 text-purple-800"
      case "PRACTICAL": return "bg-green-100 text-green-800"
      case "VIVA": return "bg-blue-100 text-blue-800"
      case "PROJECT": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const currentCalendar = academicCalendars.find(cal => cal.id === selectedCalendar)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="calendars" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendars" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Academic Calendars
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Exam Periods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendars" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Academic Calendars</CardTitle>
                  <CardDescription>
                    Manage semester boundaries and academic year schedules
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowNewCalendarForm(true)}
                  disabled={showNewCalendarForm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewCalendarForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Academic Calendar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newCalendarForm.handleSubmit(onCreateCalendar)} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="semesterName">Semester Name</Label>
                          <Input
                            id="semesterName"
                            placeholder="e.g., Spring 2024"
                            {...newCalendarForm.register("semesterName")}
                          />
                          {newCalendarForm.formState.errors.semesterName && (
                            <p className="text-sm text-destructive">
                              {newCalendarForm.formState.errors.semesterName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="academicYear">Academic Year</Label>
                          <Input
                            id="academicYear"
                            placeholder="e.g., 2024-25"
                            {...newCalendarForm.register("academicYear")}
                          />
                          {newCalendarForm.formState.errors.academicYear && (
                            <p className="text-sm text-destructive">
                              {newCalendarForm.formState.errors.academicYear.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="semesterStart">Semester Start Date</Label>
                          <Input
                            id="semesterStart"
                            type="date"
                            {...newCalendarForm.register("semesterStart")}
                          />
                          {newCalendarForm.formState.errors.semesterStart && (
                            <p className="text-sm text-destructive">
                              {newCalendarForm.formState.errors.semesterStart.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="semesterEnd">Semester End Date</Label>
                          <Input
                            id="semesterEnd"
                            type="date"
                            {...newCalendarForm.register("semesterEnd")}
                          />
                          {newCalendarForm.formState.errors.semesterEnd && (
                            <p className="text-sm text-destructive">
                              {newCalendarForm.formState.errors.semesterEnd.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Creating..." : "Create Calendar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewCalendarForm(false)
                            newCalendarForm.reset()
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
                {academicCalendars.map((calendar) => (
                  <Card key={calendar.id} className={`${calendar.isActive ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{calendar.semesterName}</h3>
                            <Badge variant="outline">{calendar.academicYear}</Badge>
                            {calendar.isActive && (
                              <Badge>Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(calendar.semesterStart), "MMM dd, yyyy")} - {format(new Date(calendar.semesterEnd), "MMM dd, yyyy")}
                          </p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{calendar.holidays?.length || 0} holidays</span>
                            <span>{calendar.examPeriods?.length || 0} exam periods</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCalendar(calendar.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {academicCalendars.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No academic calendars created yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Holiday Management</CardTitle>
                  <CardDescription>
                    Manage holidays for academic calendars and department-wide holidays
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowNewHolidayForm(true)}
                  disabled={showNewHolidayForm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewHolidayForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Holiday</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newHolidayForm.handleSubmit(onCreateHoliday)} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="holidayName">Holiday Name</Label>
                          <Input
                            id="holidayName"
                            placeholder="e.g., Diwali, Christmas"
                            {...newHolidayForm.register("name")}
                          />
                          {newHolidayForm.formState.errors.name && (
                            <p className="text-sm text-destructive">
                              {newHolidayForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="holidayDate">Date</Label>
                          <Input
                            id="holidayDate"
                            type="date"
                            {...newHolidayForm.register("date")}
                          />
                          {newHolidayForm.formState.errors.date && (
                            <p className="text-sm text-destructive">
                              {newHolidayForm.formState.errors.date.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="holidayType">Holiday Type</Label>
                          <Select onValueChange={(value) => newHolidayForm.setValue("type", value as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select holiday type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NATIONAL">National Holiday</SelectItem>
                              <SelectItem value="UNIVERSITY">University Holiday</SelectItem>
                              <SelectItem value="DEPARTMENT">Department Holiday</SelectItem>
                              <SelectItem value="LOCAL">Local Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="holidayDescription">Description (Optional)</Label>
                          <Input
                            id="holidayDescription"
                            placeholder="Holiday description"
                            {...newHolidayForm.register("description")}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Creating..." : "Create Holiday"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewHolidayForm(false)
                            newHolidayForm.reset()
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
                {/* Department-wide holidays */}
                {departmentHolidays.map((holiday) => (
                  <Card key={holiday.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{holiday.name}</h3>
                            <Badge className={getHolidayTypeColor(holiday.type)}>
                              {holiday.type}
                            </Badge>
                            {holiday.isRecurring && (
                              <Badge variant="outline">Recurring</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(holiday.date), "MMM dd, yyyy")}
                          </p>
                          {holiday.description && (
                            <p className="text-xs text-muted-foreground">{holiday.description}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Academic calendar specific holidays */}
                {academicCalendars.map((calendar) => 
                  calendar.holidays?.map((holiday) => (
                    <Card key={holiday.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{holiday.name}</h3>
                              <Badge className={getHolidayTypeColor(holiday.type)}>
                                {holiday.type}
                              </Badge>
                              <Badge variant="secondary">{calendar.semesterName}</Badge>
                              {holiday.isRecurring && (
                                <Badge variant="outline">Recurring</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(holiday.date), "MMM dd, yyyy")}
                            </p>
                            {holiday.description && (
                              <p className="text-xs text-muted-foreground">{holiday.description}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}

                {(departmentHolidays.length === 0 && academicCalendars.every(cal => (cal.holidays?.length || 0) === 0)) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No holidays created yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exam Period Management</CardTitle>
                  <CardDescription>
                    Configure exam periods and their restrictions on regular classes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCalendar || ""} onValueChange={setSelectedCalendar}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicCalendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.semesterName} ({calendar.academicYear})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowNewExamPeriodForm(true)}
                    disabled={showNewExamPeriodForm || !selectedCalendar}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exam Period
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedCalendar && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select an academic calendar to manage exam periods.
                  </AlertDescription>
                </Alert>
              )}

              {showNewExamPeriodForm && selectedCalendar && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Exam Period</CardTitle>
                    <CardDescription>
                      For {currentCalendar?.semesterName} ({currentCalendar?.academicYear})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newExamPeriodForm.handleSubmit(onCreateExamPeriod)} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="examName">Exam Period Name</Label>
                          <Input
                            id="examName"
                            placeholder="e.g., Mid Semester Exam"
                            {...newExamPeriodForm.register("name")}
                          />
                          {newExamPeriodForm.formState.errors.name && (
                            <p className="text-sm text-destructive">
                              {newExamPeriodForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="examType">Exam Type</Label>
                          <Select onValueChange={(value) => newExamPeriodForm.setValue("examType", value as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exam type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INTERNAL">Internal Exam</SelectItem>
                              <SelectItem value="EXTERNAL">External Exam</SelectItem>
                              <SelectItem value="PRACTICAL">Practical Exam</SelectItem>
                              <SelectItem value="VIVA">Viva/Oral Exam</SelectItem>
                              <SelectItem value="PROJECT">Project Presentation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="examStartDate">Start Date</Label>
                          <Input
                            id="examStartDate"
                            type="date"
                            {...newExamPeriodForm.register("startDate")}
                          />
                          {newExamPeriodForm.formState.errors.startDate && (
                            <p className="text-sm text-destructive">
                              {newExamPeriodForm.formState.errors.startDate.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="examEndDate">End Date</Label>
                          <Input
                            id="examEndDate"
                            type="date"
                            {...newExamPeriodForm.register("endDate")}
                          />
                          {newExamPeriodForm.formState.errors.endDate && (
                            <p className="text-sm text-destructive">
                              {newExamPeriodForm.formState.errors.endDate.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="examDescription">Description (Optional)</Label>
                          <Input
                            id="examDescription"
                            placeholder="Exam description"
                            {...newExamPeriodForm.register("description")}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Creating..." : "Create Exam Period"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewExamPeriodForm(false)
                            newExamPeriodForm.reset()
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {selectedCalendar && currentCalendar && (
                <div className="space-y-3">
                  {currentCalendar.examPeriods?.map((examPeriod) => (
                    <Card key={examPeriod.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{examPeriod.name}</h3>
                              <Badge className={getExamTypeColor(examPeriod.examType)}>
                                {examPeriod.examType}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(examPeriod.startDate), "MMM dd, yyyy")} - {format(new Date(examPeriod.endDate), "MMM dd, yyyy")}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>{examPeriod.blockRegularClasses ? "Blocks regular classes" : "Allows regular classes"}</span>
                              <span>{examPeriod.allowReviewClasses ? "Allows review classes" : "No review classes"}</span>
                            </div>
                            {examPeriod.description && (
                              <p className="text-xs text-muted-foreground">{examPeriod.description}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(currentCalendar.examPeriods?.length || 0) === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No exam periods created for this calendar yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}