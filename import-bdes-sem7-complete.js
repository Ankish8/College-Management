#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importBDesSem7Complete() {
  try {
    console.log('🚀 Starting B.Des UX Semester 7 COMPLETE import...');
    
    // 1. Find existing B-Des UX Sem-7 batch
    const batch = await prisma.batch.findFirst({
      where: { name: "B-Des UX Sem-7" },
      include: { program: true, specialization: true }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-7 batch not found.');
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
    console.log(`✅ Found ${timeSlots.length} time slots`);
    
    // 4. Smart Content Classification for Semester 7 - BE VERY CAREFUL HERE!
    const SUBJECTS = [
      'Field Research Project',          // SUBJECT - taught by Bhawana Jain
      'Design for Social Innovation',    // SUBJECT - taught by Sushmita Shahi  
      'Futuristic Technology for UX Design' // SUBJECT - taught by Priyanshi Rungta
    ];
    
    const CUSTOM_EVENTS = [
      'ORIENTATION',
      'Seminar and Research Writing',    // This is a CUSTOM EVENT, not subject
      'University Level Clubs',
      'Design Hive Club', 
      'Open Elective'
    ];
    
    const HOLIDAYS = [
      'Independence Day',
      'Ganesh Chaturthi 2025',
      'Durga Ashtami',
      'Vijay Dashami / Gandhi Jayanti',
      'Mahanavam',
      'Diwali',
      'Bhai Diwali',
      'Govardhan Pooja',
      'Chhot Diwali'
    ];
    
    function classifyContent(content) {
      if (!content || content.trim() === '') return { type: 'EMPTY', content: null };
      
      const cleanContent = content.trim();
      
      // Check for holidays first
      for (const holiday of HOLIDAYS) {
        if (cleanContent.includes(holiday) || holiday.includes(cleanContent)) {
          return { type: 'HOLIDAY', content: holiday };
        }
      }
      
      // Check for subjects (EXACT matches - be very careful!)
      for (const subject of SUBJECTS) {
        if (cleanContent === subject) {
          return { type: 'SUBJECT', content: subject };
        }
      }
      
      // Check for custom events (EXACT matches)
      for (const event of CUSTOM_EVENTS) {
        if (cleanContent === event) {
          return { type: 'CUSTOM_EVENT', content: event };
        }
      }
      
      // For anything else, classify based on context
      console.log(`⚠️  Unrecognized content: "${cleanContent}" - classifying as CUSTOM_EVENT`);
      return { type: 'CUSTOM_EVENT', content: cleanContent };
    }
    
    // 5. Setup Subjects and Faculty for Semester 7
    console.log('\n📚 Setting up subjects and faculty...');
    const subjectMap = new Map();
    
    // Faculty data based on existing real data from backup
    const facultyData = [
      { name: 'Bhawana Jain', email: 'bhawana.jain@jlu.edu.in', subjects: ['Field Research Project'] },
      { name: 'Sushmita Shahi', email: 'sushmita.shahi@jlu.edu.in', subjects: ['Design for Social Innovation'] },
      { name: 'Priyanshi Rungta', email: 'priyanshi.rungta@jlu.edu.in', subjects: ['Futuristic Technology for UX Design'] }
    ];
    
    for (const facultyInfo of facultyData) {
      let faculty = await prisma.user.findFirst({
        where: { email: facultyInfo.email, role: 'FACULTY' }
      });
      
      if (!faculty) {
        faculty = await prisma.user.create({
          data: {
            name: facultyInfo.name,
            email: facultyInfo.email,
            role: 'FACULTY',
            status: 'ACTIVE',
            departmentId: department.id
          }
        });
        console.log(`✅ Created faculty: ${faculty.name}`);
      }
      
      // Create subjects for this faculty
      for (const subjectName of facultyInfo.subjects) {
        let subject = await prisma.subject.findFirst({
          where: { name: subjectName, batchId: batch.id }
        });
        
        if (!subject) {
          let subjectCode, credits;
          
          if (subjectName === 'Field Research Project') {
            subjectCode = 'FRP701';
            credits = 8;
          } else if (subjectName === 'Design for Social Innovation') {
            subjectCode = 'DSI701';
            credits = 4;
          } else if (subjectName === 'Futuristic Technology for UX Design') {
            subjectCode = 'FTU701';
            credits = 4;
          }
          
          subject = await prisma.subject.create({
            data: {
              name: subjectName,
              code: subjectCode,
              credits: credits,
              totalHours: credits * 15,
              batchId: batch.id,
              primaryFacultyId: faculty.id,
              examType: 'THEORY',
              subjectType: 'CORE',
              isActive: true
            }
          });
          console.log(`✅ Created subject: ${subject.name} (${subject.code}) - ${credits} credits`);
        }
        
        subjectMap.set(subjectName, { subject, faculty });
      }
    }
    
    // 6. Complete timetable data for Semester 7 (July 21 - October 31, 2025)
    console.log('\n📅 Processing complete semester 7 timetable data...');
    
    const completeSchedule = [
      // Week 1 (July 21-25, 2025)
      { date: '2025-07-21', day: 'MONDAY', entries: ['ORIENTATION'] },
      { date: '2025-07-22', day: 'TUESDAY', entries: ['ORIENTATION'] },
      { date: '2025-07-23', day: 'WEDNESDAY', entries: ['Field Research Project'] },
      { date: '2025-07-24', day: 'THURSDAY', entries: ['Field Research Project'] },
      { date: '2025-07-25', day: 'FRIDAY', entries: ['Field Research Project'] },
      
      // Week 2 (July 28 - Aug 1, 2025)
      { date: '2025-07-28', day: 'MONDAY', entries: ['Field Research Project'] },
      { date: '2025-07-29', day: 'TUESDAY', entries: ['Field Research Project'] },
      { date: '2025-07-30', day: 'WEDNESDAY', entries: ['Field Research Project'] },
      { date: '2025-07-31', day: 'THURSDAY', entries: ['Field Research Project'] },
      { date: '2025-08-01', day: 'FRIDAY', entries: ['Field Research Project'] },
      
      // Week 3 (Aug 4-8, 2025)
      { date: '2025-08-04', day: 'MONDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-05', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-06', day: 'WEDNESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-07', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-08', day: 'FRIDAY', entries: ['Design for Social Innovation', 'University Level Clubs'] },
      
      // Week 4 (Aug 11-15, 2025)
      { date: '2025-08-11', day: 'MONDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-12', day: 'TUESDAY', entries: ['Open Elective', 'Seminar and Research Writing'] },
      { date: '2025-08-13', day: 'WEDNESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-14', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-15', day: 'FRIDAY', entries: ['Independence Day'] }, // Holiday
      
      // Week 5 (Aug 18-22, 2025)
      { date: '2025-08-18', day: 'MONDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-19', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-20', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-08-21', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-22', day: 'FRIDAY', entries: ['Design for Social Innovation', 'University Level Clubs'] },
      
      // Week 6 (Aug 25-29, 2025)
      { date: '2025-08-25', day: 'MONDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-26', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-27', day: 'WEDNESDAY', entries: ['Ganesh Chaturthi 2025'] }, // Holiday
      { date: '2025-08-28', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-08-29', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      
      // Week 7 (Sep 1-5, 2025)
      { date: '2025-09-01', day: 'MONDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-09-02', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-09-03', day: 'WEDNESDAY', entries: ['Open Elective', 'Seminar and Research Writing'] },
      { date: '2025-09-04', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      { date: '2025-09-05', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Seminar and Research Writing'] },
      
      // Week 8 (Sep 8-12, 2025) - Futuristic Technology starts
      { date: '2025-09-08', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-09', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-10', day: 'WEDNESDAY', entries: ['Open Elective', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-11', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-12', day: 'FRIDAY', entries: ['Design for Social Innovation', 'University Level Clubs'] },
      
      // Continue pattern through remaining weeks...
      // Week 9-15 following similar pattern with Futuristic Technology for UX Design
      { date: '2025-09-15', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-16', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-17', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-09-18', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-19', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      
      // Week 10 (Sep 22-26, 2025)
      { date: '2025-09-22', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-23', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-24', day: 'WEDNESDAY', entries: ['Open Elective', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-25', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-26', day: 'FRIDAY', entries: ['Design for Social Innovation', 'University Level Clubs'] },
      
      // Week 11 (Sep 29 - Oct 3, 2025)
      { date: '2025-09-29', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-09-30', day: 'TUESDAY', entries: ['Durga Ashtami'] }, // Holiday
      { date: '2025-10-01', day: 'WEDNESDAY', entries: ['Mahanavam'] }, // Holiday
      { date: '2025-10-02', day: 'THURSDAY', entries: ['Vijay Dashami / Gandhi Jayanti'] }, // Holiday
      { date: '2025-10-03', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      
      // Week 12-15 continuing the pattern...
      { date: '2025-10-06', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-07', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-08', day: 'WEDNESDAY', entries: ['Open Elective', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-09', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-10', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      
      // Continue through October...
      { date: '2025-10-13', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-14', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-15', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-16', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-17', day: 'FRIDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      
      // Week 14 (Oct 20-24, 2025) - Diwali period
      { date: '2025-10-20', day: 'MONDAY', entries: ['Chhot Diwali'] }, // Holiday
      { date: '2025-10-21', day: 'TUESDAY', entries: ['Bhai Diwali'] }, // Holiday
      { date: '2025-10-22', day: 'WEDNESDAY', entries: ['Govardhan Pooja'] }, // Holiday
      { date: '2025-10-23', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-24', day: 'FRIDAY', entries: ['Design for Social Innovation', 'University Level Clubs'] },
      
      // Week 15 (Oct 27-31, 2025)
      { date: '2025-10-27', day: 'MONDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-28', day: 'TUESDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-29', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-30', day: 'THURSDAY', entries: ['Design for Social Innovation', 'Futuristic Technology for UX Design'] },
      { date: '2025-10-31', day: 'FRIDAY', entries: ['Diwali'] } // Holiday
    ];
    
    let entriesCreated = 0;
    let subjectsCreated = 0;
    let eventsCreated = 0;
    let holidaysCreated = 0;
    
    // Process each day
    for (const schedule of completeSchedule) {
      const scheduleDate = new Date(schedule.date);
      
      if (entriesCreated % 50 === 0) {
        console.log(`   Processing ${schedule.date} (${schedule.day})...`);
      }
      
      // Handle each entry for the day
      for (let entryIndex = 0; entryIndex < schedule.entries.length; entryIndex++) {
        const entry = schedule.entries[entryIndex];
        const classification = classifyContent(entry);
        
        if (classification.type === 'EMPTY') continue;
        
        if (classification.type === 'HOLIDAY') {
          // Use existing holidays - don't create duplicates
          holidaysCreated++;
        } else {
          // Create timetable entries for subjects and events
          const relevantSlots = timeSlots.filter(ts => {
            if (ts.name.toLowerCase().includes('lunch')) return false;
            
            // Full day events (ORIENTATION)
            if (['ORIENTATION'].includes(classification.content)) {
              return true;
            }
            
            // Morning slots for first entry, afternoon for second entry
            const startHour = parseInt(ts.startTime.split(':')[0]);
            if (entryIndex === 0) {
              return startHour >= 9 && startHour < 13; // Morning
            } else {
              return startHour >= 13 && startHour < 17; // Afternoon
            }
          });
          
          for (const timeSlot of relevantSlots) {
            const existingEntry = await prisma.timetableEntry.findFirst({
              where: {
                batchId: batch.id,
                dayOfWeek: schedule.day,
                timeSlotId: timeSlot.id,
                date: scheduleDate
              }
            });
            
            if (existingEntry) continue;
            
            const entryData = {
              batchId: batch.id,
              dayOfWeek: schedule.day,
              timeSlotId: timeSlot.id,
              date: scheduleDate,
              isActive: true
            };
            
            if (classification.type === 'SUBJECT') {
              const subjectInfo = subjectMap.get(classification.content);
              if (subjectInfo) {
                entryData.subjectId = subjectInfo.subject.id;
                entryData.facultyId = subjectInfo.faculty.id;
                entryData.entryType = 'REGULAR';
                entryData.requiresAttendance = true;
                entryData.notes = `Regular class - ${classification.content}`;
                subjectsCreated++;
              }
            } else if (classification.type === 'CUSTOM_EVENT') {
              entryData.customEventTitle = classification.content;
              entryData.customEventColor = getEventColor(classification.content);
              entryData.entryType = 'EVENT';
              entryData.requiresAttendance = classification.content === 'ORIENTATION';
              entryData.notes = `${classification.content} - Semester 7`;
              eventsCreated++;
            }
            
            await prisma.timetableEntry.create({ data: entryData });
            entriesCreated++;
          }
        }
      }
    }
    
    function getEventColor(eventName) {
      const colorMap = {
        'ORIENTATION': '#10b981',
        'Seminar and Research Writing': '#f59e0b',
        'Open Elective': '#3b82f6',
        'Design Hive Club': '#ec4899',
        'University Level Clubs': '#ef4444'
      };
      return colorMap[eventName] || '#6b7280';
    }
    
    console.log('\n✅ SEMESTER 7 COMPLETE IMPORT SUCCESSFUL!');
    console.log(`📊 Final Results:`);
    console.log(`   - Total timetable entries created: ${entriesCreated}`);
    console.log(`   - Subject entries: ${subjectsCreated}`);
    console.log(`   - Event entries: ${eventsCreated}`);
    console.log(`   - Holidays referenced: ${holidaysCreated}`);
    console.log(`   - Batch: ${batch.name}`);
    console.log(`   - Period: July 2025 - October 2025`);
    console.log(`   - Subjects: Field Research Project (Bhawana Jain), Design for Social Innovation (Sushmita Shahi), Futuristic Technology for UX Design (Priyanshi Rungta)`);
    console.log(`   - Events: ORIENTATION, Seminar and Research Writing, Open Elective, Design Hive Club, University Level Clubs`);
    
    console.log('\n🎯 Complete B.Des UX Semester 7 timetable is now available!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run complete import
importBDesSem7Complete();