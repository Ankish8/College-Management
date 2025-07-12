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
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  phone: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

type FormData = z.infer<typeof formSchema>

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  phone?: string
  status: "ACTIVE" | "INACTIVE"
  primarySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
  }>
  coFacultySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
  }>
}

interface EditFacultyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  faculty: Faculty | null
  onFacultyUpdated: (faculty: Faculty) => void
}

export function EditFacultyModal({ 
  open, 
  onOpenChange, 
  faculty, 
  onFacultyUpdated 
}: EditFacultyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      employeeId: "",
      phone: "",
      status: "ACTIVE",
    },
  })

  // Update form values when faculty changes
  useEffect(() => {
    if (faculty && open) {
      form.reset({
        name: faculty.name,
        email: faculty.email,
        employeeId: faculty.employeeId,
        phone: faculty.phone || "",
        status: faculty.status,
      })
    }
  }, [faculty, open, form])

  const onSubmit = async (data: FormData) => {
    if (!faculty) return

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/faculty/${faculty.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          phone: data.phone || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update faculty")
      }

      const updatedFaculty = await response.json()
      onFacultyUpdated(updatedFaculty)
      toast({
        title: "Success",
        description: "Faculty member updated successfully",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating faculty:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update faculty",
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

  const totalSubjects = faculty ? 
    faculty.primarySubjects.length + faculty.coFacultySubjects.length : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Faculty</DialogTitle>
          <DialogDescription>
            Update faculty member details. Subject assignments are managed in the Subjects section.
            {totalSubjects > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Currently assigned to {totalSubjects} subject{totalSubjects > 1 ? 's' : ''}.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dr. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="e.g., john.doe@jlu.edu.in" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FAC001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique employee identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="e.g., +91 9876543210" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Inactive faculty cannot be assigned to new subjects
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
                {isSubmitting ? "Updating..." : "Update Faculty"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}