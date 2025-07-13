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
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { CalendarEvent } from '@/types/timetable'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (dontAskAgain: boolean) => void
  event: CalendarEvent | null
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  event,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  const [dontAskAgain, setDontAskAgain] = React.useState(false)
  
  if (!event) return null

  const handleConfirm = () => {
    onConfirm(dontAskAgain)
    onClose()
  }

  // Reset the checkbox when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setDontAskAgain(false)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Class</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this class? This action cannot be undone.
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
          {event.extendedProps?.credits && (
            <div className="text-sm text-muted-foreground">
              <strong>Credits:</strong> {event.extendedProps.credits}
            </div>
          )}
        </div>

        {/* Don't ask again checkbox */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="dont-ask-again"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            disabled={isDeleting}
          />
          <label
            htmlFor="dont-ask-again"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Don't ask again this session
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Class
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}