'use client'

import { useState, useEffect } from 'react'
import { useOfflineData } from '@/lib/utils/offline-data-manager'
import { useOfflineApi } from '@/lib/utils/offline-api-interceptor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Settings
} from 'lucide-react'

interface OfflineStatusProps {
  showDetails?: boolean
  className?: string
}

export function OfflineStatus({ showDetails = false, className = "" }: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncInProgress, setSyncInProgress] = useState(false)
  
  const { isInitialized, cacheStats, refreshCacheStats, cacheCriticalData, clearAllData } = useOfflineData()
  const { isInitialized: apiInitialized } = useOfflineApi()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (isInitialized && apiInitialized) {
        performAutoSync()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Set initial state
    setIsOnline(navigator.onLine)

    // Listen for connection changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Refresh stats periodically
    const statsInterval = setInterval(refreshCacheStats, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(statsInterval)
    }
  }, [isInitialized, apiInitialized, refreshCacheStats])

  const performAutoSync = async () => {
    if (!isOnline) return
    
    setSyncInProgress(true)
    try {
      await cacheCriticalData()
      setLastSync(new Date())
    } catch (error) {
      console.error('Auto sync failed:', error)
    } finally {
      setSyncInProgress(false)
    }
  }

  const formatCacheSize = (count: number) => {
    if (count === 0) return '0 items'
    if (count === 1) return '1 item'
    return `${count} items`
  }

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    return date.toLocaleDateString()
  }

  const getTotalCacheItems = () => {
    return cacheStats.criticalData + cacheStats.apiCache
  }

  const getOfflineReadiness = () => {
    const total = getTotalCacheItems()
    if (total >= 10) return { status: 'excellent', percentage: 100 }
    if (total >= 5) return { status: 'good', percentage: 75 }
    if (total >= 2) return { status: 'basic', percentage: 50 }
    return { status: 'poor', percentage: 25 }
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={isOnline ? "secondary" : "destructive"}
          className={`text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>

        {!isOnline && getTotalCacheItems() > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
            <Database className="h-3 w-3 mr-1" />
            {getTotalCacheItems()} cached
          </Badge>
        )}
      </div>
    )
  }

  const readiness = getOfflineReadiness()

  return (
    <div className={className}>
      {/* Offline Mode Alert */}
      {!isOnline && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            You're offline. Using cached data where available.
            {cacheStats.syncQueue > 0 && (
              <span className="block mt-1">
                {cacheStats.syncQueue} changes will sync when connection is restored.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Offline Data Management Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <Database className="h-4 w-4" />
            Offline Data
            {syncInProgress && <RefreshCw className="h-3 w-3 animate-spin" />}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Offline Data Management
            </DialogTitle>
            <DialogDescription>
              Manage your offline data cache and sync settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Connection Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <Badge variant={isOnline ? "secondary" : "destructive"}>
                {isOnline ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* Offline Readiness */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {readiness.status === 'excellent' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {readiness.status === 'good' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                  {readiness.status === 'basic' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  {readiness.status === 'poor' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  Offline Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={readiness.percentage} className="mb-2" />
                <p className="text-xs text-muted-foreground">
                  {readiness.status === 'excellent' && 'Excellent - Full offline functionality'}
                  {readiness.status === 'good' && 'Good - Most features available offline'}
                  {readiness.status === 'basic' && 'Basic - Limited offline functionality'}
                  {readiness.status === 'poor' && 'Poor - Minimal offline support'}
                </p>
              </CardContent>
            </Card>

            {/* Cache Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">Critical Data</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-bold">{formatCacheSize(cacheStats.criticalData)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">API Cache</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-bold">{formatCacheSize(cacheStats.apiCache)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">Sync Queue</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-bold">{formatCacheSize(cacheStats.syncQueue)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Last Sync Info */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Last Sync</p>
                  <p className="text-xs text-muted-foreground">
                    {formatLastSync(lastSync)}
                  </p>
                </div>
              </div>
              {syncInProgress && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setSyncInProgress(true)
                  try {
                    await cacheCriticalData()
                    setLastSync(new Date())
                    await refreshCacheStats()
                  } finally {
                    setSyncInProgress(false)
                  }
                }}
                disabled={syncInProgress || !isOnline}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-1" />
                Cache Data
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCacheStats}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await clearAllData()
                  setLastSync(null)
                }}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-700 mb-1">Offline Mode</p>
                <p>
                  Critical app data is automatically cached for offline use. 
                  Changes made offline will sync when connection is restored.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mini offline status for header/navigation
export function OfflineStatusMini({ className = "" }: { className?: string }) {
  return (
    <OfflineStatus showDetails={false} className={className} />
  )
}

// Full offline status for settings/admin pages
export function OfflineStatusFull({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Offline Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <OfflineStatus showDetails={true} />
      </CardContent>
    </Card>
  )
}