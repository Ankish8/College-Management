"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Batch {
  id: string
  name: string
  program: {
    name: string
    shortName: string
  }
  specialization?: {
    name: string
    shortName: string
  }
  currentStrength: number
  maxCapacity?: number
  _count?: {
    students: number
    subjects: number
  }
}

interface BatchOverviewCardsProps {
  batches: Batch[]
  isLoading: boolean
  onSelectBatch: (batchId: string) => void
}

export function BatchOverviewCards({ batches, isLoading, onSelectBatch }: BatchOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Batches Found</h3>
          <p className="text-muted-foreground">
            No active batches available for attendance reporting.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Batches</h3>
        <Badge variant="secondary">{batches.length} batches</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => {
          const studentCount = batch._count?.students || batch.currentStrength || 0
          const subjectCount = batch._count?.subjects || 0
          
          return (
            <Card key={batch.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{batch.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {batch.program.shortName}
                      {batch.specialization && ` - ${batch.specialization.shortName}`}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {batch.program.shortName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Students</span>
                  </div>
                  <span className="font-medium">{studentCount}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>Subjects</span>
                  </div>
                  <span className="font-medium">{subjectCount}</span>
                </div>

                {batch.maxCapacity && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>Capacity</span>
                    </div>
                    <span className="font-medium">
                      {Math.round((studentCount / batch.maxCapacity) * 100)}%
                    </span>
                  </div>
                )}

                <Button 
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => onSelectBatch(batch.id)}
                >
                  View Attendance Reports
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}