const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs from database
const BATCH_ID = 'cmdyt7d8e0003ng6fopxswmfo'; // B-Des UX Sem-7
const SUBJECTS = {
  'Design for Social Innovation': {
    id: 'cmdyt7jx40009ngaf5d9vtypc',
    facultyId: 'cmdyt1caz0007ngf5qqfhsdo0' // Sushmita Shahi
  },
  'Seminar & Research Writing': {
    id: 'cmdyt7jx6000dngaf6jwss1p5', 
    facultyId: 'cmdyt1cax0003ngf5go5pdrog' // Madhu Toppo
  }
};

const TIME_SLOTS = {
  '09:30-10:30': 'cmdyszmry0005ngir7acqjxg8',
  '10:30-11:30': 'cmdyszmrz0006ngiripadxpq7',
  '11:30-12:30': 'cmdyszmrz0007ngir9j72o99x',
  '13:30-14:30': 'cmdyszms00008ngiryfxvoo31',
  '14:30-15:30': 'cmdyszms00009ngirvy8lzcuz',
  '15:30-16:30': 'cmdyszms1000angirgcux6020'
};

// Week 3-7 schedule data based on Excel
const SCHEDULE_DATA = [
  // WEEK 3 (Aug 4-8, 2025)
  { date: '2025-08-04', day: 'MONDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-05', day: 'TUESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-06', day: 'WEDNESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-07', day: 'THURSDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-08', day: 'FRIDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', customEvent: 'University Level Clubs', color: '#8b5cf6' }
  ]},

  // WEEK 4 (Aug 11-15, 2025)  
  { date: '2025-08-11', day: 'MONDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-12', day: 'TUESDAY', schedule: [
    { timeSlot: '09:30-10:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '10:30-11:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '11:30-12:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-13', day: 'WEDNESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-14', day: 'THURSDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  // Aug 15 is HOLIDAY - Independence Day (no classes)
  
  // WEEK 5 (Aug 18-22, 2025)
  { date: '2025-08-18', day: 'MONDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-19', day: 'TUESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-20', day: 'WEDNESDAY', schedule: [
    { timeSlot: '09:30-10:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '10:30-11:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '11:30-12:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', customEvent: 'Design Hive Club', color: '#f59e0b' },
    { timeSlot: '15:30-16:30', customEvent: 'Design Hive Club', color: '#f59e0b' }
  ]},
  { date: '2025-08-21', day: 'THURSDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-22', day: 'FRIDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', customEvent: 'University Level Clubs', color: '#8b5cf6' },
    { timeSlot: '15:30-16:30', customEvent: 'University Level Clubs', color: '#8b5cf6' }
  ]},

  // WEEK 6 (Aug 25-29, 2025)
  { date: '2025-08-25', day: 'MONDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-26', day: 'TUESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  // Aug 27 is HOLIDAY - Ganesh Chaturthi (no classes)
  { date: '2025-08-28', day: 'THURSDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-08-29', day: 'FRIDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},

  // WEEK 7 (Sep 1-5, 2025)
  { date: '2025-09-01', day: 'MONDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-09-02', day: 'TUESDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-09-03', day: 'WEDNESDAY', schedule: [
    { timeSlot: '09:30-10:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '10:30-11:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '11:30-12:30', customEvent: 'Open Elective', color: '#06b6d4' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-09-04', day: 'THURSDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]},
  { date: '2025-09-05', day: 'FRIDAY', schedule: [
    { timeSlot: '09:30-10:30', subject: 'Design for Social Innovation' },
    { timeSlot: '10:30-11:30', subject: 'Design for Social Innovation' },
    { timeSlot: '11:30-12:30', subject: 'Design for Social Innovation' },
    { timeSlot: '13:30-14:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '14:30-15:30', subject: 'Seminar & Research Writing' },
    { timeSlot: '15:30-16:30', subject: 'Seminar & Research Writing' }
  ]}
];

// Holiday data
const HOLIDAYS = [
  {
    date: '2025-08-15',
    name: 'Independence Day',
    type: 'NATIONAL'
  },
  {
    date: '2025-08-27', 
    name: 'Ganesh Chaturthi',
    type: 'FESTIVAL'
  }
];

async function addWeeks3to7Data() {
  console.log('🚀 Adding Weeks 3-7 timetable data...');
  
  let addedCount = 0;
  let skippedCount = 0;
  let holidayCount = 0;
  
  try {
    // First, add holidays to the database if they don't exist
    console.log('🎊 Adding holidays...');
    for (const holiday of HOLIDAYS) {
      const existingHoliday = await prisma.holiday.findFirst({
        where: {
          date: new Date(holiday.date),
          name: holiday.name
        }
      });
      
      if (!existingHoliday) {
        await prisma.holiday.create({
          data: {
            name: holiday.name,
            date: new Date(holiday.date),
            type: holiday.type,
            description: holiday.type === 'NATIONAL' ? 'National Holiday' : 'Festival Holiday',
            isRecurring: false,
            departmentId: null // University-wide holiday
          }
        });
        console.log(`✅ Added holiday: ${holiday.name} on ${holiday.date}`);
        holidayCount++;
      } else {
        console.log(`⏭️ Holiday already exists: ${holiday.name} on ${holiday.date}`);
      }
    }

    // Process each day's schedule
    for (const dayData of SCHEDULE_DATA) {
      console.log(`\n📅 Processing ${dayData.day} ${dayData.date}...`);
      
      for (const classData of dayData.schedule) {
        // Check if entry already exists
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            batchId: BATCH_ID,
            date: new Date(dayData.date),
            dayOfWeek: dayData.day,
            timeSlotId: TIME_SLOTS[classData.timeSlot]
          }
        });
        
        if (existingEntry) {
          console.log(`⏭️ Entry already exists for ${dayData.day} ${dayData.date} at ${classData.timeSlot}`);
          skippedCount++;
          continue;
        }
        
        let entryData = {
          batchId: BATCH_ID,
          timeSlotId: TIME_SLOTS[classData.timeSlot],
          dayOfWeek: dayData.day,
          date: new Date(dayData.date),
          entryType: 'REGULAR'
        };
        
        if (classData.subject) {
          // Regular subject class
          const subjectInfo = SUBJECTS[classData.subject];
          entryData.subjectId = subjectInfo.id;
          entryData.facultyId = subjectInfo.facultyId;
          
          console.log(`➕ Adding subject: ${classData.subject} at ${classData.timeSlot}`);
        } else if (classData.customEvent) {
          // Custom event
          entryData.customEventTitle = classData.customEvent;
          entryData.customEventColor = classData.color;
          entryData.subjectId = null;
          entryData.facultyId = null;
          
          console.log(`🎨 Adding custom event: ${classData.customEvent} at ${classData.timeSlot}`);
        }
        
        await prisma.timetableEntry.create({
          data: entryData
        });
        
        addedCount++;
      }
    }
    
    console.log('\n✅ Week 3-7 data import completed!');
    console.log(`📊 Summary:`);
    console.log(`   Timetable entries added: ${addedCount}`);
    console.log(`   Entries skipped (already exist): ${skippedCount}`);
    console.log(`   Holidays added: ${holidayCount}`);
    
  } catch (error) {
    console.error('❌ Error adding Week 3-7 data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addWeeks3to7Data();