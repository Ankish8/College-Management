'use client'

import { useState, useEffect } from 'react'
import { useServiceWorker } from '@/lib/utils/service-worker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Trash2, 
  Settings,
  Cloud,
  Info
} from 'lucide-react'

interface ServiceWorkerStatusProps {
  className?: string
  showDetails?: boolean
}

export function ServiceWorkerStatus({ 
  className = "",
  showDetails = false 
}: ServiceWorkerStatusProps) {
  const {
    isSupported,
    isRegistered,
    isOnline,
    cacheSize,
    needsRefresh,
    refreshCacheSize,
    clearCache,
    forceRefresh,
    formatCacheSize
  } = useServiceWorker()

  // Prevent hydration mismatch by not rendering until client-side
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isSupported) {
    return null
  }

  return (
    <div className={className}>
      {/* Offline indicator */}
      {!isOnline && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            You're offline. Changes will sync when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Update available indicator */}
      {needsRefresh && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Download className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 flex items-center justify-between">
            <span>New version available!</span>
            <Button
              variant="outline"
              size="sm"
              onClick={forceRefresh}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Update
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection status in navigation/header */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={isOnline ? "secondary" : "destructive"} 
          className={`text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>

        {showDetails && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Offline & Sync Settings
                </DialogTitle>
                <DialogDescription>
                  Manage your offline experience and cached data
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                        Connection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        Cache Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm font-medium">
                        {formatCacheSize(cacheSize)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Service Worker Status */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Service Worker</p>
                    <p className="text-xs text-muted-foreground">
                      {isRegistered ? 'Active' : 'Not registered'}
                    </p>
                  </div>
                  <Badge variant={isRegistered ? "secondary" : "outline"}>
                    {isRegistered ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshCacheSize}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCache}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear Cache
                  </Button>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-700 mb-1">Offline Mode</p>
                    <p>
                      Critical app data is cached for offline access. Changes made offline will sync when connection is restored.
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Mini status component for header/navigation
export function ServiceWorkerStatusMini() {
  const { isOnline } = useServiceWorker()
  
  return (
    <ServiceWorkerStatus 
      showDetails={true}
      className="flex items-center"
    />
  )
}

// Full status component for settings page
export function ServiceWorkerStatusFull() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Offline & Background Sync
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ServiceWorkerStatus showDetails={true} />
      </CardContent>
    </Card>
  )
}