import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

const db = new PrismaClient()

async function fixDepartmentSettings() {
  try {
    // Find the Design Department
    const department = await db.department.findFirst({
      where: { shortName: "DESIGN" }
    })

    if (!department) {
      console.error("Design Department not found!")
      return
    }

    // Check if department settings exist
    const existingSettings = await db.departmentSettings.findUnique({
      where: { departmentId: department.id }
    })

    if (existingSettings) {
      console.log("Department settings already exist")
      return
    }

    // Create department settings
    const settings = await db.departmentSettings.create({
      data: {
        departmentId: department.id,
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
        schedulingMode: "MODULE_BASED",
        autoCreateAttendance: true,
        defaultExamTypes: ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
        defaultSubjectTypes: ["CORE", "ELECTIVE"],
        customExamTypes: [],
        customSubjectTypes: [],
      }
    })

    console.log("Department settings created successfully:", settings.id)
  } catch (error) {
    console.error("Error fixing department settings:", error)
  } finally {
    await db.$disconnect()
  }
}

fixDepartmentSettings()