"use client"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useSorting } from "@/hooks/useSorting"

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

interface FacultyTableProps {
  faculty: Faculty[]
  onUpdate: (faculty: Faculty) => void
  onDelete: (facultyId: string) => void
  onEdit: (faculty: Faculty) => void
}

export function FacultyTable({ faculty, onUpdate, onDelete, onEdit }: FacultyTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; faculty?: Faculty }>({
    open: false,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { sortedData, handleSort, getSortDirection } = useSorting({
    data: faculty,
    defaultSort: { key: 'name', direction: 'asc' }
  })

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

  const getTotalCredits = (facultyMember: Faculty) => {
    return [...facultyMember.primarySubjects, ...facultyMember.coFacultySubjects]
      .reduce((sum, subject) => sum + subject.credits, 0)
  }

  const getTotalSubjects = (facultyMember: Faculty) => {
    return facultyMember.primarySubjects.length + facultyMember.coFacultySubjects.length
  }

  const getSubjectNames = (facultyMember: Faculty) => {
    const allSubjects = [...facultyMember.primarySubjects, ...facultyMember.coFacultySubjects]
    if (allSubjects.length === 0) return "-"
    if (allSubjects.length <= 2) {
      return allSubjects.map(s => s.name).join(", ")
    }
    return `${allSubjects.slice(0, 2).map(s => s.name).join(", ")} +${allSubjects.length - 2} more`
  }

  const handleDelete = async () => {
    if (!deleteDialog.faculty) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/faculty/${deleteDialog.faculty.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete faculty")
      }

      onDelete(deleteDialog.faculty.id)
      setDeleteDialog({ open: false })
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

  const handleToggleStatus = async (facultyMember: Faculty) => {
    try {
      const newStatus = facultyMember.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      const response = await fetch(`/api/faculty/${facultyMember.id}`, {
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
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="name"
                  sortDirection={getSortDirection('name')}
                  onSort={handleSort}
                  className="min-w-[150px]"
                >
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="employeeId"
                  sortDirection={getSortDirection('employeeId')}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  Employee ID
                </SortableTableHead>
                <SortableTableHead
                  sortKey="email"
                  sortDirection={getSortDirection('email')}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                >
                  Email
                </SortableTableHead>
                <SortableTableHead
                  sortKey="totalCredits"
                  sortDirection={getSortDirection('totalCredits')}
                  onSort={handleSort}
                  className="min-w-[80px]"
                >
                  Credits
                </SortableTableHead>
                <SortableTableHead
                  sortKey="totalSubjects"
                  sortDirection={getSortDirection('totalSubjects')}
                  onSort={handleSort}
                  className="min-w-[80px]"
                >
                  Subjects
                </SortableTableHead>
                <TableHead className="hidden lg:table-cell min-w-[200px]">
                  Teaching
                </TableHead>
                <SortableTableHead
                  sortKey="status"
                  sortDirection={getSortDirection('status')}
                  onSort={handleSort}
                >
                  Status
                </SortableTableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {sortedData.map((facultyMember) => (
              <TableRow key={facultyMember.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{facultyMember.name}</div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {facultyMember.employeeId}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{facultyMember.employeeId}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="max-w-[200px] truncate">
                    {facultyMember.email}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{getTotalCredits(facultyMember)}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{getTotalSubjects(facultyMember)}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {getSubjectNames(facultyMember)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(facultyMember.status)}>
                    <span className="hidden sm:inline">{facultyMember.status}</span>
                    <span className="sm:hidden">{facultyMember.status === 'ACTIVE' ? 'A' : 'I'}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(facultyMember)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Faculty
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(facultyMember)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {facultyMember.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialog({ open: true, faculty: facultyMember })}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the faculty member &quot;{deleteDialog.faculty?.name}&quot;. 
              This action cannot be undone.
              {deleteDialog.faculty && 
                getTotalSubjects(deleteDialog.faculty) > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This faculty member is assigned to {getTotalSubjects(deleteDialog.faculty)} subjects. 
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