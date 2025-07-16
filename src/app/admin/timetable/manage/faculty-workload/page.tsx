"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  BarChart3,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  User,
  RefreshCw,
  Settings,
  Target,
  Zap
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Faculty {
  id: string
  name: string
  email: string
  department: string
  currentLoad: number
  maxLoad: number
  subjects: {
    id: string
    name: string
    code: string
    credits: number
    batch: string
    hoursPerWeek: number
  }[]
  preferences: {
    maxDailyHours: number
    maxWeeklyHours: number
    preferredTimeSlots: string[]
    blackoutPeriods: string[]
  }
  workloadStatus: 'underutilized' | 'balanced' | 'overloaded'
}

interface WorkloadAnalytics {
  totalFaculty: number
  averageLoad: number
  overloadedCount: number
  underutilizedCount: number
  balancedCount: number
  workloadDistribution: {
    name: string
    value: number
    percentage: number
  }[]
}

export default function FacultyWorkloadTab() {
  const { toast } = useToast()
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')
  const [viewMode, setViewMode] = useState('overview')

  // Mock data
  const facultyData: Faculty[] = [
    {
      id: '1',
      name: 'Prof. Ankish Khatri',
      email: 'ankish.khatri@jlu.edu.in',
      department: 'Design',
      currentLoad: 22,
      maxLoad: 30,
      workloadStatus: 'balanced',
      subjects: [
        { id: '1', name: 'User Experience Design', code: 'UXD101', credits: 4, batch: 'B.Des UX Sem 5', hoursPerWeek: 6 },
        { id: '2', name: 'Design Thinking', code: 'DT201', credits: 6, batch: 'B.Des GD Sem 3', hoursPerWeek: 9 },
        { id: '3', name: 'Prototyping', code: 'PT301', credits: 4, batch: 'B.Des UX Sem 6', hoursPerWeek: 6 }
      ],
      preferences: {
        maxDailyHours: 8,
        maxWeeklyHours: 30,
        preferredTimeSlots: ['10:00-11:30', '14:00-15:30'],
        blackoutPeriods: []
      }
    },
    {
      id: '2',
      name: 'Prof. Sarah Johnson',
      email: 'sarah.johnson@jlu.edu.in',
      department: 'Design',
      currentLoad: 35,
      maxLoad: 30,
      workloadStatus: 'overloaded',
      subjects: [
        { id: '4', name: 'Graphic Design Fundamentals', code: 'GDF101', credits: 6, batch: 'B.Des GD Sem 1', hoursPerWeek: 9 },
        { id: '5', name: 'Typography', code: 'TYP201', credits: 4, batch: 'B.Des GD Sem 3', hoursPerWeek: 6 },
        { id: '6', name: 'Brand Identity Design', code: 'BID301', credits: 6, batch: 'B.Des GD Sem 5', hoursPerWeek: 9 },
        { id: '7', name: 'Portfolio Development', code: 'PD401', credits: 4, batch: 'B.Des GD Sem 7', hoursPerWeek: 6 }
      ],
      preferences: {
        maxDailyHours: 6,
        maxWeeklyHours: 30,
        preferredTimeSlots: ['09:00-10:30', '11:00-12:30'],
        blackoutPeriods: ['2024-01-15', '2024-01-16']
      }
    },
    {
      id: '3',
      name: 'Prof. Michael Chen',
      email: 'michael.chen@jlu.edu.in',
      department: 'Design',
      currentLoad: 15,
      maxLoad: 30,
      workloadStatus: 'underutilized',
      subjects: [
        { id: '8', name: 'Digital Media Design', code: 'DMD201', credits: 4, batch: 'B.Des MM Sem 3', hoursPerWeek: 6 },
        { id: '9', name: 'Animation Basics', code: 'AB101', credits: 4, batch: 'B.Des MM Sem 1', hoursPerWeek: 6 }
      ],
      preferences: {
        maxDailyHours: 8,
        maxWeeklyHours: 32,
        preferredTimeSlots: ['10:00-11:30', '13:00-14:30', '15:00-16:30'],
        blackoutPeriods: []
      }
    }
  ]

  const analytics: WorkloadAnalytics = {
    totalFaculty: 15,
    averageLoad: 24,
    overloadedCount: 3,
    underutilizedCount: 5,
    balancedCount: 7,
    workloadDistribution: [
      { name: 'Overloaded (>30 hrs)', value: 3, percentage: 20 },
      { name: 'Balanced (20-30 hrs)', value: 7, percentage: 47 },
      { name: 'Underutilized (<20 hrs)', value: 5, percentage: 33 }
    ]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'bg-red-100 text-red-700 border-red-200'
      case 'balanced': return 'bg-green-100 text-green-700 border-green-200'
      case 'underutilized': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overloaded': return <AlertTriangle className="h-4 w-4" />
      case 'balanced': return <CheckCircle className="h-4 w-4" />
      case 'underutilized': return <TrendingDown className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const handleAutoBalance = () => {
    toast({
      title: "Auto-Balance Initiated",
      description: "Analyzing faculty workload and generating optimization suggestions...",
    })
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFaculty}</div>
            <p className="text-xs text-muted-foreground">
              Active teaching faculty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Load</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageLoad}h</div>
            <p className="text-xs text-muted-foreground">
              Per week across all faculty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.overloadedCount}</div>
            <p className="text-xs text-muted-foreground">
              Faculty above capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((analytics.balancedCount / analytics.totalFaculty) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Balanced workload
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workload Distribution
          </CardTitle>
          <CardDescription>
            Visual breakdown of faculty workload across the department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.workloadDistribution.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.value} faculty ({item.percentage}%)
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Faculty Overview</TabsTrigger>
          <TabsTrigger value="optimization">Load Optimization</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Faculty Workload Overview
              </CardTitle>
              <CardDescription>
                Current teaching assignments and workload status for all faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {facultyData.map((faculty) => (
                  <div key={faculty.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{faculty.name}</div>
                          <div className="text-sm text-muted-foreground">{faculty.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(faculty.workloadStatus)}>
                          {getStatusIcon(faculty.workloadStatus)}
                          <span className="ml-1 capitalize">{faculty.workloadStatus}</span>
                        </Badge>
                        <div className="text-right">
                          <div className="font-semibold">{faculty.currentLoad}h / {faculty.maxLoad}h</div>
                          <div className="text-xs text-muted-foreground">Current / Max Load</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Workload Progress</span>
                        <span>{Math.round((faculty.currentLoad / faculty.maxLoad) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(faculty.currentLoad / faculty.maxLoad) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Current Subjects ({faculty.subjects.length})</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {faculty.subjects.map((subject) => (
                          <div key={subject.id} className="text-xs bg-gray-50 p-2 rounded border">
                            <div className="font-medium">{subject.name}</div>
                            <div className="text-muted-foreground">
                              {subject.code} • {subject.batch} • {subject.hoursPerWeek}h/week
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        View Schedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Edit Preferences
                      </Button>
                      {faculty.workloadStatus === 'overloaded' && (
                        <Button variant="outline" size="sm" className="text-red-600">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Redistribute Load
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Load Optimization Tools
              </CardTitle>
              <CardDescription>
                Automated tools to balance faculty workload and optimize schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleAutoBalance} 
                  className="h-20 flex-col gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Auto-Balance Workload</div>
                    <div className="text-xs text-muted-foreground">
                      Redistribute overloaded faculty assignments
                    </div>
                  </div>
                </Button>

                <Button 
                  className="h-20 flex-col gap-2"
                  variant="outline"
                >
                  <TrendingUp className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Optimize Utilization</div>
                    <div className="text-xs text-muted-foreground">
                      Assign more work to underutilized faculty
                    </div>
                  </div>
                </Button>
              </div>

              {/* Optimization Suggestions */}
              <div className="space-y-4">
                <div className="text-base font-medium">Optimization Suggestions</div>
                
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">High Priority: Prof. Sarah Johnson Overloaded</div>
                      <div className="text-sm">
                        Current load: 35h/week (17% over capacity). 
                        Suggest moving "Portfolio Development" (6h) to Prof. Michael Chen.
                      </div>
                      <Button size="sm" className="mt-2">
                        Apply Suggestion
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <TrendingDown className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Medium Priority: Prof. Michael Chen Underutilized</div>
                      <div className="text-sm">
                        Current load: 15h/week (50% capacity). 
                        Can take additional subjects from overloaded faculty.
                      </div>
                      <Button size="sm" variant="outline" className="mt-2">
                        Assign More Work
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert className="border-blue-200 bg-blue-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Optimization Opportunity: Cross-Training</div>
                      <div className="text-sm">
                        Prof. Michael Chen could be trained to teach "User Experience Design" 
                        to provide backup coverage and distribute load.
                      </div>
                      <Button size="sm" variant="outline" className="mt-2">
                        Plan Training
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faculty Workload Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground">
                    [Workload trend chart would go here]
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Weekly workload distribution over the semester
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground">
                    [Subject distribution pie chart would go here]
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Distribution of subjects across faculty members
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Capacity Utilization</span>
                    <span className="text-sm font-medium">80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Load Variance</span>
                    <span className="text-sm font-medium">±6.2h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Faculty Satisfaction</span>
                    <span className="text-sm font-medium">4.2/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Schedule Conflicts</span>
                    <span className="text-sm font-medium">2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Teaching Hours</span>
                    <span className="text-sm font-medium">360h/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Subjects per Faculty</span>
                    <span className="text-sm font-medium">2.8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Most Loaded Faculty</span>
                    <span className="text-sm font-medium">Prof. S. Johnson</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Least Loaded Faculty</span>
                    <span className="text-sm font-medium">Prof. M. Chen</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}