import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function verifySeedData() {
  try {
    console.log("🔍 Verifying seeded data...\n")

    // Check basic structure
    const university = await db.university.findFirst()
    const department = await db.department.findFirst()
    const program = await db.program.findFirst()
    
    console.log("🏛️ Institution Structure:")
    console.log(`   University: ${university?.name} (${university?.shortName})`)
    console.log(`   Department: ${department?.name} (${department?.shortName})`)
    console.log(`   Program: ${program?.name} (${program?.shortName})\n`)

    // Check batches and students
    const batches = await db.batch.findMany({
      include: {
        students: true,
        subjects: true,
      }
    })

    console.log("📚 Batches and Students:")
    for (const batch of batches) {
      console.log(`   ${batch.name}: ${batch.students.length} students, ${batch.subjects.length} subjects`)
    }
    console.log()

    // Check faculty
    const faculty = await db.user.findMany({
      where: { role: "FACULTY" },
      include: {
        primarySubjects: true,
      }
    })

    console.log("👩‍🏫 Faculty:")
    for (const f of faculty) {
      console.log(`   ${f.name} (${f.employeeId}): ${f.primarySubjects.length} subjects`)
    }
    console.log()

    // Check time slots
    const timeSlots = await db.timeSlot.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    console.log("⏰ Time Slots:")
    for (const slot of timeSlots) {
      console.log(`   ${slot.name} (${slot.duration} min)`)
    }
    console.log()

    // Check timetable entries
    const totalEntries = await db.timetableEntry.count()
    const sundayEntries = await db.timetableEntry.count({
      where: {
        dayOfWeek: "SUNDAY",
        date: new Date("2025-07-20")
      }
    })

    console.log("📅 Timetable:")
    console.log(`   Total entries: ${totalEntries}`)
    console.log(`   Sunday July 20, 2025 entries: ${sundayEntries}`)
    console.log()

    // Sample timetable for one batch
    const sampleBatch = batches[0]
    const sampleEntries = await db.timetableEntry.findMany({
      where: { batchId: sampleBatch.id },
      include: {
        subject: true,
        faculty: true,
        timeSlot: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlot: { sortOrder: 'asc' } }
      ],
      take: 5
    })

    console.log(`📋 Sample Timetable for ${sampleBatch.name} (first 5 entries):`)
    for (const entry of sampleEntries) {
      console.log(`   ${entry.dayOfWeek} ${entry.timeSlot.name}: ${entry.subject?.name || 'No Subject'} by ${entry.faculty?.name || 'No Faculty'}`)
    }
    console.log()

    console.log("✅ Database verification complete!")
    
  } catch (error) {
    console.error("❌ Error verifying data:", error)
  } finally {
    await db.$disconnect()
  }
}

verifySeedData()