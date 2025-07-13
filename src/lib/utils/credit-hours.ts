import { db } from "@/lib/db"

/**
 * Get the credit hours ratio for a department
 * @param departmentId - The department ID
 * @returns The credit hours ratio (default: 15)
 */
export async function getCreditHoursRatio(departmentId: string): Promise<number> {
  try {
    const settings = await db.departmentSettings.findUnique({
      where: { departmentId }
    })
    return settings?.creditHoursRatio || 15
  } catch (error) {
    console.error("Error fetching credit hours ratio:", error)
    return 15 // Default fallback
  }
}

/**
 * Calculate total hours for a subject based on credits and department ratio
 * @param credits - Number of credits for the subject
 * @param departmentId - The department ID
 * @returns The total hours for the subject
 */
export async function calculateSubjectHours(credits: number, departmentId: string): Promise<number> {
  const ratio = await getCreditHoursRatio(departmentId)
  return credits * ratio
}

/**
 * Get maximum faculty credits for a department
 * @param departmentId - The department ID
 * @returns The maximum credits a faculty can teach (default: 30)
 */
export async function getMaxFacultyCredits(departmentId: string): Promise<number> {
  try {
    const settings = await db.departmentSettings.findUnique({
      where: { departmentId }
    })
    return settings?.maxFacultyCredits || 30
  } catch (error) {
    console.error("Error fetching max faculty credits:", error)
    return 30 // Default fallback
  }
}

/**
 * Get co-faculty weight for workload calculation
 * @param departmentId - The department ID
 * @returns The weight for co-faculty (default: 0.5 = 50%)
 */
export async function getCoFacultyWeight(departmentId: string): Promise<number> {
  try {
    const settings = await db.departmentSettings.findUnique({
      where: { departmentId }
    })
    return settings?.coFacultyWeight || 0.5
  } catch (error) {
    console.error("Error fetching co-faculty weight:", error)
    return 0.5 // Default fallback
  }
}

/**
 * Calculate faculty workload percentage
 * @param currentCredits - Current credits assigned to faculty
 * @param departmentId - The department ID
 * @returns Workload percentage (0-100+)
 */
export async function calculateFacultyWorkloadPercentage(
  currentCredits: number, 
  departmentId: string
): Promise<number> {
  const maxCredits = await getMaxFacultyCredits(departmentId)
  return Math.round((currentCredits / maxCredits) * 100)
}