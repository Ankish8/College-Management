"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Plus, Search, Grid, List, Filter, Settings, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { SubjectCard } from "./subject-card"
import { SubjectTable } from "./subject-table"
import { AddSubjectModal } from "./add-subject-modal"
import { EditSubjectModal } from "./edit-subject-modal"
import { useToast } from "@/hooks/use-toast"

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: string
  subjectType: string
  description?: string
  batch: {
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    }
  }
  primaryFaculty: {
    name: string
    email: string
  }
  coFaculty?: {
    name: string
    email: string
  }
  _count: {
    attendanceSessions: number
  }
}

type ViewMode = "cards" | "table"
type FilterType = "all" | "theory" | "practical" | "core" | "elective"

export function SubjectList() {
  const { data: session, status } = useSession()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const { toast } = useToast()

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/subjects", {
        credentials: 'include'
      })
      if (!response.ok) throw new Error("Failed to fetch subjects")
      
      const data = await response.json()
      setSubjects(data)
      setFilteredSubjects(data)
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subjects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Remove focus listener to reduce unnecessary API calls
  // useEffect(() => {
  //   const handleFocus = () => {
  //     fetchSubjects()
  //   }
  //   window.addEventListener('focus', handleFocus)
  //   return () => window.removeEventListener('focus', handleFocus)
  // }, [])

  useEffect(() => {
    let filtered = subjects

    // Apply filter
    if (filter === "theory") {
      filtered = filtered.filter(subject => subject.examType === "THEORY")
    } else if (filter === "practical") {
      filtered = filtered.filter(subject => ["PRACTICAL", "JURY", "PROJECT"].includes(subject.examType))
    } else if (filter === "core") {
      filtered = filtered.filter(subject => subject.subjectType === "CORE")
    } else if (filter === "elective") {
      filtered = filtered.filter(subject => subject.subjectType === "ELECTIVE")
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.primaryFaculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.batch.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredSubjects(filtered)
  }, [subjects, filter, searchQuery])

  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects(prev => [newSubject, ...prev])
    setIsAddModalOpen(false)
    toast({
      title: "Success",
      description: "Subject created successfully",
    })
  }

  const handleSubjectUpdated = (updatedSubject: Subject) => {
    setSubjects(prev => 
      prev.map(subject => 
        subject.id === updatedSubject.id ? updatedSubject : subject
      )
    )
    toast({
      title: "Success",
      description: "Subject updated successfully",
    })
  }

  const handleSubjectDeleted = (subjectId: string) => {
    setSubjects(prev => prev.filter(subject => subject.id !== subjectId))
    toast({
      title: "Success",
      description: "Subject deleted successfully",
    })
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
  }

  // Calculate stats
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0)
  const totalHours = subjects.reduce((sum, s) => sum + s.totalHours, 0)
  const coreSubjects = subjects.filter(s => s.subjectType === "CORE").length
  const activeClasses = subjects.reduce((sum, s) => sum + s._count.attendanceSessions, 0)

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
            <p className="text-sm text-muted-foreground">
              Manage academic subjects and faculty assignments
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic subjects and faculty assignments
          </p>
        </div>
        <div className="text-center py-12">Please sign in to access this page.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic subjects and faculty assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchSubjects}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            asChild
            title="Subject Configuration"
          >
            <Link href="/settings/subjects">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{subjects.length}</span>
          <span>Total Subjects</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{totalCredits}</span>
          <span>Credits</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{totalHours}</span>
          <span>Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{coreSubjects}</span>
          <span>Core Subjects</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{activeClasses}</span>
          <span>Classes Conducted</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {filter !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {filter}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={filter === "all"}
              onCheckedChange={() => setFilter("all")}
            >
              All Subjects
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "theory"}
              onCheckedChange={() => setFilter("theory")}
            >
              Theory
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "practical"}
              onCheckedChange={() => setFilter("practical")}
            >
              Practical/Jury
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "core"}
              onCheckedChange={() => setFilter("core")}
            >
              Core Subjects
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "elective"}
              onCheckedChange={() => setFilter("elective")}
            >
              Elective Subjects
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No subjects found</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject as any}
              onUpdate={handleSubjectUpdated}
              onDelete={handleSubjectDeleted}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <SubjectTable
          subjects={filteredSubjects}
          onUpdate={handleSubjectUpdated}
          onDelete={handleSubjectDeleted}
          onEdit={handleEdit}
        />
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubjectCreated={handleSubjectCreated}
      />

      {/* Edit Subject Modal */}
      <EditSubjectModal
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        subject={editingSubject as any}
        onSubjectUpdated={handleSubjectUpdated}
      />
    </div>
  )
}