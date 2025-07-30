import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

const db = new PrismaClient()

// Helper functions
function generateStudentId(semester: number, index: number): string {
  return `2024BDES${semester.toString().padStart(2, '0')}${(index + 1).toString().padStart(3, '0')}`
}

function generateRollNumber(semester: number, index: number): string {
  return `BDES${semester}/24/${(index + 1).toString().padStart(2, '0')}`
}

function generateEmail(name: string, counter: number): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}.${counter}@jlu.edu.in`
}

// Sample student names
const studentNames = [
  "Aarav Sharma", "Vivaan Gupta", "Aditya Kumar", "Vihaan Singh", "Arjun Verma",
  "Sai Patel", "Reyansh Jain", "Ayaan Khan", "Krishna Yadav", "Ishaan Agarwal",
  "Shaurya Rajput", "Atharv Mishra", "Rudra Saxena", "Aadhya Singh", "Diya Sharma",
  "Saanvi Gupta", "Ananya Patel", "Kavya Kumar", "Aanya Verma", "Myra Jain",
  "Pihu Khan", "Anvi Yadav", "Riya Agarwal", "Shanaya Rajput", "Navya Mishra",
  "Kiara Saxena", "Aarohi Singh", "Avni Sharma", "Prisha Gupta", "Anushka Patel",
  "Tara Kumar", "Ira Verma", "Zara Jain", "Niya Khan", "Drishti Yadav",
  "Mishka Agarwal", "Sara Rajput", "Reet Mishra", "Vanya Saxena", "Mysha Singh"
]

// Faculty data
const facultyData = [
  { name: "Dr. Priya Sharma", email: "priya.sharma@jlu.edu.in", empId: "FAC001" },
  { name: "Prof. Rajesh Kumar", email: "rajesh.kumar@jlu.edu.in", empId: "FAC002" },
  { name: "Dr. Neha Gupta", email: "neha.gupta@jlu.edu.in", empId: "FAC003" },
  { name: "Prof. Amit Verma", email: "amit.verma@jlu.edu.in", empId: "FAC004" }
]

// Subjects by semester
const subjectsBySemester = {
  3: [
    { name: "Design Thinking", code: "DT301", credits: 4, hours: 60, type: "CORE", exam: "THEORY" },
    { name: "Typography", code: "TY302", credits: 4, hours: 60, type: "CORE", exam: "PRACTICAL" },
    { name: "Digital Design", code: "DD303", credits: 4, hours: 60, type: "CORE", exam: "PRACTICAL" },
    { name: "Brand Identity", code: "BI304", credits: 4, hours: 60, type: "CORE", exam: "PROJECT" },
    { name: "User Experience", code: "UX305", credits: 4, hours: 60, type: "CORE", exam: "PRACTICAL" },
    { name: "Design History", code: "DH306", credits: 2, hours: 30, type: "ELECTIVE", exam: "THEORY" }
  ],
  5: [
    { name: "Advanced Typography", code: "AT501", credits: 4, hours: 60, type: "CORE", exam: "PRACTICAL" },
    { name: "Packaging Design", code: "PD502", credits: 4, hours: 60, type: "CORE", exam: "PROJECT" },
    { name: "Motion Graphics", code: "MG503", credits: 4, hours: 60, type: "CORE", exam: "PRACTICAL" },
    { name: "Portfolio Development", code: "PF504", credits: 4, hours: 60, type: "CORE", exam: "PROJECT" },
    { name: "Design Research", code: "DR505", credits: 2, hours: 30, type: "ELECTIVE", exam: "THEORY" },
    { name: "Professional Practice", code: "PP506", credits: 2, hours: 30, type: "ELECTIVE", exam: "VIVA" }
  ],
  7: [
    { name: "Thesis Project", code: "TP701", credits: 8, hours: 120, type: "CORE", exam: "PROJECT" },
    { name: "Design Management", code: "DM702", credits: 4, hours: 60, type: "CORE", exam: "THEORY" },
    { name: "Entrepreneurship", code: "EN703", credits: 4, hours: 60, type: "CORE", exam: "THEORY" },
    { name: "Advanced Portfolio", code: "AP704", credits: 4, hours: 60, type: "CORE", exam: "PROJECT" },
    { name: "Industry Collaboration", code: "IC705", credits: 4, hours: 60, type: "ELECTIVE", exam: "PROJECT" },
    { name: "Design Ethics", code: "DE706", credits: 2, hours: 30, type: "ELECTIVE", exam: "THEORY" }
  ]
}

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

    // Create Time Slots (9:45 to 3:15 with 1 hour break)
    const timeSlotData = [
      { name: "09:45-10:35", startTime: "09:45", endTime: "10:35", duration: 50, sortOrder: 1 },
      { name: "10:35-11:25", startTime: "10:35", endTime: "11:25", duration: 50, sortOrder: 2 },
      { name: "11:45-12:35", startTime: "11:45", endTime: "12:35", duration: 50, sortOrder: 3 }, // 20 min break
      { name: "12:35-13:25", startTime: "12:35", endTime: "13:25", duration: 50, sortOrder: 4 },
      // 1 hour lunch break (13:25 - 14:25)
      { name: "14:25-15:15", startTime: "14:25", endTime: "15:15", duration: 50, sortOrder: 5 },
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

    // Create Admin User
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

    // Create Faculty Users
    const faculties = []
    for (const facultyInfo of facultyData) {
      const faculty = await db.user.upsert({
        where: { email: facultyInfo.email },
        update: { departmentId: department.id },
        create: {
          name: facultyInfo.name,
          email: facultyInfo.email,
          role: "FACULTY",
          employeeId: facultyInfo.empId,
          departmentId: department.id,
          status: "ACTIVE",
        },
      })
      faculties.push(faculty)
    }

    // Add existing Ankish faculty
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
    faculties.push(ankishFaculty)
    console.log("✅ Faculty created (5 total)")

    // Create Batches (3 batches: Semester 3, 5, 7)
    const batchData = [
      { name: "B.Des Semester 3", semester: 3, startYear: 2024, endYear: 2025, semType: "ODD" },
      { name: "B.Des Semester 5", semester: 5, startYear: 2024, endYear: 2025, semType: "ODD" },
      { name: "B.Des Semester 7", semester: 7, startYear: 2024, endYear: 2025, semType: "ODD" }
    ]

    const batches = []
    let studentCounter = 1

    for (const batchInfo of batchData) {
      let batch = await db.batch.findFirst({ 
        where: { 
          name: batchInfo.name,
          programId: program.id 
        } 
      })
      
      if (!batch) {
        batch = await db.batch.create({
          data: {
            name: batchInfo.name,
            programId: program.id,
            semester: batchInfo.semester,
            startYear: batchInfo.startYear,
            endYear: batchInfo.endYear,
            isActive: true,
            semType: batchInfo.semType,
            maxCapacity: 30,
            currentStrength: 0,
          },
        })
      }

      // Create 25-30 students for each batch
      const studentsInBatch = 25 + Math.floor(Math.random() * 6) // 25-30 students
      
      for (let i = 0; i < studentsInBatch; i++) {
        const studentName = studentNames[i % studentNames.length]
        const studentUser = await db.user.create({
          data: {
            name: studentName,
            email: generateEmail(studentName, studentCounter),
            role: "STUDENT",
            departmentId: department.id,
            status: "ACTIVE",
          },
        })

        await db.student.create({
          data: {
            userId: studentUser.id,
            studentId: generateStudentId(batch.semester, i),
            rollNumber: generateRollNumber(batch.semester, i),
            batchId: batch.id,
          },
        })

        studentCounter++
      }

      // Update batch strength
      await db.batch.update({
        where: { id: batch.id },
        data: { currentStrength: studentsInBatch },
      })

      batches.push(batch)
      console.log(`✅ Batch ${batch.name} created with ${studentsInBatch} students`)
    }

    // Create Subjects for each batch
    const allSubjects = []
    for (const batch of batches) {
      const subjects = subjectsBySemester[batch.semester as keyof typeof subjectsBySemester]
      
      for (let i = 0; i < subjects.length; i++) {
        const subjectData = subjects[i]
        const facultyIndex = i % faculties.length // Rotate faculty assignments
        
        let subject = await db.subject.findFirst({
          where: { 
            code: subjectData.code,
            batchId: batch.id 
          }
        })

        if (!subject) {
          subject = await db.subject.create({
            data: {
              name: subjectData.name,
              code: subjectData.code,
              credits: subjectData.credits,
              totalHours: subjectData.hours,
              batchId: batch.id,
              primaryFacultyId: faculties[facultyIndex].id,
              examType: subjectData.exam as any,
              subjectType: subjectData.type as any,
              isActive: true,
            },
          })
        }
        allSubjects.push(subject)
      }
      console.log(`✅ Subjects created for ${batch.name}`)
    }

    // Create Timetable Entries for full semester including Sunday July 20, 2025
    const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    
    for (const batch of batches) {
      const batchSubjects = allSubjects.filter(s => s.batchId === batch.id)
      
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const dayOfWeek = days[dayIndex]
        
        // For Sunday July 20, 2025, add special classes
        let specificDate = null
        if (dayOfWeek === "SUNDAY") {
          specificDate = new Date("2025-07-20")
        }
        
        for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
          const timeSlot = timeSlots[slotIndex]
          const subjectIndex = (dayIndex * timeSlots.length + slotIndex) % batchSubjects.length
          const subject = batchSubjects[subjectIndex]
          
          if (subject) {
            const existingEntry = await db.timetableEntry.findFirst({
              where: {
                batchId: batch.id,
                timeSlotId: timeSlot.id,
                dayOfWeek: dayOfWeek as any,
                date: specificDate,
              }
            })

            if (!existingEntry) {
              await db.timetableEntry.create({
                data: {
                  batchId: batch.id,
                  subjectId: subject.id,
                  facultyId: subject.primaryFacultyId!,
                  timeSlotId: timeSlot.id,
                  dayOfWeek: dayOfWeek as any,
                  date: specificDate,
                  entryType: "REGULAR",
                  isActive: true,
                },
              })
            }
          }
        }
      }
      console.log(`✅ Timetable created for ${batch.name}`)
    }

    console.log("\n🎉 Comprehensive database seeding completed!")
    console.log("📊 Summary:")
    console.log(`   • University: ${university.name}`)
    console.log(`   • Department: ${department.name}`)
    console.log(`   • Program: ${program.name}`)
    console.log(`   • Batches: ${batches.length}`)
    console.log(`   • Faculty: ${faculties.length}`)
    console.log(`   • Subjects: ${allSubjects.length}`)
    console.log(`   • Time Slots: ${timeSlots.length}`)
    console.log(`   • Students: ~${batches.length * 27} (25-30 per batch)`)
    console.log("\n🔐 Login Credentials:")
    console.log("   Admin: admin@jlu.edu.in / admin123")
    console.log("   Faculty: [any faculty email] / password123")
    console.log("   Example: priya.sharma@jlu.edu.in / password123")
    
  } catch (error) {
    console.error("❌ Error seeding database:", error)
  } finally {
    await db.$disconnect()
  }
}

seedDatabase()