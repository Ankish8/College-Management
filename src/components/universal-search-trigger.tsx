"use client"

import { useState, useEffect } from 'react'
import { Search, Command } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UniversalSearch } from "./universal-search"
import { cn } from "@/lib/utils"

interface UniversalSearchTriggerProps {
  placeholder?: string
  className?: string
  variant?: "input" | "button"
}

export function UniversalSearchTrigger({ 
  placeholder = "Search students, subjects, batches...",
  className,
  variant = "input"
}: UniversalSearchTriggerProps) {
  const [open, setOpen] = useState(false)

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (variant === "button") {
    return (
      <>
        <Button
          variant="outline"
          className={cn("relative h-8 w-8 p-0 xl:h-8 xl:w-64 xl:justify-start xl:px-3 xl:py-2", className)}
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline-flex">{placeholder}</span>
          <span className="sr-only">Search</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <UniversalSearch open={open} onOpenChange={setOpen} placeholder={placeholder} />
      </>
    )
  }

  return (
    <>
      <div className={cn("relative flex-1 max-w-md", className)}>
        <button
          onClick={() => setOpen(true)}
          className="relative w-full flex items-center h-9 px-3 py-2 text-sm text-muted-foreground bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-text"
        >
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <span className="pl-6 truncate">{placeholder}</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </button>
      </div>
      <UniversalSearch open={open} onOpenChange={setOpen} placeholder={placeholder} />
    </>
  )
}