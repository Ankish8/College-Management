const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function flushData() {
  console.log('🗑️  Starting database flush (keeping admin user)...');
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      console.log('📋 Deleting operation logs...');
      await tx.operationLog.deleteMany();
      
      console.log('📋 Deleting bulk operations...');
      await tx.bulkOperation.deleteMany();
      
      console.log('📋 Deleting attendance disputes...');
      await tx.attendanceDispute.deleteMany();
      
      console.log('📋 Deleting attendance records...');
      await tx.attendanceRecord.deleteMany();
      
      console.log('📋 Deleting attendance sessions...');
      await tx.attendanceSession.deleteMany();
      
      console.log('📋 Deleting timetable entries...');
      await tx.timetableEntry.deleteMany();
      
      console.log('📋 Deleting timetable templates (old)...');
      await tx.timetableTemplate.deleteMany();
      
      console.log('📋 Deleting timetable templates (new)...');
      await tx.timetableTemplateNew.deleteMany();
      
      console.log('📋 Deleting subjects...');
      await tx.subject.deleteMany();
      
      console.log('📋 Deleting faculty blackout periods...');
      await tx.facultyBlackoutPeriod.deleteMany();
      
      console.log('📋 Deleting faculty preferences...');
      await tx.facultyPreferences.deleteMany();
      
      console.log('📋 Deleting user preferences...');
      await tx.userPreferences.deleteMany();
      
      console.log('📋 Deleting students...');
      await tx.student.deleteMany();
      
      console.log('📋 Deleting batches...');
      await tx.batch.deleteMany();
      
      console.log('📋 Deleting specializations...');
      await tx.specialization.deleteMany();
      
      console.log('📋 Deleting programs...');
      await tx.program.deleteMany();
      
      console.log('📋 Deleting exam periods...');
      await tx.examPeriod.deleteMany();
      
      console.log('📋 Deleting holidays...');
      await tx.holiday.deleteMany();
      
      console.log('📋 Deleting academic calendars...');
      await tx.academicCalendar.deleteMany();
      
      console.log('📋 Deleting department settings...');
      await tx.departmentSettings.deleteMany();
      
      console.log('📋 Deleting time slots...');
      await tx.timeSlot.deleteMany();
      
      console.log('📋 Deleting non-admin users...');
      await tx.user.deleteMany({
        where: {
          role: {
            not: 'ADMIN'
          }
        }
      });
      
      console.log('📋 Deleting departments...');
      await tx.department.deleteMany();
      
      console.log('📋 Deleting universities...');
      await tx.university.deleteMany();
      
      console.log('✅ Database flush completed successfully!');
    });
    
    // Verify admin user still exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    console.log(`👤 Admin users remaining: ${adminCount}`);
    
    // Show final counts
    const finalCounts = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.batch.count(),
      prisma.subject.count(),
      prisma.timetableEntry.count(),
      prisma.attendanceSession.count(),
      prisma.department.count(),
      prisma.university.count()
    ]);
    
    console.log('\n📊 Final counts:');
    console.log(`Users: ${finalCounts[0]}`);
    console.log(`Students: ${finalCounts[1]}`);
    console.log(`Batches: ${finalCounts[2]}`);
    console.log(`Subjects: ${finalCounts[3]}`);
    console.log(`Timetable Entries: ${finalCounts[4]}`);
    console.log(`Attendance Sessions: ${finalCounts[5]}`);
    console.log(`Departments: ${finalCounts[6]}`);
    console.log(`Universities: ${finalCounts[7]}`);
    
  } catch (error) {
    console.error('❌ Error during database flush:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the flush
flushData()
  .catch(console.error)
  .finally(() => process.exit(0));