'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  AlertCircle,
  CheckCircle,
  Settings,
  Target,
  Timer
} from 'lucide-react'
import { toast } from 'sonner'

interface PerformanceData {
  overview: {
    totalQueries: number
    averageDuration: number
    slowQueries: number
    errorCount: number
    fastestQuery: number
    slowestQuery: number
    queryBreakdown: Record<string, {
      count: number
      totalDuration: number
      averageDuration: number
      errors: number
    }>
    timestamp: string
  }
  recentQueries: Array<{
    id: string
    operation: string
    query: string
    duration: number
    timestamp: string
    model?: string
    success: boolean
    error?: string
    recordCount?: number
  }>
  slowQueries: Array<{
    id: string
    operation: string
    query: string
    duration: number
    timestamp: string
    model?: string
    success: boolean
    error?: string
  }>
}

interface QueryTrend {
  timestamp: string
  count: number
  averageDuration: number
  totalDuration: number
  errors: number
}

async function fetchPerformanceData(timeWindow?: string): Promise<PerformanceData> {
  const params = new URLSearchParams()
  if (timeWindow) params.set('timeWindow', timeWindow)
  
  const response = await fetch(`/api/admin/performance?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch performance data')
  }
  
  const result = await response.json()
  return result.data
}

async function fetchQueryTrends(bucket: string = '300'): Promise<QueryTrend[]> {
  const response = await fetch(`/api/admin/performance?action=trends&bucket=${bucket}`)
  if (!response.ok) {
    throw new Error('Failed to fetch query trends')
  }
  
  const result = await response.json()
  return result.data
}

async function performAction(action: string) {
  const response = await fetch('/api/admin/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
  
  if (!response.ok) {
    throw new Error('Failed to perform action')
  }
  
  return response.json()
}

export function PerformanceDashboard() {
  const [timeWindow, setTimeWindow] = useState<string>('3600') // 1 hour default
  const [trendBucket, setTrendBucket] = useState<string>('300') // 5 minutes default
  const queryClient = useQueryClient()

  const { data: performanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['performance-data', timeWindow],
    queryFn: () => fetchPerformanceData(timeWindow),
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  })

  const { data: trends } = useQuery({
    queryKey: ['query-trends', trendBucket],
    queryFn: () => fetchQueryTrends(trendBucket),
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const clearMetricsMutation = useMutation({
    mutationFn: () => performAction('clear_metrics'),
    onSuccess: () => {
      toast.success('Performance metrics cleared')
      queryClient.invalidateQueries({ queryKey: ['performance-data'] })
    },
    onError: (error) => {
      toast.error(`Failed to clear metrics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  const testSlowQueryMutation = useMutation({
    mutationFn: () => performAction('test_slow_query'),
    onSuccess: () => {
      toast.success('Test slow query executed')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['performance-data'] })
      }, 2500)
    }
  })

  const testErrorQueryMutation = useMutation({
    mutationFn: () => performAction('test_error_query'),
    onSuccess: () => {
      toast.success('Test error query executed')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['performance-data'] })
      }, 1000)
    }
  })

  const getPerformanceStatus = (data: PerformanceData['overview']) => {
    const errorRate = data.totalQueries > 0 ? (data.errorCount / data.totalQueries) * 100 : 0
    const slowQueryRate = data.totalQueries > 0 ? (data.slowQueries / data.totalQueries) * 100 : 0
    
    if (errorRate > 5 || slowQueryRate > 10 || data.averageDuration > 1000) {
      return { status: 'poor', color: 'text-red-600', bg: 'bg-red-100' }
    } else if (errorRate > 2 || slowQueryRate > 5 || data.averageDuration > 500) {
      return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    } else {
      return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-100' }
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Performance Dashboard - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load performance data: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const performanceStatus = performanceData ? getPerformanceStatus(performanceData.overview) : null

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time database query monitoring and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="900">15 minutes</SelectItem>
              <SelectItem value="3600">1 hour</SelectItem>
              <SelectItem value="21600">6 hours</SelectItem>
              <SelectItem value="86400">24 hours</SelectItem>
            </SelectContent>
          </Select>
          
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

      {/* Overview Cards */}
      {performanceData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
                  <p className="text-2xl font-bold">{performanceData.overview.totalQueries}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(performanceData.overview.averageDuration)}</p>
                </div>
                <Timer className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Slow Queries</p>
                  <p className="text-2xl font-bold text-yellow-600">{performanceData.overview.slowQueries}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{performanceData.overview.errorCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Status */}
      {performanceData && performanceStatus && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {performanceStatus.status === 'excellent' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : performanceStatus.status === 'fair' ? (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className="font-semibold">Performance Status</p>
                  <p className={`text-sm ${performanceStatus.color}`}>
                    {performanceStatus.status.toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => testSlowQueryMutation.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={testSlowQueryMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Test Slow Query
                </Button>
                
                <Button
                  onClick={() => testErrorQueryMutation.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={testErrorQueryMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Test Error
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queries">Query Details</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {performanceData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Queries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {performanceData.recentQueries.map((query) => (
                        <div key={query.id} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">
                              {query.model || 'Unknown'}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Badge variant={query.success ? "default" : "destructive"} className="text-xs">
                                {formatDuration(query.duration)}
                              </Badge>
                              {query.success ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-medium truncate">{query.operation}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(query.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Slow Queries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Slow Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {performanceData.slowQueries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No slow queries detected! 🎉
                        </p>
                      ) : (
                        performanceData.slowQueries.map((query) => (
                          <div key={query.id} className="border border-yellow-200 rounded p-3 bg-yellow-50">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {query.model || 'Unknown'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                {formatDuration(query.duration)}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{query.operation}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(query.timestamp).toLocaleTimeString()}
                            </p>
                            {query.error && (
                              <p className="text-xs text-red-600 mt-1 truncate">{query.error}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => clearMetricsMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={clearMetricsMutation.isPending}
            >
              <Settings className="h-4 w-4 mr-2" />
              {clearMetricsMutation.isPending ? 'Clearing...' : 'Clear Metrics'}
            </Button>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          {/* Placeholder for detailed query list */}
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Detailed query analysis coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={trendBucket} onValueChange={setTrendBucket}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Bucket size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="900">15 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Placeholder for trend charts */}
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Performance trend charts coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          {performanceData && (
            <Card>
              <CardHeader>
                <CardTitle>Query Breakdown by Model & Operation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(performanceData.overview.queryBreakdown).map(([key, stats]) => (
                    <div key={key} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{key}</h4>
                        <Badge variant="outline">{stats.count} queries</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Avg Duration</p>
                          <p className="font-medium">{formatDuration(stats.averageDuration)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Time</p>
                          <p className="font-medium">{formatDuration(stats.totalDuration)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Errors</p>
                          <p className={`font-medium ${stats.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {stats.errors}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}