"use client"

import { useState } from "react"
import { MoreHorizontal, Users, BookOpen, Clock, GraduationCap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useSorting } from "@/hooks/useSorting"

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: string
  subjectType: string
  description?: string
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
    _count: {
      students: number
    }
  }
  primaryFaculty: {
    name: string
    email: string
  } | null
  coFaculty?: {
    name: string
    email: string
  }
  _count: {
    attendanceSessions: number
  }
}

interface SubjectTableProps {
  subjects: Subject[]
  onUpdate: (subject: Subject) => void
  onDelete: (subjectId: string) => void
  onEdit: (subject: Subject) => void
}

export function SubjectTable({ subjects, onUpdate, onDelete, onEdit }: SubjectTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { sortedData, handleSort, getSortDirection } = useSorting({
    data: subjects,
    defaultSort: { key: 'name', direction: 'asc' }
  })

  const getExamTypeColor = (examType: string) => {
    const colors = {
      "THEORY": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "PRACTICAL": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "JURY": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "PROJECT": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "VIVA": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    }
    return colors[examType as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  const getSubjectTypeColor = (subjectType: string) => {
    const colors = {
      "CORE": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      "ELECTIVE": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    }
    return colors[subjectType as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                sortKey="name"
                sortDirection={getSortDirection('name')}
                onSort={handleSort}
                className="min-w-[200px]"
              >
                Subject
              </SortableTableHead>
              <SortableTableHead
                sortKey="code"
                sortDirection={getSortDirection('code')}
                onSort={handleSort}
                className="min-w-[100px]"
              >
                Code
              </SortableTableHead>
              <SortableTableHead
                sortKey="credits"
                sortDirection={getSortDirection('credits')}
                onSort={handleSort}
                className="min-w-[120px]"
              >
                Credits/Hours
              </SortableTableHead>
              <SortableTableHead
                sortKey="primaryFaculty.name"
                sortDirection={getSortDirection('primaryFaculty.name')}
                onSort={handleSort}
                className="min-w-[150px]"
              >
                Faculty
              </SortableTableHead>
              <SortableTableHead
                sortKey="batch.name"
                sortDirection={getSortDirection('batch.name')}
                onSort={handleSort}
                className="min-w-[200px]"
              >
                Batch
              </SortableTableHead>
              <SortableTableHead
                sortKey="subjectType"
                sortDirection={getSortDirection('subjectType')}
                onSort={handleSort}
                className="min-w-[120px]"
              >
                Type
              </SortableTableHead>
              <SortableTableHead
                sortKey="_count.attendanceSessions"
                sortDirection={getSortDirection('_count.attendanceSessions')}
                onSort={handleSort}
                className="min-w-[100px]"
              >
                Classes
              </SortableTableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((subject) => (
              <TableRow key={subject.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{subject.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="status-outline" className={`text-xs ${getExamTypeColor(subject.examType)}`}>
                        {subject.examType}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant="status-outline" className="font-mono">
                    {subject.code}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-sm">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span>{subject.credits} Credits</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{subject.totalHours}h</span>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {subject.primaryFaculty?.name || "No Faculty Assigned"}
                      </span>
                    </div>
                    {subject.coFaculty && (
                      <div className="text-xs text-muted-foreground ml-5">
                        Co: {subject.coFaculty.name}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{subject.batch.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {subject.batch.program.shortName} Sem {subject.batch.semester}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant="status-outline" className={`text-xs ${getSubjectTypeColor(subject.subjectType)}`}>
                    {subject.subjectType}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {subject._count.attendanceSessions}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={loadingId === subject.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(subject)}>
                        Edit Subject
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onDelete(subject.id)}
                      >
                        Delete Subject
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
  )
}