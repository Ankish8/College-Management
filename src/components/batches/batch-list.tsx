"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Grid, List, Filter, Settings, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BatchCard } from "./batch-card"
import { BatchTable } from "./batch-table"
import { AddBatchModal } from "./add-batch-modal"
import { useToast } from "@/hooks/use-toast"

interface Batch {
  id: string
  name: string
  semester: number
  startYear: number
  endYear: number
  isActive: boolean
  currentStrength: number
  maxCapacity?: number
  program: {
    name: string
    shortName: string
    duration: number
  }
  specialization?: {
    name: string
    shortName: string
  }
  _count: {
    students: number
    subjects: number
  }
}

type ViewMode = "cards" | "table"
type FilterType = "all" | "active" | "inactive"

export function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { toast } = useToast()

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/batches", {
        credentials: 'include'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch batches")
      }
      
      const data = await response.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch batches",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, []) // Remove toast dependency to prevent infinite loops

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Refresh data when window regains focus (user returns from config page)
  useEffect(() => {
    const handleFocus = () => {
      fetchBatches()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchBatches])

  useEffect(() => {
    let filtered = batches

    // Apply status filter
    if (filter === "active") {
      filtered = filtered.filter(batch => batch.isActive)
    } else if (filter === "inactive") {
      filtered = filtered.filter(batch => !batch.isActive)
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(batch =>
        batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.specialization?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredBatches(filtered)
  }, [batches, filter, searchQuery])

  const handleBatchCreated = (newBatch: Batch) => {
    setBatches(prev => [newBatch, ...prev])
    setIsAddModalOpen(false)
    toast({
      title: "Success",
      description: "Batch created successfully",
    })
  }

  const handleBatchUpdated = (updatedBatch: Batch) => {
    setBatches(prev => 
      prev.map(batch => 
        batch.id === updatedBatch.id ? updatedBatch : batch
      )
    )
    toast({
      title: "Success",
      description: "Batch updated successfully",
    })
  }

  const handleBatchDeleted = (batchId: string) => {
    setBatches(prev => prev.filter(batch => batch.id !== batchId))
    toast({
      title: "Success",
      description: "Batch deleted successfully",
    })
  }

  const activeBatches = batches.filter(b => b.isActive).length
  const totalStudents = batches.reduce((sum, b) => sum + (b._count?.students || 0), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Batches</h1>
            <p className="text-sm text-muted-foreground">
              Manage academic batches and student groups
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
          <h1 className="text-2xl font-semibold tracking-tight">Batches</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic batches and student groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchBatches}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open('/settings/batch-config', '_blank')}
            title="Batch Configuration"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Batch
          </Button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{batches.length}</span>
          <span>Total Batches</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{activeBatches}</span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{totalStudents}</span>
          <span>Students</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {activeBatches > 0 ? Math.round(totalStudents / activeBatches) : 0}
          </span>
          <span>Avg. Size</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
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
              All Batches
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
      {filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No batches found</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onUpdate={handleBatchUpdated}
              onDelete={handleBatchDeleted}
            />
          ))}
        </div>
      ) : (
        <BatchTable
          batches={filteredBatches}
          onUpdate={handleBatchUpdated}
          onDelete={handleBatchDeleted}
        />
      )}

      {/* Add Batch Modal */}
      <AddBatchModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onBatchCreated={handleBatchCreated}
      />
    </div>
  )
}