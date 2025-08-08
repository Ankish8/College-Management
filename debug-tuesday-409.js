// Comprehensive debug script for Tuesday Aug 5 409 error
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTuesday409() {
  try {
    console.log('🔍 DEBUG: Tuesday Aug 5 - Why Design Thinking fails but Summer Internship works\n');
    
    // First, let's get all the IDs we need
    console.log('📋 Step 1: Getting all relevant IDs...\n');
    
    // Get batch info
    const batch = await prisma.batch.findFirst({
      where: {
        name: "B-Des UX Sem-5"
      },
      select: {
        id: true,
        name: true
      }
    });
    console.log('🎓 Batch:', batch);
    
    // Get Summer Internship subject (the one that WORKS)
    const summerInternship = await prisma.subject.findFirst({
      where: {
        code: "BDES5-SI"
      },
      include: {
        primaryFaculty: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log('📚 Summer Internship (WORKS):', {
      id: summerInternship?.id,
      name: summerInternship?.name,
      code: summerInternship?.code,
      facultyId: summerInternship?.primaryFacultyId,
      facultyName: summerInternship?.primaryFaculty?.name
    });
    
    // Get Design Thinking subject (the one that FAILS)
    const designThinking = await prisma.subject.findFirst({
      where: {
        code: "BDES5-DT"
      },
      include: {
        primaryFaculty: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log('📚 Design Thinking (FAILS):', {
      id: designThinking?.id,
      name: designThinking?.name,
      code: designThinking?.code,
      facultyId: designThinking?.primaryFacultyId,
      facultyName: designThinking?.primaryFaculty?.name
    });
    
    // Get 9:30 AM timeslot
    const timeSlot930 = await prisma.timeSlot.findFirst({
      where: {
        name: "9:30 AM"
      }
    });
    console.log('⏰ 9:30 AM TimeSlot:', timeSlot930);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 2: Simulating CREATE requests for both subjects\n');
    
    // Test data for Summer Internship (should work)
    const summerInternshipData = {
      batchId: batch?.id,
      subjectId: summerInternship?.id,
      facultyId: summerInternship?.primaryFacultyId,
      timeSlotId: timeSlot930?.id,
      dayOfWeek: 'TUESDAY',
      date: '2025-08-05',
      entryType: 'REGULAR'
    };
    
    // Test data for Design Thinking (currently fails)
    const designThinkingData = {
      batchId: batch?.id,
      subjectId: designThinking?.id,
      facultyId: designThinking?.primaryFacultyId,
      timeSlotId: timeSlot930?.id,
      dayOfWeek: 'TUESDAY',
      date: '2025-08-05',
      entryType: 'REGULAR'
    };
    
    console.log('🟢 Summer Internship test data:', summerInternshipData);
    console.log('🔴 Design Thinking test data:', designThinkingData);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 3: Running conflict detection for both subjects\n');
    
    // Function to simulate the exact conflict check from the API
    async function simulateConflictCheck(data, subjectName) {
      console.log(`\n🔍 Checking conflicts for ${subjectName}:`);
      
      const whereClause = {
        timeSlotId: data.timeSlotId,
        dayOfWeek: data.dayOfWeek,
        isActive: true,
      };
      
      if (data.date) {
        whereClause.OR = [
          { date: null }, // Recurring entries always conflict
          { date: new Date(data.date) } // Same specific date conflicts
        ];
      }
      
      console.log('   WHERE clause:', JSON.stringify(whereClause, null, 4));
      
      // Check all potential conflicts
      const allConflicts = await prisma.timetableEntry.findMany({
        where: whereClause,
        include: {
          subject: { select: { name: true, code: true } },
          faculty: { select: { name: true } },
          batch: { select: { name: true } },
          timeSlot: { select: { name: true } },
        }
      });
      
      console.log(`   📊 Found ${allConflicts.length} entries at this time:`);
      allConflicts.forEach((entry, i) => {
        console.log(`     ${i+1}. ${entry.subject?.name} - ${entry.faculty?.name} - ${entry.batch.name}`);
        console.log(`        Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
        console.log(`        Entry ID: ${entry.id}`);
        console.log(`        Batch ID: ${entry.batchId}`);
        console.log(`        Faculty ID: ${entry.facultyId}`);
        console.log(`        Subject ID: ${entry.subjectId}`);
      });
      
      // Check for EXACT duplicate (this is what causes 409)
      const exactDuplicate = allConflicts.find(entry => {
        const sameBasicInfo = entry.batchId === data.batchId && 
          entry.subjectId === data.subjectId && 
          entry.facultyId === data.facultyId;
        
        if (!sameBasicInfo) return false;
        
        // If this is a date-specific entry, check the date too
        if (data.date) {
          const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : null;
          const dataDateStr = data.date;
          return entryDateStr === dataDateStr;
        }
        
        // For recurring entries, any match is a duplicate
        return entry.date === null;
      });
      
      if (exactDuplicate) {
        console.log(`   ❌ EXACT DUPLICATE FOUND! This would cause 409:`);
        console.log(`      Entry ID: ${exactDuplicate.id}`);
        console.log(`      Subject: ${exactDuplicate.subject?.name}`);
        console.log(`      Date: ${exactDuplicate.date ? exactDuplicate.date.toISOString().split('T')[0] : 'Recurring'}`);
        return { hasConflict: true, type: 'EXACT_DUPLICATE', entry: exactDuplicate };
      }
      
      // Check for other conflicts
      const batchConflicts = allConflicts.filter(entry => 
        entry.batchId === data.batchId && 
        !(entry.subjectId === data.subjectId && entry.facultyId === data.facultyId)
      );
      
      const facultyConflicts = allConflicts.filter(entry => 
        entry.facultyId === data.facultyId &&
        !(entry.batchId === data.batchId && entry.subjectId === data.subjectId)
      );
      
      if (batchConflicts.length > 0) {
        console.log(`   ❌ BATCH CONFLICTS (${batchConflicts.length}):`);
        batchConflicts.forEach(c => {
          console.log(`      - ${c.subject?.name} with ${c.faculty?.name}`);
        });
        return { hasConflict: true, type: 'BATCH_CONFLICT', conflicts: batchConflicts };
      }
      
      if (facultyConflicts.length > 0) {
        console.log(`   ❌ FACULTY CONFLICTS (${facultyConflicts.length}):`);
        facultyConflicts.forEach(c => {
          console.log(`      - ${c.subject?.name} for ${c.batch.name}`);
        });
        return { hasConflict: true, type: 'FACULTY_CONFLICT', conflicts: facultyConflicts };
      }
      
      console.log(`   ✅ No conflicts found for ${subjectName}`);
      return { hasConflict: false };
    }
    
    // Test Summer Internship
    const summerResult = await simulateConflictCheck(summerInternshipData, 'Summer Internship');
    
    // Test Design Thinking
    const designResult = await simulateConflictCheck(designThinkingData, 'Design Thinking');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 4: Summary and Analysis\n');
    
    console.log('🟢 Summer Internship Result:');
    console.log(`   Has Conflict: ${summerResult.hasConflict}`);
    if (summerResult.hasConflict) {
      console.log(`   Conflict Type: ${summerResult.type}`);
    }
    
    console.log('\n🔴 Design Thinking Result:');
    console.log(`   Has Conflict: ${designResult.hasConflict}`);
    if (designResult.hasConflict) {
      console.log(`   Conflict Type: ${designResult.type}`);
    }
    
    console.log('\n📝 Analysis:');
    if (summerResult.hasConflict && !designResult.hasConflict) {
      console.log('❓ UNEXPECTED: Summer Internship has conflicts but Design Thinking doesn\'t');
      console.log('   This doesn\'t match the UI behavior. Let me investigate further...');
    } else if (!summerResult.hasConflict && designResult.hasConflict) {
      console.log('✅ EXPECTED: Design Thinking has conflicts, Summer Internship doesn\'t');
      console.log(`   Root Cause: ${designResult.type}`);
    } else if (summerResult.hasConflict && designResult.hasConflict) {
      console.log('❓ BOTH have conflicts but only Design Thinking fails in UI');
      console.log('   This suggests different conflict handling or different data being sent');
    } else {
      console.log('❓ NEITHER have conflicts but Design Thinking fails in UI');
      console.log('   This suggests an issue in the frontend or API routing');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 5: Checking existing entries for both subjects\n');
    
    // Check if Design Thinking already exists anywhere
    const existingDesignThinking = await prisma.timetableEntry.findMany({
      where: {
        subjectId: designThinking?.id,
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    console.log(`🔍 Existing Design Thinking entries: ${existingDesignThinking.length}`);
    existingDesignThinking.forEach((entry, i) => {
      console.log(`  ${i+1}. ${entry.dayOfWeek} ${entry.timeSlot.name} - ${entry.batch.name}`);
      console.log(`     Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`     Entry ID: ${entry.id}`);
    });
    
    // Check if Summer Internship already exists anywhere  
    const existingSummerInternship = await prisma.timetableEntry.findMany({
      where: {
        subjectId: summerInternship?.id,
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    console.log(`\n🔍 Existing Summer Internship entries: ${existingSummerInternship.length}`);
    existingSummerInternship.forEach((entry, i) => {
      console.log(`  ${i+1}. ${entry.dayOfWeek} ${entry.timeSlot.name} - ${entry.batch.name}`);
      console.log(`     Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`     Entry ID: ${entry.id}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL DIAGNOSIS:');
    
    if (designResult.hasConflict && designResult.type === 'EXACT_DUPLICATE') {
      console.log('❌ FOUND THE ISSUE: Design Thinking already exists at this exact slot!');
      console.log('   The 409 error is correct - you\'re trying to create a duplicate entry.');
      console.log(`   Existing entry ID: ${designResult.entry.id}`);
      console.log('   ');
      console.log('   SOLUTION: Either:');
      console.log('   1. Delete the existing Design Thinking entry first, OR');
      console.log('   2. Choose a different time slot, OR'); 
      console.log('   3. Check if the existing entry should be there');
    } else if (summerResult.hasConflict && !designResult.hasConflict) {
      console.log('❓ MYSTERY: Summer Internship should fail but doesn\'t in UI');
      console.log('   This suggests a bug in conflict detection consistency');
    } else if (!summerResult.hasConflict && !designResult.hasConflict) {
      console.log('❓ MYSTERY: Neither should fail but Design Thinking does in UI');
      console.log('   This suggests a frontend/backend data mismatch');
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTuesday409();