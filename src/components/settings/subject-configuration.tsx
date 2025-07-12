"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Plus, X, Save, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DepartmentSettings {
  creditHoursRatio: number
  defaultExamTypes: string[]
  defaultSubjectTypes: string[]
  customExamTypes: string[]
  customSubjectTypes: string[]
}

export function SubjectConfiguration() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<DepartmentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creditHoursRatio, setCreditHoursRatio] = useState(15)
  const [newExamType, setNewExamType] = useState("")
  const [newSubjectType, setNewSubjectType] = useState("")
  const { toast } = useToast()

  // Get all types (merge default and custom)
  const allExamTypes = settings ? [...settings.defaultExamTypes, ...settings.customExamTypes] : []
  const allSubjectTypes = settings ? [...settings.defaultSubjectTypes, ...settings.customSubjectTypes] : []

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/settings/subjects", {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Settings API error:", response.status, errorText)
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }

      const data = await response.json()
      setSettings(data)
      setCreditHoursRatio(data.creditHoursRatio)
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast({
        title: "Error",
        description: `Failed to load settings: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status])

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      const response = await fetch("/api/settings/subjects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          creditHoursRatio,
          defaultExamTypes: allExamTypes,
          defaultSubjectTypes: allSubjectTypes,
          customExamTypes: [],
          customSubjectTypes: [],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
      
      // Navigate back after successful save
      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

    setSettings({
      ...settings,
      defaultExamTypes: [...settings.defaultExamTypes, upperCaseType]
    })
    setNewExamType("")
  }

  const removeExamType = (typeToRemove: string) => {
    if (!settings) return

    setSettings({
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

    setSettings({
      ...settings,
      defaultSubjectTypes: [...settings.defaultSubjectTypes, upperCaseType]
    })
    setNewSubjectType("")
  }

  const removeSubjectType = (typeToRemove: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      defaultSubjectTypes: settings.defaultSubjectTypes.filter(type => type !== typeToRemove),
      customSubjectTypes: settings.customSubjectTypes.filter(type => type !== typeToRemove)
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Subject Configuration</h1>
              <p className="text-sm text-muted-foreground">Configure department-specific subject settings</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading configuration...</div>
      </div>
    )
  }

  if (status === "unauthenticated" || !settings) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Subject Configuration</h1>
              <p className="text-sm text-muted-foreground">Configure department-specific subject settings</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground">Unable to load configuration</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Subject Configuration</h1>
            <p className="text-sm text-muted-foreground">Configure department-specific subject settings</p>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Credit Hours */}
        <div>
          <h2 className="text-lg font-medium mb-4">Credit Hours Ratio</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Hours per Credit:</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={creditHoursRatio}
                  onChange={(e) => setCreditHoursRatio(parseInt(e.target.value) || 15)}
                  className="w-20 h-9"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Examples: 2 credits = {2 * creditHoursRatio}h, 4 credits = {4 * creditHoursRatio}h, 6 credits = {6 * creditHoursRatio}h
              </div>
            </div>
          </div>
        </div>

        {/* Exam Types */}
        <div>
          <h2 className="text-lg font-medium mb-4">Exam Types</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
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
          </div>
        </div>

        {/* Subject Types */}
        <div>
          <h2 className="text-lg font-medium mb-4">Subject Types</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
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
          </div>
        </div>
      </div>
    </div>
  )
}