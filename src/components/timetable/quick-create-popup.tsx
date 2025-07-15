"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Clock, BookOpen, Star, History, Ban, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { autoSaveManager } from '@/lib/utils/auto-save'

interface QuickCreatePopupProps {
  isOpen: boolean
  onClose: () => void
  onCreateEvent: (data: {
    subjectId: string
    facultyId: string
    date: Date
    timeSlot: string
  }) => void
  position: { x: number; y: number }
  date: Date
  timeSlot: string
  batchId: string
  dayOfWeek: string
  subjects: Array<{
    id: string
    name: string
    code: string
    credits: number
    facultyId: string
    facultyName: string
  }>
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
}

interface SubjectOption {
  id: string
  name: string
  code: string
  credits: number
  facultyId: string
  facultyName: string
}

interface FilteredSubject extends SubjectOption {
  isAvailable: boolean
  conflictReason?: string
}

export function QuickCreatePopup({
  isOpen,
  onClose,
  onCreateEvent,
  position,
  date,
  timeSlot,
  batchId,
  dayOfWeek,
  subjects,
  onCheckConflicts
}: QuickCreatePopupProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const [filteredSubjects, setFilteredSubjects] = useState<FilteredSubject[]>([])
  const [showUnavailable, setShowUnavailable] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Check conflicts for all subjects when popup opens
  useEffect(() => {
    if (!isOpen || !onCheckConflicts || subjects.length === 0) {
      const defaultFiltered = subjects.map(subject => ({
        ...subject,
        isAvailable: true
      }))
      setFilteredSubjects(defaultFiltered)
      return
    }

    const checkAllConflicts = async () => {
      setIsCheckingConflicts(true)
      
      try {
        const conflictResults = await Promise.all(
          subjects.map(async (subject) => {
            try {
              const hasConflict = await onCheckConflicts(subject.facultyId, dayOfWeek, timeSlot)
              return {
                ...subject,
                isAvailable: !hasConflict,
                conflictReason: hasConflict ? `${subject.facultyName} is teaching another class at this time` : undefined
              }
            } catch (error) {
              console.error(`Error checking conflicts for ${subject.name}:`, error)
              return {
                ...subject,
                isAvailable: true // Default to available if check fails
              }
            }
          })
        )
        
        setFilteredSubjects(conflictResults)
      } catch (error) {
        console.error('Error checking conflicts:', error)
        // Fallback to showing all subjects as available
        const fallbackFiltered = subjects.map(subject => ({
          ...subject,
          isAvailable: true
        }))
        setFilteredSubjects(fallbackFiltered)
      } finally {
        setIsCheckingConflicts(false)
      }
    }

    checkAllConflicts()
  }, [isOpen, subjects, onCheckConflicts, dayOfWeek, timeSlot])

  // Sort subjects with recently used at the top, separated by availability
  const sortedSubjects = React.useMemo(() => {
    const recentSubjectIds = autoSaveManager.getRecentSubjects()
    
    const available = filteredSubjects.filter(subject => subject.isAvailable)
    const unavailable = filteredSubjects.filter(subject => !subject.isAvailable)
    
    const sortByRecency = (subjects: FilteredSubject[]) => {
      const recent = subjects.filter(subject => recentSubjectIds.includes(subject.id))
        .sort((a, b) => recentSubjectIds.indexOf(a.id) - recentSubjectIds.indexOf(b.id))
      
      const remaining = subjects.filter(subject => !recentSubjectIds.includes(subject.id))
        .sort((a, b) => a.name.localeCompare(b.name))
      
      return [...recent, ...remaining]
    }
    
    return {
      available: sortByRecency(available),
      unavailable: sortByRecency(unavailable)
    }
  }, [filteredSubjects])

  // Position the popup near the cursor but keep it in viewport
  const getPopupStyle = () => {
    const popupWidth = 320
    const popupHeight = 380
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let x = position.x + 10 // Small offset from cursor
    let y = position.y + 10
    
    // Adjust horizontal position if popup would go off-screen
    if (x + popupWidth > viewportWidth) {
      x = position.x - popupWidth - 10 // Show to the left of cursor
    }
    
    // Adjust vertical position if popup would go off-screen
    if (y + popupHeight > viewportHeight) {
      y = position.y - popupHeight - 10 // Show above cursor
    }
    
    // Ensure minimum distance from edges
    x = Math.max(10, x)
    y = Math.max(10, y)
    
    return {
      position: 'fixed' as const,
      left: x,
      top: y,
      width: popupWidth,
      zIndex: 1000
    }
  }

  // Handle subject selection - now directly creates the class
  const handleSubjectSelect = React.useCallback((subject: FilteredSubject) => {
    if (!subject.facultyId) {
      console.error('Cannot create class: Subject has no faculty assigned')
      return
    }
    
    if (!subject.isAvailable) {
      console.error('Cannot create class: Subject is not available due to conflicts')
      return
    }
    
    onCreateEvent({
      subjectId: subject.id,
      facultyId: subject.facultyId,
      date,
      timeSlot
    })
    
    // Auto-save recent subject and session data
    autoSaveManager.addRecentSubject(subject.id)
    autoSaveManager.saveQuickCreateSession({
      subjectId: subject.id,
      timeSlot,
      day: date.toISOString().split('T')[0], // Use date string as day identifier
      timestamp: Date.now()
    })
    
    // Store default preferences if this is a frequent pattern
    const sessions = autoSaveManager.getQuickCreateSessions()
    const timeSlotCount = sessions.filter(s => s.timeSlot === timeSlot).length
    
    // Auto-save preferences if patterns are detected
    if (timeSlotCount >= 3 && !autoSaveManager.getDefaultTimeSlot()) {
      autoSaveManager.setDefaultTimeSlot(timeSlot)
    }
    
    onClose()
  }, [onCreateEvent, date, timeSlot, onClose])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < sortedSubjects.available.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : sortedSubjects.available.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (sortedSubjects.available.length > 0) {
            handleSubjectSelect(sortedSubjects.available[highlightedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, sortedSubjects.available, highlightedIndex, onClose, handleSubjectSelect])

  // Reset selection when popup opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0)
    }
  }, [isOpen])


  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        ref={popupRef}
        className="pointer-events-auto"
        style={getPopupStyle()}
      >
        <Card className="shadow-xl border-2 animate-in fade-in-0 zoom-in-95 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Quick Add Class</CardTitle>
                {isCheckingConflicts ? (
                  <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                ) : autoSaveManager.getRecentSubjects().length > 0 ? (
                  <div title="Recent subjects loaded">
                    <History className="h-3 w-3 text-blue-500" />
                  </div>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{timeSlot}</span>
              <span>•</span>
              <span>{date.toLocaleDateString()}</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Select Subject & Faculty
                    </Label>
                    {!isCheckingConflicts && (
                      <div className="text-xs text-muted-foreground">
                        {sortedSubjects.available.length} available{sortedSubjects.unavailable.length > 0 && `, ${sortedSubjects.unavailable.length} filtered`}
                      </div>
                    )}
                  </div>
                  
                  {/* Subject List */}
                  <div className="mt-2 border rounded-md max-h-64 overflow-y-auto">
                    {isCheckingConflicts ? (
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Checking availability...</span>
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : sortedSubjects.available.length === 0 && sortedSubjects.unavailable.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="text-sm">No subjects found for this batch</div>
                        <div className="text-xs mt-1">Please add subjects to this batch first</div>
                      </div>
                    ) : sortedSubjects.available.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Ban className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                        <div className="text-sm font-medium">No subjects available</div>
                        <div className="text-xs mt-1">All subjects have conflicts at this time</div>
                        {sortedSubjects.unavailable.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowUnavailable(true)}
                            className="mt-2 text-xs"
                          >
                            Show conflicts ({sortedSubjects.unavailable.length})
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Available Subjects */}
                        {sortedSubjects.available.map((subject, index) => {
                          const isRecent = autoSaveManager.getRecentSubjects().includes(subject.id)
                          const recentIndex = autoSaveManager.getRecentSubjects().indexOf(subject.id)
                          
                          return (
                            <div
                              key={subject.id}
                              className={cn(
                                "p-2 cursor-pointer border-b transition-colors",
                                index === highlightedIndex ? "bg-primary/20" : "hover:bg-muted/70",
                                isRecent && "bg-blue-50/50 border-blue-200/50"
                              )}
                              onClick={() => handleSubjectSelect(subject)}
                            >
                              <div className="flex items-center gap-2">
                                {isRecent ? (
                                  <Star className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <BookOpen className="h-3 w-3 text-green-600 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm leading-tight flex items-center gap-2">
                                    {subject.name}
                                    {isRecent && recentIndex === 0 && (
                                      <span className="text-xs text-blue-600 font-medium">Recent</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {subject.facultyName}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Unavailable Subjects - Collapsible */}
                        {sortedSubjects.unavailable.length > 0 && (
                          <>
                            <div className="border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUnavailable(!showUnavailable)}
                                className="w-full justify-between p-2 h-auto border-b-0 rounded-none"
                              >
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Ban className="h-3 w-3" />
                                  <span>Unavailable ({sortedSubjects.unavailable.length})</span>
                                </div>
                                <span className="text-xs">{showUnavailable ? '▼' : '▶'}</span>
                              </Button>
                            </div>
                            
                            {showUnavailable && (
                              <div className="bg-muted/30">
                                {sortedSubjects.unavailable.map((subject) => (
                                  <div
                                    key={subject.id}
                                    className="p-2 border-b last:border-b-0 opacity-60"
                                    title={subject.conflictReason}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Ban className="h-3 w-3 text-red-500 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-sm leading-tight line-through">
                                          {subject.name}
                                        </div>
                                        <div className="text-xs text-red-600">
                                          {subject.conflictReason}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
                  {isCheckingConflicts ? (
                    "🔍 Filtering subjects based on availability..."
                  ) : sortedSubjects.available.length > 0 ? (
                    "💡 Click any subject to add instantly • Use ↑↓ arrows + Enter • ESC to cancel"
                  ) : (
                    "⚠️ No subjects available at this time slot"
                  )}
                </div>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}