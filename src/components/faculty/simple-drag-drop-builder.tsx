"use client"

import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { 
  Save, 
  RefreshCw, 
  Layout, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  GripVertical,
  Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: 'THEORY' | 'PRACTICAL' | 'JURY' | 'PROJECT' | 'VIVA'
  subjectType: 'CORE' | 'ELECTIVE'
  batch: {
    id: string
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
  }
  primaryFaculty?: {
    id: string
    name: string
    email: string
  } | null
  coFaculty?: {
    id: string
    name: string
    email: string
  } | null
}

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  status: 'ACTIVE' | 'INACTIVE'
  currentWorkload: {
    totalCredits: number
    teachingCredits: number
    nonTeachingCredits: number
    maxCredits: number
    utilization: number
    status: 'underutilized' | 'balanced' | 'overloaded'
  }
  assignedSubjects: Subject[]
}

interface SimpleDragDropBuilderProps {
  unassignedSubjects: Subject[]
  facultyList: Faculty[]
  onSave: (allotmentData: any) => Promise<void>
  onDataChange: () => void
  onReset: () => void
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (hasChanges: boolean) => void
}

export interface SimpleDragDropBuilderRef {
  getCurrentAssignments: () => any[]
  resetToInitial: () => void
}

// Draggable Subject Card Component
function DraggableSubjectCard({ subject }: { subject: Subject }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getSubjectTypeColor = (type: string) => {
    return type === 'CORE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  const getPriorityColor = (type: string) => {
    return type === 'CORE' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-move transition-all hover:shadow-md ${getPriorityColor(subject.subjectType)} ${
        isDragging ? 'shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-grab" />
          <div className="font-medium text-sm flex-1">{subject.name}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {subject.code} • {subject.credits} credits
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className={`text-xs ${getSubjectTypeColor(subject.subjectType)}`}>
            {subject.subjectType}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {subject.examType}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{subject.batch.name}</div>
      </div>
    </Card>
  )
}

// Draggable Assigned Subject Card Component
function DraggableAssignedSubjectCard({ 
  subject, 
  onRemove 
}: { 
  subject: Subject
  onRemove: (subjectId: string) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getSubjectTypeColor = (type: string) => {
    return type === 'CORE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-2 group relative cursor-move transition-all hover:shadow-md ${
        isDragging ? 'shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(subject.id)
        }}
      >
        ×
      </Button>
      <div className="flex items-center gap-2 mb-1">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-grab" />
        <div className="text-sm font-medium pr-6 flex-1">{subject.name}</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {subject.code} • {subject.credits} credits
      </div>
      <Badge variant="outline" className={`text-xs mt-1 ${getSubjectTypeColor(subject.subjectType)}`}>
        {subject.subjectType}
      </Badge>
    </Card>
  )
}

// Droppable Faculty Column Component
function DroppableFacultyColumn({ 
  faculty, 
  assignedSubjects, 
  onRemoveSubject 
}: { 
  faculty: Faculty
  assignedSubjects: Subject[]
  onRemoveSubject: (subjectId: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: faculty.id,
  })
  const getWorkloadStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'bg-red-100 text-red-700 border-red-200'
      case 'balanced': return 'bg-green-100 text-green-700 border-green-200'
      case 'underutilized': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getWorkloadStatusIcon = (status: string) => {
    switch (status) {
      case 'overloaded': return <AlertTriangle className="h-4 w-4" />
      case 'balanced': return <CheckCircle className="h-4 w-4" />
      case 'underutilized': return <Target className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  // Calculate workload with assigned subjects
  const totalCredits = assignedSubjects.reduce((acc, subject) => acc + subject.credits, 0)
  const utilization = (totalCredits / faculty.currentWorkload.maxCredits) * 100
  const workloadStatus = utilization > 100 ? 'overloaded' : utilization > 80 ? 'balanced' : 'underutilized'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-500" />
          <h3 className="font-semibold text-sm">{faculty.name}</h3>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Workload</span>
            <span>{totalCredits}h / {faculty.currentWorkload.maxCredits}h</span>
          </div>
          <Progress value={Math.min(utilization, 100)} className="h-2" />
          <Badge className={getWorkloadStatusColor(workloadStatus)} variant="outline">
            {getWorkloadStatusIcon(workloadStatus)}
            <span className="ml-1 capitalize">{workloadStatus}</span>
          </Badge>
        </div>
      </div>
      
      {/* Drop Zone */}
      <Card 
        ref={setNodeRef}
        className={`min-h-[350px] border-2 border-dashed border-muted transition-colors hover:border-primary/50 ${
          isOver ? 'border-primary bg-primary/5' : ''
        }`}
      >
        <CardContent className="p-3">
          <SortableContext items={assignedSubjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 min-h-[300px]">
              {assignedSubjects.map((subject) => (
                <DraggableAssignedSubjectCard
                  key={subject.id}
                  subject={subject}
                  onRemove={onRemoveSubject}
                />
              ))}
              {assignedSubjects.length === 0 && (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center text-muted-foreground text-sm">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Drop subjects here
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
}

// Droppable Unassigned Subjects Zone
function UnassignedSubjectsDropZone({ subjects }: { subjects: Subject[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned',
  })

  return (
    <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Unassigned Subjects</h3>
          <Badge variant="secondary">{subjects.length}</Badge>
        </div>
        <div 
          ref={setNodeRef}
          className={`space-y-2 min-h-[460px] p-3 border-2 border-dashed border-muted rounded-lg transition-colors ${
            isOver ? 'border-primary bg-primary/5' : ''
          }`}
        >
          {subjects.map((subject) => (
            <DraggableSubjectCard key={subject.id} subject={subject} />
          ))}
          {subjects.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-muted-foreground text-sm">
                All subjects assigned!
              </div>
            </div>
          )}
        </div>
      </div>
    </SortableContext>
  )
}

export function SimpleDragDropBuilder({ 
  unassignedSubjects, 
  facultyList, 
  onSave,
  onDataChange,
  onReset,
  hasUnsavedChanges,
  setHasUnsavedChanges
}: SimpleDragDropBuilderProps) {
  const { toast } = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [facultySearch, setFacultySearch] = useState('')
  
  // Local state for drag and drop
  const [localUnassignedSubjects, setLocalUnassignedSubjects] = useState<Subject[]>([])
  const [localFacultyAssignments, setLocalFacultyAssignments] = useState<{[facultyId: string]: Subject[]}>({})

  // Filter faculty based on search
  const filteredFaculty = facultyList.filter(faculty =>
    faculty.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
    faculty.email.toLowerCase().includes(facultySearch.toLowerCase()) ||
    faculty.employeeId.toLowerCase().includes(facultySearch.toLowerCase())
  )

  // Debug logging
  React.useEffect(() => {
    console.log('Faculty count:', facultyList.length)
    console.log('Filtered faculty count:', filteredFaculty.length)
    console.log('Unassigned subjects count:', localUnassignedSubjects.length)
    
    // Layout debugging
    setTimeout(() => {
      const container = document.querySelector('[data-debug="drag-container"]')
      const unassignedDiv = document.querySelector('[data-debug="unassigned-section"]')
      const scrollableDiv = document.querySelector('[data-debug="scrollable-section"]')
      
      if (container && unassignedDiv && scrollableDiv) {
        console.log('=== LAYOUT DEBUG ===')
        console.log('Viewport width:', window.innerWidth)
        console.log('Container width:', container.clientWidth)
        console.log('Container scroll width:', container.scrollWidth)
        console.log('Unassigned width:', unassignedDiv.clientWidth)
        console.log('Scrollable width:', scrollableDiv.clientWidth)
        console.log('Scrollable scroll width:', scrollableDiv.scrollWidth)
        console.log('Faculty count:', filteredFaculty.length)
        console.log('Expected faculty width:', (filteredFaculty.length * 288) + ((filteredFaculty.length - 1) * 16))
        console.log('Available for scrollable:', container.clientWidth - unassignedDiv.clientWidth - 16)
        console.log('Is overflowing:', scrollableDiv.scrollWidth > scrollableDiv.clientWidth)
      }
    }, 100)
  }, [facultyList.length, filteredFaculty.length, localUnassignedSubjects.length])

  // Initialize local state
  useEffect(() => {
    setLocalUnassignedSubjects(unassignedSubjects)
    const assignments: {[facultyId: string]: Subject[]} = {}
    facultyList.forEach(faculty => {
      assignments[faculty.id] = faculty.assignedSubjects || []
    })
    setLocalFacultyAssignments(assignments)
  }, [unassignedSubjects, facultyList])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    const subjectId = active.id as string

    // Find the subject being dragged
    const draggedSubject = localUnassignedSubjects.find(s => s.id === subjectId) ||
                          Object.values(localFacultyAssignments).flat().find(s => s.id === subjectId)

    if (!draggedSubject) return

    // If dropped outside valid drop zones, return to unassigned
    if (!over) {
      // Remove from current location
      setLocalUnassignedSubjects(prev => prev.filter(s => s.id !== subjectId))
      setLocalFacultyAssignments(prev => {
        const newAssignments = { ...prev }
        Object.keys(newAssignments).forEach(facultyId => {
          newAssignments[facultyId] = newAssignments[facultyId].filter(s => s.id !== subjectId)
        })
        return newAssignments
      })

      // Add to unassigned subjects
      setLocalUnassignedSubjects(prev => [...prev, draggedSubject])
      setHasUnsavedChanges(true)
      return
    }

    const targetId = over.id as string
    let targetFacultyId = targetId

    // Check if dropped on a subject card (not a faculty column or unassigned area)
    if (targetId !== 'unassigned' && !facultyList.some(f => f.id === targetId)) {
      // Find which faculty this subject belongs to
      const targetFaculty = facultyList.find(faculty => 
        (localFacultyAssignments[faculty.id] || []).some(s => s.id === targetId)
      )
      
      if (targetFaculty) {
        targetFacultyId = targetFaculty.id
      } else {
        // If can't find faculty, check if it's in unassigned and move to unassigned
        const isInUnassigned = localUnassignedSubjects.some(s => s.id === targetId)
        if (isInUnassigned) {
          targetFacultyId = 'unassigned'
        } else {
          // Fallback to unassigned if can't determine location
          targetFacultyId = 'unassigned'
        }
      }
    }

    // Remove subject from its current location
    setLocalUnassignedSubjects(prev => prev.filter(s => s.id !== subjectId))
    setLocalFacultyAssignments(prev => {
      const newAssignments = { ...prev }
      Object.keys(newAssignments).forEach(facultyId => {
        newAssignments[facultyId] = newAssignments[facultyId].filter(s => s.id !== subjectId)
      })
      return newAssignments
    })

    // Add subject to new location
    if (targetFacultyId === 'unassigned') {
      setLocalUnassignedSubjects(prev => [...prev, draggedSubject])
    } else {
      setLocalFacultyAssignments(prev => ({
        ...prev,
        [targetFacultyId]: [...(prev[targetFacultyId] || []), draggedSubject]
      }))
    }

    setHasUnsavedChanges(true)
  }

  const handleRemoveSubject = (subjectId: string) => {
    // Find and move subject back to unassigned
    const subject = Object.values(localFacultyAssignments).flat().find(s => s.id === subjectId)
    if (!subject) return

    setLocalFacultyAssignments(prev => {
      const newAssignments = { ...prev }
      Object.keys(newAssignments).forEach(facultyId => {
        newAssignments[facultyId] = newAssignments[facultyId].filter(s => s.id !== subjectId)
      })
      return newAssignments
    })

    setLocalUnassignedSubjects(prev => [...prev, subject])
    setHasUnsavedChanges(true)
  }

  // Allow parent to trigger save with current assignments
  const handleSaveWithCurrentData = async () => {
    const assignments = facultyList.map(faculty => ({
      facultyId: faculty.id,
      subjectIds: (localFacultyAssignments[faculty.id] || []).map(s => s.id)
    }))
    
    await onSave({ assignments })
    setHasUnsavedChanges(false)
  }

  // Expose save handler to parent
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleBuilderSave = handleSaveWithCurrentData
    }
  }, [localFacultyAssignments])

  // Get the currently dragged subject for the overlay
  const activeSubject = activeId ? 
    localUnassignedSubjects.find(s => s.id === activeId) ||
    Object.values(localFacultyAssignments).flat().find(s => s.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 w-full max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Subject Allotment</h3>
        </div>

        {hasUnsavedChanges && (
          <Alert>
            <Layout className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save your allotment before leaving.
            </AlertDescription>
          </Alert>
        )}

        {/* Faculty Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search faculty..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredFaculty.length} of {facultyList.length} faculty
          </div>
        </div>

        {/* Drag and Drop Interface */}
        <div className="w-full max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
          <div 
            className="flex gap-4 min-h-[500px]" 
            data-debug="drag-container"
            style={{ 
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Fixed Unassigned Subjects Pool */}
            <div 
              className="flex-shrink-0" 
              data-debug="unassigned-section"
              style={{ 
                width: '320px',
                maxWidth: '320px',
                overflow: 'hidden'
              }}
            >
              <UnassignedSubjectsDropZone 
                subjects={localUnassignedSubjects}
              />
            </div>

            {/* Scrollable Faculty Columns */}
            <div 
              className="flex-1" 
              data-debug="scrollable-section"
              style={{ 
                minWidth: '0',
                flex: '1',
                overflowX: 'auto',
                overflowY: 'hidden'
              }}
            >
              <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                {filteredFaculty.map((faculty) => (
                  <div key={faculty.id} className="flex-shrink-0" style={{ width: '288px' }}>
                    <DroppableFacultyColumn
                      faculty={faculty}
                      assignedSubjects={localFacultyAssignments[faculty.id] || []}
                      onRemoveSubject={handleRemoveSubject}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <Layout className="h-4 w-4" />
          <AlertDescription>
            <strong>How to use:</strong> Drag subjects from the unassigned pool to faculty columns, or between faculty columns. 
            Real-time workload calculations show when faculty are overloaded. 
            Click the × on assigned subjects to move them back to the unassigned pool.
          </AlertDescription>
        </Alert>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeSubject ? (
          localUnassignedSubjects.find(s => s.id === activeId) ? (
            <DraggableSubjectCard subject={activeSubject} />
          ) : (
            <DraggableAssignedSubjectCard subject={activeSubject} onRemove={() => {}} />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}