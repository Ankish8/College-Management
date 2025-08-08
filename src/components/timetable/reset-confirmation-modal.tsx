"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw, Eraser } from 'lucide-react'
import { CalendarEvent } from '@/types/timetable'

interface ResetConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  event: CalendarEvent | null
  scope: 'slot' | 'fullday'
  isResetting?: boolean
}

export function ResetConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  event,
  scope,
  isResetting = false
}: ResetConfirmationModalProps) {
  if (!event) return null

  const isSlotReset = scope === 'slot'
  const title = isSlotReset ? 'Reset Attendance - Time Slot' : 'Reset Attendance - Full Day'
  const description = isSlotReset 
    ? 'Are you sure you want to reset attendance for this time slot? This action cannot be undone.'
    : 'Are you sure you want to reset attendance for the entire day? This action cannot be undone.'
  
  const buttonText = isSlotReset ? 'Reset Time Slot' : 'Reset Full Day'
  const Icon = isSlotReset ? RotateCcw : Eraser

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Class Details */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="font-semibold text-sm">
            {event.extendedProps?.subjectName || event.extendedProps?.subjectCode}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Faculty:</strong> {event.extendedProps?.facultyName}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Time:</strong> {event.extendedProps?.timeSlotName}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Day:</strong> {event.extendedProps?.dayOfWeek}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Date:</strong> {new Date(event.start).toLocaleDateString()}
          </div>
          {event.extendedProps?.credits && (
            <div className="text-sm text-muted-foreground">
              <strong>Credits:</strong> {event.extendedProps.credits}
            </div>
          )}
        </div>

        {/* Reset scope warning */}
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 border border-orange-200">
          <strong>What will be reset:</strong>
          <p className="mt-1">
            {isSlotReset 
              ? 'Only the attendance for this specific time slot will be cleared. Other time slots on the same day will remain unchanged.'
              : 'All attendance data for this subject on this entire day will be permanently deleted.'
            }
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isResetting}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {isResetting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}