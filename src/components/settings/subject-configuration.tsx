"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Plus, X, Save, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface DepartmentSettings {
  creditHoursRatio: number
  defaultExamTypes: string[]
  defaultSubjectTypes: string[]
  customExamTypes: string[]
  customSubjectTypes: string[]
}

const fetchSettings = async (): Promise<DepartmentSettings> => {
  const response = await fetch("/api/settings/subjects", {
    credentials: 'include'
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error("Settings API error:", response.status, errorText)
    throw new Error(`Failed to fetch settings: ${response.status}`)
  }

  return response.json()
}

export function SubjectConfiguration() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [creditHoursRatio, setCreditHoursRatio] = useState(15)
  const [newExamType, setNewExamType] = useState("")
  const [newSubjectType, setNewSubjectType] = useState("")
  const { toast } = useToast()

  // Use React Query for settings
  const { data: settings, isLoading: loading, error } = useQuery({
    queryKey: ['subjectSettings'],
    queryFn: fetchSettings,
    enabled: status === "authenticated",
    staleTime: 10 * 60 * 1000, // 10 minutes - settings rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    retry: 0
  })

  // Get all types (merge default and custom)
  const allExamTypes = settings ? [...settings.defaultExamTypes, ...settings.customExamTypes] : []
  const allSubjectTypes = settings ? [...settings.defaultSubjectTypes, ...settings.customSubjectTypes] : []

  // Update local state when settings load
  useEffect(() => {
    if (settings && settings.creditHoursRatio !== creditHoursRatio) {
      setCreditHoursRatio(settings.creditHoursRatio)
    }
  }, [settings, creditHoursRatio])

  // Handle query error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: `Failed to load settings: ${(error as Error).message}`,
        variant: "destructive",
      })
    }
  }, [error, toast])

  // Mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Partial<DepartmentSettings>) => {
      const response = await fetch("/api/settings/subjects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      return response.json()
    },
    onSuccess: (updatedSettings) => {
      // Update the cache
      queryClient.setQueryData(['subjectSettings'], updatedSettings)
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
      
      // Don't navigate back automatically - let user stay on page
    },
    onError: (error) => {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    }
  })

  const saveSettings = () => {
    if (!settings) return

    saveSettingsMutation.mutate({
      creditHoursRatio,
      defaultExamTypes: allExamTypes,
      defaultSubjectTypes: allSubjectTypes,
      customExamTypes: [],
      customSubjectTypes: [],
    })
  }

  const addExamType = () => {
    if (!newExamType.trim() || !settings) return

    const upperCaseType = newExamType.toUpperCase().trim()
    
    if (allExamTypes.includes(upperCaseType)) {
      toast({
        title: "Error",
        description: "This exam type already exists",
        variant: "destructive",
      })
      return
    }

    // Update through mutation instead
    saveSettingsMutation.mutate({
      ...settings,
      defaultExamTypes: [...settings.defaultExamTypes, upperCaseType]
    })
    setNewExamType("")
  }

  const removeExamType = (typeToRemove: string) => {
    if (!settings) return

    // Update through mutation instead
    saveSettingsMutation.mutate({
      ...settings,
      defaultExamTypes: settings.defaultExamTypes.filter(type => type !== typeToRemove),
      customExamTypes: settings.customExamTypes.filter(type => type !== typeToRemove)
    })
  }

  const addSubjectType = () => {
    if (!newSubjectType.trim() || !settings) return

    const upperCaseType = newSubjectType.toUpperCase().trim()
    
    if (allSubjectTypes.includes(upperCaseType)) {
      toast({
        title: "Error",
        description: "This subject type already exists",
        variant: "destructive",
      })
      return
    }

    // Update through mutation instead
    saveSettingsMutation.mutate({
      ...settings,
      defaultSubjectTypes: [...settings.defaultSubjectTypes, upperCaseType]
    })
    setNewSubjectType("")
  }

  const removeSubjectType = (typeToRemove: string) => {
    if (!settings) return

    // Update through mutation instead
    saveSettingsMutation.mutate({
      ...settings,
      defaultSubjectTypes: settings.defaultSubjectTypes.filter(type => type !== typeToRemove),
      customSubjectTypes: settings.customSubjectTypes.filter(type => type !== typeToRemove)
    })
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Subjects", href: "/subjects" },
    { label: "Subject Configuration", current: true }
  ]

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Breadcrumb items={breadcrumbItems} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subject Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Configure department-specific subject settings
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || !settings) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Breadcrumb items={breadcrumbItems} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subject Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Configure department-specific subject settings
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Unable to load configuration</p>
            <p className="text-sm text-muted-foreground mt-1">Please check your permissions and try again</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Breadcrumb items={breadcrumbItems} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subject Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Configure department-specific subject settings
            </p>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saveSettingsMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Credit Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Hours Ratio</CardTitle>
            <CardDescription>
              Configure the number of hours per credit for your department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Hours per Credit:</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={creditHoursRatio}
                  onChange={(e) => setCreditHoursRatio(parseInt(e.target.value) || 15)}
                  className="w-20"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Examples: 2 credits = {2 * creditHoursRatio}h, 4 credits = {4 * creditHoursRatio}h, 6 credits = {6 * creditHoursRatio}h
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Types */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Types</CardTitle>
            <CardDescription>
              Manage the types of examinations available for subjects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Add new exam type..."
                value={newExamType}
                onChange={(e) => setNewExamType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExamType()}
                className="flex-1"
              />
              <Button onClick={addExamType} disabled={!newExamType.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {allExamTypes.map((type) => (
                <Badge key={type} variant="secondary" className="h-8 px-3 cursor-pointer group hover:bg-secondary/80">
                  {type}
                  <button
                    onClick={() => removeExamType(type)}
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {allExamTypes.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No exam types configured yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subject Types */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Types</CardTitle>
            <CardDescription>
              Manage the categories of subjects (Core, Elective, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Add new subject type..."
                value={newSubjectType}
                onChange={(e) => setNewSubjectType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubjectType()}
                className="flex-1"
              />
              <Button onClick={addSubjectType} disabled={!newSubjectType.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {allSubjectTypes.map((type) => (
                <Badge key={type} variant="secondary" className="h-8 px-3 cursor-pointer group hover:bg-secondary/80">
                  {type}
                  <button
                    onClick={() => removeSubjectType(type)}
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {allSubjectTypes.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No subject types configured yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}