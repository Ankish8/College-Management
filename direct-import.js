#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function directImport() {
  try {
    console.log('🚀 Starting direct database import...');
    
    // Read the validated JSON data
    const jsonData = JSON.parse(fs.readFileSync('batch5-week1-final.json', 'utf8'));
    
    console.log(`📊 Import Data Summary:`);
    console.log(`   - Import ID: ${jsonData.metadata.importId}`);
    console.log(`   - Batch: ${jsonData.batch.name}`);
    console.log(`   - Total entries: ${jsonData.entries.length}`);
    
    // 1. Find or create department
    console.log('\n🔍 Checking department...');
    const department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });
    
    if (!department) {
      throw new Error('Design department not found. Please ensure the database is properly seeded.');
    }
    console.log(`✅ Found department: ${department.name}`);
    
    // 2. Find or create program
    console.log('\n🔍 Checking program...');
    let program = await prisma.program.findFirst({
      where: { 
        departmentId: department.id,
        name: { contains: "B.Des" }
      }
    });
    
    if (!program) {
      program = await prisma.program.create({
        data: {
          name: "Bachelor of Design",
          shortName: "B.Des",
          duration: 4,
          totalSems: 8,
          programType: "UNDERGRADUATE",
          departmentId: department.id,
          isActive: true
        }
      });
      console.log(`✅ Created program: ${program.name}`);
    } else {
      console.log(`✅ Found program: ${program.name}`);
    }
    
    // 3. Find or create specialization
    console.log('\n🔍 Checking specialization...');
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
    
    // 4. Find or create batch
    console.log('\n🔍 Checking batch...');
    let batch = await prisma.batch.findFirst({
      where: { name: "B.Des UX Batch 5" }
    });
    
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          name: "B.Des UX Batch 5",
          programId: program.id,
          specializationId: specialization.id,
          semester: 5, // Semester 5
          startYear: 2023,
          endYear: 2027,
          maxCapacity: 30,
          currentStrength: 0,
          semType: "ODD",
          isActive: true
        }
      });
      console.log(`✅ Created batch: ${batch.name}`);
    } else {
      console.log(`✅ Found batch: ${batch.name}`);
    }
    
    // 5. Create/update time slots
    console.log('\n⏰ Processing time slots...');
    const timeSlotMap = new Map();
    
    for (const timeSlotData of jsonData.timeSlots) {
      let timeSlot = await prisma.timeSlot.findFirst({
        where: { 
          OR: [
            { name: timeSlotData.name },
            { startTime: timeSlotData.startTime, endTime: timeSlotData.endTime }
          ]
        }
      });
      
      if (!timeSlot) {
        timeSlot = await prisma.timeSlot.create({
          data: {
            name: timeSlotData.name,
            startTime: timeSlotData.startTime,
            endTime: timeSlotData.endTime,
            duration: timeSlotData.duration,
            isActive: true,
            sortOrder: timeSlotData.sortOrder
          }
        });
        console.log(`✅ Created time slot: ${timeSlot.name}`);
      } else {
        console.log(`✅ Found time slot: ${timeSlot.name}`);
      }
      
      // Map both the JSON name and the entry time slot format
      timeSlotMap.set(timeSlotData.name, timeSlot.id);
      timeSlotMap.set(`${timeSlotData.startTime.replace(':', '')}-${timeSlotData.endTime.replace(':', '')}`, timeSlot.id);
    }
    
    // 6. Process entries
    console.log('\n📚 Processing timetable entries...');
    let created = { subjects: 0, faculty: 0, entries: 0, holidays: 0, events: 0 };
    
    // Focus on Week 1 entries (July 21-25, 2025)
    const week1Entries = jsonData.entries.filter(e => {
      const entryDate = new Date(e.date);
      const week1Start = new Date('2025-07-21');
      const week1End = new Date('2025-07-25');
      return entryDate >= week1Start && entryDate <= week1End;
    });
    
    console.log(`   Found ${week1Entries.length} Week 1 entries to process`);
    const entries = week1Entries;
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (i % 10 === 0) {
        console.log(`   Processing entry ${i + 1}/${entries.length}...`);
      }
      
      if (entry.type === 'HOLIDAY') {
        // Create holiday
        const existingHoliday = await prisma.holiday.findFirst({
          where: {
            date: new Date(entry.date),
            name: entry.name
          }
        });
        
        if (!existingHoliday) {
          await prisma.holiday.create({
            data: {
              name: entry.name,
              date: new Date(entry.date),
              type: entry.holidayType,
              description: entry.description,
              isRecurring: entry.isRecurring,
              departmentId: department.id
            }
          });
          created.holidays++;
        }
      } else {
        // Handle subject and custom event entries
        let subjectId = null;
        let facultyId = null;
        
        if (entry.type === 'SUBJECT') {
          // Find or create subject
          let subject = await prisma.subject.findFirst({
            where: { 
              OR: [
                { code: entry.subject.code },
                { name: entry.subject.name, batchId: batch.id }
              ]
            }
          });
          
          if (!subject) {
            subject = await prisma.subject.create({
              data: {
                name: entry.subject.name,
                code: entry.subject.code,
                credits: entry.subject.credits,
                totalHours: entry.subject.credits * 15,
                batchId: batch.id,
                examType: entry.subject.type,
                subjectType: "CORE",
                isActive: true
              }
            });
            created.subjects++;
          }
          subjectId = subject.id;
          
          // Find or create faculty
          let faculty = await prisma.user.findFirst({
            where: {
              email: entry.faculty.email,
              role: 'FACULTY'
            }
          });
          
          if (!faculty) {
            faculty = await prisma.user.create({
              data: {
                name: entry.faculty.name,
                email: entry.faculty.email,
                role: 'FACULTY',
                status: 'ACTIVE',
                departmentId: department.id
              }
            });
            created.faculty++;
          }
          facultyId = faculty.id;
          
          // Update subject with faculty if not assigned
          if (!subject.primaryFacultyId) {
            await prisma.subject.update({
              where: { id: subject.id },
              data: { primaryFacultyId: faculty.id }
            });
          }
        }
        
        // Find time slot - try multiple formats
        let timeSlotId = timeSlotMap.get(entry.timeSlot);
        if (!timeSlotId) {
          // Try alternative formats
          const altFormat = entry.timeSlot.replace(':', '').replace('-', '');
          timeSlotId = timeSlotMap.get(altFormat);
        }
        if (!timeSlotId) {
          // Try direct database lookup
          const timeSlot = await prisma.timeSlot.findFirst({
            where: {
              OR: [
                { name: entry.timeSlot },
                { name: entry.timeSlot.replace('-', ' - ') },
                { startTime: entry.timeSlot.split('-')[0], endTime: entry.timeSlot.split('-')[1] }
              ]
            }
          });
          if (timeSlot) {
            timeSlotId = timeSlot.id;
            timeSlotMap.set(entry.timeSlot, timeSlot.id);
          }
        }
        if (!timeSlotId) {
          if (i < 5) console.log(`⚠️  Time slot not found: ${entry.timeSlot}`);
          continue;
        }
        
        // Create timetable entry
        const entryData = {
          batchId: batch.id,
          dayOfWeek: entry.dayOfWeek,
          timeSlotId: timeSlotId,
          date: new Date(entry.date),
          isActive: true
        };
        
        if (entry.type === 'SUBJECT') {
          entryData.subjectId = subjectId;
          entryData.facultyId = facultyId;
          entryData.notes = entry.notes;
          entryData.entryType = 'REGULAR';
        } else if (entry.type === 'CUSTOM_EVENT') {
          entryData.customEventTitle = entry.title;
          entryData.customEventColor = entry.color || '#3b82f6';
          entryData.notes = entry.description;
          entryData.entryType = 'EVENT';
          entryData.requiresAttendance = false;
          created.events++;
        }
        
        // Check for existing entry to avoid duplicates
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            batchId: batch.id,
            dayOfWeek: entry.dayOfWeek,
            timeSlotId: timeSlotId,
            date: new Date(entry.date)
          }
        });
        
        if (!existingEntry) {
          await prisma.timetableEntry.create({ data: entryData });
          created.entries++;
        }
      }
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Subjects created: ${created.subjects}`);
    console.log(`   - Faculty created: ${created.faculty}`);
    console.log(`   - Timetable entries created: ${created.entries}`);
    console.log(`   - Holidays created: ${created.holidays}`);
    console.log(`   - Custom events: ${created.events}`);
    
    console.log('\n🎯 Week 1 data should now be visible in the timetable!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
directImport();