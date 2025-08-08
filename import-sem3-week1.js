#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importSem3Week1() {
  try {
    console.log('🚀 Starting Semester 3 Week 1 import...');
    
    // 1. Find Design department
    const department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });
    
    if (!department) {
      throw new Error('Design department not found. Please ensure the database is properly seeded.');
    }
    console.log(`✅ Found department: ${department.name}`);
    
    // 2. Find or create M.Des program
    let program = await prisma.program.findFirst({
      where: { 
        departmentId: department.id,
        name: { contains: "M.Des" }
      }
    });
    
    if (!program) {
      program = await prisma.program.create({
        data: {
          name: "Master of Design",
          shortName: "M.Des",
          duration: 2,
          totalSems: 4,
          programType: "POSTGRADUATE",
          departmentId: department.id,
          isActive: true
        }
      });
      console.log(`✅ Created program: ${program.name}`);
    } else {
      console.log(`✅ Found program: ${program.name}`);
    }
    
    // 3. Find or create UX specialization
    let specialization = await prisma.specialization.findFirst({
      where: { 
        name: { contains: "UX" },
        programId: program.id
      }
    });
    
    if (!specialization) {
      specialization = await prisma.specialization.create({
        data: {
          name: "User Experience Design",
          shortName: "UX",
          programId: program.id,
          isActive: true
        }
      });
      console.log(`✅ Created specialization: ${specialization.name}`);
    } else {
      console.log(`✅ Found specialization: ${specialization.name}`);
    }
    
    // 4. Find or create Semester 3 batch
    let batch = await prisma.batch.findFirst({
      where: { name: "M.Des UX Semester 3" }
    });
    
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          name: "M.Des UX Semester 3",
          programId: program.id,
          specializationId: specialization.id,
          semester: 3,
          startYear: 2024,
          endYear: 2026,
          maxCapacity: 25,
          currentStrength: 0,
          semType: "ODD",
          isActive: true
        }
      });
      console.log(`✅ Created batch: ${batch.name}`);
    } else {
      console.log(`✅ Found batch: ${batch.name}`);
    }
    
    // 5. Get time slots
    const timeSlots = await prisma.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    if (timeSlots.length === 0) {
      throw new Error('No active time slots found. Please ensure time slots are configured.');
    }
    
    console.log(`✅ Found ${timeSlots.length} time slots`);
    
    // 6. Create Week 1 entries based on the screenshot
    const week1Data = [
      // Monday 21 July 2025 - ORIENTATION
      { date: '2025-07-21', dayOfWeek: 'MONDAY', eventTitle: 'ORIENTATION' },
      // Tuesday 22 July 2025 - ORIENTATION  
      { date: '2025-07-22', dayOfWeek: 'TUESDAY', eventTitle: 'ORIENTATION' },
      // Wednesday 23 July 2025 - SUMMER INTERNSHIP
      { date: '2025-07-23', dayOfWeek: 'WEDNESDAY', eventTitle: 'SUMMER INTERNSHIP' },
      // Thursday 24 July 2025 - SUMMER INTERNSHIP
      { date: '2025-07-24', dayOfWeek: 'THURSDAY', eventTitle: 'SUMMER INTERNSHIP' },
      // Friday 25 July 2025 - SUMMER INTERNSHIP
      { date: '2025-07-25', dayOfWeek: 'FRIDAY', eventTitle: 'SUMMER INTERNSHIP' }
    ];
    
    let entriesCreated = 0;
    
    // Create entries for each day and each time slot
    for (const dayData of week1Data) {
      console.log(`\n📅 Processing ${dayData.dayOfWeek} - ${dayData.eventTitle}`);
      
      // Create entries for main time slots (skip lunch break)
      for (const timeSlot of timeSlots) {
        // Skip lunch break time slot
        if (timeSlot.name.toLowerCase().includes('lunch') || 
            timeSlot.name.toLowerCase().includes('break')) {
          continue;
        }
        
        // Check if entry already exists
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            batchId: batch.id,
            dayOfWeek: dayData.dayOfWeek,
            timeSlotId: timeSlot.id,
            date: new Date(dayData.date)
          }
        });
        
        if (existingEntry) {
          console.log(`   ⚠️  Entry already exists for ${timeSlot.name}`);
          continue;
        }
        
        // Determine color based on event type
        const eventColor = dayData.eventTitle === 'ORIENTATION' ? '#10b981' : '#f59e0b';
        
        // Create timetable entry
        await prisma.timetableEntry.create({
          data: {
            batchId: batch.id,
            dayOfWeek: dayData.dayOfWeek,
            timeSlotId: timeSlot.id,
            date: new Date(dayData.date),
            customEventTitle: dayData.eventTitle,
            customEventColor: eventColor,
            entryType: 'EVENT',
            requiresAttendance: dayData.eventTitle === 'ORIENTATION', // ORIENTATION requires attendance
            notes: `${dayData.eventTitle} - Week 1 of Semester 3`,
            isActive: true
          }
        });
        
        entriesCreated++;
      }
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Timetable entries created: ${entriesCreated}`);
    console.log(`   - Batch: ${batch.name}`);
    console.log(`   - Week: July 21-25, 2025`);
    console.log(`   - Events: ORIENTATION (Mon-Tue), SUMMER INTERNSHIP (Wed-Fri)`);
    
    console.log('\n🎯 Semester 3 Week 1 data should now be visible in the timetable!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importSem3Week1();