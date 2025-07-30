import { useState, useEffect } from "react"

export type ViewMode = "grid" | "list"

export function useViewMode(storageKey: string = "viewMode") {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === "grid" || stored === "list") {
      setViewMode(stored)
    }
  }, [storageKey])

  const setMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(storageKey, mode)
  }

  return { viewMode, setViewMode: setMode }
}