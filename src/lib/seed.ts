import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

const db = new PrismaClient()

// CLEAN SEED - No fake data, only structural setup

async function seedDatabase() {
  try {
    console.log("🌱 Starting comprehensive database seeding...")

    // Create University
    let university = await db.university.findFirst({ where: { shortName: "JLU" } })
    if (!university) {
      university = await db.university.create({
        data: {
          name: "Jagran Lakecity University",
          shortName: "JLU",
        },
      })
      console.log("✅ University created")
    }

    // Create Design Department
    let department = await db.department.findFirst({ where: { shortName: "DESIGN" } })
    if (!department) {
      department = await db.department.create({
        data: {
          name: "School of Design",
          shortName: "DESIGN",
          universityId: university.id,
        },
      })
      console.log("✅ Department created")
    }

    // Create B.Des Program
    let program = await db.program.findFirst({ where: { shortName: "B.Des" } })
    if (!program) {
      program = await db.program.create({
        data: {
          name: "Bachelor of Design",
          shortName: "B.Des",
          duration: 4,
          totalSems: 8,
          programType: "UNDERGRADUATE",
          departmentId: department.id,
          isActive: true,
        },
      })
      console.log("✅ Program created")
    }

    // Create Time Slots (based on Excel timetable structure)
    const timeSlotData = [
      { name: "09:30-10:30", startTime: "09:30", endTime: "10:30", duration: 60, sortOrder: 1 },
      { name: "10:30-11:30", startTime: "10:30", endTime: "11:30", duration: 60, sortOrder: 2 },
      { name: "11:30-12:30", startTime: "11:30", endTime: "12:30", duration: 60, sortOrder: 3 },
      // Lunch break (12:30 - 13:30)
      { name: "13:30-14:30", startTime: "13:30", endTime: "14:30", duration: 60, sortOrder: 4 },
      { name: "14:30-15:30", startTime: "14:30", endTime: "15:30", duration: 60, sortOrder: 5 },
      { name: "15:30-16:30", startTime: "15:30", endTime: "16:30", duration: 60, sortOrder: 6 },
    ]

    const timeSlots = []
    for (const slotData of timeSlotData) {
      let timeSlot = await db.timeSlot.findFirst({ where: { name: slotData.name } })
      if (!timeSlot) {
        timeSlot = await db.timeSlot.create({ data: slotData })
      }
      timeSlots.push(timeSlot)
    }
    console.log("✅ Time slots created")

    // Create Admin User ONLY
    const adminUser = await db.user.upsert({
      where: { email: "admin@jlu.edu.in" },
      update: { departmentId: department.id },
      create: {
        email: "admin@jlu.edu.in",
        name: "System Admin",
        role: "ADMIN",
        employeeId: "ADMIN001",
        departmentId: department.id,
        status: "ACTIVE",
      },
    })

    // Add existing Ankish faculty ONLY
    const ankishFaculty = await db.user.upsert({
      where: { email: "ankish.khatri@jlu.edu.in" },
      update: { departmentId: department.id },
      create: {
        email: "ankish.khatri@jlu.edu.in",
        name: "Ankish Khatri",
        role: "FACULTY",
        employeeId: "JLU618",
        departmentId: department.id,
        status: "ACTIVE",
      },
    })
    console.log("✅ Real users created (Admin + Ankish only)")

    // Create ONLY B.Des Semester 7 batch for Excel timetable import
    let batch7 = await db.batch.findFirst({ 
      where: { 
        name: "B.Des Semester 7",
        programId: program.id 
      } 
    })
    
    if (!batch7) {
      batch7 = await db.batch.create({
        data: {
          name: "B.Des Semester 7",
          programId: program.id,
          semester: 7,
          startYear: 2024,
          endYear: 2025,
          isActive: true,
          semType: "ODD",
          maxCapacity: 30,
          currentStrength: 0,
        },
      })
    }
    console.log(`✅ Created B.Des Semester 7 batch ONLY (no fake data)`)

    console.log("\n🎉 CLEAN database seeding completed!")
    console.log("📊 Summary (NO FAKE DATA):")
    console.log(`   • University: ${university.name}`)
    console.log(`   • Department: ${department.name}`)
    console.log(`   • Program: ${program.name}`)
    console.log(`   • Batch: B.Des Semester 7 (ONLY)`)
    console.log(`   • Faculty: Ankish Khatri (ONLY)`)
    console.log(`   • Subjects: 0 (will be added from Excel)`)
    console.log(`   • Time Slots: ${timeSlots.length}`)
    console.log(`   • Students: 0 (will be added as needed)`)
    console.log("\n🔐 Login Credentials:")
    console.log("   Admin: admin@jlu.edu.in / admin123")
    console.log("   Faculty: ankish.khatri@jlu.edu.in / password123")
    
  } catch (error) {
    console.error("❌ Error seeding database:", error)
  } finally {
    await db.$disconnect()
  }
}

seedDatabase()