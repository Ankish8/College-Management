import { User, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Student, AttendanceStatus } from '@/types/attendance'

interface StudentInfoCardProps {
  student: Student & {
    attendancePercentage?: number
    recentStatus?: { date: string; status: AttendanceStatus }[]
    trend?: 'improving' | 'declining' | 'stable'
    currentStatus?: AttendanceStatus
    todayAttendance?: { sessionId: string; status: AttendanceStatus }[]
  }
  isSelected?: boolean
  onClick?: () => void
  showFullInfo?: boolean
  showQuickActions?: boolean
  onQuickAction?: (studentId: string, action: AttendanceStatus) => void
}

export function StudentInfoCard({ 
  student, 
  isSelected, 
  onClick, 
  showFullInfo = true, 
  showQuickActions = true,
  onQuickAction 
}: StudentInfoCardProps) {
  const [actionFeedback, setActionFeedback] = useState<{ action: AttendanceStatus; timestamp: number } | null>(null)
  const getTrendIcon = () => {
    switch (student.trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'declining': return <TrendingDown className="h-3 w-3 text-red-600" />
      default: return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />
      case 'medical': return <Heart className="h-4 w-4 text-blue-600" />
    }
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 75) return 'text-amber-600'
    return 'text-red-600'
  }

  const handleQuickAction = (action: AttendanceStatus, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    onQuickAction?.(student.id, action)
    
    // Show feedback animation
    setActionFeedback({ action, timestamp: Date.now() })
    setTimeout(() => setActionFeedback(null), 2000)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Just trigger the main click action
    onClick?.()
  }

  const getSmartSuggestion = () => {
    if (!student.recentStatus || student.recentStatus.length === 0) {
      return { action: 'present' as AttendanceStatus, reason: 'New day - mark attendance' }
    }

    const recentDays = student.recentStatus.slice(0, 3)
    const absentCount = recentDays.filter(s => s.status === 'absent').length
    const presentCount = recentDays.filter(s => s.status === 'present').length

    if (absentCount >= 2) {
      return { action: 'present' as AttendanceStatus, reason: 'Been absent - encourage attendance' }
    }
    if (presentCount === 3) {
      return { action: 'present' as AttendanceStatus, reason: 'Great streak - keep it up!' }
    }
    if (student.attendancePercentage && student.attendancePercentage < 75) {
      return { action: 'present' as AttendanceStatus, reason: 'Below 75% - needs improvement' }
    }
    
    return { action: 'present' as AttendanceStatus, reason: 'Regular attendance expected' }
  }

  const suggestion = getSmartSuggestion()

  // Keyboard shortcuts - only when card is focused AND user is not typing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if this card is selected/focused
      if (!isSelected) return
      
      // Don't trigger if user is typing in an input field
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )) {
        return
      }
      
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handleQuickAction('present', e as any)
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault()
        handleQuickAction('absent', e as any)
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        handleQuickAction('medical', e as any)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isSelected])

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-md border cursor-pointer transition-all relative",
        isSelected 
          ? "bg-accent border-accent-foreground/20" 
          : "bg-card border-border hover:bg-accent/50"
      )}
      onClick={handleCardClick}
    >
      {/* Cleaner Single Row Layout */}
      <div className="flex items-center gap-3">
        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Student Info with integrated percentage */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm leading-tight truncate">{student.name}</h3>
            {student.attendancePercentage !== undefined && (
              <div className="flex items-center gap-1">
                <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", 
                  student.attendancePercentage >= 80 ? "bg-green-100 text-green-700" :
                  student.attendancePercentage >= 75 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {student.attendancePercentage}%
                </span>
                {student.trend && getTrendIcon()}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{student.studentId}</span>
        </div>

        {/* Quick Actions - Just Present/Absent */}
        {showFullInfo && showQuickActions && onQuickAction && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs px-3"
              onClick={(e) => handleQuickAction('present', e)}
            >
              <CheckCircle className="h-3 w-3 mr-1.5" />
              Present
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={(e) => handleQuickAction('absent', e)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Absent
            </Button>
          </div>
        )}
      </div>


      {/* Action Feedback Overlay - Minimal Toast */}
      {actionFeedback && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm rounded-md px-3 py-2 shadow-lg border z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            {getStatusIcon(actionFeedback.action)}
            <span className="text-sm font-medium">
              Marked {actionFeedback.action}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}