// View mode types
export type ViewMode = "cards" | "table"

// Page types for view mode preferences
export type PageType = "batches" | "students" | "faculty" | "subjects"

// View modes for all pages
export interface ViewModes {
  batches: ViewMode
  students: ViewMode
  faculty: ViewMode
  subjects: ViewMode
}

// User preferences structure
export interface UserPreferences {
  viewModes: ViewModes
  updatedAt: Date
}

// Request types for API
export interface UpdatePreferencesRequest {
  viewModes?: Partial<ViewModes>
}

// Response types from API
export interface PreferencesResponse {
  viewModes: ViewModes
  updatedAt: string
}

// Hook return type
export interface UseUserPreferencesResult {
  preferences: UserPreferences | null
  loading: boolean
  error: string | null
  updatePreferences: (updates: UpdatePreferencesRequest) => Promise<void>
  updateViewMode: (page: PageType, viewMode: ViewMode) => Promise<void>
  refresh: () => Promise<void>
}

// Default preferences - ALWAYS TABLE VIEW
export const DEFAULT_PREFERENCES: ViewModes = {
  batches: "table",
  students: "table", 
  faculty: "table",
  subjects: "table",
}