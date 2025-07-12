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
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  phone: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
})

type FormData = z.infer<typeof formSchema>

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
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

interface AddFacultyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFacultyCreated: (faculty: Faculty) => void
}

export function AddFacultyModal({ open, onOpenChange, onFacultyCreated }: AddFacultyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
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

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return // Prevent double submission
    
    try {
      setIsSubmitting(true)
      setNetworkError(null)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch("/api/faculty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          ...data,
          phone: data.phone || undefined,
        }),
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create faculty")
      }

      const newFaculty = await response.json()
      onFacultyCreated(newFaculty)
      form.reset()
      setNetworkError(null)
      toast({
        title: "Success",
        description: "Faculty member created successfully",
      })
    } catch (error) {
      console.error("Error creating faculty:", error)
      
      if (error.name === 'AbortError') {
        setNetworkError("Request timed out. Please check your connection and try again.")
      } else if (error.message.includes('fetch')) {
        setNetworkError("Network error. Please check your connection and try again.")
      } else {
        setNetworkError((error as Error).message || "Failed to create faculty")
      }
      
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create faculty",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset()
      setNetworkError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Faculty</DialogTitle>
          <DialogDescription>
            Create a new faculty member. Subjects can be assigned when creating or editing subjects.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {networkError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{networkError}</p>
              </div>
            )}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    Faculty status - Active faculty can be assigned to subjects
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Faculty"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}