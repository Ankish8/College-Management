"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

// Dynamic schema - will be created based on available types
const createFormSchema = (examTypes: string[], subjectTypes: string[]) => {
  return z.object({
    name: z.string().min(1, "Subject name is required"),
    code: z.string().min(1, "Subject code is required"),
    credits: z.number().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6"),
    batchId: z.string().min(1, "Batch is required"),
    primaryFacultyId: z.string().min(1, "Primary faculty is required"),
    coFacultyId: z.string().optional(),
    examType: z.enum(examTypes as [string, ...string[]]),
    subjectType: z.enum(subjectTypes as [string, ...string[]]),
    description: z.string().optional(),
  })
}

// Fallback schema with default types
const defaultFormSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  credits: z.number().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6"),
  batchId: z.string().min(1, "Batch is required"),
  primaryFacultyId: z.string().min(1, "Primary faculty is required"),
  coFacultyId: z.string().optional(),
  examType: z.enum(["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"]),
  subjectType: z.enum(["CORE", "ELECTIVE"]),
  description: z.string().optional(),
})

type FormData = z.infer<typeof defaultFormSchema>

interface Batch {
  id: string
  name: string
  semester: number
  program: {
    name: string
    shortName: string
  }
  specialization?: {
    name: string
    shortName: string
  }
}

interface Faculty {
  id: string
  name: string
  email: string
  employeeId?: string
}

interface DepartmentSettings {
  creditHoursRatio: number
  defaultExamTypes: string[]
  defaultSubjectTypes: string[]
  customExamTypes: string[]
  customSubjectTypes: string[]
}

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: string
  subjectType: string
  description?: string
  batch: {
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    }
  }
  primaryFaculty: {
    name: string
    email: string
  }
  coFaculty?: {
    name: string
    email: string
  }
  _count: {
    attendanceSessions: number
  }
}

interface AddSubjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubjectCreated: (subject: Subject) => void
}

export function AddSubjectModal({ open, onOpenChange, onSubjectCreated }: AddSubjectModalProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [settings, setSettings] = useState<DepartmentSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const getFormSchema = () => {
    if (settings) {
      const allExamTypes = [...settings.defaultExamTypes, ...settings.customExamTypes]
      const allSubjectTypes = [...settings.defaultSubjectTypes, ...settings.customSubjectTypes]
      return createFormSchema(allExamTypes, allSubjectTypes)
    }
    return defaultFormSchema
  }

  const form = useForm({
    resolver: zodResolver(getFormSchema()),
    defaultValues: {
      name: "",
      code: "",
      credits: 4,
      batchId: "",
      primaryFacultyId: "",
      coFacultyId: "",
      examType: "THEORY",
      subjectType: "CORE",
      description: "",
    },
  })

  // Update form resolver when settings change
  useEffect(() => {
    if (settings) {
      form.setValue('examType', settings.defaultExamTypes[0] || 'THEORY')
      form.setValue('subjectType', settings.defaultSubjectTypes[0] || 'CORE')
    }
  }, [settings, form])

  const watchedValues = form.watch()
  const totalHours = settings ? watchedValues.credits * settings.creditHoursRatio : watchedValues.credits * 15

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch batches
      try {
        const batchesRes = await fetch("/api/batches", { credentials: 'include' })
        if (batchesRes.ok) {
          const batchesData = await batchesRes.json()
          setBatches(batchesData)
        } else {
          console.error("Batches API error:", batchesRes.status, await batchesRes.text())
        }
      } catch (err) {
        console.error("Batches fetch error:", err)
      }

      // Fetch faculty
      try {
        const facultyRes = await fetch("/api/faculty", { credentials: 'include' })
        if (facultyRes.ok) {
          const facultyData = await facultyRes.json()
          setFaculty(facultyData)
        } else {
          console.error("Faculty API error:", facultyRes.status, await facultyRes.text())
        }
      } catch (err) {
        console.error("Faculty fetch error:", err)
      }

      // Fetch settings
      try {
        const settingsRes = await fetch("/api/settings/subjects", { credentials: 'include' })
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setSettings(settingsData)
        } else {
          console.error("Settings API error:", settingsRes.status, await settingsRes.text())
        }
      } catch (err) {
        console.error("Settings fetch error:", err)
      }

    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load some required data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          coFacultyId: data.coFacultyId === "none" ? undefined : data.coFacultyId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create subject")
      }

      const newSubject = await response.json()
      onSubjectCreated(newSubject)
      form.reset()
    } catch (error: any) {
      console.error("Error creating subject:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create subject",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  const availableFaculty = faculty.filter(f => f.id !== watchedValues.primaryFacultyId)
  const allExamTypes = settings ? [...settings.defaultExamTypes, ...settings.customExamTypes] : ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"]
  const allSubjectTypes = settings ? [...settings.defaultSubjectTypes, ...settings.customSubjectTypes] : ["CORE", "ELECTIVE"]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] lg:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogDescription>
            Create a new academic subject with faculty assignments and credit hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Subject Name and Batch - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Gamification & UX"
                        className="h-9 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Batch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            <div className="flex items-center gap-2">
                              <span>{batch.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({batch.program.shortName} Sem {batch.semester})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subject Code and Credits - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., JSD012"
                        className="h-9 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="flex items-center justify-between">
                      <span>Credits</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Total Hours: {totalHours}
                      </span>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select credits" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((credit) => (
                          <SelectItem key={credit} value={credit.toString()}>
                            {credit} Credit{credit > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exam Type and Subject Type - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="examType"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Exam Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allExamTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectType"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Subject Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select subject type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allSubjectTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Primary Faculty and Co-Faculty - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryFacultyId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Primary Faculty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select primary faculty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {faculty.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-2">
                              <span>{f.name}</span>
                              {f.employeeId && (
                                <span className="text-xs text-muted-foreground">
                                  ({f.employeeId})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coFacultyId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Co-Faculty (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select co-faculty (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No co-faculty</SelectItem>
                        {availableFaculty.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-2">
                              <span>{f.name}</span>
                              {f.employeeId && (
                                <span className="text-xs text-muted-foreground">
                                  ({f.employeeId})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the subject..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}