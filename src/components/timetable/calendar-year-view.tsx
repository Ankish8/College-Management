"use client"

import { CalendarEvent, CalendarView } from '@/types/timetable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { 
  format, 
  startOfYear, 
  endOfYear, 
  addMonths, 
  isSameMonth,
  isSameYear,
  isToday,
  getMonth
} from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarYearViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onMonthClick?: (date: Date) => void
  className?: string
  viewTitle?: string
  onPrevious?: () => void
  onNext?: () => void
  onToday?: () => void
  onViewChange?: (view: CalendarView) => void
  currentView?: CalendarView
  onFiltersToggle?: () => void
  showFilters?: boolean
}

export function CalendarYearView({
  date,
  events,
  onEventClick,
  onMonthClick,
  className,
  viewTitle,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  currentView,
  onFiltersToggle,
  showFilters
}: CalendarYearViewProps) {
  const yearStart = startOfYear(date)
  const yearEnd = endOfYear(date)

  // Generate all months in the year
  const months: Date[] = []
  let currentMonth = yearStart
  while (currentMonth <= yearEnd) {
    months.push(currentMonth)
    currentMonth = addMonths(currentMonth, 1)
  }

  const handleMonthClick = (monthDate: Date) => {
    if (onMonthClick) {
      onMonthClick(monthDate)
    }
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const MonthCard = ({ monthDate }: { monthDate: Date }) => {
    const monthEvents = events.filter(event => isSameMonth(event.start, monthDate))
    const totalCredits = monthEvents.reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)
    const currentMonth = isToday(monthDate) && isSameMonth(new Date(), monthDate)

    // Group events by entry type for quick overview
    const eventsByType = monthEvents.reduce((acc, event) => {
      const type = event.extendedProps?.entryType || 'REGULAR'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get unique subjects and faculty
    const uniqueSubjects = new Set(monthEvents.map(e => e.extendedProps?.subjectId)).size
    const uniqueFaculty = new Set(monthEvents.map(e => e.extendedProps?.facultyId)).size

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-lg hover:scale-105",
          currentMonth && "ring-2 ring-primary",
          monthEvents.length > 0 && "bg-accent/20"
        )}
        onClick={() => handleMonthClick(monthDate)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            {format(monthDate, 'MMM')}
            {monthEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {monthEvents.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {monthEvents.length > 0 ? (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{totalCredits}</div>
                  <div className="text-muted-foreground text-xs">Credits</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{uniqueSubjects}</div>
                  <div className="text-muted-foreground text-xs">Subjects</div>
                </div>
              </div>

              {/* Entry Types Distribution */}
              {Object.keys(eventsByType).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Class Types</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(eventsByType).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Events Preview */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Recent Classes</div>
                <div className="space-y-1 max-h-20 overflow-hidden">
                  {monthEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded bg-background cursor-pointer hover:bg-accent/50"
                      onClick={(e) => handleEventClick(event, e)}
                    >
                      <div className="font-medium truncate">
                        {event.extendedProps?.subjectName || event.extendedProps?.subjectCode}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {format(event.start, 'MMM d')} - {event.extendedProps?.facultyName}
                      </div>
                    </div>
                  ))}
                  {monthEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{monthEvents.length - 3} more classes
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-xs">No classes</div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const QuarterSection = ({ quarter, startMonth }: { quarter: string; startMonth: number }) => {
    const quarterMonths = months.slice(startMonth, startMonth + 3)
    const quarterEvents = events.filter(event => {
      const eventMonth = getMonth(event.start)
      return eventMonth >= startMonth && eventMonth < startMonth + 3
    })

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{quarter}</h3>
          <div className="text-sm text-muted-foreground">
            {quarterEvents.length} class{quarterEvents.length !== 1 ? 'es' : ''}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quarterMonths.map((monthDate) => (
            <MonthCard key={monthDate.toISOString()} monthDate={monthDate} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Integrated Header with Navigation */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title and Navigation */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {viewTitle || format(date, 'yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-8 px-2 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-lg border">
              {(['day', 'week', 'month', 'year'] as CalendarView[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange?.(view)}
                  className={cn(
                    "rounded-none first:rounded-l-lg last:rounded-r-lg h-8 px-2 text-xs",
                    "min-w-[30px]"
                  )}
                >
                  <span className="hidden sm:inline">
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </span>
                  <span className="sm:hidden">
                    {view.charAt(0).toUpperCase()}
                  </span>
                </Button>
              ))}
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={onFiltersToggle}
              className="h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
              <span className="sr-only">Toggle filters</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-muted-foreground">
            {events.filter(event => isSameYear(event.start, date)).length} total class{events.filter(event => isSameYear(event.start, date)).length !== 1 ? 'es' : ''} this year
          </p>
          
          {/* Year Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="font-medium text-lg">
                {events
                  .filter(event => isSameYear(event.start, date))
                  .reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)
                }
              </div>
              <div className="text-muted-foreground">Total Credits</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-lg">
                {months.filter(month => 
                  events.some(event => isSameMonth(event.start, month))
                ).length}
              </div>
              <div className="text-muted-foreground">Active Months</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-lg">
                {new Set(events
                  .filter(event => isSameYear(event.start, date))
                  .map(e => e.extendedProps?.subjectId)
                ).size}
              </div>
              <div className="text-muted-foreground">Subjects</div>
            </div>
          </div>
        </div>
      </div>

      {/* Year Calendar Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8">
          <QuarterSection quarter="Q1 (Jan - Mar)" startMonth={0} />
          <QuarterSection quarter="Q2 (Apr - Jun)" startMonth={3} />
          <QuarterSection quarter="Q3 (Jul - Sep)" startMonth={6} />
          <QuarterSection quarter="Q4 (Oct - Dec)" startMonth={9} />
        </div>
      </ScrollArea>

      {/* Year Summary */}
      {events.filter(event => isSameYear(event.start, date)).length === 0 && (
        <div className="flex-shrink-0 p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">No classes scheduled this year</p>
            <p className="text-sm">
              Click on any month to start adding classes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Calendar(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}