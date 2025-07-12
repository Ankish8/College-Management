"use client"

import { useState } from "react"
import { MoreHorizontal, Clock, Users, BookOpen, GraduationCap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  }
  primaryFaculty: {
    name: string
    email: string
  }
  coFaculty?: {
    name: string
    email: string
  }
  _count: {
    attendanceSessions: number
  }
}

interface SubjectCardProps {
  subject: Subject
  onUpdate: (subject: Subject) => void
  onDelete: (subjectId: string) => void
}

export function SubjectCard({ subject, onUpdate, onDelete }: SubjectCardProps) {
  const [isLoading, setIsLoading] = useState(false)

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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold leading-tight">
                {subject.name}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs h-5 font-mono">
                  {subject.code}
                </Badge>
                <Badge className={`text-xs h-5 ${getExamTypeColor(subject.examType)}`}>
                  {subject.examType}
                </Badge>
                <Badge className={`text-xs h-5 ${getSubjectTypeColor(subject.subjectType)}`}>
                  {subject.subjectType}
                </Badge>
              </div>
            </div>
            
            {/* Compact info in header */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{subject.credits}c</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{subject.totalHours}h</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                <span>{subject.batch.program.shortName} S{subject.batch.semester}</span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Subject</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Faculty - more prominent */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">{subject.primaryFaculty.name}</span>
          </div>
          {subject.coFaculty && (
            <div className="text-xs text-muted-foreground ml-5">
              Co-Faculty: {subject.coFaculty.name}
            </div>
          )}
        </div>

        {/* Batch name - truncated */}
        <div className="text-xs text-muted-foreground truncate">
          {subject.batch.name}
        </div>

        {/* Footer - single row */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">Classes Conducted</span>
          <Badge variant="secondary" className="text-xs h-5">
            {subject._count.attendanceSessions}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}