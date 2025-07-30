import { Config } from "@measured/puck"
import { Clock, BookOpen, Users, Coffee, Calendar, BarChart3, Target, AlertTriangle, CheckCircle } from "lucide-react"

// Timetable-specific component types
export interface TimeSlotProps {
  startTime: string
  endTime: string
  duration: number
  label: string
  isBreak: boolean
}

export interface SubjectBlockProps {
  subjectName: string
  subjectCode: string
  facultyName: string
  credits: number
  color: string
  position: {
    day: number // 0-6 for Mon-Sun
    timeSlot: number // index in time slots array
  }
  span: {
    rows: number // how many time slots it spans
    cols: number // how many days it spans (for multi-day modules)
  }
}

export interface BatchAssignmentProps {
  batchName: string
  program: string
  semester: number
  specialization?: string
  maxCapacity: number
  currentStrength: number
}

export interface BreakPeriodProps {
  name: string
  startTime: string
  endTime: string
  duration: number
  type: "lunch" | "short" | "custom"
  isRecurring: boolean
}

export interface TimetableLayoutProps {
  weekStart: number // 0=Sunday, 1=Monday
  workingDays: number[] // Array of working day numbers
  timeSlots: TimeSlotProps[]
  displayMode: "grid" | "timeline" | "compact"
  showWeekends: boolean
}

// Subject Allotment specific component types
export interface SubjectCardProps {
  subjectId: string
  subjectName: string
  subjectCode: string
  credits: number
  examType: "THEORY" | "PRACTICAL" | "JURY" | "PROJECT" | "VIVA"
  subjectType: "CORE" | "ELECTIVE"
  batchName: string
  priority: "high" | "medium" | "low"
  isDraggable: boolean
}

export interface FacultyColumnProps {
  facultyId: string
  facultyName: string
  employeeId: string
  currentCredits: number
  maxCredits: number
  teachingCredits: number
  nonTeachingCredits: number
  workloadStatus: "underutilized" | "balanced" | "overloaded"
  assignedSubjects: SubjectCardProps[]
  isDropZone: boolean
}

export interface WorkloadIndicatorProps {
  totalCredits: number
  maxCredits: number
  teachingCredits: number
  nonTeachingCredits: number
  utilization: number
  status: "underutilized" | "balanced" | "overloaded"
  showBreakdown: boolean
}

export interface AllotmentSummaryProps {
  totalFaculty: number
  totalSubjects: number
  unassignedSubjects: number
  overloadedFaculty: number
  balancedFaculty: number
  underutilizedFaculty: number
  totalCredits: number
  averageWorkload: number
}

// Puck.js configuration for timetable template builder
export const puckConfig: Config = {
  components: {
    // Layout Components
    TimetableLayout: {
      fields: {
        weekStart: {
          type: "select",
          options: [
            { label: "Sunday", value: 0 },
            { label: "Monday", value: 1 }
          ]
        },
        workingDays: {
          type: "array",
          arrayFields: {
            day: {
              type: "select",
              options: [
                { label: "Monday", value: 1 },
                { label: "Tuesday", value: 2 },
                { label: "Wednesday", value: 3 },
                { label: "Thursday", value: 4 },
                { label: "Friday", value: 5 },
                { label: "Saturday", value: 6 },
                { label: "Sunday", value: 0 }
              ]
            }
          }
        },
        displayMode: {
          type: "select",
          options: [
            { label: "Grid View", value: "grid" },
            { label: "Timeline View", value: "timeline" },
            { label: "Compact View", value: "compact" }
          ]
        },
        showWeekends: {
          type: "radio",
          options: [
            { label: "Show", value: true },
            { label: "Hide", value: false }
          ]
        }
      },
      defaultProps: {
        weekStart: 1,
        workingDays: [1, 2, 3, 4, 5],
        displayMode: "grid",
        showWeekends: false,
        timeSlots: []
      },
      render: (props: any) => {
        const { weekStart, workingDays, displayMode, showWeekends, timeSlots } = props as TimetableLayoutProps
        return (
        <div className="timetable-layout p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Timetable Layout</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Week starts: {weekStart === 0 ? 'Sunday' : 'Monday'}</p>
            <p>Working days: {workingDays.length} days</p>
            <p>Display mode: {displayMode}</p>
            <p>Time slots: {timeSlots.length}</p>
            <p>Weekends: {showWeekends ? 'Shown' : 'Hidden'}</p>
          </div>
        </div>
        )
      }
    },

    // Time Slot Component
    TimeSlot: {
      fields: {
        startTime: {
          type: "text",
          label: "Start Time (HH:MM)"
        },
        endTime: {
          type: "text",
          label: "End Time (HH:MM)"
        },
        label: {
          type: "text",
          label: "Display Label"
        },
        isBreak: {
          type: "radio",
          options: [
            { label: "Regular Slot", value: false },
            { label: "Break Period", value: true }
          ]
        }
      },
      defaultProps: {
        startTime: "09:00",
        endTime: "10:30",
        duration: 90,
        label: "Morning Session",
        isBreak: false
      },
      render: (props: any) => {
        const { startTime, endTime, label, isBreak } = props as TimeSlotProps
        return (
        <div className={`time-slot p-3 rounded-lg border-2 ${
          isBreak 
            ? 'border-orange-300 bg-orange-50' 
            : 'border-blue-300 bg-blue-50'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isBreak ? 'text-orange-500' : 'text-blue-500'}`} />
            <span className="font-medium text-sm">{label}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {startTime} - {endTime}
          </div>
          {isBreak && (
            <div className="text-xs text-orange-600 mt-1">Break Period</div>
          )}
        </div>
        )
      }
    },

    // Subject Block Component
    SubjectBlock: {
      fields: {
        subjectName: {
          type: "text",
          label: "Subject Name"
        },
        subjectCode: {
          type: "text",
          label: "Subject Code"
        },
        facultyName: {
          type: "text",
          label: "Faculty Name"
        },
        credits: {
          type: "number",
          label: "Credits"
        },
        color: {
          type: "select",
          options: [
            { label: "Blue", value: "blue" },
            { label: "Green", value: "green" },
            { label: "Purple", value: "purple" },
            { label: "Orange", value: "orange" },
            { label: "Red", value: "red" },
            { label: "Teal", value: "teal" }
          ]
        },
        position: {
          type: "object",
          objectFields: {
            day: {
              type: "select",
              options: [
                { label: "Monday", value: 0 },
                { label: "Tuesday", value: 1 },
                { label: "Wednesday", value: 2 },
                { label: "Thursday", value: 3 },
                { label: "Friday", value: 4 },
                { label: "Saturday", value: 5 },
                { label: "Sunday", value: 6 }
              ]
            },
            timeSlot: {
              type: "number",
              label: "Time Slot Index"
            }
          }
        },
        span: {
          type: "object",
          objectFields: {
            rows: {
              type: "number",
              label: "Time Slots Span"
            },
            cols: {
              type: "number", 
              label: "Days Span"
            }
          }
        }
      },
      defaultProps: {
        subjectName: "New Subject",
        subjectCode: "SUB101",
        facultyName: "Faculty Name",
        credits: 4,
        color: "blue",
        position: { day: 0, timeSlot: 0 },
        span: { rows: 1, cols: 1 }
      },
      render: ({ subjectName, subjectCode, facultyName, credits, color, span }: SubjectBlockProps) => {
        const colorClasses = {
          blue: 'border-blue-400 bg-blue-100 text-blue-800',
          green: 'border-green-400 bg-green-100 text-green-800',
          purple: 'border-purple-400 bg-purple-100 text-purple-800',
          orange: 'border-orange-400 bg-orange-100 text-orange-800',
          red: 'border-red-400 bg-red-100 text-red-800',
          teal: 'border-teal-400 bg-teal-100 text-teal-800'
        }

        return (
          <div className={`subject-block p-3 rounded-lg border-2 ${colorClasses[color as keyof typeof colorClasses]} relative`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="font-semibold text-sm">{subjectName}</span>
            </div>
            <div className="text-xs space-y-1">
              <div>Code: {subjectCode}</div>
              <div>Faculty: {facultyName}</div>
              <div>Credits: {credits}</div>
              {(span.rows > 1 || span.cols > 1) && (
                <div className="text-xs opacity-75">
                  Span: {span.rows}×{span.cols}
                </div>
              )}
            </div>
          </div>
        )
      }
    },

    // Batch Assignment Component
    BatchAssignment: {
      fields: {
        batchName: {
          type: "text",
          label: "Batch Name"
        },
        program: {
          type: "select",
          options: [
            { label: "B.Des", value: "bdes" },
            { label: "M.Des", value: "mdes" },
            { label: "Diploma", value: "diploma" }
          ]
        },
        semester: {
          type: "number",
          label: "Semester"
        },
        specialization: {
          type: "text",
          label: "Specialization (Optional)"
        },
        maxCapacity: {
          type: "number",
          label: "Maximum Capacity"
        },
        currentStrength: {
          type: "number",
          label: "Current Strength"
        }
      },
      defaultProps: {
        batchName: "New Batch",
        program: "bdes",
        semester: 1,
        specialization: "",
        maxCapacity: 30,
        currentStrength: 25
      },
      render: ({ batchName, program, semester, specialization, maxCapacity, currentStrength }: BatchAssignmentProps) => (
        <div className="batch-assignment p-3 rounded-lg border-2 border-green-300 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm text-green-800">{batchName}</span>
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>{program.toUpperCase()} Semester {semester}</div>
            {specialization && <div>Specialization: {specialization}</div>}
            <div>Capacity: {currentStrength}/{maxCapacity}</div>
          </div>
        </div>
      )
    },

    // Break Period Component
    BreakPeriod: {
      fields: {
        name: {
          type: "text",
          label: "Break Name"
        },
        startTime: {
          type: "text",
          label: "Start Time (HH:MM)"
        },
        endTime: {
          type: "text",
          label: "End Time (HH:MM)"
        },
        type: {
          type: "select",
          options: [
            { label: "Lunch Break", value: "lunch" },
            { label: "Short Break", value: "short" },
            { label: "Custom Break", value: "custom" }
          ]
        },
        isRecurring: {
          type: "radio",
          options: [
            { label: "Daily", value: true },
            { label: "One-time", value: false }
          ]
        }
      },
      defaultProps: {
        name: "Lunch Break",
        startTime: "12:30",
        endTime: "13:15",
        duration: 45,
        type: "lunch",
        isRecurring: true
      },
      render: ({ name, startTime, endTime, type, isRecurring }: BreakPeriodProps) => (
        <div className="break-period p-3 rounded-lg border-2 border-orange-300 bg-orange-50">
          <div className="flex items-center gap-2 mb-1">
            <Coffee className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-sm text-orange-800">{name}</span>
          </div>
          <div className="text-xs text-orange-700 space-y-1">
            <div>{startTime} - {endTime}</div>
            <div>Type: {type}</div>
            <div>{isRecurring ? 'Daily recurring' : 'One-time only'}</div>
          </div>
        </div>
      )
    },

    // Subject Allotment Components
    SubjectCard: {
      fields: {
        subjectName: {
          type: "text",
          label: "Subject Name"
        },
        subjectCode: {
          type: "text",
          label: "Subject Code"
        },
        credits: {
          type: "number",
          label: "Credits",
          min: 1,
          max: 6
        },
        examType: {
          type: "select",
          options: [
            { label: "Theory", value: "THEORY" },
            { label: "Practical", value: "PRACTICAL" },
            { label: "Jury", value: "JURY" },
            { label: "Project", value: "PROJECT" },
            { label: "Viva", value: "VIVA" }
          ]
        },
        subjectType: {
          type: "select",
          options: [
            { label: "Core (Teaching)", value: "CORE" },
            { label: "Elective (Non-Teaching)", value: "ELECTIVE" }
          ]
        },
        batchName: {
          type: "text",
          label: "Batch Name"
        },
        priority: {
          type: "select",
          options: [
            { label: "High Priority", value: "high" },
            { label: "Medium Priority", value: "medium" },
            { label: "Low Priority", value: "low" }
          ]
        },
        isDraggable: {
          type: "radio",
          options: [
            { label: "Draggable", value: true },
            { label: "Fixed", value: false }
          ]
        }
      },
      defaultProps: {
        subjectId: "new-subject",
        subjectName: "New Subject",
        subjectCode: "SUB101",
        credits: 4,
        examType: "THEORY",
        subjectType: "CORE",
        batchName: "B.Des Semester 5",
        priority: "medium",
        isDraggable: true
      },
      render: ({ subjectName, subjectCode, credits, examType, subjectType, batchName, priority, isDraggable }: SubjectCardProps) => {
        const priorityColors = {
          high: 'border-red-300 bg-red-50 text-red-800',
          medium: 'border-yellow-300 bg-yellow-50 text-yellow-800',
          low: 'border-green-300 bg-green-50 text-green-800'
        }

        const typeColors = {
          CORE: 'bg-blue-100 text-blue-800',
          ELECTIVE: 'bg-purple-100 text-purple-800'
        }

        return (
          <div className={`subject-card p-3 rounded-lg border-2 ${priorityColors[priority]} ${isDraggable ? 'cursor-move' : 'cursor-default'} transition-all hover:shadow-md`}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" />
              <span className="font-semibold text-sm">{subjectName}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Code: {subjectCode}</span>
                <span className="font-medium">{credits} credits</span>
              </div>
              <div className="flex justify-between">
                <span className={`px-2 py-1 rounded text-xs ${typeColors[subjectType]}`}>
                  {subjectType}
                </span>
                <span className="text-muted-foreground">{examType}</span>
              </div>
              <div className="text-muted-foreground">{batchName}</div>
              <div className={`text-xs font-medium ${priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                {priority.toUpperCase()} PRIORITY
              </div>
            </div>
          </div>
        )
      }
    },

    FacultyColumn: {
      fields: {
        facultyName: {
          type: "text",
          label: "Faculty Name"
        },
        employeeId: {
          type: "text",
          label: "Employee ID"
        },
        currentCredits: {
          type: "number",
          label: "Current Credits",
          min: 0
        },
        maxCredits: {
          type: "number",
          label: "Max Credits",
          min: 1
        },
        teachingCredits: {
          type: "number",
          label: "Teaching Credits",
          min: 0
        },
        nonTeachingCredits: {
          type: "number",
          label: "Non-Teaching Credits",
          min: 0
        },
        workloadStatus: {
          type: "select",
          options: [
            { label: "Underutilized", value: "underutilized" },
            { label: "Balanced", value: "balanced" },
            { label: "Overloaded", value: "overloaded" }
          ]
        },
        isDropZone: {
          type: "radio",
          options: [
            { label: "Allow Drops", value: true },
            { label: "Read Only", value: false }
          ]
        }
      },
      defaultProps: {
        facultyId: "faculty-1",
        facultyName: "Faculty Member",
        employeeId: "EMP001",
        currentCredits: 20,
        maxCredits: 30,
        teachingCredits: 15,
        nonTeachingCredits: 5,
        workloadStatus: "balanced",
        assignedSubjects: [],
        isDropZone: true
      },
      render: ({ facultyName, employeeId, currentCredits, maxCredits, teachingCredits, nonTeachingCredits, workloadStatus, isDropZone }: FacultyColumnProps) => {
        const statusColors = {
          underutilized: 'border-yellow-300 bg-yellow-50',
          balanced: 'border-green-300 bg-green-50',
          overloaded: 'border-red-300 bg-red-50'
        }

        const statusIcons = {
          underutilized: <Target className="h-4 w-4 text-yellow-600" />,
          balanced: <CheckCircle className="h-4 w-4 text-green-600" />,
          overloaded: <AlertTriangle className="h-4 w-4 text-red-600" />
        }

        const utilization = (currentCredits / maxCredits) * 100

        return (
          <div className={`faculty-column p-4 rounded-lg border-2 ${statusColors[workloadStatus]} min-h-[400px]`}>
            <div className="space-y-3">
              {/* Faculty Header */}
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-sm">{facultyName}</div>
                  <div className="text-xs text-muted-foreground">{employeeId}</div>
                </div>
              </div>

              {/* Workload Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Workload</span>
                  <span>{currentCredits}h / {maxCredits}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${workloadStatus === 'overloaded' ? 'bg-red-500' : workloadStatus === 'balanced' ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {statusIcons[workloadStatus]}
                  <span className="capitalize font-medium">{workloadStatus}</span>
                </div>
              </div>

              {/* Teaching vs Non-Teaching Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-600">Teaching:</span>
                  <span className="font-medium">{teachingCredits}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Non-Teaching:</span>
                  <span className="font-medium">{nonTeachingCredits}h</span>
                </div>
              </div>

              {/* Drop Zone */}
              {isDropZone && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">Drop subjects here</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    },

    WorkloadIndicator: {
      fields: {
        totalCredits: {
          type: "number",
          label: "Total Credits",
          min: 0
        },
        maxCredits: {
          type: "number",
          label: "Max Credits",
          min: 1
        },
        teachingCredits: {
          type: "number",
          label: "Teaching Credits",
          min: 0
        },
        nonTeachingCredits: {
          type: "number",
          label: "Non-Teaching Credits",
          min: 0
        },
        status: {
          type: "select",
          options: [
            { label: "Underutilized", value: "underutilized" },
            { label: "Balanced", value: "balanced" },
            { label: "Overloaded", value: "overloaded" }
          ]
        },
        showBreakdown: {
          type: "radio",
          options: [
            { label: "Show Breakdown", value: true },
            { label: "Simple View", value: false }
          ]
        }
      },
      defaultProps: {
        totalCredits: 20,
        maxCredits: 30,
        teachingCredits: 15,
        nonTeachingCredits: 5,
        utilization: 67,
        status: "balanced",
        showBreakdown: true
      },
      render: ({ totalCredits, maxCredits, teachingCredits, nonTeachingCredits, status, showBreakdown }: WorkloadIndicatorProps) => {
        const utilization = (totalCredits / maxCredits) * 100

        return (
          <div className="workload-indicator p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Workload Status</h3>
            </div>

            <div className="space-y-3">
              {/* Main Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Utilization</span>
                  <span className="font-medium">{Math.round(utilization)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      status === 'overloaded' ? 'bg-red-500' : 
                      status === 'balanced' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalCredits}h of {maxCredits}h maximum
                </div>
              </div>

              {/* Breakdown */}
              {showBreakdown && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Credit Breakdown</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="text-blue-600 font-medium">Teaching</div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>{teachingCredits}h</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-purple-600 font-medium">Non-Teaching</div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span>{nonTeachingCredits}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                status === 'overloaded' ? 'bg-red-100 text-red-700' :
                status === 'balanced' ? 'bg-green-100 text-green-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {status === 'overloaded' ? <AlertTriangle className="h-3 w-3" /> :
                 status === 'balanced' ? <CheckCircle className="h-3 w-3" /> :
                 <Target className="h-3 w-3" />}
                <span className="capitalize">{status}</span>
              </div>
            </div>
          </div>
        )
      }
    },

    AllotmentSummary: {
      fields: {
        totalFaculty: {
          type: "number",
          label: "Total Faculty",
          min: 0
        },
        totalSubjects: {
          type: "number",
          label: "Total Subjects",
          min: 0
        },
        unassignedSubjects: {
          type: "number",
          label: "Unassigned Subjects",
          min: 0
        },
        overloadedFaculty: {
          type: "number",
          label: "Overloaded Faculty",
          min: 0
        },
        balancedFaculty: {
          type: "number",
          label: "Balanced Faculty",
          min: 0
        },
        underutilizedFaculty: {
          type: "number",
          label: "Underutilized Faculty",
          min: 0
        },
        totalCredits: {
          type: "number",
          label: "Total Credits",
          min: 0
        },
        averageWorkload: {
          type: "number",
          label: "Average Workload",
          min: 0
        }
      },
      defaultProps: {
        totalFaculty: 15,
        totalSubjects: 45,
        unassignedSubjects: 8,
        overloadedFaculty: 2,
        balancedFaculty: 10,
        underutilizedFaculty: 3,
        totalCredits: 360,
        averageWorkload: 24
      },
      render: ({ totalFaculty, totalSubjects, unassignedSubjects, overloadedFaculty, balancedFaculty, underutilizedFaculty, totalCredits, averageWorkload }: AllotmentSummaryProps) => (
        <div className="allotment-summary p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Allotment Summary</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalFaculty}</div>
              <div className="text-xs text-blue-700">Faculty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{totalSubjects}</div>
              <div className="text-xs text-indigo-700">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unassignedSubjects}</div>
              <div className="text-xs text-orange-700">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{averageWorkload}h</div>
              <div className="text-xs text-green-700">Avg Workload</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="text-sm text-blue-800 font-medium mb-2">Faculty Distribution</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded"></div>
                <span>{overloadedFaculty} Overloaded</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded"></div>
                <span>{balancedFaculty} Balanced</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                <span>{underutilizedFaculty} Under-utilized</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }
}

export default puckConfig