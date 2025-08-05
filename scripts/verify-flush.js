const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFlush() {
  console.log('🔍 Verifying database flush...');
  
  try {
    // Check admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Role: ${adminUser.role}`);
    } else {
      console.log('❌ No admin user found!');
    }
    
    // Check all table counts
    const counts = {
      users: await prisma.user.count(),
      students: await prisma.student.count(),
      batches: await prisma.batch.count(),
      subjects: await prisma.subject.count(),
      timetableEntries: await prisma.timetableEntry.count(),
      attendanceSessions: await prisma.attendanceSession.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      departments: await prisma.department.count(),
      universities: await prisma.university.count(),
      programs: await prisma.program.count(),
      specializations: await prisma.specialization.count(),
      timeSlots: await prisma.timeSlot.count(),
      facultyPreferences: await prisma.facultyPreferences.count(),
      userPreferences: await prisma.userPreferences.count(),
      bulkOperations: await prisma.bulkOperation.count(),
      timetableTemplates: await prisma.timetableTemplate.count(),
      timetableTemplatesNew: await prisma.timetableTemplateNew.count(),
      academicCalendars: await prisma.academicCalendar.count(),
      holidays: await prisma.holiday.count(),
      examPeriods: await prisma.examPeriod.count(),
      departmentSettings: await prisma.departmentSettings.count()
    };
    
    console.log('\n📊 Database counts after flush:');
    Object.entries(counts).forEach(([table, count]) => {
      const status = (table === 'users' && count === 1) || count === 0 ? '✅' : '⚠️';
      console.log(`${status} ${table}: ${count}`);
    });
    
    // Summary
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`\n📈 Total records: ${totalRecords} (should be 1 - admin user only)`);
    
    if (totalRecords === 1 && counts.users === 1) {
      console.log('🎉 Database successfully flushed! Only admin user remains.');
    } else {
      console.log('⚠️  Database flush may not be complete. Please review counts above.');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFlush();