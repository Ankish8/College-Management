"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, BookOpen, CreditCard, Edit, Trash2, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  status: "ACTIVE" | "INACTIVE"
  department?: {
    id: string
    name: string
    shortName: string
  }
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

interface FacultyCardProps {
  faculty: Faculty
  onUpdate: (faculty: Faculty) => void
  onDelete: (facultyId: string) => void
  onEdit: (faculty: Faculty) => void
}

export function FacultyCard({ faculty, onUpdate, onDelete, onEdit }: FacultyCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [workloadPercentage, setWorkloadPercentage] = useState(0)
  const [maxCredits, setMaxCredits] = useState(30)
  const [totalCredits, setTotalCredits] = useState(0)
  const { toast } = useToast()

  // Calculate proper workload using configurable settings
  useEffect(() => {
    if (faculty.department) {
      const fetchWorkload = async () => {
        try {
          const response = await fetch(`/api/faculty/${faculty.id}/workload`)
          if (response.ok) {
            const workload = await response.json()
            setTotalCredits(workload.totalCredits)
            setMaxCredits(workload.maxCredits)
            setWorkloadPercentage(workload.creditPercentage)
          } else {
            // Fallback to simple calculation if API fails (teaching subjects only)
            const teachingSubjects = [
              ...faculty.primarySubjects,
              ...faculty.coFacultySubjects
            ].filter(subject => {
              const subjectName = subject.name.toLowerCase();
              return !subjectName.includes('internship') && 
                     !subjectName.includes('field research project');
            });
            const simpleTotal = teachingSubjects.reduce((sum, subject) => sum + subject.credits, 0)
            setTotalCredits(simpleTotal)
            setWorkloadPercentage(Math.round((simpleTotal / 30) * 100))
          }
        } catch (error) {
          console.error("Error fetching workload:", error)
          // Fallback to simple calculation (teaching subjects only)
          const teachingSubjects = [
            ...faculty.primarySubjects,
            ...faculty.coFacultySubjects
          ].filter(subject => {
            const subjectName = subject.name.toLowerCase();
            return !subjectName.includes('internship') && 
                   !subjectName.includes('field research project');
          });
          const simpleTotal = teachingSubjects.reduce((sum, subject) => sum + subject.credits, 0)
          setTotalCredits(simpleTotal)
          setWorkloadPercentage(Math.round((simpleTotal / 30) * 100))
        }
      }
      
      fetchWorkload()
    }
  }, [faculty.id, faculty.department, faculty.primarySubjects, faculty.coFacultySubjects])

  const totalSubjects = faculty.primarySubjects.length + faculty.coFacultySubjects.length

  const allSubjects = [
    ...faculty.primarySubjects,
    ...faculty.coFacultySubjects
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200"
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/faculty/${faculty.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete faculty")
      }

      onDelete(faculty.id)
      setIsDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "Faculty member deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting faculty:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete faculty",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async () => {
    try {
      const newStatus = faculty.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      const response = await fetch(`/api/faculty/${faculty.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update faculty status")
      }

      const updatedFaculty = await response.json()
      onUpdate(updatedFaculty)
      toast({
        title: "Success",
        description: "Faculty status updated successfully",
      })
    } catch (error) {
      console.error("Error updating faculty:", error)
      toast({
        title: "Error",
        description: "Failed to update faculty status",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${faculty.status !== "ACTIVE" ? 'opacity-75' : ''}`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base font-medium leading-none">
              {faculty.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(faculty.status)}>
                {faculty.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ID: {faculty.employeeId}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(faculty)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Faculty
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                <Eye className="mr-2 h-4 w-4" />
                {faculty.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {faculty.email}
            </div>
            
            {faculty.department && (
              <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block">
                {faculty.department.name} ({faculty.department.shortName})
              </div>
            )}
            
            {/* Workload Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Workload</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    workloadPercentage > 100 ? 'text-red-600' : 
                    workloadPercentage > 83 ? 'text-orange-600' : 
                    'text-green-600'
                  }`}>
                    {totalCredits}/{maxCredits}
                  </span>
                  <span className={`text-xs font-medium ${
                    workloadPercentage > 100 ? 'text-red-600' : 
                    workloadPercentage > 83 ? 'text-orange-600' : 
                    'text-green-600'
                  }`}>
                    {workloadPercentage}%
                  </span>
                </div>
              </div>
              <Progress 
                value={Math.min(workloadPercentage, 100)} 
                className={`h-2 ${
                  workloadPercentage > 100 ? '[&>div]:bg-red-500' :
                  workloadPercentage > 83 ? '[&>div]:bg-orange-500' :
                  '[&>div]:bg-green-500'
                }`}
              />
              {workloadPercentage > 100 && (
                <div className="text-xs text-red-600 font-medium">
                  Overloaded by {workloadPercentage - 100}%
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{totalSubjects}</span>
                <span className="text-muted-foreground">Subjects</span>
              </div>
            </div>

            {allSubjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">SUBJECTS</h4>
                <div className="flex flex-wrap gap-1">
                  {allSubjects.slice(0, 3).map((subject) => (
                    <Badge key={subject.id} variant="outline" className="text-xs">
                      {subject.name}
                    </Badge>
                  ))}
                  {allSubjects.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{allSubjects.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the faculty member &quot;{faculty.name}&quot;. This action cannot be undone.
              {totalSubjects > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This faculty member is assigned to {totalSubjects} subjects. 
                    You may need to reassign them first.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}