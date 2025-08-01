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

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: string
  subjectType: string
  description?: string
  batchId: string
  primaryFacultyId: string
  coFacultyId?: string
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

interface EditSubjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: Subject | null
  onSubjectUpdated: (subject: Subject) => void
}

// Dynamic schema - will be created based on available types
const createFormSchema = (examTypes: string[], subjectTypes: string[]) => {
  // Ensure we have valid arrays with at least one element
  const validExamTypes = examTypes && examTypes.length > 0 ? examTypes : ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"]
  const validSubjectTypes = subjectTypes && subjectTypes.length > 0 ? subjectTypes : ["CORE", "ELECTIVE"]
  
  return z.object({
    name: z.string().min(1, "Subject name is required"),
    code: z.string().min(1, "Subject code is required"),
    credits: z.number().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6"),
    batchId: z.string().min(1, "Batch is required"),
    primaryFacultyId: z.string().min(1, "Primary faculty is required"),
    coFacultyId: z.string().optional(),
    examType: z.enum(validExamTypes as [string, ...string[]]),
    subjectType: z.enum(validSubjectTypes as [string, ...string[]]),
    description: z.string().optional(),
  })
}

type FormData = {
  name: string
  code: string
  credits: number
  batchId: string
  primaryFacultyId: string
  coFacultyId?: string
  examType: string
  subjectType: string
  description?: string
}

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
}

interface Settings {
  creditHoursRatio: number
  examTypes: string[]
  subjectTypes: string[]
}

export function EditSubjectModal({ open, onOpenChange, subject, onSubjectUpdated }: EditSubjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [batches, setBatches] = useState<Batch[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [settings, setSettings] = useState<Settings>({
    creditHoursRatio: 15,
    examTypes: ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
    subjectTypes: ["CORE", "ELECTIVE"]
  })
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Create form schema with current settings
  const formSchema = createFormSchema(settings?.examTypes || [], settings?.subjectTypes || [])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      credits: 2,
      batchId: "",
      primaryFacultyId: "",
      coFacultyId: "",
      examType: "THEORY",
      subjectType: "CORE",
      description: "",
    },
  })

  // Update form when subject changes
  useEffect(() => {
    if (subject && open) {
      form.reset({
        name: subject.name,
        code: subject.code,
        credits: subject.credits,
        batchId: subject.batchId,
        primaryFacultyId: subject.primaryFacultyId,
        coFacultyId: subject.coFacultyId || "none",
        examType: subject.examType,
        subjectType: subject.subjectType,
        description: subject.description || "",
      })
    }
  }, [subject, open, form])

  // Fetch initial data
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [batchesRes, facultyRes, settingsRes] = await Promise.all([
        fetch("/api/batches?active=true"),
        fetch("/api/faculty"),
        fetch("/api/settings/subjects"),
      ])

      if (!batchesRes.ok || !facultyRes.ok || !settingsRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const [batchesData, facultyData, settingsData] = await Promise.all([
        batchesRes.json(),
        facultyRes.json(),
        settingsRes.json(),
      ])

      setBatches(batchesData)
      setFaculty(facultyData)
      setSettings(settingsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!subject) return
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          coFacultyId: data.coFacultyId === "none" ? null : data.coFacultyId || null,
          description: data.description || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update subject")
      }

      const updatedSubject = await response.json()
      onSubjectUpdated(updatedSubject)
      onOpenChange(false)
      
      toast({
        title: "Success",
        description: "Subject updated successfully",
      })
    } catch (error) {
      console.error("Error updating subject:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update subject",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset()
      onOpenChange(false)
    }
  }

  if (!subject) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] lg:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>
            Update the subject details. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : (
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
                          placeholder="e.g., Design Thinking" 
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
                          placeholder="e.g., DT101" 
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
                          Total Hours: {field.value * (settings?.creditHoursRatio || 15)}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="6"
                          className="h-9 w-full"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
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
                          {(settings?.examTypes || ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"]).map((type) => (
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
                          {(settings?.subjectTypes || ["CORE", "ELECTIVE"]).map((type) => (
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
                          {faculty.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <span>{member.name}</span>
                                {member.email && (
                                  <span className="text-xs text-muted-foreground">
                                    ({member.email})
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
                          <SelectItem value="none">None</SelectItem>
                          {faculty
                            .filter((member) => member.id !== form.watch("primaryFacultyId"))
                            .map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <span>{member.name}</span>
                                  {member.email && (
                                    <span className="text-xs text-muted-foreground">
                                      ({member.email})
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
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Subject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}