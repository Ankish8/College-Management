"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Plus, Edit, Trash2, GraduationCap, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddProgramModal } from "./add-program-modal"
import { AddSpecializationModal } from "./add-specialization-modal"
import { useToast } from "@/hooks/use-toast"

interface Program {
  id: string
  name: string
  shortName: string
  duration: number
  totalSems: number
  programType: string
  isActive: boolean
  department: {
    name: string
    shortName: string
  }
  specializations: Array<{
    id: string
    name: string
    shortName: string
    isActive: boolean
  }>
  _count: {
    batches: number
  }
}

interface Specialization {
  id: string
  name: string
  shortName: string
  isActive: boolean
  program: {
    name: string
    shortName: string
  }
  _count: {
    batches: number
  }
}

export function BatchConfiguration() {
  const { data: session, status } = useSession()
  const [programs, setPrograms] = useState<Program[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [loading, setLoading] = useState(true)
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false)
  const [isSpecializationModalOpen, setIsSpecializationModalOpen] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [programsRes, specializationsRes] = await Promise.all([
        fetch("/api/programs", {
          credentials: 'include'
        }),
        fetch("/api/specializations", {
          credentials: 'include'
        })
      ])

      if (!programsRes.ok || !specializationsRes.ok) {
        let programsError = null
        let specializationsError = null
        
        if (!programsRes.ok) {
          try {
            programsError = await programsRes.json()
          } catch {
            programsError = await programsRes.text()
          }
        }
        
        if (!specializationsRes.ok) {
          try {
            specializationsError = await specializationsRes.json()
          } catch {
            specializationsError = await specializationsRes.text()
          }
        }
        
        console.error("API Errors:", { 
          programsStatus: programsRes.status,
          specializationsStatus: specializationsRes.status,
          programsError, 
          specializationsError 
        })
        throw new Error(`API Error: Programs ${programsRes.status}, Specializations ${specializationsRes.status}`)
      }

      const [programsData, specializationsData] = await Promise.all([
        programsRes.json(),
        specializationsRes.json()
      ])

      setPrograms(programsData)
      setSpecializations(specializationsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load configuration data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
    }
  }, [status])

  const handleProgramCreated = (newProgram: Program) => {
    setPrograms(prev => [newProgram, ...prev])
    setIsProgramModalOpen(false)
    toast({
      title: "Success",
      description: "Program created successfully",
    })
  }

  const handleSpecializationCreated = (newSpecialization: Specialization) => {
    setSpecializations(prev => [newSpecialization, ...prev])
    setIsSpecializationModalOpen(false)
    toast({
      title: "Success",
      description: "Specialization created successfully",
    })
  }

  const toggleProgramStatus = async (programId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update program status")
      }

      const updatedProgram = await response.json()
      setPrograms(prev => 
        prev.map(program => 
          program.id === programId ? updatedProgram : program
        )
      )

      toast({
        title: "Success",
        description: `Program ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      })
    } catch (error) {
      console.error("Error updating program:", error)
      toast({
        title: "Error",
        description: "Failed to update program status",
        variant: "destructive",
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Batch Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Manage programs and specializations for batch creation
          </p>
        </div>
        <div className="text-center py-12">Loading configuration...</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Batch Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Manage programs and specializations for batch creation
          </p>
        </div>
        <div className="text-center py-12">Please sign in to access this page.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage programs and specializations for batch creation
        </p>
      </div>

      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Academic Programs</h3>
              <p className="text-sm text-muted-foreground">
                Configure degree programs (B.Des, M.Des, etc.)
              </p>
            </div>
            <Button onClick={() => setIsProgramModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Program
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Semesters</TableHead>
                  <TableHead>Specializations</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{program.shortName}</div>
                          <div className="text-sm text-muted-foreground">
                            {program.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {program.programType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{program.duration} years</TableCell>
                    <TableCell>{program.totalSems}</TableCell>
                    <TableCell>{program.specializations.length}</TableCell>
                    <TableCell>{program._count.batches}</TableCell>
                    <TableCell>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProgramStatus(program.id, program.isActive)}
                        >
                          {program.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="specializations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Specializations</h3>
              <p className="text-sm text-muted-foreground">
                Configure specializations within programs (UX, Graphic Design, etc.)
              </p>
            </div>
            <Button 
              onClick={() => setIsSpecializationModalOpen(true)}
              disabled={programs.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Specialization
            </Button>
          </div>

          {programs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Create programs first before adding specializations
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specializations.map((specialization) => (
                    <TableRow key={specialization.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{specialization.shortName}</div>
                            <div className="text-sm text-muted-foreground">
                              {specialization.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {specialization.program.shortName}
                        </Badge>
                      </TableCell>
                      <TableCell>{specialization._count.batches}</TableCell>
                      <TableCell>
                        <Badge variant={specialization.isActive ? "default" : "secondary"}>
                          {specialization.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Toggle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddProgramModal
        open={isProgramModalOpen}
        onOpenChange={setIsProgramModalOpen}
        onProgramCreated={handleProgramCreated}
      />

      <AddSpecializationModal
        open={isSpecializationModalOpen}
        onOpenChange={setIsSpecializationModalOpen}
        programs={programs.filter(p => p.isActive)}
        onSpecializationCreated={handleSpecializationCreated}
      />
    </div>
  )
}