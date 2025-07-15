import { db } from "@/lib/db"

export async function createSampleTimetableData() {
  try {
    // Get existing data
    const department = await db.department.findFirst({ where: { shortName: "DESIGN" } })
    if (!department) throw new Error("Design department not found")

    const program = await db.program.findFirst({ where: { shortName: "B.Des" } })
    if (!program) throw new Error("B.Des program not found")

    const batch = await db.batch.findFirst({ where: { programId: program.id } })
    if (!batch) {
      console.log("No batch found, creating sample batch...")
      // Create a sample batch if none exists
      const newBatch = await db.batch.create({
        data: {
          name: "B.Des Semester 5",
          programId: program.id,
          semester: 5,
          startYear: 2023,
          endYear: 2027,
          isActive: true
        }
      })
      console.log("Created batch:", newBatch.name)
    }

    // Get or create time slots
    const timeSlots = await db.timeSlot.findMany()
    if (timeSlots.length === 0) {
      console.log("No time slots found, creating sample time slots...")
      await db.timeSlot.createMany({
        data: [
          {
            name: "09:00-10:30",
            startTime: "09:00",
            endTime: "10:30",
            duration: 90,
            sortOrder: 1
          },
          {
            name: "11:00-12:30",
            startTime: "11:00", 
            endTime: "12:30",
            duration: 90,
            sortOrder: 2
          },
          {
            name: "14:00-15:30",
            startTime: "14:00",
            endTime: "15:30", 
            duration: 90,
            sortOrder: 3
          },
          {
            name: "16:00-17:30",
            startTime: "16:00",
            endTime: "17:30",
            duration: 90,
            sortOrder: 4
          }
        ]
      })
      console.log("Created sample time slots")
    }

    // Get faculty
    const faculty = await db.user.findMany({ 
      where: { 
        role: "FACULTY",
        departmentId: department.id 
      } 
    })

    if (faculty.length === 0) {
      console.log("No faculty found, timetable data cannot be created")
      return
    }

    // Get subjects
    const subjects = await db.subject.findMany({
      where: { batchId: batch?.id },
      include: { primaryFaculty: true }
    })

    if (subjects.length === 0) {
      console.log("No subjects found, creating sample subjects...")
      
      const sampleSubjects = [
        {
          name: "Design Fundamentals",
          code: "DF101", 
          credits: 4,
          primaryFacultyId: faculty[0]?.id
        },
        {
          name: "Typography",
          code: "TYP201",
          credits: 3,
          primaryFacultyId: faculty[1]?.id || faculty[0]?.id
        },
        {
          name: "Digital Design",
          code: "DD301",
          credits: 6,
          primaryFacultyId: faculty[0]?.id
        }
      ]

      for (const subject of sampleSubjects) {
        if (batch && subject.primaryFacultyId) {
          await db.subject.create({
            data: {
              ...subject,
              batchId: batch.id,
              totalHours: subject.credits * 15,
              examType: "THEORY",
              subjectType: "CORE"
            }
          })
        }
      }
      console.log("Created sample subjects")
    }

    console.log("Sample timetable data setup completed")
  } catch (error) {
    console.error("Error creating sample timetable data:", error)
  }
}

// Function to run the sample data creation
export async function runSampleDataCreation() {
  await createSampleTimetableData()
}