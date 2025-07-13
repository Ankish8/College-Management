import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'

// WebSocket connection types
interface RealtimeMessage {
  type: 'ping' | 'pong' | 'update' | 'conflict' | 'notification' | 'user_activity'
  payload?: any
  timestamp: number
  userId?: string
  sessionId?: string
}

interface RealtimeConfig {
  url: string
  reconnectDelay: number
  maxReconnectAttempts: number
  heartbeatInterval: number
}

interface TimetableUpdate {
  action: 'create' | 'update' | 'delete'
  entry: any
  batchId: string
  conflicts?: any[]
}

interface AttendanceUpdate {
  action: 'start_session' | 'mark_attendance' | 'end_session'
  sessionId: string
  batchId: string
  subjectId: string
  updates?: any[]
}

interface UserActivity {
  userId: string
  userName: string
  action: string
  resource: string
  timestamp: number
}

// WebSocket connection class
class RealtimeConnection {
  private ws: WebSocket | null = null
  private config: RealtimeConfig
  private reconnectAttempts = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected'

  constructor(config: RealtimeConfig) {
    this.config = config
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState = 'connecting'
        const wsUrl = `${this.config.url}?token=${token}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.connectionState = 'connected'
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.connectionState = 'disconnected'
          this.stopHeartbeat()
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect(token)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.connectionState = 'error'
          reject(error)
        }

      } catch (error) {
        this.connectionState = 'error'
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this.connectionState = 'disconnected'
  }

  send(message: RealtimeMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(eventType)
      if (typeListeners) {
        typeListeners.delete(callback)
        if (typeListeners.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  getConnectionState(): string {
    return this.connectionState
  }

  private handleMessage(message: RealtimeMessage): void {
    const { type, payload } = message

    // Handle system messages
    switch (type) {
      case 'ping':
        this.send({ type: 'pong', timestamp: Date.now() })
        break
        
      case 'pong':
        // Heartbeat response received
        break
        
      default:
        // Notify subscribers
        const listeners = this.listeners.get(type)
        if (listeners) {
          listeners.forEach(callback => callback(payload))
        }
        break
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() })
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(token: string): void {
    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(token).catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// Singleton connection instance
let realtimeConnection: RealtimeConnection | null = null

// React hook for realtime features
export function useRealtime(token?: string) {
  const queryClient = useQueryClient()
  const { 
    setOnlineStatus, 
    addConnectedUser, 
    removeConnectedUser,
    addConflict,
    updateLastSync 
  } = useAppStore()
  
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef<RealtimeConnection | null>(null)

  // Initialize connection
  const connect = useCallback(async () => {
    if (!token || connectionRef.current) return

    try {
      setOnlineStatus('connecting')
      
      const config: RealtimeConfig = {
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
        reconnectDelay: 1000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000,
      }

      realtimeConnection = new RealtimeConnection(config)
      connectionRef.current = realtimeConnection

      await realtimeConnection.connect(token)
      setIsConnected(true)
      setOnlineStatus('online')
      updateLastSync()

    } catch (error) {
      console.error('Failed to connect to realtime service:', error)
      setOnlineStatus('offline')
      setIsConnected(false)
    }
  }, [token, setOnlineStatus, updateLastSync])

  // Disconnect
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.disconnect()
      connectionRef.current = null
      realtimeConnection = null
      setIsConnected(false)
      setOnlineStatus('offline')
    }
  }, [setOnlineStatus])

  // Subscribe to timetable updates
  const subscribeTimetableUpdates = useCallback(() => {
    if (!connectionRef.current) return

    return connectionRef.current.subscribe('timetable_update', (data: TimetableUpdate) => {
      console.log('Timetable update received:', data)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      queryClient.invalidateQueries({ queryKey: ['conflicts'] })
      
      // Handle conflicts
      if (data.conflicts && data.conflicts.length > 0) {
        data.conflicts.forEach(conflict => addConflict(conflict))
        
        toast.warning('Timetable Conflicts Detected', {
          description: `${data.conflicts.length} conflict(s) found in the timetable`,
          duration: 5000,
        })
      }
      
      // Show update notification
      if (data.action === 'create') {
        toast.success('New timetable entry added')
      } else if (data.action === 'update') {
        toast.info('Timetable entry updated')
      } else if (data.action === 'delete') {
        toast.info('Timetable entry removed')
      }
    })
  }, [queryClient, addConflict])

  // Subscribe to attendance updates
  const subscribeAttendanceUpdates = useCallback(() => {
    if (!connectionRef.current) return

    return connectionRef.current.subscribe('attendance_update', (data: AttendanceUpdate) => {
      console.log('Attendance update received:', data)
      
      // Invalidate attendance queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] })
      
      // Show notifications
      if (data.action === 'start_session') {
        toast.info('Attendance session started')
      } else if (data.action === 'end_session') {
        toast.success('Attendance session completed')
      }
    })
  }, [queryClient])

  // Subscribe to user activity
  const subscribeUserActivity = useCallback(() => {
    if (!connectionRef.current) return

    return connectionRef.current.subscribe('user_activity', (data: UserActivity) => {
      console.log('User activity:', data)
      
      // Update connected users list
      addConnectedUser(data.userId)
      
      // Show activity notifications for important actions
      const importantActions = ['delete_batch', 'create_subject', 'mark_attendance']
      if (importantActions.includes(data.action)) {
        toast.info(`${data.userName} ${data.action.replace('_', ' ')}`)
      }
    })
  }, [addConnectedUser])

  // Send message
  const sendMessage = useCallback((message: Omit<RealtimeMessage, 'timestamp'>) => {
    if (connectionRef.current) {
      return connectionRef.current.send({
        ...message,
        timestamp: Date.now()
      })
    }
    return false
  }, [])

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (token) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [token, connect, disconnect])

  // Effect to set up subscriptions
  useEffect(() => {
    if (!isConnected) return

    const unsubscribers: (() => void)[] = []

    // Set up all subscriptions
    unsubscribers.push(subscribeTimetableUpdates())
    unsubscribers.push(subscribeAttendanceUpdates())
    unsubscribers.push(subscribeUserActivity())

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe?.())
    }
  }, [isConnected, subscribeTimetableUpdates, subscribeAttendanceUpdates, subscribeUserActivity])

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    connectionState: connectionRef.current?.getConnectionState() || 'disconnected'
  }
}

// Hook for broadcasting user activity
export function useActivityBroadcast() {
  const { sendMessage } = useRealtime()

  const broadcastActivity = useCallback((action: string, resource: string) => {
    sendMessage({
      type: 'user_activity',
      payload: {
        action,
        resource,
        timestamp: Date.now()
      }
    })
  }, [sendMessage])

  return { broadcastActivity }
}

// Hook for collaborative editing
export function useCollaborativeEditing(resourceId: string, resourceType: string) {
  const queryClient = useQueryClient()
  const { sendMessage } = useRealtime()
  const [collaborators, setCollaborators] = useState<string[]>([])

  const joinSession = useCallback(() => {
    sendMessage({
      type: 'join_editing_session',
      payload: { resourceId, resourceType }
    })
  }, [sendMessage, resourceId, resourceType])

  const leaveSession = useCallback(() => {
    sendMessage({
      type: 'leave_editing_session',
      payload: { resourceId, resourceType }
    })
  }, [sendMessage, resourceId, resourceType])

  const broadcastChange = useCallback((change: any) => {
    sendMessage({
      type: 'collaborative_change',
      payload: { resourceId, resourceType, change }
    })
  }, [sendMessage, resourceId, resourceType])

  return {
    collaborators,
    joinSession,
    leaveSession,
    broadcastChange
  }
}

// Export connection instance for direct access
export { realtimeConnection }