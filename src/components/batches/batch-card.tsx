"use client"

import { useState } from "react"
import { MoreHorizontal, Users, BookOpen, Edit, Trash2, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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

interface BatchCardProps {
  batch: Batch
  onUpdate: (batch: Batch) => void
  onDelete: (batchId: string) => void
}

export function BatchCard({ batch, onUpdate, onDelete }: BatchCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete batch")
      }

      onDelete(batch.id)
      setIsDeleteDialogOpen(false)
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

  const handleToggleStatus = async () => {
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

  const capacityPercentage = batch.maxCapacity 
    ? (batch._count.students / batch.maxCapacity) * 100 
    : 0

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${!batch.isActive ? 'opacity-75' : ''}`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base font-medium leading-none">
              {batch.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={batch.isActive ? "default" : "secondary"}>
                {batch.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {batch.startYear}-{batch.endYear}
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
              <DropdownMenuItem asChild>
                <Link href={`/batches/${batch.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                <Edit className="mr-2 h-4 w-4" />
                {batch.isActive ? "Deactivate" : "Activate"}
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
              {batch.program.name}
              {batch.specialization && ` • ${batch.specialization.name}`}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{batch._count.students}</span>
                <span className="text-muted-foreground">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{batch._count.subjects}</span>
                <span className="text-muted-foreground">Subjects</span>
              </div>
            </div>

            {batch.maxCapacity && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="text-muted-foreground">
                    {batch._count.students}/{batch.maxCapacity}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      capacityPercentage >= 90
                        ? "bg-red-500"
                        : capacityPercentage >= 75
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                  />
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
              This will permanently delete the batch "{batch.name}". This action cannot be undone.
              {(batch._count.students > 0 || batch._count.subjects > 0) && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This batch has {batch._count.students} students 
                    and {batch._count.subjects} subjects. You may need to transfer them first.
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