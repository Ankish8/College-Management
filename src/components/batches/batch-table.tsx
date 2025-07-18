"use client"

import { useState } from "react"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
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
import Link from "next/link"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useSorting } from "@/hooks/useSorting"

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

interface BatchTableProps {
  batches: Batch[]
  onUpdate: (batch: Batch) => void
  onDelete: (batchId: string) => void
}

export function BatchTable({ batches, onUpdate, onDelete }: BatchTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; batch?: Batch }>({
    open: false,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { sortedData, handleSort, getSortDirection } = useSorting({
    data: batches,
    defaultSort: { key: 'name', direction: 'asc' }
  })

  const handleDelete = async () => {
    if (!deleteDialog.batch) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/batches/${deleteDialog.batch.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete batch")
      }

      onDelete(deleteDialog.batch.id)
      setDeleteDialog({ open: false })
    } catch (error: any) {
      console.error("Error deleting batch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete batch",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async (batch: Batch) => {
    try {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !batch.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update batch status")
      }

      const updatedBatch = await response.json()
      onUpdate(updatedBatch)
    } catch (error) {
      console.error("Error updating batch:", error)
      toast({
        title: "Error",
        description: "Failed to update batch status",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                sortKey="name"
                sortDirection={getSortDirection('name')}
                onSort={handleSort}
              >
                Batch Name
              </SortableTableHead>
              <SortableTableHead
                sortKey="program.shortName"
                sortDirection={getSortDirection('program.shortName')}
                onSort={handleSort}
              >
                Program
              </SortableTableHead>
              <SortableTableHead
                sortKey="specialization.shortName"
                sortDirection={getSortDirection('specialization.shortName')}
                onSort={handleSort}
              >
                Specialization
              </SortableTableHead>
              <SortableTableHead
                sortKey="semester"
                sortDirection={getSortDirection('semester')}
                onSort={handleSort}
              >
                Semester
              </SortableTableHead>
              <SortableTableHead
                sortKey="startYear"
                sortDirection={getSortDirection('startYear')}
                onSort={handleSort}
              >
                Year
              </SortableTableHead>
              <SortableTableHead
                sortKey="_count.students"
                sortDirection={getSortDirection('_count.students')}
                onSort={handleSort}
              >
                Students
              </SortableTableHead>
              <SortableTableHead
                sortKey="_count.subjects"
                sortDirection={getSortDirection('_count.subjects')}
                onSort={handleSort}
              >
                Subjects
              </SortableTableHead>
              <SortableTableHead
                sortKey="isActive"
                sortDirection={getSortDirection('isActive')}
                onSort={handleSort}
              >
                Status
              </SortableTableHead>
              <TableHead className="w-[70px]" canSort={false}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">{batch.name}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{batch.program.shortName}</div>
                    <div className="text-sm text-muted-foreground">
                      {batch.program.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {batch.specialization ? (
                    <div>
                      <div className="font-medium">{batch.specialization.shortName}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.specialization.name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{batch.semester}</TableCell>
                <TableCell>
                  {batch.startYear}-{batch.endYear}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{batch._count.students}</span>
                    {batch.maxCapacity && (
                      <span className="text-muted-foreground">/ {batch.maxCapacity}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{batch._count.subjects}</TableCell>
                <TableCell>
                  <Badge variant={batch.isActive ? "default" : "secondary"}>
                    {batch.isActive ? "Active" : "Inactive"}
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
                      <DropdownMenuItem asChild>
                        <Link href={`/batches/${batch.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(batch)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {batch.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialog({ open: true, batch })}
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
      </Card>

      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the batch "{deleteDialog.batch?.name}". 
              This action cannot be undone.
              {deleteDialog.batch && 
                (deleteDialog.batch._count.students > 0 || deleteDialog.batch._count.subjects > 0) && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This batch has {deleteDialog.batch._count.students} students 
                    and {deleteDialog.batch._count.subjects} subjects. You may need to transfer them first.
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