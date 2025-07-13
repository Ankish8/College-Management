"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Building2, Calculator, Clock, Users, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const departmentSettingsSchema = z.object({
  creditHoursRatio: z.number().min(1).max(30),
  maxFacultyCredits: z.number().min(1).max(50),
  coFacultyWeight: z.number().min(0).max(1),
})

type DepartmentSettingsFormData = z.infer<typeof departmentSettingsSchema>

interface Department {
  id: string
  name: string
  shortName: string
}

interface DepartmentSettings {
  id: string
  creditHoursRatio: number
  maxFacultyCredits: number
  coFacultyWeight: number
}

interface DepartmentSettingsFormProps {
  department: Department
  settings: DepartmentSettings
}

export function DepartmentSettingsForm({ department, settings }: DepartmentSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<DepartmentSettingsFormData>({
    resolver: zodResolver(departmentSettingsSchema),
    defaultValues: {
      creditHoursRatio: settings.creditHoursRatio,
      maxFacultyCredits: settings.maxFacultyCredits,
      coFacultyWeight: settings.coFacultyWeight,
    },
  })

  const currentValues = watch()

  const onSubmit = async (data: DepartmentSettingsFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/settings/department/${department.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update settings")
      }

      toast({
        title: "Settings updated",
        description: "Department settings have been updated successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Department Information</CardTitle>
              <CardDescription>
                {department.name} ({department.shortName})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Credit System Configuration</CardTitle>
                <CardDescription>
                  Configure how credits are calculated and converted to hours
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="creditHoursRatio">
                  Credit Hours Ratio
                  <span className="text-xs text-muted-foreground ml-1">(hours per credit)</span>
                </Label>
                <Input
                  id="creditHoursRatio"
                  type="number"
                  min="1"
                  max="30"
                  {...register("creditHoursRatio", { valueAsNumber: true })}
                />
                {errors.creditHoursRatio && (
                  <p className="text-sm text-destructive">{errors.creditHoursRatio.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Standard at JLU: 15 hours = 1 credit
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Calculated Hours</Label>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="space-y-1 text-sm">
                    <div>2 Credits = {currentValues.creditHoursRatio * 2} hours</div>
                    <div>4 Credits = {currentValues.creditHoursRatio * 4} hours</div>
                    <div>6 Credits = {currentValues.creditHoursRatio * 6} hours</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Faculty Workload Configuration</CardTitle>
                <CardDescription>
                  Set limits and weightings for faculty workload calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxFacultyCredits">
                  Maximum Faculty Credits
                  <span className="text-xs text-muted-foreground ml-1">(per semester)</span>
                </Label>
                <Input
                  id="maxFacultyCredits"
                  type="number"
                  min="1"
                  max="50"
                  {...register("maxFacultyCredits", { valueAsNumber: true })}
                />
                {errors.maxFacultyCredits && (
                  <p className="text-sm text-destructive">{errors.maxFacultyCredits.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum credits a faculty member can teach per semester
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coFacultyWeight">
                  Co-Faculty Weight
                  <span className="text-xs text-muted-foreground ml-1">(0.0 - 1.0)</span>
                </Label>
                <Input
                  id="coFacultyWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  {...register("coFacultyWeight", { valueAsNumber: true })}
                />
                {errors.coFacultyWeight && (
                  <p className="text-sm text-destructive">{errors.coFacultyWeight.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Weight for co-faculty workload (0.5 = 50%, 1.0 = 100%)
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                With current settings: Maximum workload = {currentValues.maxFacultyCredits} credits 
                ({currentValues.maxFacultyCredits * currentValues.creditHoursRatio} hours). 
                Co-faculty gets {Math.round(currentValues.coFacultyWeight * 100)}% weight in workload calculations.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isDirty ? "You have unsaved changes" : "All changes saved"}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || isLoading}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}