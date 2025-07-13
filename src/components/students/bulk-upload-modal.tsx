"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface Batch {
  id: string
  name: string
  program: {
    name: string
    shortName: string
  }
  specialization?: {
    name: string
    shortName: string
  }
}

interface BulkUploadResult {
  created: number
  skipped: number
  errors: string[]
}

interface BulkUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (results: BulkUploadResult) => void
  defaultBatchId?: string
}

export function BulkUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete,
  defaultBatchId 
}: BulkUploadModalProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<string>(defaultBatchId || "")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<BulkUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch batches when modal opens
  useEffect(() => {
    if (open) {
      fetchBatches()
      if (defaultBatchId) {
        setSelectedBatch(defaultBatchId)
      }
    }
  }, [open, defaultBatchId])

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches?active=true", {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error("Failed to fetch batches")
      }
      const data = await response.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to fetch batches",
        variant: "destructive",
      })
    }
  }

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      "name",
      "email", 
      "phone",
      "studentId",
      "rollNumber",
      "guardianName",
      "guardianPhone",
      "address",
      "dateOfBirth"
    ]
    
    const sampleData = [
      "John Doe",
      "john.doe@student.jlu.edu.in",
      "+91 9876543210",
      "JLU2024001",
      "BD24UX001",
      "Jane Doe",
      "+91 9876543211",
      "123 Main Street, City, State",
      "2000-01-15"
    ]

    const csvContent = [
      headers.join(","),
      sampleData.join(","),
      // Add one more sample row
      [
        "Jane Smith",
        "jane.smith@student.jlu.edu.in", 
        "+91 9876543212",
        "JLU2024002",
        "BD24UX002",
        "John Smith",
        "+91 9876543213",
        "456 Oak Avenue, City, State",
        "2000-05-20"
      ].join(",")
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "student-upload-template.csv"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Template Downloaded",
      description: "Check your downloads folder for the template file",
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const students = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const student: any = {}

      headers.forEach((header, index) => {
        if (values[index]) {
          student[header] = values[index]
        }
      })

      // Skip empty rows
      if (student.name && student.email) {
        student.batchId = selectedBatch
        students.push(student)
      }
    }

    return students
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedBatch) {
      toast({
        title: "Missing Information",
        description: "Please select a file and batch",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      setUploadProgress(10)

      // Read file content
      const text = await selectedFile.text()
      setUploadProgress(30)

      // Parse CSV
      const students = parseCSV(text)
      setUploadProgress(50)

      if (students.length === 0) {
        throw new Error("No valid student data found in file")
      }

      // Upload students
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          students: students
        }),
      })

      setUploadProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload students")
      }

      const uploadResults = await response.json()
      setUploadProgress(100)
      setResults(uploadResults)

      toast({
        title: "Upload Complete",
        description: `Successfully created ${uploadResults.created} students`,
      })

    } catch (error) {
      console.error("Error uploading students:", error)
      toast({
        title: "Upload Failed",
        description: (error as Error).message || "Failed to upload students",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (results) {
      onUploadComplete(results)
    }
    
    // Reset state
    setSelectedFile(null)
    setSelectedBatch(defaultBatchId || "")
    setUploading(false)
    setUploadProgress(0)
    setResults(null)
    
    onOpenChange(false)
  }

  const handleStartOver = () => {
    setSelectedFile(null)
    setResults(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Student Upload</DialogTitle>
          <DialogDescription>
            Upload multiple students from a CSV file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-6">
            {/* Step 1: Download Template */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Step 1: Download Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Download the CSV template with the required column headers and sample data.
                </p>
                <Button variant="outline" onClick={downloadTemplate}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* Step 2: Select Batch */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step 2: Select Target Batch</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch for all students" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Step 3: Upload File */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Step 3: Upload File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="h-8 w-8 mx-auto text-green-600" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ""
                          }
                        }}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm">Click to select a CSV file</p>
                      <p className="text-xs text-muted-foreground">
                        Supports CSV and Excel files
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading students...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Results Display */
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.created}
                    </div>
                    <div className="text-sm text-muted-foreground">Students Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {results.skipped}
                    </div>
                    <div className="text-sm text-muted-foreground">Students Skipped</div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Issues Found</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.slice(0, 10).map((error, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {error}
                        </Badge>
                      ))}
                      {results.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ... and {results.errors.length - 10} more issues
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !selectedBatch || uploading}
              >
                {uploading ? "Uploading..." : "Upload Students"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleStartOver}>
                Upload More
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}