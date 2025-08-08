const { PrismaClient } = require('@prisma/client');

async function flushTimetableAndAttendance() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Starting flush operation...');
    
    // Get counts before deletion for verification
    const beforeCounts = {
      timetableEntries: await prisma.timetableEntry.count(),
      attendanceDisputes: await prisma.attendanceDispute.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      attendanceSessions: await prisma.attendanceSession.count(),
    };

    console.log('📊 Current counts before deletion:');
    console.log(`  - TimetableEntry: ${beforeCounts.timetableEntries}`);
    console.log(`  - AttendanceDispute: ${beforeCounts.attendanceDisputes}`);
    console.log(`  - AttendanceRecord: ${beforeCounts.attendanceRecords}`);
    console.log(`  - AttendanceSession: ${beforeCounts.attendanceSessions}`);
    
    // Use transaction to ensure all deletions are atomic
    await prisma.$transaction(async (tx) => {
      console.log('\n🗑️  Deleting attendance disputes...');
      const disputesDeleted = await tx.attendanceDispute.deleteMany({});
      console.log(`   ✅ Deleted ${disputesDeleted.count} attendance disputes`);

      console.log('🗑️  Deleting attendance records...');
      const recordsDeleted = await tx.attendanceRecord.deleteMany({});
      console.log(`   ✅ Deleted ${recordsDeleted.count} attendance records`);

      console.log('🗑️  Deleting attendance sessions...');
      const sessionsDeleted = await tx.attendanceSession.deleteMany({});
      console.log(`   ✅ Deleted ${sessionsDeleted.count} attendance sessions`);

      console.log('🗑️  Deleting timetable entries...');
      const timetableDeleted = await tx.timetableEntry.deleteMany({});
      console.log(`   ✅ Deleted ${timetableDeleted.count} timetable entries`);
    });

    // Get counts after deletion for verification
    const afterCounts = {
      timetableEntries: await prisma.timetableEntry.count(),
      attendanceDisputes: await prisma.attendanceDispute.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      attendanceSessions: await prisma.attendanceSession.count(),
    };

    console.log('\n📊 Final counts after deletion:');
    console.log(`  - TimetableEntry: ${afterCounts.timetableEntries}`);
    console.log(`  - AttendanceDispute: ${afterCounts.attendanceDisputes}`);
    console.log(`  - AttendanceRecord: ${afterCounts.attendanceRecords}`);
    console.log(`  - AttendanceSession: ${afterCounts.attendanceSessions}`);

    // Verify all target tables are empty
    const allEmpty = afterCounts.timetableEntries === 0 && 
                    afterCounts.attendanceDisputes === 0 && 
                    afterCounts.attendanceRecords === 0 && 
                    afterCounts.attendanceSessions === 0;

    if (allEmpty) {
      console.log('\n✅ SUCCESS: All timetable and attendance data has been flushed!');
      console.log('🎯 The following data types remain intact: Batches, Subjects, Students, Faculty, Users, etc.');
    } else {
      console.log('\n❌ ERROR: Some data may not have been deleted properly');
    }

  } catch (error) {
    console.error('❌ Error during flush operation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the flush operation
flushTimetableAndAttendance()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });