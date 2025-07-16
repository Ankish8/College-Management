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

    // Create Department Settings
    await db.departmentSettings.upsert({
      where: { departmentId: department.id },
      update: {},
      create: {
        departmentId: department.id,
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
        schedulingMode: "MODULE_BASED",
        autoCreateAttendance: true,
      },
    })

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
      update: {
        departmentId: department.id, // Ensure department ID is set
      },
      create: {
        email: "admin@jlu.edu.in",
        name: "System Admin",
        role: "ADMIN",
        employeeId: "ADMIN001",
        departmentId: department.id,
      },
    })

    // Create Faculty Users
    const facultyUsers = [
      {
        email: "ankish.khatri@jlu.edu.in",
        name: "Ankish Khatri",
        employeeId: "JLU618",
      },
      {
        email: "dr.neha.gupta@jlu.edu.in",
        name: "Dr. Neha Gupta",
        employeeId: "JLU501",
      },
      {
        email: "dr.priya.sharma@jlu.edu.in",
        name: "Dr. Priya Sharma",
        employeeId: "JLU502",
      },
      {
        email: "prof.amit.patel@jlu.edu.in",
        name: "Prof. Amit Patel",
        employeeId: "JLU503",
      },
      {
        email: "prof.rajesh.kumar@jlu.edu.in",
        name: "Prof. Rajesh Kumar",
        employeeId: "JLU504",
      },
      {
        email: "dr.kavita.singh@jlu.edu.in",
        name: "Dr. Kavita Singh",
        employeeId: "JLU505",
      },
      {
        email: "prof.rahul.verma@jlu.edu.in",
        name: "Prof. Rahul Verma",
        employeeId: "JLU506",
      },
      {
        email: "dr.anjali.mehta@jlu.edu.in",
        name: "Dr. Anjali Mehta",
        employeeId: "JLU507",
      },
      {
        email: "prof.sanjay.joshi@jlu.edu.in",
        name: "Prof. Sanjay Joshi",
        employeeId: "JLU508",
      },
      {
        email: "dr.pooja.agarwal@jlu.edu.in",
        name: "Dr. Pooja Agarwal",
        employeeId: "JLU509",
      },
      {
        email: "prof.vikram.singh@jlu.edu.in",
        name: "Prof. Vikram Singh",
        employeeId: "JLU510",
      },
      {
        email: "dr.ritu.sharma@jlu.edu.in",
        name: "Dr. Ritu Sharma",
        employeeId: "JLU511",
      },
    ]

    const createdFaculty = []
    for (const faculty of facultyUsers) {
      const facultyUser = await db.user.upsert({
        where: { email: faculty.email },
        update: {},
        create: {
          email: faculty.email,
          name: faculty.name,
          role: "FACULTY",
          employeeId: faculty.employeeId,
          departmentId: department.id,
        },
      })
      createdFaculty.push(facultyUser)
    }

    // Use the first faculty user for backward compatibility
    const facultyUser = createdFaculty[0]

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

    // Create Sample Subjects and assign to different faculty members
    const subjects = [
      {
        name: "Digital Prototyping",
        code: "DPR501",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[0].id, // Dr. Neha Gupta
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Advanced digital prototyping techniques"
      },
      {
        name: "User Experience Design",
        code: "UXD501",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[1].id, // Dr. Priya Sharma
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Comprehensive UX design principles"
      },
      {
        name: "Design Thinking",
        code: "DTH301",
        credits: 2,
        totalHours: 30,
        primaryFacultyId: createdFaculty[2].id, // Prof. Amit Patel
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Design thinking methodology"
      },
      {
        name: "Design Research Methods",
        code: "DRM501",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[3].id, // Prof. Rajesh Kumar
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Research methodologies in design"
      },
      {
        name: "Visual Communication",
        code: "VCD301",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[4].id, // Dr. Kavita Singh
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Visual communication principles"
      },
      {
        name: "UX Portfolio Development",
        code: "UXP701",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[5].id, // Prof. Rahul Verma
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Building professional UX portfolios"
      },
      {
        name: "Advanced Interaction Design",
        code: "AID701",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[6].id, // Dr. Anjali Mehta
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Advanced interaction design techniques"
      },
      {
        name: "Typography & Layout",
        code: "TYP301",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[7].id, // Prof. Sanjay Joshi
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Typography and layout design"
      },
      {
        name: "Gamification & UX",
        code: "JSD012",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: facultyUser.id, // Ankish Khatri
        examType: "THEORY" as const,
        subjectType: "CORE" as const,
        description: "Understanding gamification principles and UX design"
      }
    ]

    // Create all subjects
    for (const subject of subjects) {
      await db.subject.upsert({
        where: { code: subject.code },
        update: {},
        create: {
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          totalHours: subject.totalHours,
          batchId: batch5.id,
          primaryFacultyId: subject.primaryFacultyId,
          examType: subject.examType,
          subjectType: subject.subjectType,
          description: subject.description,
        },
      })
    }

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

    // Create real timetable entries for testing drag and drop
    console.log('Creating timetable entries...')
    
    // Get time slots
    const allTimeSlots = await db.timeSlot.findMany()
    const morningSlot = allTimeSlots.find(ts => ts.startTime.includes('10:00')) || allTimeSlots[0]
    const afternoonSlot = allTimeSlots.find(ts => ts.startTime.includes('11:30')) || allTimeSlots[1]
    
    // Get subjects and faculty
    const designFundamentals = await db.subject.findFirst({ where: { code: 'DF101' } })
    const typography = await db.subject.findFirst({ where: { code: 'TYP201' } })
    const faculty = await db.user.findFirst({ where: { role: 'FACULTY' } })
    
    if (designFundamentals && faculty && batch5 && morningSlot) {
      // Create Design Fundamentals class
      await db.timetableEntry.upsert({
        where: { 
          id: 'real-df-monday-10am' 
        },
        update: {},
        create: {
          id: 'real-df-monday-10am',
          batchId: batch5.id,
          subjectId: designFundamentals.id,
          facultyId: faculty.id,
          timeSlotId: morningSlot.id,
          dayOfWeek: 'MONDAY',
          entryType: 'REGULAR',
          isActive: true,
        }
      })
    }
    
    if (typography && faculty && batch5 && afternoonSlot) {
      // Create Typography class
      await db.timetableEntry.upsert({
        where: { 
          id: 'real-typ-tuesday-1130am' 
        },
        update: {},
        create: {
          id: 'real-typ-tuesday-1130am',
          batchId: batch5.id,
          subjectId: typography.id,
          facultyId: faculty.id,
          timeSlotId: afternoonSlot.id,
          dayOfWeek: 'TUESDAY',
          entryType: 'REGULAR',
          isActive: true,
        }
      })
    }

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