"use client"

import React, { useState, useEffect } from 'react'
import { Puck, Render } from "@measured/puck"
import { puckConfig } from './puck-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, FileOpen, Eye, Plus, Trash2, Copy, Download, Upload } from 'lucide-react'

interface TimetableTemplate {
  id: string
  name: string
  description?: string
  templateData: any // Puck.js JSON data
  isDefault: boolean
  isPublic: boolean
  templateType?: string
  targetBatches?: string[]
  creditHours?: number
  subjectCount?: number
  timesUsed: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

interface TimetableTemplateBuilderProps {
  initialData?: any
  templateId?: string
  onSave?: (templateData: any) => void
  readOnly?: boolean
}

export default function TimetableTemplateBuilder({ 
  initialData, 
  templateId, 
  onSave,
  readOnly = false 
}: TimetableTemplateBuilderProps) {
  const [data, setData] = useState(initialData || { content: [], root: {} })
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [templates, setTemplates] = useState<TimetableTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Save dialog form state
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateType, setTemplateType] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isDefault, setIsDefault] = useState(false)

  const { toast } = useToast()

  // Load templates on component mount
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/timetable/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast({
          title: "Error loading templates",
          description: "Could not load saved templates",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: "Error loading templates",
        description: "Could not load saved templates",
        variant: "destructive"
      })
    }
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const templateData = {
        name: templateName,
        description: templateDescription,
        templateData: JSON.stringify(data),
        templateType,
        isPublic,
        isDefault,
        // Calculate metadata from current data
        subjectCount: data.content?.filter((item: any) => item.type === 'SubjectBlock').length || 0,
        creditHours: data.content?.reduce((total: number, item: any) => {
          if (item.type === 'SubjectBlock') {
            return total + (item.props?.credits || 0)
          }
          return total
        }, 0) || 0
      }

      const url = templateId 
        ? `/api/timetable/templates/${templateId}`
        : '/api/timetable/templates'
      const method = templateId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Template saved",
          description: `Template "${templateName}" has been saved successfully`,
        })
        setShowSaveDialog(false)
        loadTemplates() // Refresh templates list
        
        // Call external save handler if provided
        if (onSave) {
          onSave(data)
        }
      } else {
        const error = await response.json()
        toast({
          title: "Save failed",
          description: error.error || "Could not save template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: "Save failed",
        description: "Could not save template",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplate = async (template: TimetableTemplate) => {
    try {
      const templateData = JSON.parse(template.templateData)
      setData(templateData)
      setShowLoadDialog(false)
      
      // Update usage statistics
      await fetch(`/api/timetable/templates/${template.id}/use`, {
        method: 'POST'
      })
      
      toast({
        title: "Template loaded",
        description: `Template "${template.name}" has been loaded`,
      })
    } catch (error) {
      console.error('Error loading template:', error)
      toast({
        title: "Load failed",
        description: "Could not load template",
        variant: "destructive"
      })
    }
  }

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/timetable/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Template deleted",
          description: `Template "${templateName}" has been deleted`,
        })
        loadTemplates()
      } else {
        const error = await response.json()
        toast({
          title: "Delete failed",
          description: error.error || "Could not delete template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Delete failed",
        description: "Could not delete template",
        variant: "destructive"
      })
    }
  }

  const duplicateTemplate = async (template: TimetableTemplate) => {
    try {
      const templateData = JSON.parse(template.templateData)
      setData(templateData)
      setTemplateName(`${template.name} (Copy)`)
      setTemplateDescription(template.description || '')
      setTemplateType(template.templateType || '')
      setIsPublic(false)
      setIsDefault(false)
      setShowSaveDialog(true)
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast({
        title: "Duplicate failed",
        description: "Could not duplicate template",
        variant: "destructive"
      })
    }
  }

  const exportTemplate = (template: TimetableTemplate) => {
    const exportData = {
      name: template.name,
      description: template.description,
      templateData: template.templateData,
      templateType: template.templateType,
      metadata: {
        creditHours: template.creditHours,
        subjectCount: template.subjectCount,
        exportedAt: new Date().toISOString()
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)
        const templateData = typeof importData.templateData === 'string' 
          ? JSON.parse(importData.templateData)
          : importData.templateData

        setData(templateData)
        setTemplateName(importData.name + ' (Imported)')
        setTemplateDescription(importData.description || '')
        setTemplateType(importData.templateType || '')
        setShowSaveDialog(true)
        
        toast({
          title: "Template imported",
          description: "Template has been imported successfully",
        })
      } catch (error) {
        console.error('Error importing template:', error)
        toast({
          title: "Import failed",
          description: "Could not import template file",
          variant: "destructive"
        })
      }
    }
    reader.readAsText(file)
  }

  const clearTemplate = () => {
    if (confirm("Are you sure you want to clear the current template?")) {
      setData({ content: [], root: {} })
    }
  }

  if (isPreviewMode) {
    return (
      <div className="h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Template Preview</h1>
          <Button onClick={() => setIsPreviewMode(false)}>
            Exit Preview
          </Button>
        </div>
        <div className="p-6">
          <Render config={puckConfig} data={data} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Timetable Template Builder</h1>
          {templateId && (
            <Badge variant="secondary">Editing Template</Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          
          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileOpen className="w-4 h-4 mr-2" />
                Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Load Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Available Templates</h3>
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importTemplate}
                      className="hidden"
                      id="import-template"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('import-template')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            {template.description && (
                              <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            {template.isDefault && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            {template.isPublic && (
                              <Badge variant="secondary" className="text-xs">Public</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{template.subjectCount || 0} subjects</span>
                          <span>{template.creditHours || 0} credits</span>
                          <span>Used {template.timesUsed} times</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => loadTemplate(template)}
                            className="flex-1"
                          >
                            Load
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportTemplate(template)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplate(template.id, template.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={readOnly}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe this template"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester">Full Semester</SelectItem>
                      <SelectItem value="weekly">Weekly Pattern</SelectItem>
                      <SelectItem value="intensive">Intensive Module</SelectItem>
                      <SelectItem value="exam">Exam Schedule</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span className="text-sm">Make public</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                    />
                    <span className="text-sm">Set as default</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveTemplate} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Template'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={clearTemplate}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Puck Editor */}
      <div className="flex-1">
        <Puck
          config={puckConfig}
          data={data}
          onPublish={setData}
          onChange={setData}
        />
      </div>
    </div>
  )
}