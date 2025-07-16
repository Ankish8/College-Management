"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Star,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  X,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AcademicEvent {
  id: string
  name: string
  type: 'semester' | 'holiday' | 'exam' | 'special' | 'break'
  startDate: string
  endDate: string
  description?: string
  isRecurring: boolean
  affects: string[] // batch IDs or 'all'
  status: 'upcoming' | 'ongoing' | 'completed'
  blockClasses: boolean
}

interface SemesterPlan {
  id: string
  name: string
  academicYear: string
  startDate: string
  endDate: string
  totalWeeks: number
  teachingWeeks: number
  examWeeks: number
  breakWeeks: number
  status: 'planning' | 'active' | 'completed'
}

function AcademicCalendarTab() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null)

  const currentSemester: SemesterPlan = {
    id: '1',
    name: 'Spring Semester 2024',
    academicYear: '2023-24',
    startDate: '2024-01-15',
    endDate: '2024-06-15',
    totalWeeks: 22,
    teachingWeeks: 16,
    examWeeks: 2,
    breakWeeks: 4,
    status: 'active'
  }

  const academicEvents: AcademicEvent[] = [
    {
      id: '1',
      name: 'Spring Semester Start',
      type: 'semester',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      description: 'Classes begin for Spring 2024',
      isRecurring: false,
      affects: ['all'],
      status: 'completed',
      blockClasses: false
    },
    {
      id: '2',
      name: 'Republic Day',
      type: 'holiday',
      startDate: '2024-01-26',
      endDate: '2024-01-26',
      description: 'National holiday - no classes',
      isRecurring: true,
      affects: ['all'],
      status: 'completed',
      blockClasses: true
    },
    {
      id: '3',
      name: 'Mid-Semester Exams',
      type: 'exam',
      startDate: '2024-03-15',
      endDate: '2024-03-22',
      description: 'Mid-semester examination period',
      isRecurring: false,
      affects: ['all'],
      status: 'upcoming',
      blockClasses: true
    },
    {
      id: '4',
      name: 'Design Week 2024',
      type: 'special',
      startDate: '2024-04-10',
      endDate: '2024-04-15',
      description: 'Annual design showcase and workshops',
      isRecurring: true,
      affects: ['design-batches'],
      status: 'upcoming',
      blockClasses: false
    },
    {
      id: '5',
      name: 'Spring Break',
      type: 'break',
      startDate: '2024-04-20',
      endDate: '2024-04-28',
      description: 'Mid-semester break',
      isRecurring: false,
      affects: ['all'],
      status: 'upcoming',
      blockClasses: true
    }
  ]

  const eventTypeColors = {
    semester: 'bg-blue-100 text-blue-700 border-blue-200',
    holiday: 'bg-red-100 text-red-700 border-red-200',
    exam: 'bg-purple-100 text-purple-700 border-purple-200',
    special: 'bg-green-100 text-green-700 border-green-200',
    break: 'bg-orange-100 text-orange-700 border-orange-200'
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'semester': return <Calendar className="h-4 w-4" />
      case 'holiday': return <Star className="h-4 w-4" />
      case 'exam': return <FileText className="h-4 w-4" />
      case 'special': return <Users className="h-4 w-4" />
      case 'break': return <Clock className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return <Badge variant="outline">Upcoming</Badge>
      case 'ongoing': return <Badge className="bg-green-100 text-green-700">Ongoing</Badge>
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAddEvent = () => {
    setShowAddEvent(true)
    setSelectedEvent(null)
  }

  const handleEditEvent = (event: AcademicEvent) => {
    setSelectedEvent(event)
    setShowAddEvent(true)
  }

  const handleDeleteEvent = (eventId: string) => {
    toast({
      title: "Event Deleted",
      description: "Academic calendar event has been removed.",
    })
  }

  const handleSaveEvent = () => {
    toast({
      title: selectedEvent ? "Event Updated" : "Event Created",
      description: `Academic calendar event has been ${selectedEvent ? 'updated' : 'created'}.`,
    })
    setShowAddEvent(false)
    setSelectedEvent(null)
  }

  return (
    <div className="space-y-6">
      {/* Semester Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Current Semester: {currentSemester.name}
              </CardTitle>
              <CardDescription>
                Academic Year {currentSemester.academicYear} • 
                {new Date(currentSemester.startDate).toLocaleDateString()} - 
                {new Date(currentSemester.endDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentSemester.totalWeeks}</div>
              <div className="text-xs text-muted-foreground">Total Weeks</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentSemester.teachingWeeks}</div>
              <div className="text-xs text-muted-foreground">Teaching Weeks</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{currentSemester.examWeeks}</div>
              <div className="text-xs text-muted-foreground">Exam Weeks</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{currentSemester.breakWeeks}</div>
              <div className="text-xs text-muted-foreground">Break Weeks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Calendar Overview</TabsTrigger>
          <TabsTrigger value="events">Manage Events</TabsTrigger>
          <TabsTrigger value="planning">Semester Planning</TabsTrigger>
          <TabsTrigger value="conflicts">Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Academic Calendar Events</CardTitle>
                <Button onClick={handleAddEvent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {academicEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={eventTypeColors[event.type as keyof typeof eventTypeColors]}>
                          {getEventIcon(event.type)}
                          <span className="ml-1 capitalize">{event.type}</span>
                        </Badge>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()}
                            {event.startDate !== event.endDate && 
                              ` - ${new Date(event.endDate).toLocaleDateString()}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(event.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {event.blockClasses && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          Blocks classes
                        </div>
                      )}
                      {event.isRecurring && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Recurring event
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Affects: {event.affects.includes('all') ? 'All batches' : `${event.affects.length} batches`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {showAddEvent ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedEvent ? 'Edit Event' : 'Add New Event'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input 
                      placeholder="Enter event name" 
                      defaultValue={selectedEvent?.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select defaultValue={selectedEvent?.type || 'special'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semester">Semester</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="exam">Exam Period</SelectItem>
                        <SelectItem value="special">Special Event</SelectItem>
                        <SelectItem value="break">Break</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      defaultValue={selectedEvent?.startDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      defaultValue={selectedEvent?.endDate}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Event description (optional)"
                    defaultValue={selectedEvent?.description}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Affects</Label>
                    <Select defaultValue={selectedEvent?.affects[0] || 'all'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select affected batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        <SelectItem value="design-batches">Design Batches Only</SelectItem>
                        <SelectItem value="sem5">Semester 5 Only</SelectItem>
                        <SelectItem value="sem6">Semester 6 Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 pt-6">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="blockClasses"
                        defaultChecked={selectedEvent?.blockClasses}
                      />
                      <Label htmlFor="blockClasses">Block regular classes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="isRecurring"
                        defaultChecked={selectedEvent?.isRecurring}
                      />
                      <Label htmlFor="isRecurring">Recurring event</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveEvent}>
                    {selectedEvent ? 'Update Event' : 'Create Event'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddEvent(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Event Management</CardTitle>
                  <Button onClick={handleAddEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(eventTypeColors).map(([type, color]) => (
                    <Card key={type} className={`cursor-pointer hover:shadow-md ${color}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {getEventIcon(type)}
                          {type.charAt(0).toUpperCase() + type.slice(1)} Events
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {academicEvents.filter(e => e.type === type).length}
                        </div>
                        <p className="text-xs">
                          {academicEvents.filter(e => e.type === type && e.status === 'upcoming').length} upcoming
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semester Planning</CardTitle>
              <CardDescription>
                Plan and configure academic semesters and yearly calendars
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-base font-medium">Next Semester Planning</div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Semester Name</Label>
                      <Input placeholder="Fall Semester 2024" />
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Input placeholder="2024-25" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <Button className="w-full">
                      Create Semester Plan
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-base font-medium">Template Options</div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Copy from Previous Semester
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Use Standard Template
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Create Custom Plan
                    </Button>
                  </div>
                  
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      Planning a new semester will help you set up holidays, exam periods, 
                      and special events in advance.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Impact Analysis</CardTitle>
              <CardDescription>
                Analyze how calendar events affect timetable scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upcoming Disruptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <div className="font-medium">Mid-Semester Exams (Mar 15-22)</div>
                            <div>Will block 45 regular classes across all batches</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                      
                      <Alert className="border-blue-200 bg-blue-50">
                        <Calendar className="h-4 w-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <div className="font-medium">Design Week (Apr 10-15)</div>
                            <div>Special schedule for design department, 12 classes affected</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recovery Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule Makeup Classes
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Extend Semester Duration
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Intensive Session Planning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-red-600">67</div>
                      <div className="text-xs text-muted-foreground">Classes Blocked</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-orange-600">89</div>
                      <div className="text-xs text-muted-foreground">Hours Lost</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-blue-600">12</div>
                      <div className="text-xs text-muted-foreground">Batches Affected</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-green-600">95%</div>
                      <div className="text-xs text-muted-foreground">Recovery Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AcademicCalendarTab