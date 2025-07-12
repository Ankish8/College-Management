"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Grid, List, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FacultyCard } from "./faculty-card"
import { FacultyTable } from "./faculty-table"
import { AddFacultyModal } from "./add-faculty-modal"
import { EditFacultyModal } from "./edit-faculty-modal"
import { useToast } from "@/hooks/use-toast"

interface Faculty {
  id: string
  name: string
  email: string
  employeeId: string
  phone?: string
  status: "ACTIVE" | "INACTIVE"
  primarySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
  }>
  coFacultySubjects: Array<{
    id: string
    name: string
    code: string
    credits: number
  }>
}

type ViewMode = "cards" | "table"
type FilterType = "all" | "active" | "inactive"

export function FacultyList() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [filteredFaculty, setFilteredFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null)
  const { toast } = useToast()

  const fetchFaculty = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/faculty", {
        credentials: 'include'
      })
      if (!response.ok) throw new Error("Failed to fetch faculty")
      
      const data = await response.json()
      setFaculty(data)
      setFilteredFaculty(data)
    } catch (error) {
      console.error("Error fetching faculty:", error)
      toast({
        title: "Error",
        description: "Failed to fetch faculty",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaculty()
  }, [])

  useEffect(() => {
    let filtered = faculty

    // Apply status filter
    if (filter === "active") {
      filtered = filtered.filter(f => f.status === "ACTIVE")
    } else if (filter === "inactive") {
      filtered = filtered.filter(f => f.status === "INACTIVE")
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.primarySubjects.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.coFacultySubjects.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredFaculty(filtered)
  }, [faculty, filter, searchQuery])

  const handleFacultyCreated = (newFaculty: Faculty) => {
    setFaculty(prev => [newFaculty, ...prev])
    setIsAddModalOpen(false)
  }

  const handleFacultyUpdated = (updatedFaculty: Faculty) => {
    setFaculty(prev => 
      prev.map(f => 
        f.id === updatedFaculty.id ? updatedFaculty : f
      )
    )
    setEditingFaculty(null)
  }

  const handleFacultyDeleted = (facultyId: string) => {
    setFaculty(prev => prev.filter(f => f.id !== facultyId))
  }

  const handleEdit = (facultyMember: Faculty) => {
    setEditingFaculty(facultyMember)
  }

  const activeFaculty = faculty.filter(f => f.status === "ACTIVE").length
  const totalCredits = faculty.reduce((sum, f) => 
    sum + f.primarySubjects.reduce((credits, s) => credits + s.credits, 0) +
          f.coFacultySubjects.reduce((credits, s) => credits + s.credits, 0), 0
  )
  const totalSubjects = faculty.reduce((sum, f) => 
    sum + f.primarySubjects.length + f.coFacultySubjects.length, 0
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Faculty</h1>
            <p className="text-sm text-muted-foreground">
              Manage faculty members and their assignments
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Faculty</h1>
          <p className="text-sm text-muted-foreground">
            Manage faculty members and their assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchFaculty}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{faculty.length}</span>
          <span>Total Faculty</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{activeFaculty}</span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{totalCredits}</span>
          <span>Total Credits</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{totalSubjects}</span>
          <span>Subject Assignments</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search faculty..."
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
              All Faculty
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "active"}
              onCheckedChange={() => setFilter("active")}
            >
              Active Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "inactive"}
              onCheckedChange={() => setFilter("inactive")}
            >
              Inactive Only
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
      {filteredFaculty.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {faculty.length === 0 ? "No faculty members yet" : "No faculty found"}
            </p>
            {faculty.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                Add your first faculty member to get started
              </p>
            ) : searchQuery ? (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFaculty.map((facultyMember) => (
            <FacultyCard
              key={facultyMember.id}
              faculty={facultyMember}
              onUpdate={handleFacultyUpdated}
              onDelete={handleFacultyDeleted}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <FacultyTable
          faculty={filteredFaculty}
          onUpdate={handleFacultyUpdated}
          onDelete={handleFacultyDeleted}
          onEdit={handleEdit}
        />
      )}

      {/* Add Faculty Modal */}
      <AddFacultyModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onFacultyCreated={handleFacultyCreated}
      />

      {/* Edit Faculty Modal */}
      <EditFacultyModal
        open={!!editingFaculty}
        onOpenChange={(open) => !open && setEditingFaculty(null)}
        faculty={editingFaculty}
        onFacultyUpdated={handleFacultyUpdated}
      />
    </div>
  )
}