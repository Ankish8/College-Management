"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  UserPreferences, 
  UseUserPreferencesResult, 
  UpdatePreferencesRequest,
  PageType,
  ViewMode,
  DEFAULT_PREFERENCES,
  PreferencesResponse
} from "@/types/preferences"

export function useUserPreferences(): UseUserPreferencesResult {
  const { data: session, status } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/user/preferences", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status}`)
      }

      const data: PreferencesResponse = await response.json()
      
      setPreferences({
        viewModes: data.viewModes,
        updatedAt: new Date(data.updatedAt),
      })
    } catch (err) {
      console.error("Error fetching preferences:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch preferences")
      
      // Fallback to default preferences
      setPreferences({
        viewModes: DEFAULT_PREFERENCES,
        updatedAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }, [session?.user, status])

  // Update preferences via API
  const updatePreferences = useCallback(async (updates: UpdatePreferencesRequest) => {
    if (status !== "authenticated" || !session?.user) {
      throw new Error("Not authenticated")
    }

    try {
      setError(null)
      
      // Optimistic update
      if (preferences && updates.viewModes) {
        setPreferences(prev => prev ? {
          ...prev,
          viewModes: {
            ...prev.viewModes,
            ...updates.viewModes,
          },
          updatedAt: new Date(),
        } : null)
      }

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`)
      }

      const data: PreferencesResponse = await response.json()
      
      setPreferences({
        viewModes: data.viewModes,
        updatedAt: new Date(data.updatedAt),
      })
    } catch (err) {
      console.error("Error updating preferences:", err)
      setError(err instanceof Error ? err.message : "Failed to update preferences")
      
      // Revert optimistic update by fetching fresh data
      await fetchPreferences()
    }
  }, [session?.user, status, preferences, fetchPreferences])

  // Update single view mode preference
  const updateViewMode = useCallback(async (page: PageType, viewMode: ViewMode) => {
    if (status !== "authenticated" || !session?.user) {
      throw new Error("Not authenticated")
    }

    try {
      setError(null)
      
      // Optimistic update
      if (preferences) {
        setPreferences(prev => prev ? {
          ...prev,
          viewModes: {
            ...prev.viewModes,
            [page]: viewMode,
          },
          updatedAt: new Date(),
        } : null)
      }

      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ page, viewMode }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update view mode: ${response.status}`)
      }

      const data: PreferencesResponse = await response.json()
      
      setPreferences({
        viewModes: data.viewModes,
        updatedAt: new Date(data.updatedAt),
      })
    } catch (err) {
      console.error("Error updating view mode:", err)
      setError(err instanceof Error ? err.message : "Failed to update view mode")
      
      // Revert optimistic update by fetching fresh data
      await fetchPreferences()
    }
  }, [session?.user, status, preferences, fetchPreferences])

  // Refresh preferences
  const refresh = useCallback(async () => {
    await fetchPreferences()
  }, [fetchPreferences])

  // Load preferences on mount and when session changes
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateViewMode,
    refresh,
  }
}