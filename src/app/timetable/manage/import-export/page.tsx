"use client"

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload,
  Download,
  FileSpreadsheet,
  File,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  Calendar,
  Database,
  Clock,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImportFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'importing' | 'completed' | 'failed'
  progress?: number
  results?: {
    total: number
    successful: number
    failed: number
    errors?: string[]
  }
}

interface ExportJob {
  id: string
  name: string
  format: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  createdAt: string
}

function ImportExportTab() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFiles, setImportFiles] = useState<ImportFile[]>([])
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [selectedBatch, setSelectedBatch] = useState('')

  const exportFormats = [
    {
      value: 'excel',
      label: 'Excel (.xlsx)',
      icon: FileSpreadsheet,
      description: 'Full-featured Excel format with formatting'
    },
    {
      value: 'csv',
      label: 'CSV (.csv)', 
      icon: File,
      description: 'Simple comma-separated values format'
    },
    {
      value: 'pdf',
      label: 'PDF (.pdf)',
      icon: FileText,
      description: 'Printable PDF timetable layout'
    },
    {
      value: 'ical',
      label: 'iCalendar (.ics)',
      icon: Calendar,
      description: 'Calendar format for Google Calendar, Outlook'
    }
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const newFile: ImportFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending'
      }

      setImportFiles(prev => [...prev, newFile])

      // Simulate validation
      setTimeout(() => {
        setImportFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: 'validating', progress: 0 }
            : f
        ))

        // Simulate progress
        let progress = 0
        const interval = setInterval(() => {
          progress += 20
          if (progress >= 100) {
            clearInterval(interval)
            setImportFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { 
                    ...f, 
                    status: Math.random() > 0.3 ? 'valid' : 'invalid',
                    progress: 100,
                    results: {
                      total: 45,
                      successful: Math.random() > 0.3 ? 45 : 30,
                      failed: Math.random() > 0.3 ? 0 : 15,
                      errors: Math.random() > 0.3 ? [] : ['Invalid time format in row 5', 'Missing faculty in row 12']
                    }
                  }
                : f
            ))
          } else {
            setImportFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { ...f, progress }
                : f
            ))
          }
        }, 200)
      }, 500)
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setImportFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const startImport = (fileId: string) => {
    setImportFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'importing', progress: 0 }
        : f
    ))

    // Simulate import progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 15
      if (progress >= 100) {
        clearInterval(interval)
        setImportFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ))
        toast({
          title: "Import Completed",
          description: "Timetable data has been successfully imported.",
        })
      } else {
        setImportFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress }
            : f
        ))
      }
    }, 300)
  }

  const handleExport = () => {
    const newJob: ExportJob = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Timetable Export - ${selectedFormat.toUpperCase()}`,
      format: selectedFormat,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    setExportJobs(prev => [newJob, ...prev])

    // Simulate export process
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: 'processing', progress: 0 }
          : job
      ))

      let progress = 0
      const interval = setInterval(() => {
        progress += 20
        if (progress >= 100) {
          clearInterval(interval)
          setExportJobs(prev => prev.map(job => 
            job.id === newJob.id 
              ? { 
                  ...job, 
                  status: 'completed', 
                  progress: 100,
                  downloadUrl: '/downloads/timetable-export.xlsx' 
                }
              : job
          ))
          toast({
            title: "Export Completed",
            description: "Your timetable export is ready for download.",
          })
        } else {
          setExportJobs(prev => prev.map(job => 
            job.id === newJob.id 
              ? { ...job, progress }
              : job
          ))
        }
      }, 400)
    }, 500)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Timetable Data
          </CardTitle>
          <CardDescription>
            Upload Excel or CSV files to import timetable entries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Click to upload files</p>
              <p className="text-sm text-gray-500">
                or drag and drop Excel (.xlsx) or CSV (.csv) files
              </p>
              <p className="text-xs text-gray-400">
                Maximum file size: 10MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Import Templates */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Import Templates</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Excel Template</div>
                  <div className="text-xs text-muted-foreground">
                    Download pre-formatted Excel template
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">CSV Template</div>
                  <div className="text-xs text-muted-foreground">
                    Download CSV format template
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Import Guide</div>
                  <div className="text-xs text-muted-foreground">
                    View formatting requirements
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* File List */}
          {importFiles.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Uploaded Files</Label>
              <div className="space-y-3">
                {importFiles.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-sm">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'valid' && (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        )}
                        {file.status === 'invalid' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Invalid
                          </Badge>
                        )}
                        {file.status === 'completed' && (
                          <Badge variant="default" className="bg-blue-100 text-blue-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Imported
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {(file.status === 'validating' || file.status === 'importing') && file.progress !== undefined && (
                      <div className="space-y-2">
                        <Progress value={file.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {file.status === 'validating' ? 'Validating...' : 'Importing...'} {file.progress}%
                        </p>
                      </div>
                    )}

                    {file.results && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs">
                          <span className="font-medium">{file.results.successful}</span> successful, 
                          <span className="font-medium text-red-600 ml-1">{file.results.failed}</span> failed 
                          out of <span className="font-medium">{file.results.total}</span> entries
                        </div>
                        {file.results.errors && file.results.errors.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {file.results.errors.map((error, index) => (
                                  <div key={index} className="text-xs">{error}</div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {file.status === 'valid' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => startImport(file.id)}>
                          Import
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Timetable Data
          </CardTitle>
          <CardDescription>
            Export timetable data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => {
                      const IconComponent = format.icon
                      return (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {format.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {exportFormats.find(f => f.value === selectedFormat)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Batch/Program</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    <SelectItem value="sem5-ux">B.Des UX Sem 5</SelectItem>
                    <SelectItem value="sem5-gd">B.Des GD Sem 5</SelectItem>
                    <SelectItem value="sem6-ux">B.Des UX Sem 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" placeholder="Start date" />
                  <Input type="date" placeholder="End date" />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Timetable
                </Button>
              </div>
            </div>
          </div>

          {/* Export History */}
          {exportJobs.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Export History</Label>
              <div className="space-y-3">
                {exportJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">{job.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' && job.downloadUrl && (
                          <Button size="sm" asChild>
                            <a href={job.downloadUrl} download>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                        {job.status === 'processing' && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {job.status === 'completed' && (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                    {job.status === 'processing' && job.progress !== undefined && (
                      <div className="mt-3 space-y-2">
                        <Progress value={job.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Processing... {job.progress}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ImportExportTab