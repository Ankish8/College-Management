import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// UI State Types
interface UIState {
  sidebarOpen: boolean
  darkMode: boolean
  loading: Record<string, boolean>
  notifications: Notification[]
  modals: Record<string, boolean>
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Real-time State Types
interface RealtimeState {
  connectedUsers: string[]
  onlineStatus: 'online' | 'offline' | 'connecting'
  lastSync: Date | null
  pendingChanges: Record<string, any>
}

// Feature State Types
interface TimetableState {
  selectedBatch: string | null
  selectedWeek: Date
  viewMode: 'calendar' | 'traditional' | 'timeline'
  filters: {
    faculty: string[]
    subjects: string[]
    roomTypes: string[]
  }
  conflicts: Array<{
    id: string
    type: 'faculty' | 'room' | 'batch'
    severity: 'high' | 'medium' | 'low'
    message: string
  }>
}

interface AttendanceState {
  currentSession: string | null
  markingMode: 'manual' | 'bulk' | 'qr_code'
  selectedStudents: string[]
  sessionHistory: Array<{
    id: string
    date: Date
    batchId: string
    subjectId: string
    attendanceCount: number
  }>
}

// Combined Store State
interface AppStore {
  // UI State
  ui: UIState
  
  // Real-time State  
  realtime: RealtimeState
  
  // Feature States
  timetable: TimetableState
  attendance: AttendanceState
  
  // UI Actions
  toggleSidebar: () => void
  setLoading: (key: string, loading: boolean) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  openModal: (modalId: string) => void
  closeModal: (modalId: string) => void
  
  // Real-time Actions
  setOnlineStatus: (status: RealtimeState['onlineStatus']) => void
  addConnectedUser: (userId: string) => void
  removeConnectedUser: (userId: string) => void
  updateLastSync: () => void
  addPendingChange: (key: string, change: any) => void
  removePendingChange: (key: string) => void
  
  // Timetable Actions
  setSelectedBatch: (batchId: string | null) => void
  setSelectedWeek: (date: Date) => void
  setViewMode: (mode: TimetableState['viewMode']) => void
  updateFilters: (filters: Partial<TimetableState['filters']>) => void
  addConflict: (conflict: TimetableState['conflicts'][0]) => void
  removeConflict: (conflictId: string) => void
  clearConflicts: () => void
  
  // Attendance Actions
  setCurrentSession: (sessionId: string | null) => void
  setMarkingMode: (mode: AttendanceState['markingMode']) => void
  toggleStudentSelection: (studentId: string) => void
  clearSelectedStudents: () => void
  addSessionToHistory: (session: AttendanceState['sessionHistory'][0]) => void
  
  // Bulk Actions
  resetTimetableState: () => void
  resetAttendanceState: () => void
  resetAllState: () => void
}

// Default States
const defaultUIState: UIState = {
  sidebarOpen: true,
  darkMode: false,
  loading: {},
  notifications: [],
  modals: {}
}

const defaultRealtimeState: RealtimeState = {
  connectedUsers: [],
  onlineStatus: 'offline',
  lastSync: null,
  pendingChanges: {}
}

const defaultTimetableState: TimetableState = {
  selectedBatch: null,
  selectedWeek: new Date(),
  viewMode: 'calendar',
  filters: {
    faculty: [],
    subjects: [],
    roomTypes: []
  },
  conflicts: []
}

const defaultAttendanceState: AttendanceState = {
  currentSession: null,
  markingMode: 'manual',
  selectedStudents: [],
  sessionHistory: []
}

// Store Implementation with Immer for immutable updates
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        ui: defaultUIState,
        realtime: defaultRealtimeState,
        timetable: defaultTimetableState,
        attendance: defaultAttendanceState,
        
        // UI Actions
        toggleSidebar: () => set((state) => {
          state.ui.sidebarOpen = !state.ui.sidebarOpen
        }),
        
        setLoading: (key: string, loading: boolean) => set((state) => {
          if (loading) {
            state.ui.loading[key] = true
          } else {
            delete state.ui.loading[key]
          }
        }),
        
        addNotification: (notification) => set((state) => {
          state.ui.notifications.unshift({
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            timestamp: new Date(),
            read: false
          })
          
          // Keep only last 50 notifications
          if (state.ui.notifications.length > 50) {
            state.ui.notifications = state.ui.notifications.slice(0, 50)
          }
        }),
        
        removeNotification: (id: string) => set((state) => {
          state.ui.notifications = state.ui.notifications.filter(n => n.id !== id)
        }),
        
        openModal: (modalId: string) => set((state) => {
          state.ui.modals[modalId] = true
        }),
        
        closeModal: (modalId: string) => set((state) => {
          state.ui.modals[modalId] = false
        }),
        
        // Real-time Actions
        setOnlineStatus: (status) => set((state) => {
          state.realtime.onlineStatus = status
        }),
        
        addConnectedUser: (userId: string) => set((state) => {
          if (!state.realtime.connectedUsers.includes(userId)) {
            state.realtime.connectedUsers.push(userId)
          }
        }),
        
        removeConnectedUser: (userId: string) => set((state) => {
          state.realtime.connectedUsers = state.realtime.connectedUsers.filter(id => id !== userId)
        }),
        
        updateLastSync: () => set((state) => {
          state.realtime.lastSync = new Date()
        }),
        
        addPendingChange: (key: string, change: any) => set((state) => {
          state.realtime.pendingChanges[key] = change
        }),
        
        removePendingChange: (key: string) => set((state) => {
          delete state.realtime.pendingChanges[key]
        }),
        
        // Timetable Actions
        setSelectedBatch: (batchId) => set((state) => {
          state.timetable.selectedBatch = batchId
          // Clear conflicts when changing batch
          state.timetable.conflicts = []
        }),
        
        setSelectedWeek: (date) => set((state) => {
          state.timetable.selectedWeek = date
        }),
        
        setViewMode: (mode) => set((state) => {
          state.timetable.viewMode = mode
        }),
        
        updateFilters: (filters) => set((state) => {
          Object.assign(state.timetable.filters, filters)
        }),
        
        addConflict: (conflict) => set((state) => {
          state.timetable.conflicts.push(conflict)
        }),
        
        removeConflict: (conflictId) => set((state) => {
          state.timetable.conflicts = state.timetable.conflicts.filter(c => c.id !== conflictId)
        }),
        
        clearConflicts: () => set((state) => {
          state.timetable.conflicts = []
        }),
        
        // Attendance Actions
        setCurrentSession: (sessionId) => set((state) => {
          state.attendance.currentSession = sessionId
          if (!sessionId) {
            state.attendance.selectedStudents = []
          }
        }),
        
        setMarkingMode: (mode) => set((state) => {
          state.attendance.markingMode = mode
        }),
        
        toggleStudentSelection: (studentId) => set((state) => {
          const index = state.attendance.selectedStudents.indexOf(studentId)
          if (index === -1) {
            state.attendance.selectedStudents.push(studentId)
          } else {
            state.attendance.selectedStudents.splice(index, 1)
          }
        }),
        
        clearSelectedStudents: () => set((state) => {
          state.attendance.selectedStudents = []
        }),
        
        addSessionToHistory: (session) => set((state) => {
          state.attendance.sessionHistory.unshift(session)
          
          // Keep only last 100 sessions
          if (state.attendance.sessionHistory.length > 100) {
            state.attendance.sessionHistory = state.attendance.sessionHistory.slice(0, 100)
          }
        }),
        
        // Bulk Reset Actions
        resetTimetableState: () => set((state) => {
          state.timetable = defaultTimetableState
        }),
        
        resetAttendanceState: () => set((state) => {
          state.attendance = defaultAttendanceState
        }),
        
        resetAllState: () => set((state) => {
          state.timetable = defaultTimetableState
          state.attendance = defaultAttendanceState
          state.ui = { ...defaultUIState, darkMode: state.ui.darkMode } // Preserve theme
          state.realtime = defaultRealtimeState
        })
      })),
      {
        name: 'jlu-app-store',
        partialize: (state) => ({
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            darkMode: state.ui.darkMode
          },
          timetable: {
            viewMode: state.timetable.viewMode,
            filters: state.timetable.filters
          },
          attendance: {
            markingMode: state.attendance.markingMode
          }
        })
      }
    ),
    { name: 'app-store' }
  )
)

// Selector hooks for performance
export const useUIState = () => useAppStore(state => state.ui)
export const useRealtimeState = () => useAppStore(state => state.realtime)
export const useTimetableState = () => useAppStore(state => state.timetable)
export const useAttendanceState = () => useAppStore(state => state.attendance)
export const useNotifications = () => useAppStore(state => state.ui.notifications)
export const useLoading = (key?: string) => useAppStore(state => 
  key ? state.ui.loading[key] || false : Object.keys(state.ui.loading).length > 0
)