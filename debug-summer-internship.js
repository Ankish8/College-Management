// Debug Summer Internship timetable entries
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSummerInternship() {
  try {
    console.log('🔍 DEBUG: Summer Internship timetable entries\n');
    
    // Find Summer Internship subject
    const summerInternshipSubject = await prisma.subject.findFirst({
      where: {
        code: 'BDES5-SI'
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
    
    if (!summerInternshipSubject) {
      console.log('❌ Summer Internship subject not found');
      return;
    }
    
    console.log('📚 Summer Internship Subject:');
    console.log(`  Name: ${summerInternshipSubject.name}`);
    console.log(`  Code: ${summerInternshipSubject.code}`);
    console.log(`  Subject ID: ${summerInternshipSubject.id}`);
    
    // Get all timetable entries for Summer Internship
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: {
        subjectId: summerInternshipSubject.id,
        isActive: true
      },
      include: {
        timeSlot: {
          select: {
            name: true,
            startTime: true,
            endTime: true
          }
        },
        batch: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { date: 'asc' }
      ]
    });
    
    console.log(`\n📅 Found ${timetableEntries.length} timetable entries for Summer Internship:`);
    timetableEntries.forEach((entry, i) => {
      const entryType = entry.date ? 'date-specific' : 'recurring';
      const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'all weeks';
      const dayName = entry.dayOfWeek;
      
      console.log(`\n  ${i+1}. ${dayName} - ${entry.timeSlot.name} (${entryType})`);
      console.log(`     Date: ${entryDateStr}`);
      console.log(`     Batch: ${entry.batch.name}`);
      console.log(`     Entry ID: ${entry.id}`);
      console.log(`     Is Active: ${entry.isActive}`);
    });
    
    // Check current week (Aug 4-8, 2025)
    console.log('\n' + '='.repeat(60));
    console.log('🗓️  WEEK ANALYSIS: Aug 4-8, 2025\n');
    
    const weekDays = [
      { day: 'MONDAY', date: '2025-08-04' },
      { day: 'TUESDAY', date: '2025-08-05' },
      { day: 'WEDNESDAY', date: '2025-08-06' },
      { day: 'THURSDAY', date: '2025-08-07' },
      { day: 'FRIDAY', date: '2025-08-08' }
    ];
    
    weekDays.forEach(({ day, date }) => {
      console.log(`\n📅 ${day} ${date}:`);
      
      const matchingEntries = timetableEntries.filter(entry => {
        // Must match day of week
        if (entry.dayOfWeek !== day) return false;
        
        // If recurring entry (no date), it applies
        if (!entry.date) return true;
        
        // If date-specific, must match exact date
        const entryDateStr = entry.date.toISOString().split('T')[0];
        return entryDateStr === date;
      });
      
      if (matchingEntries.length > 0) {
        console.log(`  ✅ Summer Internship scheduled:`);
        matchingEntries.forEach(entry => {
          const entryType = entry.date ? 'date-specific' : 'recurring';
          console.log(`    - ${entry.timeSlot.name} (${entryType})`);
        });
      } else {
        console.log(`  ❌ No Summer Internship scheduled`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 EXPECTED ATTENDANCE HISTORY:');
    console.log('Based on timetable analysis:\n');
    
    weekDays.forEach(({ day, date }) => {
      const hasClass = timetableEntries.some(entry => {
        if (entry.dayOfWeek !== day) return false;
        if (!entry.date) return true;
        return entry.date.toISOString().split('T')[0] === date;
      });
      
      const dayAbbrev = day.charAt(0);
      if (hasClass) {
        if (day === 'WEDNESDAY') {
          console.log(`  ${dayAbbrev}: 🟢 GREEN (Present - marked as 16/25)`);
        } else {
          console.log(`  ${dayAbbrev}: 🟡 YELLOW (Class scheduled but not marked)`);
        }
      } else {
        console.log(`  ${dayAbbrev}: ⚪ GREY (No class scheduled)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSummerInternship();