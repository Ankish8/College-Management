"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  User,
  Mail,
  GraduationCap,
  Hash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BatchDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  batchName: string
}

interface BatchDetail {
  id: string
  name: string
  semester: number
  startYear: number
  endYear: number
  isActive: boolean
  maxCapacity?: number
  program: {
    name: string
    shortName: string
    duration: number
    department: {
      name: string
      shortName: string
    }
  }
  specialization?: {
    name: string
    shortName: string
  }
  students: Array<{
    id: string
    studentId: string
    rollNumber: string
    user: {
      name: string
      email: string
    }
  }>
  subjects: Array<{
    id: string
    name: string
    code: string
    credits: number
    totalHours: number
    examType: string
    subjectType: string
    primaryFaculty?: {
      name: string
      email: string
    }
  }>
  _count: {
    students: number
    subjects: number
    timetableEntries: number
    attendanceSessions: number
  }
}

export function BatchDetailsModal({ 
  open, 
  onOpenChange, 
  batchId, 
  batchName 
}: BatchDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [batchDetails, setBatchDetails] = useState<BatchDetail | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open && batchId) {
      fetchBatchDetails()
    }
  }, [open, batchId])

  const fetchBatchDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/batches/${batchId}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch batch details")
      }
      
      const data = await response.json()
      setBatchDetails(data)
    } catch (error) {
      console.error("Error fetching batch details:", error)
      toast({
        title: "Error",
        description: "Failed to load batch details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalCredits = batchDetails?.subjects.reduce((sum, subject) => sum + subject.credits, 0) || 0
  const totalHours = batchDetails?.subjects.reduce((sum, subject) => sum + subject.totalHours, 0) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-[60vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {batchName}
          </DialogTitle>
          <DialogDescription>
            Complete details and information about this batch
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : batchDetails ? (
          <div className="flex-1 overflow-hidden">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{batchDetails._count.students}</div>
                  {batchDetails.maxCapacity && (
                    <p className="text-xs text-muted-foreground">
                      of {batchDetails.maxCapacity} capacity
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{batchDetails._count.subjects}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalCredits} total credits
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{batchDetails._count.timetableEntries}</div>
                  <p className="text-xs text-muted-foreground">scheduled</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{batchDetails._count.attendanceSessions}</div>
                  <p className="text-xs text-muted-foreground">attendance taken</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subjects">Subjects ({batchDetails._count.subjects})</TabsTrigger>
                <TabsTrigger value="students">Students ({batchDetails._count.students})</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Batch Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Program</label>
                          <p className="font-medium">{batchDetails.program.name}</p>
                          <p className="text-sm text-muted-foreground">{batchDetails.program.shortName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Department</label>
                          <p className="font-medium">{batchDetails.program.department.name}</p>
                          <p className="text-sm text-muted-foreground">{batchDetails.program.department.shortName}</p>
                        </div>
                      </div>

                      {batchDetails.specialization && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                          <p className="font-medium">{batchDetails.specialization.name}</p>
                          <p className="text-sm text-muted-foreground">{batchDetails.specialization.shortName}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Semester</label>
                          <p className="font-medium">Semester {batchDetails.semester}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Duration</label>
                          <p className="font-medium">{batchDetails.startYear} - {batchDetails.endYear}</p>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Academic Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Credits</label>
                        <p className="text-2xl font-bold">{totalCredits}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Hours</label>
                        <p className="text-2xl font-bold">{totalHours}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Average Credits per Subject</label>
                        <p className="text-2xl font-bold">
                          {batchDetails._count.subjects > 0 ? (totalCredits / batchDetails._count.subjects).toFixed(1) : '0'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Batch Status</label>
                        <div className="mt-2">
                          <Badge variant={batchDetails.isActive ? "default" : "secondary"} className="text-sm">
                            {batchDetails.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Capacity Utilization</label>
                        <p className="text-2xl font-bold">
                          {batchDetails.maxCapacity ? 
                            `${Math.round((batchDetails._count.students / batchDetails.maxCapacity) * 100)}%` :
                            'No limit'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Classes Scheduled</label>
                        <p className="text-2xl font-bold">{batchDetails._count.timetableEntries}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="subjects" className="flex-1 overflow-hidden">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Subjects ({batchDetails._count.subjects})</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-auto max-h-[50vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Faculty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchDetails.subjects.map((subject) => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell>{subject.code}</TableCell>
                            <TableCell>{subject.credits}</TableCell>
                            <TableCell>{subject.totalHours}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {subject.subjectType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {subject.primaryFaculty ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {subject.primaryFaculty.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{subject.primaryFaculty.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not assigned</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="students" className="flex-1 overflow-hidden">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Students ({batchDetails._count.students})</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-auto max-h-[50vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchDetails.students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {student.user.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.user.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{student.rollNumber}</TableCell>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{student.user.email}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Capacity Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Current Enrollment</span>
                            <span>{batchDetails._count.students}{batchDetails.maxCapacity ? ` / ${batchDetails.maxCapacity}` : ''}</span>
                          </div>
                          {batchDetails.maxCapacity && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min((batchDetails._count.students / batchDetails.maxCapacity) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {batchDetails.maxCapacity ? 
                            `${Math.round((batchDetails._count.students / batchDetails.maxCapacity) * 100)}% capacity utilized` :
                            'No capacity limit set'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Subject Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {/* Group subjects by type */}
                        {Object.entries(
                          batchDetails.subjects.reduce((acc, subject) => {
                            acc[subject.subjectType] = (acc[subject.subjectType] || 0) + 1
                            return acc
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-sm">{type}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Failed to load batch details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}