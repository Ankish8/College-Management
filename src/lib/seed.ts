import { db } from "@/lib/db"
import { PrismaClient } from "@prisma/client"

async function seedDatabase() {
  try {
    // Create University
    let university = await db.university.findFirst({ where: { shortName: "JLU" } })
    if (!university) {
      university = await db.university.create({
        data: {
          name: "Jagran Lakecity University",
          shortName: "JLU",
        },
      })
    }

    // Create Design Department
    let department = await db.department.findFirst({ where: { shortName: "DESIGN" } })
    if (!department) {
      department = await db.department.create({
        data: {
          name: "Design Department",
          shortName: "DESIGN",
          universityId: university.id,
        },
      })
    }

    // Create B.Des Program
    let bdesProgram = await db.program.findFirst({ where: { shortName: "B.Des" } })
    if (!bdesProgram) {
      bdesProgram = await db.program.create({
        data: {
          name: "Bachelor of Design",
          shortName: "B.Des",
          duration: 4,
          totalSems: 8,
          programType: "UNDERGRADUATE",
          departmentId: department.id,
        },
      })
    }

    // Create M.Des Program
    let mdesProgram = await db.program.findFirst({ where: { shortName: "M.Des" } })
    if (!mdesProgram) {
      mdesProgram = await db.program.create({
        data: {
          name: "Master of Design",
          shortName: "M.Des",
          duration: 2,
          totalSems: 4,
          programType: "POSTGRADUATE",
          departmentId: department.id,
        },
      })
    }

    // Create Specializations for B.Des
    const bdesSpecializations = [
      { name: "User Experience Design", shortName: "UX" },
      { name: "Graphic Design", shortName: "GD" },
      { name: "Product Design", shortName: "PD" },
      { name: "Interior Design", shortName: "ID" },
    ]

    for (const spec of bdesSpecializations) {
      await db.specialization.upsert({
        where: {
          programId_shortName: {
            programId: bdesProgram.id,
            shortName: spec.shortName,
          },
        },
        update: {},
        create: {
          name: spec.name,
          shortName: spec.shortName,
          programId: bdesProgram.id,
        },
      })
    }

    // Create Specializations for M.Des
    const mdesSpecializations = [
      { name: "Design Research", shortName: "DR" },
      { name: "Digital Design", shortName: "DD" },
    ]

    for (const spec of mdesSpecializations) {
      await db.specialization.upsert({
        where: {
          programId_shortName: {
            programId: mdesProgram.id,
            shortName: spec.shortName,
          },
        },
        update: {},
        create: {
          name: spec.name,
          shortName: spec.shortName,
          programId: mdesProgram.id,
        },
      })
    }

    // Create Admin User
    const adminUser = await db.user.upsert({
      where: { email: "admin@jlu.edu.in" },
      update: {},
      create: {
        email: "admin@jlu.edu.in",
        name: "System Admin",
        role: "ADMIN",
        employeeId: "ADMIN001",
        departmentId: department.id,
      },
    })

    // Create Faculty User
    const facultyUser = await db.user.upsert({
      where: { email: "ankish.khatri@jlu.edu.in" },
      update: {},
      create: {
        email: "ankish.khatri@jlu.edu.in",
        name: "Ankish Khatri",
        role: "FACULTY",
        employeeId: "JLU618",
        departmentId: department.id,
      },
    })

    // Create Sample Batches
    let batch5 = await db.batch.findFirst({ where: { name: "B.Des Semester 5" } })
    if (!batch5) {
      batch5 = await db.batch.create({
        data: {
          name: "B.Des Semester 5",
          programId: bdesProgram.id,
          semester: 5,
          startYear: 2022,
          endYear: 2025,
          semType: "ODD",
        },
      })
    }

    let batch6 = await db.batch.findFirst({ where: { name: "B.Des Semester 6" } })
    if (!batch6) {
      batch6 = await db.batch.create({
        data: {
          name: "B.Des Semester 6",
          programId: bdesProgram.id,
          semester: 6,
          startYear: 2022,
          endYear: 2025,
          semType: "EVEN",
        },
      })
    }

    // Create Sample Time Slots
    const timeSlots = [
      { name: "9:15-10:05", startTime: "09:15", endTime: "10:05", duration: 50, sortOrder: 1 },
      { name: "10:15-11:05", startTime: "10:15", endTime: "11:05", duration: 50, sortOrder: 2 },
      { name: "11:15-12:05", startTime: "11:15", endTime: "12:05", duration: 50, sortOrder: 3 },
      { name: "12:15-13:05", startTime: "12:15", endTime: "13:05", duration: 50, sortOrder: 4 },
      { name: "14:15-15:05", startTime: "14:15", endTime: "15:05", duration: 50, sortOrder: 5 },
      { name: "15:15-16:05", startTime: "15:15", endTime: "16:05", duration: 50, sortOrder: 6 },
    ]

    for (const slot of timeSlots) {
      const existing = await db.timeSlot.findFirst({ where: { name: slot.name } })
      if (!existing) {
        await db.timeSlot.create({ data: slot })
      }
    }

    // Create Sample Subjects
    const gamificationSubject = await db.subject.upsert({
      where: { code: "JSD012" },
      update: {},
      create: {
        name: "Gamification & UX",
        code: "JSD012",
        credits: 4,
        totalHours: 60,
        batchId: batch5.id,
        primaryFacultyId: facultyUser.id,
        examType: "THEORY",
        subjectType: "CORE",
        description: "Understanding gamification principles and UX design",
      },
    })

    // Create Sample Student
    const studentUser = await db.user.upsert({
      where: { email: "virat@student.jlu.edu.in" },
      update: {},
      create: {
        email: "virat@student.jlu.edu.in",
        name: "Virat Kohli",
        role: "STUDENT",
        departmentId: department.id,
      },
    })

    const student = await db.student.upsert({
      where: { studentId: "2022BDS001" },
      update: {},
      create: {
        userId: studentUser.id,
        studentId: "2022BDS001",
        rollNumber: "BDS22001",
        batchId: batch5.id,
        guardianName: "Virat's Father",
        guardianPhone: "8962412368",
      },
    })

    console.log("Database seeded successfully!")
    console.log("Admin login: admin@jlu.edu.in / admin123")
    console.log("Faculty login: ankish.khatri@jlu.edu.in / password123")
    console.log("Student login: virat@student.jlu.edu.in / password123")
    
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await db.$disconnect()
  }
}

seedDatabase()