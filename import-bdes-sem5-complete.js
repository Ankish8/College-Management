#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importBDesSem5Complete() {
  try {
    console.log('🚀 Starting B.Des UX Semester 5 COMPLETE import...');
    
    // 1. Find existing B-Des UX Sem-5 batch
    const batch = await prisma.batch.findFirst({
      where: { name: "B-Des UX Sem-5" },
      include: { program: true, specialization: true }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-5 batch not found.');
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
    
    // 4. Smart Content Classification for Semester 5
    const SUBJECTS = [
      'UI Development',
      'Service Design'
    ];
    
    const CUSTOM_EVENTS = [
      'ORIENTATION',
      'SUMMER INTERNSHIP',
      'Open Elective',
      'Design Thinking',
      'Design Hive Club',
      'University Level Clubs',
      'Internal'  // Exam
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
      
      // Check for subjects (exact matches)
      for (const subject of SUBJECTS) {
        if (cleanContent === subject) {
          return { type: 'SUBJECT', content: subject };
        }
      }
      
      // Check for custom events
      for (const event of CUSTOM_EVENTS) {
        if (cleanContent === event) {
          return { type: 'CUSTOM_EVENT', content: event };
        }
      }
      
      // Special handling for "Internal" variations
      if (cleanContent.toLowerCase().includes('internal')) {
        return { type: 'CUSTOM_EVENT', content: 'Internal' };
      }
      
      // Default: treat as custom event for semester 5 (many activities)
      return { type: 'CUSTOM_EVENT', content: cleanContent };
    }
    
    // 5. Setup Subjects and Faculty for Semester 5
    console.log('\n📚 Setting up subjects and faculty...');
    const subjectMap = new Map();
    
    // Create faculty members for Semester 5
    const facultyData = [
      { name: 'Priyanshi Rungta', email: 'priyanshi.rungta@jlu.edu.in', subjects: ['UI Development'] },
      { name: 'Bhawana Jain', email: 'bhawana.jain@jlu.edu.in', subjects: ['Service Design'] }
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
          const subjectCode = subjectName === 'UI Development' ? 'UID501' : 'SRD501';
          const credits = subjectName === 'UI Development' ? 2 : 4;
          
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
    
    // 6. Complete timetable data for Semester 5 (July 21 - October 31, 2025)
    console.log('\n📅 Processing complete semester 5 timetable data...');
    
    const completeSchedule = [
      // Week 1 (July 21-25, 2025)
      { date: '2025-07-21', day: 'MONDAY', entries: ['ORIENTATION'] },
      { date: '2025-07-22', day: 'TUESDAY', entries: ['ORIENTATION'] },
      { date: '2025-07-23', day: 'WEDNESDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-07-24', day: 'THURSDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-07-25', day: 'FRIDAY', entries: ['SUMMER INTERNSHIP'] },
      
      // Week 2 (July 28 - Aug 1, 2025)
      { date: '2025-07-28', day: 'MONDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-07-29', day: 'TUESDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-07-30', day: 'WEDNESDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-07-31', day: 'THURSDAY', entries: ['SUMMER INTERNSHIP'] },
      { date: '2025-08-01', day: 'FRIDAY', entries: ['SUMMER INTERNSHIP'] },
      
      // Week 3 (Aug 4-8, 2025)
      { date: '2025-08-04', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-05', day: 'TUESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-06', day: 'WEDNESDAY', entries: ['UI Development', 'Design Hive Club'] },
      { date: '2025-08-07', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-08', day: 'FRIDAY', entries: ['UI Development', 'University Level Clubs'] },
      
      // Week 4 (Aug 11-15, 2025)
      { date: '2025-08-11', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-12', day: 'TUESDAY', entries: ['Open Elective', 'Design Thinking'] },
      { date: '2025-08-13', day: 'WEDNESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-14', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-15', day: 'FRIDAY', entries: ['Independence Day'] }, // Holiday
      
      // Week 5 (Aug 18-22, 2025)
      { date: '2025-08-18', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-19', day: 'TUESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-20', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-08-21', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-22', day: 'FRIDAY', entries: ['UI Development', 'University Level Clubs'] },
      
      // Week 6 (Aug 25-29, 2025)
      { date: '2025-08-25', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-26', day: 'TUESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-27', day: 'WEDNESDAY', entries: ['Ganesh Chaturthi 2025'] }, // Holiday
      { date: '2025-08-28', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-08-29', day: 'FRIDAY', entries: ['UI Development', 'Internal'] }, // Internal exam
      
      // Week 7 (Sep 1-5, 2025)
      { date: '2025-09-01', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-02', day: 'TUESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-03', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Thinking'] },
      { date: '2025-09-04', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-05', day: 'FRIDAY', entries: ['UI Development', 'Design Thinking'] },
      
      // Week 8 (Sep 8-12, 2025)
      { date: '2025-09-08', day: 'MONDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-09', day: 'TUESDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-10', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-09-11', day: 'THURSDAY', entries: ['UI Development', 'Design Thinking'] },
      { date: '2025-09-12', day: 'FRIDAY', entries: ['UI Development', 'University Level Clubs'] },
      
      // Week 9 (Sep 15-19, 2025) - Service Design starts
      { date: '2025-09-15', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-16', day: 'TUESDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-17', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-09-18', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-19', day: 'FRIDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      
      // Week 10 (Sep 22-26, 2025)
      { date: '2025-09-22', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-23', day: 'TUESDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-24', day: 'WEDNESDAY', entries: ['Open Elective', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-25', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-26', day: 'FRIDAY', entries: ['Service Design', 'University Level Clubs'] },
      
      // Week 11 (Sep 29 - Oct 3, 2025)
      { date: '2025-09-29', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-09-30', day: 'TUESDAY', entries: ['Durga Ashtami'] }, // Holiday
      { date: '2025-10-01', day: 'WEDNESDAY', entries: ['Mahanavam'] }, // Holiday
      { date: '2025-10-02', day: 'THURSDAY', entries: ['Vijay Dashami / Gandhi Jayanti'] }, // Holiday
      { date: '2025-10-03', day: 'FRIDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      
      // Week 12 (Oct 6-10, 2025)
      { date: '2025-10-06', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-07', day: 'TUESDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-08', day: 'WEDNESDAY', entries: ['Open Elective', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-09', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-10', day: 'FRIDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      
      // Week 13 (Oct 13-17, 2025)
      { date: '2025-10-13', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-14', day: 'TUESDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-15', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-16', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-17', day: 'FRIDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      
      // Week 14 (Oct 20-24, 2025) - Diwali period
      { date: '2025-10-20', day: 'MONDAY', entries: ['Chhot Diwali'] }, // Holiday
      { date: '2025-10-21', day: 'TUESDAY', entries: ['Bhai Diwali'] }, // Holiday
      { date: '2025-10-22', day: 'WEDNESDAY', entries: ['Govardhan Pooja'] }, // Holiday
      { date: '2025-10-23', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-24', day: 'FRIDAY', entries: ['Service Design', 'University Level Clubs'] },
      
      // Week 15 (Oct 27-31, 2025)
      { date: '2025-10-27', day: 'MONDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-28', day: 'TUESDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
      { date: '2025-10-29', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-30', day: 'THURSDAY', entries: ['Service Design', 'SUMMER INTERNSHIP'] },
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
          // Create holiday entry
          const existingHoliday = await prisma.holiday.findFirst({
            where: {
              date: scheduleDate,
              name: classification.content
            }
          });
          
          if (!existingHoliday) {
            await prisma.holiday.create({
              data: {
                name: classification.content,
                date: scheduleDate,
                type: classification.content === 'Independence Day' ? 'NATIONAL' : 'UNIVERSITY',
                description: `${classification.content} - Semester 5`,
                isRecurring: false,
                departmentId: department.id
              }
            });
            holidaysCreated++;
          }
        } else {
          // Create timetable entries for subjects and events
          const relevantSlots = timeSlots.filter(ts => {
            if (ts.name.toLowerCase().includes('lunch')) return false;
            
            // Full day events (ORIENTATION, SUMMER INTERNSHIP, holidays)
            if (['ORIENTATION', 'SUMMER INTERNSHIP'].includes(classification.content)) {
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
              entryData.requiresAttendance = ['ORIENTATION', 'Internal'].includes(classification.content);
              entryData.notes = `${classification.content} - Semester 5`;
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
        'SUMMER INTERNSHIP': '#f59e0b',
        'Open Elective': '#3b82f6',
        'Design Thinking': '#8b5cf6',
        'Design Hive Club': '#ec4899',
        'University Level Clubs': '#ef4444',
        'Internal': '#dc2626' // Red for exam
      };
      return colorMap[eventName] || '#6b7280';
    }
    
    console.log('\n✅ SEMESTER 5 COMPLETE IMPORT SUCCESSFUL!');
    console.log(`📊 Final Results:`);
    console.log(`   - Total timetable entries created: ${entriesCreated}`);
    console.log(`   - Subject entries: ${subjectsCreated}`);
    console.log(`   - Event entries: ${eventsCreated}`);
    console.log(`   - Holidays created: ${holidaysCreated}`);
    console.log(`   - Batch: ${batch.name}`);
    console.log(`   - Period: July 2025 - October 2025`);
    console.log(`   - Subjects: UI Development (Priyanshi Rungta), Service Design (Bhawana Jain)`);
    console.log(`   - Events: ORIENTATION, SUMMER INTERNSHIP, Open Elective, Design Thinking, Clubs, Internal Exam`);
    
    console.log('\n🎯 Complete B.Des UX Semester 5 timetable is now available!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run complete import
importBDesSem5Complete();