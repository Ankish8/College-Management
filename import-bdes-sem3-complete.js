#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importBDesSem3Complete() {
  try {
    console.log('🚀 Starting B.Des UX Semester 3 COMPLETE import...');
    
    // 1. Find existing B-Des UX Sem-3 batch
    const batch = await prisma.batch.findFirst({
      where: { name: "B-Des UX Sem-3" },
      include: { program: true, specialization: true }
    });
    
    if (!batch) {
      throw new Error('B-Des UX Sem-3 batch not found.');
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
    
    // 4. Smart Content Classification
    const SUBJECTS = [
      'Introduction to Semiotics',
      'Visual Design Tools', 
      'Introduction to UX design'
    ];
    
    const CUSTOM_EVENTS = [
      'ORIENTATION',
      'Open Elective',
      'Design Thinking Application',
      'Design Hive Club',
      'University Level Clubs'
    ];
    
    const HOLIDAYS = [
      'Ganesh Chaturthi 2025',
      'Durga Ashtami',
      'Vijay Dashami / Gandhi Jayanti',
      'Diwali',
      'Bhai Diwali',
      'Govardhan Pooja', 
      'Chhot Diwali',
      'Mahanavam'
    ];
    
    function classifyContent(content) {
      if (!content || content.trim() === '') return { type: 'EMPTY', content: null };
      
      const cleanContent = content.trim();
      
      // Check for holidays
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
      
      // Default classification based on patterns
      if (cleanContent.toUpperCase() === cleanContent && cleanContent.length > 3) {
        return { type: 'CUSTOM_EVENT', content: cleanContent };
      }
      
      return { type: 'SUBJECT', content: cleanContent };
    }
    
    // 5. Setup Subjects and Faculty
    console.log('\\n📚 Setting up subjects and faculty...');
    const subjectMap = new Map();
    const facultyMap = new Map();
    
    // Create faculty members
    const facultyData = [
      { name: 'Madhu Toppo', email: 'madhu.toppo@jlu.edu.in', subjects: ['Introduction to Semiotics'] },
      { name: 'Priyal Gautam', email: 'priyal.gautam@jlu.edu.in', subjects: ['Visual Design Tools'] },
      { name: 'Ankish Khatri', email: 'ankish.khatri@jlu.edu.in', subjects: ['Introduction to UX design'] }
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
      
      facultyMap.set(facultyInfo.name, faculty);
      
      // Create subjects for this faculty
      for (const subjectName of facultyInfo.subjects) {
        let subject = await prisma.subject.findFirst({
          where: { name: subjectName, batchId: batch.id }
        });
        
        if (!subject) {
          const subjectCode = subjectName.split(' ').map(word => word.substring(0, 3)).join('').toUpperCase() + '301';
          
          subject = await prisma.subject.create({
            data: {
              name: subjectName,
              code: subjectCode,
              credits: 4,
              totalHours: 60,
              batchId: batch.id,
              primaryFacultyId: faculty.id,
              examType: 'THEORY',
              subjectType: 'CORE',
              isActive: true
            }
          });
          console.log(`✅ Created subject: ${subject.name} (${subject.code})`);
        }
        
        subjectMap.set(subjectName, { subject, faculty });
      }
    }
    
    // 6. Complete timetable data from the Excel screenshot
    console.log('\\n📅 Processing complete semester timetable data...');
    
    const completeSchedule = [
      // Week 1 (already imported, but including for completeness)
      
      // Week 2 (July 28 - Aug 1, 2025)
      { date: '2025-07-28', day: 'MONDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-07-29', day: 'TUESDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-07-30', day: 'WEDNESDAY', entries: ['Introduction to Semiotics', 'Design Hive Club'] },
      { date: '2025-07-31', day: 'THURSDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-01', day: 'FRIDAY', entries: ['Introduction to Semiotics', 'University Level Clubs'] },
      
      // Week 3 (Aug 4-8, 2025)
      { date: '2025-08-04', day: 'MONDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-05', day: 'TUESDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-06', day: 'WEDNESDAY', entries: ['Introduction to Semiotics', 'Design Hive Club'] },
      { date: '2025-08-07', day: 'THURSDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-08', day: 'FRIDAY', entries: ['Introduction to Semiotics', 'University Level Clubs'] },
      
      // Week 4 (Aug 11-15, 2025) 
      { date: '2025-08-11', day: 'MONDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-12', day: 'TUESDAY', entries: ['Open Elective'] },
      { date: '2025-08-13', day: 'WEDNESDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-14', day: 'THURSDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-15', day: 'FRIDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      
      // Week 5 (Aug 18-22, 2025)
      { date: '2025-08-18', day: 'MONDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-19', day: 'TUESDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-20', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-08-21', day: 'THURSDAY', entries: ['Introduction to Semiotics', 'Design Thinking Application'] },
      { date: '2025-08-22', day: 'FRIDAY', entries: ['Introduction to Semiotics', 'University Level Clubs'] },
      
      // Week 6 (Aug 25-29, 2025)
      { date: '2025-08-25', day: 'MONDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-08-26', day: 'TUESDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-08-27', day: 'WEDNESDAY', entries: ['Ganesh Chaturthi 2025'] }, // Holiday
      { date: '2025-08-28', day: 'THURSDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-08-29', day: 'FRIDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      
      // Week 7 (Sep 1-5, 2025)
      { date: '2025-09-01', day: 'MONDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-09-02', day: 'TUESDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-09-03', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Thinking Application'] },
      { date: '2025-09-04', day: 'THURSDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      { date: '2025-09-05', day: 'FRIDAY', entries: ['Visual Design Tools', 'Design Thinking Application'] },
      
      // Week 8 (Sep 8-12, 2025)
      { date: '2025-09-08', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-09', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-10', day: 'WEDNESDAY', entries: ['Open Elective', 'Introduction to UX design'] },
      { date: '2025-09-11', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-12', day: 'FRIDAY', entries: ['Visual Design Tools', 'University Level Clubs'] },
      
      // Week 9 (Sep 15-19, 2025)
      { date: '2025-09-15', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-16', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-17', day: 'WEDNESDAY', entries: ['Open Elective', 'Introduction to UX design'] },
      { date: '2025-09-18', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-19', day: 'FRIDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      
      // Week 10 (Sep 22-26, 2025)
      { date: '2025-09-22', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-23', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-24', day: 'WEDNESDAY', entries: ['Open Elective', 'Introduction to UX design'] },
      { date: '2025-09-25', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-26', day: 'FRIDAY', entries: ['Visual Design Tools', 'University Level Clubs'] },
      
      // Week 11 (Sep 29 - Oct 3, 2025)
      { date: '2025-09-29', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-09-30', day: 'TUESDAY', entries: ['Durga Ashtami'] }, // Holiday
      { date: '2025-10-01', day: 'WEDNESDAY', entries: ['Mahanavam'] }, // Holiday
      { date: '2025-10-02', day: 'THURSDAY', entries: ['Vijay Dashami / Gandhi Jayanti'] }, // Holiday
      { date: '2025-10-03', day: 'FRIDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      
      // Week 12 (Oct 6-10, 2025)
      { date: '2025-10-06', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-07', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-08', day: 'WEDNESDAY', entries: ['Open Elective', 'Introduction to UX design'] },
      { date: '2025-10-09', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-10', day: 'FRIDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      
      // Week 13 (Oct 13-17, 2025)
      { date: '2025-10-13', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-14', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-15', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-16', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-17', day: 'FRIDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      
      // Week 14 (Oct 20-24, 2025)
      { date: '2025-10-20', day: 'MONDAY', entries: ['Chhot Diwali'] }, // Holiday
      { date: '2025-10-21', day: 'TUESDAY', entries: ['Diwali'] }, // Holiday
      { date: '2025-10-22', day: 'WEDNESDAY', entries: ['Govardhan Pooja'] }, // Holiday
      { date: '2025-10-23', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-24', day: 'FRIDAY', entries: ['Visual Design Tools', 'University Level Clubs'] },
      
      // Week 15 (Oct 27-31, 2025)
      { date: '2025-10-27', day: 'MONDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-28', day: 'TUESDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-29', day: 'WEDNESDAY', entries: ['Open Elective', 'Design Hive Club'] },
      { date: '2025-10-30', day: 'THURSDAY', entries: ['Visual Design Tools', 'Introduction to UX design'] },
      { date: '2025-10-31', day: 'FRIDAY', entries: ['Bhai Diwali'] } // Holiday
    ];
    
    let entriesCreated = 0;
    let subjectsCreated = 0;
    let eventsCreated = 0;
    let holidaysCreated = 0;
    
    // Process each day
    for (const schedule of completeSchedule) {
      const scheduleDate = new Date(schedule.date);
      
      // Skip Week 1 as it's already imported
      if (scheduleDate <= new Date('2025-07-25')) {
        continue;
      }
      
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
                type: 'UNIVERSITY',
                description: `${classification.content} - Semester 3`,
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
              entryData.notes = `${classification.content} - Semester 3`;
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
        'Open Elective': '#3b82f6',
        'Design Thinking Application': '#f59e0b',
        'Design Hive Club': '#8b5cf6',
        'University Level Clubs': '#ef4444'
      };
      return colorMap[eventName] || '#6b7280';
    }
    
    console.log('\\n✅ COMPLETE SEMESTER IMPORT SUCCESSFUL!');
    console.log(`📊 Final Results:`);
    console.log(`   - Total timetable entries created: ${entriesCreated}`);
    console.log(`   - Subject entries: ${subjectsCreated}`);
    console.log(`   - Event entries: ${eventsCreated}`);
    console.log(`   - Holidays created: ${holidaysCreated}`);
    console.log(`   - Batch: ${batch.name}`);
    console.log(`   - Period: July 2025 - October 2025`);
    console.log(`   - Subjects: Introduction to Semiotics, Visual Design Tools, Introduction to UX design`);
    console.log(`   - Events: ORIENTATION, Open Elective, Design Thinking Application, Design Hive Club, University Level Clubs`);
    console.log(`   - Holidays: Ganesh Chaturthi, Durga Ashtami, Vijay Dashami, Diwali, etc.`);
    
    console.log('\\n🎯 Complete B.Des UX Semester 3 timetable is now available!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run complete import
importBDesSem3Complete();