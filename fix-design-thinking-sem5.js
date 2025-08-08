#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDesignThinkingSem5() {
  try {
    console.log('🔧 Fixing Design Thinking classification mistake for Semester 5...');
    
    // Find the batch and existing Design Thinking subject
    const batch = await prisma.batch.findFirst({
      where: { name: 'B-Des UX Sem-5' }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-5 batch not found.');
    }
    
    // Find Design department
    const department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });
    
    // Find Priyal Gautam faculty
    let priyalFaculty = await prisma.user.findFirst({
      where: { email: 'priyal.gautam@jlu.edu.in', role: 'FACULTY' }
    });
    
    if (!priyalFaculty) {
      priyalFaculty = await prisma.user.create({
        data: {
          name: 'Priyal Gautam',
          email: 'priyal.gautam@jlu.edu.in',
          role: 'FACULTY',
          status: 'ACTIVE',
          departmentId: department.id
        }
      });
      console.log(`✅ Created faculty: ${priyalFaculty.name}`);
    }
    
    // Find or create Design Thinking subject for Semester 5
    let designThinkingSubject = await prisma.subject.findFirst({
      where: { 
        name: 'Design Thinking',
        batchId: batch.id
      }
    });
    
    if (!designThinkingSubject) {
      designThinkingSubject = await prisma.subject.create({
        data: {
          name: 'Design Thinking',
          code: 'DT501',
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          primaryFacultyId: priyalFaculty.id,
          examType: 'THEORY',
          subjectType: 'CORE',
          isActive: true
        }
      });
      console.log(`✅ Created subject: ${designThinkingSubject.name} for Semester 5`);
    } else {
      // Update existing subject to have correct faculty
      await prisma.subject.update({
        where: { id: designThinkingSubject.id },
        data: { primaryFacultyId: priyalFaculty.id }
      });
      console.log(`✅ Updated Design Thinking subject with Priyal Gautam as faculty`);
    }
    
    // Find all Design Thinking event entries and convert to subject entries
    const designThinkingEvents = await prisma.timetableEntry.findMany({
      where: {
        batchId: batch.id,
        customEventTitle: 'Design Thinking'
      }
    });
    
    console.log(`Found ${designThinkingEvents.length} Design Thinking EVENT entries to convert to SUBJECT`);
    
    // Update all Design Thinking events to be subject entries
    for (const entry of designThinkingEvents) {
      await prisma.timetableEntry.update({
        where: { id: entry.id },
        data: {
          customEventTitle: null,
          customEventColor: null,
          subjectId: designThinkingSubject.id,
          facultyId: priyalFaculty.id,
          entryType: 'REGULAR',
          requiresAttendance: true,
          notes: 'Regular class - Design Thinking'
        }
      });
    }
    
    console.log(`✅ Updated ${designThinkingEvents.length} Design Thinking entries from EVENT to SUBJECT`);
    console.log(`✅ Design Thinking is now correctly assigned to Priyal Gautam as a SUBJECT`);
    
    // Final count verification
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
    
    console.log(`\n📊 Updated Statistics for ${batch.name}:`);
    console.log(`   - Subject entries: ${subjectEntries}`);
    console.log(`   - Event entries: ${eventEntries}`);
    console.log(`\n🎯 Design Thinking classification mistake FIXED!`);
    console.log(`   ✅ Design Thinking → SUBJECT (Priyal Gautam)`);
    console.log(`   ✅ All timetable entries updated correctly`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run fix
fixDesignThinkingSem5();