import { db } from "@/lib/db"
import { getCreditHoursRatio, getMaxFacultyCredits, getCoFacultyWeight } from "./credit-hours"

interface Subject {
  id: string
  credits: number
  totalHours: number
}

interface FacultyWorkload {
  totalCredits: number
  totalHours: number
  maxCredits: number
  maxHours: number
  creditPercentage: number
  hourPercentage: number
  workloadLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'OVERLOAD'
  primarySubjects: Subject[]
  coFacultySubjects: Subject[]
}

/**
 * Calculate comprehensive faculty workload
 * @param facultyId - Faculty member ID
 * @param departmentId - Department ID for settings
 * @returns Detailed workload analysis
 */
export async function calculateFacultyWorkload(
  facultyId: string,
  departmentId: string
): Promise<FacultyWorkload> {
  
  // Fetch faculty subjects
  const faculty = await db.user.findUnique({
    where: { id: facultyId },
    include: {
      primarySubjects: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          credits: true,
          totalHours: true,
        }
      },
      coFacultySubjects: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          credits: true,
          totalHours: true,
        }
      }
    }
  })

  if (!faculty) {
    throw new Error("Faculty not found")
  }

  // Get department settings
  const maxCredits = await getMaxFacultyCredits(departmentId)
  const creditRatio = await getCreditHoursRatio(departmentId)
  const coFacultyWeight = await getCoFacultyWeight(departmentId)
  const maxHours = maxCredits * creditRatio

  // Filter teaching subjects (exclude non-teaching like internships, projects)
  const teachingPrimarySubjects = faculty.primarySubjects.filter(subject => {
    const subjectName = subject.name.toLowerCase();
    return !subjectName.includes('internship') && 
           !subjectName.includes('field research project');
  });

  const teachingCoFacultySubjects = faculty.coFacultySubjects.filter(subject => {
    const subjectName = subject.name.toLowerCase();
    return !subjectName.includes('internship') && 
           !subjectName.includes('field research project');
  });

  // Calculate workload with different weights for primary vs co-faculty (teaching subjects only)
  const primaryCredits = teachingPrimarySubjects.reduce((sum, s) => sum + s.credits, 0)
  const primaryHours = teachingPrimarySubjects.reduce((sum, s) => sum + s.totalHours, 0)
  
  // Co-faculty weight is configurable (default 50%)
  const coFacultyCredits = teachingCoFacultySubjects.reduce((sum, s) => sum + (s.credits * coFacultyWeight), 0)
  const coFacultyHours = teachingCoFacultySubjects.reduce((sum, s) => sum + (s.totalHours * coFacultyWeight), 0)

  const totalCredits = primaryCredits + coFacultyCredits
  const totalHours = primaryHours + coFacultyHours

  // Calculate percentages
  const creditPercentage = Math.round((totalCredits / maxCredits) * 100)
  const hourPercentage = Math.round((totalHours / maxHours) * 100)

  // Determine workload level based on higher percentage
  const maxPercentage = Math.max(creditPercentage, hourPercentage)
  let workloadLevel: FacultyWorkload['workloadLevel']
  
  if (maxPercentage <= 50) {
    workloadLevel = 'LOW'
  } else if (maxPercentage <= 83) {
    workloadLevel = 'NORMAL'
  } else if (maxPercentage <= 100) {
    workloadLevel = 'HIGH'
  } else {
    workloadLevel = 'OVERLOAD'
  }

  return {
    totalCredits,
    totalHours,
    maxCredits,
    maxHours,
    creditPercentage,
    hourPercentage,
    workloadLevel,
    primarySubjects: teachingPrimarySubjects,
    coFacultySubjects: teachingCoFacultySubjects
  }
}

/**
 * Check if faculty can take additional workload
 * @param facultyId - Faculty member ID
 * @param additionalCredits - Credits to be added
 * @param departmentId - Department ID
 * @returns Whether faculty can handle additional workload
 */
export async function canFacultyTakeAdditionalWorkload(
  facultyId: string,
  additionalCredits: number,
  departmentId: string
): Promise<{ canTake: boolean; reason?: string; currentWorkload: FacultyWorkload }> {
  
  const currentWorkload = await calculateFacultyWorkload(facultyId, departmentId)
  const newCredits = currentWorkload.totalCredits + additionalCredits
  const newCreditPercentage = (newCredits / currentWorkload.maxCredits) * 100

  if (newCreditPercentage > 100) {
    return {
      canTake: false,
      reason: `Would exceed maximum credits (${newCredits}/${currentWorkload.maxCredits} = ${newCreditPercentage.toFixed(1)}%)`,
      currentWorkload
    }
  }

  if (newCreditPercentage > 90) {
    return {
      canTake: false,
      reason: `Would result in high workload (${newCreditPercentage.toFixed(1)}%). Consider redistributing.`,
      currentWorkload
    }
  }

  return {
    canTake: true,
    currentWorkload
  }
}

/**
 * Get workload distribution across faculty in department
 * @param departmentId - Department ID
 * @returns Faculty workload distribution
 */
export async function getDepartmentWorkloadDistribution(departmentId: string) {
  const faculty = await db.user.findMany({
    where: {
      role: 'FACULTY',
      departmentId,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  const workloadDistribution = await Promise.all(
    faculty.map(async (f) => {
      const workload = await calculateFacultyWorkload(f.id, departmentId)
      return {
        faculty: f,
        workload
      }
    })
  )

  // Sort by workload percentage (highest first)
  workloadDistribution.sort((a, b) => b.workload.creditPercentage - a.workload.creditPercentage)

  return {
    faculty: workloadDistribution,
    summary: {
      totalFaculty: faculty.length,
      overloadedCount: workloadDistribution.filter(f => f.workload.workloadLevel === 'OVERLOAD').length,
      highWorkloadCount: workloadDistribution.filter(f => f.workload.workloadLevel === 'HIGH').length,
      averageWorkload: workloadDistribution.reduce((sum, f) => sum + f.workload.creditPercentage, 0) / faculty.length
    }
  }
}