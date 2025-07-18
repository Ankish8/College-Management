"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { AddProgramModal } from "@/components/settings/add-program-modal"
import { AddSpecializationModal } from "@/components/settings/add-specialization-modal"

const formSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  specializationId: z.string().optional(),
  semester: z.coerce.number().min(1).max(8),
  startYear: z.coerce.number().min(2020).max(2030),
  maxCapacity: z.coerce.number().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Program {
  id: string
  name: string
  shortName: string
  duration: number
  totalSems: number
  specializations: Array<{
    id: string
    name: string
    shortName: string
  }>
}

interface Batch {
  id: string
  name: string
  semester: number
  startYear: number
  endYear: number
  isActive: boolean
  currentStrength: number
  maxCapacity?: number
  program: {
    name: string
    shortName: string
    duration: number
  }
  specialization?: {
    name: string
    shortName: string
  }
  _count: {
    students: number
    subjects: number
  }
}

interface AddBatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBatchCreated: (batch: Batch) => void
}

export function AddBatchModal({ open, onOpenChange, onBatchCreated }: AddBatchModalProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [showSpecializationModal, setShowSpecializationModal] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      programId: "",
      specializationId: "",
      semester: 1,
      startYear: new Date().getFullYear(),
      maxCapacity: undefined,
    },
  })

  // Watch specific fields only to prevent excessive re-renders
  const watchedProgramId = form.watch("programId")
  const watchedSpecializationId = form.watch("specializationId")
  const watchedSemester = form.watch("semester") as number
  const watchedStartYear = form.watch("startYear") as number

  const selectedProgram = useMemo(() => 
    programs.find(p => p.id === watchedProgramId), 
    [programs, watchedProgramId]
  )
  
  const selectedSpecialization = useMemo(() => 
    selectedProgram?.specializations.find(s => s.id === watchedSpecializationId),
    [selectedProgram, watchedSpecializationId]
  )

  // Generate preview of batch name
  const generateBatchName = useCallback(() => {
    if (!selectedProgram) return ""
    
    const specializationPart = selectedSpecialization ? ` ${selectedSpecialization.shortName}` : ""
    const endYear = watchedStartYear + selectedProgram.duration - 1
    
    return `${selectedProgram.shortName}${specializationPart} Semester ${watchedSemester} Batch ${watchedStartYear}-${endYear}`
  }, [selectedProgram, selectedSpecialization, watchedSemester, watchedStartYear])

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/programs", {
        credentials: 'include'
      })
      if (!response.ok) throw new Error("Failed to fetch programs")
      
      const data = await response.json()
      setPrograms(data)
    } catch (error) {
      console.error("Error fetching programs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch programs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, []) // Remove toast dependency to prevent infinite loops

  useEffect(() => {
    if (open) {
      fetchPrograms()
    }
  }, [open, fetchPrograms])

  // Reset specialization and semester when program changes
  useEffect(() => {
    form.setValue("specializationId", "")
    form.setValue("semester", 1)
  }, [watchedProgramId, form])

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          specializationId: data.specializationId === "none" ? undefined : data.specializationId,
          maxCapacity: data.maxCapacity || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create batch")
      }

      const newBatch = await response.json()
      onBatchCreated(newBatch)
      form.reset()
    } catch (error: any) {
      console.error("Error creating batch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create batch",
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

  const availableSemesters = useMemo(() => 
    selectedProgram 
      ? Array.from({ length: selectedProgram.totalSems }, (_, i) => i + 1)
      : [],
    [selectedProgram]
  )

  // Handle program creation
  const handleProgramCreated = useCallback((newProgram: any) => {
    setPrograms(prev => [...prev, newProgram])
    form.setValue("programId", newProgram.id)
    setShowProgramModal(false)
    toast({
      title: "Success",
      description: "Program created and selected successfully",
    })
  }, [form, toast])

  // Handle specialization creation
  const handleSpecializationCreated = useCallback((newSpecialization: any) => {
    // Update the programs list to include the new specialization
    setPrograms(prev => prev.map(program => 
      program.id === watchedProgramId 
        ? { ...program, specializations: [...(program.specializations || []), newSpecialization] }
        : program
    ))
    form.setValue("specializationId", newSpecialization.id)
    setShowSpecializationModal(false)
    toast({
      title: "Success",
      description: "Specialization created and selected successfully",
    })
  }, [form, toast, watchedProgramId])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Batch</DialogTitle>
          <DialogDescription>
            Create a new academic batch for student enrollment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program</FormLabel>
                  <div className="flex gap-2">
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No programs available. Click the + button to add one.
                          </div>
                        ) : (
                          programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              <div className="flex items-center gap-2">
                                <span>{program.shortName}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm">{program.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-3 shrink-0 h-9"
                      onClick={() => setShowProgramModal(true)}
                      title="Add new program"
                      aria-label="Add new program"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedProgram && (
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSemesters.map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedProgram && (
              <FormField
                control={form.control}
                name="specializationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization (Optional)</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specialization</SelectItem>
                          {selectedProgram.specializations?.map((spec) => (
                            <SelectItem key={spec.id} value={spec.id}>
                              <div className="flex items-center gap-2">
                                <span>{spec.shortName}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm">{spec.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="px-3 shrink-0 h-9"
                        onClick={() => setShowSpecializationModal(true)}
                        title="Add new specialization to this program"
                        aria-label="Add new specialization"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="2020" 
                        max="2030" 
                        className="w-full"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormDescription>
                      <span className="text-xs">
                        {selectedProgram && watchedStartYear 
                          ? `End Year: ${watchedStartYear + selectedProgram.duration - 1}`
                          : 'Academic year when batch starts'
                        }
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="e.g., 30"
                        className="w-full"
                        {...field}
                        value={field.value as number || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      <span className="text-xs">Optional - leave empty for unlimited</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Batch Name Preview */}
            {generateBatchName() && (
              <div className="rounded-lg border bg-muted p-3">
                <div className="text-sm font-medium mb-1">Batch Name Preview:</div>
                <Badge variant="outline" className="text-sm">
                  {generateBatchName()}
                </Badge>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Nested Modals */}
      <AddProgramModal
        open={showProgramModal}
        onOpenChange={setShowProgramModal}
        onProgramCreated={handleProgramCreated}
      />

      <AddSpecializationModal
        open={showSpecializationModal}
        onOpenChange={setShowSpecializationModal}
        programs={programs}
        onSpecializationCreated={handleSpecializationCreated}
        defaultProgramId={watchedProgramId}
      />
    </Dialog>
  )
}