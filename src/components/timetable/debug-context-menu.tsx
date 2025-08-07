"use client"

import { CalendarEvent } from '@/types/timetable'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Info, Pencil, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DebugContextMenuProps {
  event: CalendarEvent
  children: React.ReactNode
}

export function DebugContextMenu({ event, children }: DebugContextMenuProps) {
  const { toast } = useToast()
  
  return (
    <div 
      style={{ 
        position: 'relative',
        isolation: 'isolate',
        zIndex: 1 
      }}
      onContextMenu={(e) => {
        console.log('🐛 DEBUG: Wrapper onContextMenu', e)
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger 
          asChild
          onContextMenu={(e) => {
            console.log('🐛 DEBUG: ContextMenuTrigger onContextMenu', e)
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              zIndex: 2
            }}
            onContextMenu={(e) => {
              console.log('🐛 DEBUG: Inner wrapper onContextMenu', e)
              e.stopPropagation()
            }}
          >
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56" style={{ zIndex: 999999 }}>
          <ContextMenuItem 
            onClick={() => {
              console.log('🐛 DEBUG: Debug menu item clicked')
              toast({
                title: "DEBUG: Context Menu Works!",
                description: `Event: ${event.title}`,
              })
            }}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            DEBUG: Menu Works!
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}