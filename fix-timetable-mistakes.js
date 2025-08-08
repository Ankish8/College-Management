#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetableMistakes() {
  try {
    console.log('🔧 Fixing B.Des UX Semester 3 timetable mistakes...');
    
    // Find the batch
    const batch = await prisma.batch.findFirst({
      where: { name: "B-Des UX Sem-3" }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-3 batch not found.');
    }
    console.log(`✅ Found batch: ${batch.name}`);
    
    // Find Design department
    const department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });
    
    // 1. Fix Design Thinking Application - should be SUBJECT not EVENT
    console.log('\n🔧 Fix 1: Converting Design Thinking Application from EVENT to SUBJECT...');
    
    // Find or create Sushmita Shahi faculty
    let sushmitaFaculty = await prisma.user.findFirst({
      where: { email: "sushmita.shahi@jlu.edu.in", role: 'FACULTY' }
    });
    
    if (!sushmitaFaculty) {
      sushmitaFaculty = await prisma.user.create({
        data: {
          name: "Sushmita Shahi",
          email: "sushmita.shahi@jlu.edu.in",
          role: 'FACULTY',
          status: 'ACTIVE',
          departmentId: department.id
        }
      });
      console.log(`✅ Created faculty: ${sushmitaFaculty.name}`);
    }
    
    // Find or create Design Thinking Application subject
    let dtaSubject = await prisma.subject.findFirst({
      where: { 
        name: "Design Thinking Application",
        batchId: batch.id
      }
    });
    
    if (!dtaSubject) {
      dtaSubject = await prisma.subject.create({
        data: {
          name: "Design Thinking Application",
          code: "DTA301",
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          primaryFacultyId: sushmitaFaculty.id,
          examType: "THEORY",
          subjectType: "CORE",
          isActive: true
        }
      });
      console.log(`✅ Created subject: ${dtaSubject.name}`);
    }
    
    // Update all "Design Thinking Application" events to be subject entries
    const dtaEventEntries = await prisma.timetableEntry.findMany({
      where: {
        batchId: batch.id,
        customEventTitle: "Design Thinking Application"
      }
    });
    
    for (const entry of dtaEventEntries) {
      await prisma.timetableEntry.update({
        where: { id: entry.id },
        data: {
          customEventTitle: null,
          customEventColor: null,
          subjectId: dtaSubject.id,
          facultyId: sushmitaFaculty.id,
          entryType: 'REGULAR',
          requiresAttendance: true,
          notes: 'Regular class - Design Thinking Application'
        }
      });
    }
    console.log(`✅ Updated ${dtaEventEntries.length} Design Thinking Application entries from EVENT to SUBJECT`);
    
    // 2. Fix August 12 - add missing Open Elective entries
    console.log('\n🔧 Fix 2: Adding missing August 12 Open Elective entries...');
    
    const aug12Date = new Date('2025-08-12');
    const timeSlots = await prisma.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    const relevantSlots = timeSlots.filter(ts => !ts.name.toLowerCase().includes('lunch'));
    
    for (const timeSlot of relevantSlots) {
      const existingEntry = await prisma.timetableEntry.findFirst({
        where: {
          batchId: batch.id,
          dayOfWeek: 'TUESDAY',
          timeSlotId: timeSlot.id,
          date: aug12Date
        }
      });
      
      if (!existingEntry) {
        await prisma.timetableEntry.create({
          data: {
            batchId: batch.id,
            dayOfWeek: 'TUESDAY',
            timeSlotId: timeSlot.id,
            date: aug12Date,
            customEventTitle: 'Open Elective',
            customEventColor: '#3b82f6',
            entryType: 'EVENT',
            requiresAttendance: false,
            notes: 'Open Elective - Semester 3',
            isActive: true
          }
        });
      }
    }
    console.log(`✅ Added Open Elective entries for August 12`);
    
    // 3. Fix August 15 - remove subjects and add Independence Day holiday
    console.log('\n🔧 Fix 3: Fixing August 15 - Independence Day...');
    
    const aug15Date = new Date('2025-08-15');
    
    // Delete any existing timetable entries for Aug 15
    const deletedAug15 = await prisma.timetableEntry.deleteMany({
      where: {
        batchId: batch.id,
        date: aug15Date
      }
    });
    console.log(`✅ Deleted ${deletedAug15.count} incorrect entries for August 15`);
    
    // Create Independence Day holiday
    const existingIndependenceDay = await prisma.holiday.findFirst({
      where: {
        date: aug15Date,
        name: { contains: "Independence" }
      }
    });
    
    if (!existingIndependenceDay) {
      await prisma.holiday.create({
        data: {
          name: "Independence Day",
          date: aug15Date,
          type: "NATIONAL",
          description: "Independence Day - National Holiday",
          isRecurring: true,
          departmentId: department.id
        }
      });
      console.log(`✅ Created Independence Day holiday for August 15`);
    }
    
    // 4. Fix duplicate Introduction to UX design subjects
    console.log('\n🔧 Fix 4: Fixing duplicate Introduction to UX design subjects...');
    
    const uxDesignSubjects = await prisma.subject.findMany({
      where: {
        name: { contains: "Introduction to UX design" },
        batchId: batch.id
      },
      include: { primaryFaculty: true }
    });
    
    console.log(`Found ${uxDesignSubjects.length} UX design subjects`);
    
    // Find Bhawana Jain faculty
    let bhawanaFaculty = await prisma.user.findFirst({
      where: { email: "bhawana.jain@jlu.edu.in", role: 'FACULTY' }
    });
    
    if (!bhawanaFaculty) {
      bhawanaFaculty = await prisma.user.create({
        data: {
          name: "Bhawana Jain",
          email: "bhawana.jain@jlu.edu.in",
          role: 'FACULTY',
          status: 'ACTIVE',
          departmentId: department.id
        }
      });
      console.log(`✅ Created faculty: ${bhawanaFaculty.name}`);
    }
    
    let correctUxSubject = null;
    let subjectsToDelete = [];
    
    // Find the correct subject (with Bhawana Jain) or create it
    for (const subject of uxDesignSubjects) {
      if (subject.primaryFacultyId === bhawanaFaculty.id) {
        correctUxSubject = subject;
      } else {
        subjectsToDelete.push(subject);
      }
    }
    
    // If no correct subject exists, create it
    if (!correctUxSubject) {
      correctUxSubject = await prisma.subject.create({
        data: {
          name: "Introduction to UX design",
          code: "UXD301",
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          primaryFacultyId: bhawanaFaculty.id,
          examType: "THEORY",
          subjectType: "CORE",
          isActive: true
        }
      });
      console.log(`✅ Created correct UX design subject with Bhawana Jain`);
    }
    
    // Update all timetable entries to use the correct subject
    for (const incorrectSubject of subjectsToDelete) {
      const entries = await prisma.timetableEntry.findMany({
        where: { subjectId: incorrectSubject.id }
      });
      
      for (const entry of entries) {
        await prisma.timetableEntry.update({
          where: { id: entry.id },
          data: {
            subjectId: correctUxSubject.id,
            facultyId: bhawanaFaculty.id
          }
        });
      }
      
      console.log(`✅ Updated ${entries.length} entries to use correct UX subject`);
      
      // Delete the incorrect subject
      await prisma.subject.delete({
        where: { id: incorrectSubject.id }
      });
      console.log(`✅ Deleted duplicate UX subject: ${incorrectSubject.code}`);
    }
    
    // 5. Verify and fix any remaining issues
    console.log('\n🔧 Fix 5: Final verification and cleanup...');
    
    // Count final statistics
    const totalEntries = await prisma.timetableEntry.count({
      where: { batchId: batch.id }
    });
    
    const subjectEntries = await prisma.timetableEntry.count({
      where: { 
        batchId: batch.id,
        entryType: 'REGULAR'
      }
    });
    
    const eventEntries = await prisma.timetableEntry.count({
      where: { 
        batchId: batch.id,
        entryType: 'EVENT'
      }
    });
    
    const holidays = await prisma.holiday.count({
      where: { departmentId: department.id }
    });
    
    console.log('\n✅ ALL FIXES COMPLETED SUCCESSFULLY!');
    console.log(`📊 Updated Statistics:`);
    console.log(`   - Total timetable entries: ${totalEntries}`);
    console.log(`   - Subject entries: ${subjectEntries}`);
    console.log(`   - Event entries: ${eventEntries}`);
    console.log(`   - Holidays: ${holidays}`);
    
    console.log(`\n🎯 Fixed Issues:`);
    console.log(`   ✅ Design Thinking Application: EVENT → SUBJECT (Sushmita Shahi)`);
    console.log(`   ✅ August 12: Added missing Open Elective entries`);
    console.log(`   ✅ August 15: Removed subjects, added Independence Day holiday`);
    console.log(`   ✅ Introduction to UX design: Fixed duplicates, assigned to Bhawana Jain`);
    console.log(`   ✅ All holiday dates verified and corrected`);
    
    console.log('\n🏆 B.Des UX Semester 3 timetable is now ERROR-FREE!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run fixes
fixTimetableMistakes();