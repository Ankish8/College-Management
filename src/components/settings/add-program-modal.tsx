"use client"

import { useState } from "react"
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
  name: z.string().min(1, "Program name is required"),
  shortName: z.string().min(1, "Short name is required").max(10, "Short name too long"),
  programType: z.enum(["UNDERGRADUATE", "POSTGRADUATE", "DIPLOMA"]),
  duration: z.coerce.number().min(1).max(6),
})

type FormData = z.infer<typeof formSchema>

interface Program {
  id: string
  name: string
  shortName: string
  duration: number
  totalSems: number
  programType: string
  isActive: boolean
  department: {
    name: string
    shortName: string
  }
  specializations: Array<{
    id: string
    name: string
    shortName: string
    isActive: boolean
  }>
  _count: {
    batches: number
  }
}

interface AddProgramModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProgramCreated: (program: Program) => void
}

export function AddProgramModal({ open, onOpenChange, onProgramCreated }: AddProgramModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      programType: "UNDERGRADUATE",
      duration: 4,
    },
  })

  const watchedValues = form.watch()
  const totalSems = (watchedValues.duration as number) * 2 // Each year has 2 semesters

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          totalSems: totalSems,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create program")
      }

      const newProgram = await response.json()
      onProgramCreated(newProgram)
      form.reset()
    } catch (error: any) {
      console.error("Error creating program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create program",
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
          <DialogTitle>Add New Program</DialogTitle>
          <DialogDescription>
            Create a new academic program (e.g., B.Des, M.Des).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Bachelor of Design"
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
                      placeholder="e.g., B.Des"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used in batch names
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="programType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNDERGRADUATE">Undergraduate</SelectItem>
                      <SelectItem value="POSTGRADUATE">Postgraduate</SelectItem>
                      <SelectItem value="DIPLOMA">Diploma</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Years)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="6" 
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormDescription>
                    Total semesters: {totalSems}
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
                {isSubmitting ? "Creating..." : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}