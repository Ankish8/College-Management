#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importBDesSem3Week1() {
  try {
    console.log('🚀 Starting B.Des UX Semester 3 Week 1 import...');
    
    // 1. Find existing B-Des UX Sem-3 batch
    const batch = await prisma.batch.findFirst({
      where: { name: "B-Des UX Sem-3" },
      include: { program: true, specialization: true }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-3 batch not found. Please ensure the batch exists.');
    }
    console.log(`✅ Found batch: ${batch.name}`);
    
    // 2. Find Design department
    const department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });
    
    if (!department) {
      throw new Error('Design department not found.');
    }
    console.log(`✅ Found department: ${department.name}`);
    
    // 3. Get time slots
    const timeSlots = await prisma.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    if (timeSlots.length === 0) {
      throw new Error('No active time slots found.');
    }
    console.log(`✅ Found ${timeSlots.length} time slots`);
    
    // 4. Find or create subjects and faculty
    console.log('\n📚 Setting up subjects and faculty...');
    
    // Introduction to Semiotics
    let semioticsSubject = await prisma.subject.findFirst({
      where: { 
        name: { contains: "Introduction to Semiotics" },
        batchId: batch.id
      }
    });
    
    if (!semioticsSubject) {
      // Find or create faculty for Semiotics (based on existing data from backup)
      let semioticsFaculty = await prisma.user.findFirst({
        where: { 
          email: "madhu.toppo@jlu.edu.in",
          role: 'FACULTY'
        }
      });
      
      if (!semioticsFaculty) {
        semioticsFaculty = await prisma.user.create({
          data: {
            name: "Madhu Toppo",
            email: "madhu.toppo@jlu.edu.in",
            role: 'FACULTY',
            status: 'ACTIVE',
            departmentId: department.id
          }
        });
        console.log(`✅ Created faculty: ${semioticsFaculty.name}`);
      }
      
      semioticsSubject = await prisma.subject.create({
        data: {
          name: "Introduction to Semiotics",
          code: "SEM301",
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          primaryFacultyId: semioticsFaculty.id,
          examType: "THEORY",
          subjectType: "CORE",
          isActive: true
        }
      });
      console.log(`✅ Created subject: ${semioticsSubject.name}`);
    }
    
    // Design Thinking Application
    let designThinkingSubject = await prisma.subject.findFirst({
      where: { 
        name: { contains: "Design Thinking Application" },
        batchId: batch.id
      }
    });
    
    if (!designThinkingSubject) {
      // Find or create faculty for Design Thinking (based on existing data)
      let designFaculty = await prisma.user.findFirst({
        where: { 
          email: "sushmita.shahi@jlu.edu.in",
          role: 'FACULTY'
        }
      });
      
      if (!designFaculty) {
        designFaculty = await prisma.user.create({
          data: {
            name: "Sushmita Shahi",
            email: "sushmita.shahi@jlu.edu.in",
            role: 'FACULTY',
            status: 'ACTIVE',
            departmentId: department.id
          }
        });
        console.log(`✅ Created faculty: ${designFaculty.name}`);
      }
      
      designThinkingSubject = await prisma.subject.create({
        data: {
          name: "Design Thinking Application",
          code: "DTA301",
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          primaryFacultyId: designFaculty.id,
          examType: "THEORY",
          subjectType: "CORE",
          isActive: true
        }
      });
      console.log(`✅ Created subject: ${designThinkingSubject.name}`);
    }
    
    // 5. Create Week 1 timetable entries
    console.log('\n📅 Creating Week 1 timetable entries...');
    let entriesCreated = 0;
    
    // Monday 21 July 2025 - ORIENTATION (all time slots)
    const mondayTimeSlots = timeSlots.filter(ts => !ts.name.toLowerCase().includes('lunch'));
    for (const timeSlot of mondayTimeSlots) {
      const existingEntry = await prisma.timetableEntry.findFirst({
        where: {
          batchId: batch.id,
          dayOfWeek: 'MONDAY',
          timeSlotId: timeSlot.id,
          date: new Date('2025-07-21')
        }
      });
      
      if (!existingEntry) {
        await prisma.timetableEntry.create({
          data: {
            batchId: batch.id,
            dayOfWeek: 'MONDAY',
            timeSlotId: timeSlot.id,
            date: new Date('2025-07-21'),
            customEventTitle: 'ORIENTATION',
            customEventColor: '#10b981',
            entryType: 'EVENT',
            requiresAttendance: true,
            notes: 'Semester 3 Orientation - Week 1',
            isActive: true
          }
        });
        entriesCreated++;
      }
    }
    
    // Tuesday 22 July 2025 - ORIENTATION (all time slots)
    for (const timeSlot of mondayTimeSlots) {
      const existingEntry = await prisma.timetableEntry.findFirst({
        where: {
          batchId: batch.id,
          dayOfWeek: 'TUESDAY',
          timeSlotId: timeSlot.id,
          date: new Date('2025-07-22')
        }
      });
      
      if (!existingEntry) {
        await prisma.timetableEntry.create({
          data: {
            batchId: batch.id,
            dayOfWeek: 'TUESDAY',
            timeSlotId: timeSlot.id,
            date: new Date('2025-07-22'),
            customEventTitle: 'ORIENTATION',
            customEventColor: '#10b981',
            entryType: 'EVENT',
            requiresAttendance: true,
            notes: 'Semester 3 Orientation - Week 1',
            isActive: true
          }
        });
        entriesCreated++;
      }
    }
    
    // Wednesday-Friday: Subject classes
    const classSchedule = [
      {
        date: '2025-07-23',
        dayOfWeek: 'WEDNESDAY',
        morning: { subject: semioticsSubject, faculty: semioticsSubject.primaryFacultyId },
        afternoon: { subject: designThinkingSubject, faculty: designThinkingSubject.primaryFacultyId }
      },
      {
        date: '2025-07-24',
        dayOfWeek: 'THURSDAY',
        morning: { subject: semioticsSubject, faculty: semioticsSubject.primaryFacultyId },
        afternoon: { subject: designThinkingSubject, faculty: designThinkingSubject.primaryFacultyId }
      },
      {
        date: '2025-07-25',
        dayOfWeek: 'FRIDAY',
        morning: { subject: semioticsSubject, faculty: semioticsSubject.primaryFacultyId },
        afternoon: { subject: designThinkingSubject, faculty: designThinkingSubject.primaryFacultyId }
      }
    ];
    
    for (const schedule of classSchedule) {
      // Morning slots (9:30 AM - 12:30 PM) - Introduction to Semiotics
      const morningSlots = timeSlots.filter(ts => {
        const startHour = parseInt(ts.startTime.split(':')[0]);
        return startHour >= 9 && startHour < 13 && !ts.name.toLowerCase().includes('lunch');
      });
      
      for (const timeSlot of morningSlots) {
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            batchId: batch.id,
            dayOfWeek: schedule.dayOfWeek,
            timeSlotId: timeSlot.id,
            date: new Date(schedule.date)
          }
        });
        
        if (!existingEntry) {
          await prisma.timetableEntry.create({
            data: {
              batchId: batch.id,
              dayOfWeek: schedule.dayOfWeek,
              timeSlotId: timeSlot.id,
              date: new Date(schedule.date),
              subjectId: schedule.morning.subject.id,
              facultyId: schedule.morning.faculty,
              entryType: 'REGULAR',
              requiresAttendance: true,
              notes: 'Regular class - Week 1',
              isActive: true
            }
          });
          entriesCreated++;
        }
      }
      
      // Afternoon slots (1:30 PM - 4:30 PM) - Design Thinking Application
      const afternoonSlots = timeSlots.filter(ts => {
        const startHour = parseInt(ts.startTime.split(':')[0]);
        return startHour >= 13 && startHour < 17;
      });
      
      for (const timeSlot of afternoonSlots) {
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            batchId: batch.id,
            dayOfWeek: schedule.dayOfWeek,
            timeSlotId: timeSlot.id,
            date: new Date(schedule.date)
          }
        });
        
        if (!existingEntry) {
          await prisma.timetableEntry.create({
            data: {
              batchId: batch.id,
              dayOfWeek: schedule.dayOfWeek,
              timeSlotId: timeSlot.id,
              date: new Date(schedule.date),
              subjectId: schedule.afternoon.subject.id,
              facultyId: schedule.afternoon.faculty,
              entryType: 'REGULAR',
              requiresAttendance: true,
              notes: 'Regular class - Week 1',
              isActive: true
            }
          });
          entriesCreated++;
        }
      }
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Timetable entries created: ${entriesCreated}`);
    console.log(`   - Batch: ${batch.name}`);
    console.log(`   - Week: July 21-25, 2025`);
    console.log(`   - Monday-Tuesday: ORIENTATION events`);
    console.log(`   - Wednesday-Friday: Introduction to Semiotics (morning) + Design Thinking Application (afternoon)`);
    
    console.log('\n🎯 B.Des UX Semester 3 Week 1 data should now be visible in the timetable!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importBDesSem3Week1();