'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  Clock,
  Server,
  Settings,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

interface DatabaseHealth {
  status: 'healthy' | 'unhealthy' | 'error'
  timestamp: string
  connectionPool: {
    poolSize: number
    maxConnections: number
    activeConnections: number
    availableClients: number
    connectionTimeout: number
    efficiency: number
    utilization: number
  }
  performance: {
    queryTime?: number
    status: 'excellent' | 'good' | 'slow' | 'failed'
    error?: string
  }
  environment: {
    nodeEnv: string
    databaseUrl: string
    poolSize: string
    maxConnections: string
    connectionTimeout: string
  }
}

async function fetchDatabaseHealth(): Promise<DatabaseHealth> {
  const response = await fetch('/api/admin/database/health')
  if (!response.ok) {
    throw new Error('Failed to fetch database health')
  }
  return response.json()
}

async function performDatabaseAction(action: string) {
  const response = await fetch('/api/admin/database/health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
  
  if (!response.ok) {
    throw new Error('Failed to perform database action')
  }
  
  return response.json()
}

export function DatabaseStatus() {
  const queryClient = useQueryClient()
  
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['database-health'],
    queryFn: fetchDatabaseHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
  })

  const refreshPoolMutation = useMutation({
    mutationFn: () => performDatabaseAction('refresh_pool'),
    onSuccess: () => {
      toast.success('Connection pool refreshed successfully')
      queryClient.invalidateQueries({ queryKey: ['database-health'] })
    },
    onError: (error) => {
      toast.error(`Failed to refresh pool: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  const healthCheckMutation = useMutation({
    mutationFn: () => performDatabaseAction('health_check'),
    onSuccess: (data) => {
      toast.success(`Health check completed - ${data.healthy ? 'Healthy' : 'Issues detected'}`)
      queryClient.invalidateQueries({ queryKey: ['database-health'] })
    },
    onError: (error) => {
      toast.error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'slow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'unhealthy':
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getPerformanceIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Zap className="h-4 w-4 text-green-500" />
      case 'good':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'slow':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Database Status - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load database health information: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection Pool
              </CardTitle>
              <CardDescription>
                Real-time connection pool monitoring and management
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {health && (
                <Badge className={getStatusColor(health.status)}>
                  {health.status === 'healthy' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {health.status.toUpperCase()}
                </Badge>
              )}
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        {health && (
          <CardContent className="space-y-6">
            {/* Connection Pool Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{health.connectionPool.poolSize}</div>
                <div className="text-xs text-muted-foreground">Pool Size</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{health.connectionPool.activeConnections}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{health.connectionPool.utilization}%</div>
                <div className="text-xs text-muted-foreground">Utilization</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{health.connectionPool.efficiency}%</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>

            {/* Pool Utilization Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Connection Pool Utilization</span>
                <span>{health.connectionPool.utilization}%</span>
              </div>
              <Progress value={health.connectionPool.utilization} className="h-2" />
            </div>

            {/* Performance Status */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getPerformanceIcon(health.performance.status)}
                <div>
                  <div className="font-medium">Query Performance</div>
                  <div className="text-sm text-muted-foreground">
                    {health.performance.queryTime ? 
                      `${health.performance.queryTime}ms average` : 
                      health.performance.error || 'No data'
                    }
                  </div>
                </div>
              </div>
              <Badge className={getStatusColor(health.performance.status)}>
                {health.performance.status.toUpperCase()}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => healthCheckMutation.mutate()}
                variant="outline"
                size="sm"
                disabled={healthCheckMutation.isPending}
              >
                <Activity className="h-4 w-4 mr-2" />
                {healthCheckMutation.isPending ? 'Checking...' : 'Run Health Check'}
              </Button>
              
              <Button
                onClick={() => refreshPoolMutation.mutate()}
                variant="outline"
                size="sm"
                disabled={refreshPoolMutation.isPending}
              >
                <Server className="h-4 w-4 mr-2" />
                {refreshPoolMutation.isPending ? 'Refreshing...' : 'Refresh Pool'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Environment Details */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Environment:</span>
                <span className="ml-2 font-mono">{health.environment.nodeEnv}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Database:</span>
                <span className="ml-2 font-mono">{health.environment.databaseUrl}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pool Size:</span>
                <span className="ml-2 font-mono">{health.environment.poolSize}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Connections:</span>
                <span className="ml-2 font-mono">{health.environment.maxConnections}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timeout:</span>
                <span className="ml-2 font-mono">{health.environment.connectionTimeout}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2 font-mono">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}