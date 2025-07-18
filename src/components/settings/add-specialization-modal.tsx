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
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  name: z.string().min(1, "Specialization name is required"),
  shortName: z.string().min(1, "Short name is required").max(5, "Short name too long"),
  programId: z.string().min(1, "Program is required"),
})

type FormData = z.infer<typeof formSchema>

interface Program {
  id: string
  name: string
  shortName: string
}

interface Specialization {
  id: string
  name: string
  shortName: string
  isActive: boolean
  program: {
    name: string
    shortName: string
  }
  _count: {
    batches: number
  }
}

interface AddSpecializationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programs: Program[]
  onSpecializationCreated: (specialization: Specialization) => void
  defaultProgramId?: string
}

export function AddSpecializationModal({ 
  open, 
  onOpenChange, 
  programs, 
  onSpecializationCreated,
  defaultProgramId = ""
}: AddSpecializationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      programId: defaultProgramId,
    },
  })

  // Update form when defaultProgramId changes
  useEffect(() => {
    if (defaultProgramId) {
      form.setValue("programId", defaultProgramId)
    }
  }, [defaultProgramId, form])

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch("/api/specializations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create specialization")
      }

      const newSpecialization = await response.json()
      onSpecializationCreated(newSpecialization)
      form.reset()
    } catch (error: any) {
      console.error("Error creating specialization:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create specialization",
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Specialization</DialogTitle>
          <DialogDescription>
            Create a new specialization within a program (e.g., UX, Graphic Design).
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          <div className="flex items-center gap-2">
                            <span>{program.shortName}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-sm">{program.name}</span>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialization Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., User Experience Design"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., UX"
                      maxLength={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used in batch names (max 5 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Specialization"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}