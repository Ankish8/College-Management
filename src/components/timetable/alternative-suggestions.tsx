"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Clock, 
  Calendar, 
  Users, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Lightbulb,
  Star,
  RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'

interface AlternativeTimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  conflictLevel: 'none' | 'low' | 'medium' | 'high'
  conflicts: {
    batchConflicts: number
    facultyConflicts: number
    holidayConflicts: number
  }
  recommendation: string
  score: number
}

interface AlternativeDay {
  dayOfWeek: string
  date: string
  availableSlots: AlternativeTimeSlot[]
  totalConflicts: number
  recommendation: string
  score: number
  isHoliday?: boolean
  isExamPeriod?: boolean
}

interface AlternativeFaculty {
  id: string
  name: string
  email: string
  department: string
  availability: 'high' | 'medium' | 'low'
  workload: {
    current: number
    maximum: number
    percentage: number
  }
  conflicts: number
  subjectExpertise: string[]
  recommendation: string
  score: number
}

interface AlternativeSuggestionsProps {
  currentSelection: {
    batchId: string
    subjectId: string
    facultyId: string
    timeSlotId: string
    dayOfWeek: string
    date?: string
  }
  onSelectAlternative: (type: 'timeslot' | 'day' | 'faculty', alternative: any) => void
  showTimeSlots?: boolean
  showDays?: boolean
  showFaculty?: boolean
  className?: string
}

// API functions
const fetchAlternativeTimeSlots = async (params: any): Promise<AlternativeTimeSlot[]> => {
  const response = await fetch('/api/timetable/alternatives/timeslots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Failed to fetch alternative time slots')
  return response.json()
}

const fetchAlternativeDays = async (params: any): Promise<AlternativeDay[]> => {
  const response = await fetch('/api/timetable/alternatives/days', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Failed to fetch alternative days')
  return response.json()
}

const fetchAlternativeFaculty = async (params: any): Promise<AlternativeFaculty[]> => {
  const response = await fetch('/api/timetable/alternatives/faculty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Failed to fetch alternative faculty')
  return response.json()
}

export function AlternativeSuggestions({
  currentSelection,
  onSelectAlternative,
  showTimeSlots = true,
  showDays = true,
  showFaculty = true,
  className = "",
}: AlternativeSuggestionsProps) {
  const [selectedTab, setSelectedTab] = useState('timeslots')
  const [timeSlotFilter, setTimeSlotFilter] = useState('all')
  const [dayRange, setDayRange] = useState('week')
  const [facultyFilter, setFacultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score')

  // Fetch alternative suggestions
  const { data: alternativeTimeSlots = [], isLoading: loadingTimeSlots } = useQuery({
    queryKey: ['alternative-timeslots', currentSelection],
    queryFn: () => fetchAlternativeTimeSlots(currentSelection),
    enabled: showTimeSlots,
  })

  const { data: alternativeDays = [], isLoading: loadingDays } = useQuery({
    queryKey: ['alternative-days', currentSelection, dayRange],
    queryFn: () => fetchAlternativeDays({ ...currentSelection, range: dayRange }),
    enabled: showDays,
  })

  const { data: alternativeFaculty = [], isLoading: loadingFaculty } = useQuery({
    queryKey: ['alternative-faculty', currentSelection],
    queryFn: () => fetchAlternativeFaculty(currentSelection),
    enabled: showFaculty,
  })

  // Filter and sort functions
  const filteredTimeSlots = alternativeTimeSlots
    .filter(slot => {
      if (timeSlotFilter === 'all') return true
      if (timeSlotFilter === 'available') return slot.conflictLevel === 'none'
      if (timeSlotFilter === 'low-conflict') return ['none', 'low'].includes(slot.conflictLevel)
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'time') return a.startTime.localeCompare(b.startTime)
      if (sortBy === 'conflicts') return a.conflicts.batchConflicts + a.conflicts.facultyConflicts - 
                                            (b.conflicts.batchConflicts + b.conflicts.facultyConflicts)
      return 0
    })

  const filteredDays = alternativeDays
    .filter(day => {
      if (dayRange === 'week') return true
      if (dayRange === 'month') return true
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === 'conflicts') return a.totalConflicts - b.totalConflicts
      return 0
    })

  const filteredFaculty = alternativeFaculty
    .filter(faculty => {
      if (facultyFilter === 'all') return true
      if (facultyFilter === 'available') return faculty.availability === 'high'
      if (facultyFilter === 'department') return faculty.department === 'Design' // This would be dynamic
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'workload') return a.workload.percentage - b.workload.percentage
      if (sortBy === 'conflicts') return a.conflicts - b.conflicts
      return 0
    })

  const getConflictLevelColor = (level: string) => {
    switch (level) {
      case 'none': return 'bg-green-100 text-green-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return format(date, 'h:mm a')
    } catch {
      return timeString
    }
  }

  const tabCount = [showTimeSlots, showDays, showFaculty].filter(Boolean).length

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium">Alternative Suggestions</h3>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${tabCount}`}>
          {showTimeSlots && (
            <TabsTrigger value="timeslots" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Slots ({filteredTimeSlots.length})
            </TabsTrigger>
          )}
          {showDays && (
            <TabsTrigger value="days" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Days ({filteredDays.length})
            </TabsTrigger>
          )}
          {showFaculty && (
            <TabsTrigger value="faculty" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Faculty ({filteredFaculty.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Time Slots Tab */}
        {showTimeSlots && (
          <TabsContent value="timeslots" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="timeslot-filter">Filter:</Label>
                <Select value={timeSlotFilter} onValueChange={setTimeSlotFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
                    <SelectItem value="available">Available Only</SelectItem>
                    <SelectItem value="low-conflict">Low Conflict</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="timeslot-sort">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="conflicts">Conflicts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Slot Cards */}
            <div className="space-y-3">
              {filteredTimeSlots.map((slot, index) => (
                <Card key={slot.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {slot.score >= 80 && <Star className="h-4 w-4 text-yellow-500" />}
                          <Clock className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">{slot.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)} ({slot.duration} min)
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={getConflictLevelColor(slot.conflictLevel)}>
                            {slot.conflictLevel === 'none' ? 'Available' : `${slot.conflictLevel} conflict`}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Score: {slot.score}/100
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => onSelectAlternative('timeslot', slot)}
                          variant={slot.conflictLevel === 'none' ? 'default' : 'outline'}
                        >
                          Select
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                    
                    {slot.conflicts.batchConflicts + slot.conflicts.facultyConflicts > 0 && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Conflicts: {slot.conflicts.batchConflicts} batch, {slot.conflicts.facultyConflicts} faculty
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-blue-600">
                      {slot.recommendation}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTimeSlots.length === 0 && !loadingTimeSlots && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <div className="text-muted-foreground mb-2">No alternative time slots found</div>
                  <Button variant="outline" size="sm">
                    Expand Search Criteria
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Days Tab */}
        {showDays && (
          <TabsContent value="days" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="day-range">Range:</Label>
                <Select value={dayRange} onValueChange={setDayRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="semester">This Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="day-sort">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="conflicts">Conflicts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Day Cards */}
            <div className="space-y-3">
              {filteredDays.map((day, index) => (
                <Card key={`${day.dayOfWeek}-${day.date}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {day.score >= 80 && <Star className="h-4 w-4 text-yellow-500" />}
                          <Calendar className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium">{day.dayOfWeek}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(day.date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {day.availableSlots.length} slots available
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score: {day.score}/100
                          </div>
                          {day.isHoliday && (
                            <Badge variant="outline" className="mt-1">Holiday</Badge>
                          )}
                          {day.isExamPeriod && (
                            <Badge variant="secondary" className="mt-1">Exam Period</Badge>
                          )}
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => onSelectAlternative('day', day)}
                        >
                          Select
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-blue-600">
                      {day.recommendation}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDays.length === 0 && !loadingDays && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <div className="text-muted-foreground mb-2">No alternative days found</div>
                  <Button variant="outline" size="sm">
                    Expand Date Range
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Faculty Tab */}
        {showFaculty && (
          <TabsContent value="faculty" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="faculty-filter">Filter:</Label>
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculty</SelectItem>
                    <SelectItem value="available">High Availability</SelectItem>
                    <SelectItem value="department">Same Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="faculty-sort">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="workload">Workload</SelectItem>
                    <SelectItem value="conflicts">Conflicts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Faculty Cards */}
            <div className="space-y-3">
              {filteredFaculty.map((faculty, index) => (
                <Card key={faculty.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {faculty.score >= 80 && <Star className="h-4 w-4 text-yellow-500" />}
                          <User className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <div className="font-medium">{faculty.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {faculty.email} • {faculty.department}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={getAvailabilityColor(faculty.availability)}>
                            {faculty.availability} availability
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Workload: {faculty.workload.percentage}%
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => onSelectAlternative('faculty', faculty)}
                        >
                          Select
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                    
                    {faculty.subjectExpertise.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {faculty.subjectExpertise.slice(0, 3).map(subject => (
                          <Badge key={subject} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {faculty.subjectExpertise.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{faculty.subjectExpertise.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-blue-600">
                      {faculty.recommendation}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredFaculty.length === 0 && !loadingFaculty && (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <div className="text-muted-foreground mb-2">No alternative faculty found</div>
                  <Button variant="outline" size="sm">
                    Expand Search Criteria
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}