"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Download, 
  Upload, 
  Users, 
  Calendar,
  Database,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Target
} from 'lucide-react'
import { isAdmin } from '@/lib/utils/permissions'
import BulkOperationsTab from './bulk-operations/page'
import ImportExportTab from './import-export/page'
import FacultyWorkloadTab from './faculty-workload/page'
import AcademicCalendarTab from './academic-calendar/page'

export default function ManageTimetablePage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState("bulk-operations")

  // Check if user is admin
  const user = session?.user as any
  const isUserAdmin = user && isAdmin(user)

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only accessible to administrators.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Timetable</h1>
          <p className="text-muted-foreground">
            Comprehensive timetable management tools for bulk operations, import/export, and analytics
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/admin/timetable">
              <Calendar className="h-4 w-4 mr-2" />
              View Timetable
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/settings/timetable">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty Load</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bulk-operations" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
          <TabsTrigger value="faculty-workload" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Faculty Workload
          </TabsTrigger>
          <TabsTrigger value="academic-calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Academic Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-operations" className="space-y-4">
          <BulkOperationsTab />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <ImportExportTab />
        </TabsContent>

        <TabsContent value="faculty-workload" className="space-y-4">
          <FacultyWorkloadTab />
        </TabsContent>

        <TabsContent value="academic-calendar" className="space-y-4">
          <AcademicCalendarTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}