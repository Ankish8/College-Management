// Database Schema Debug - Run in browser console
// This will help us understand the database structure

console.log('🔍 DATABASE SCHEMA DEBUG');

const debugSchema = async () => {
  try {
    console.log('🧪 Testing different API endpoints to understand schema...');
    
    // 1. Check if AttendanceSession table exists
    console.log('📋 1. Testing AttendanceSession...');
    try {
      const sessionResponse = await fetch('/api/attendance/courses/cmdyt7jx30007ngafndajz1af/sessions');
      const sessionData = await sessionResponse.json();
      console.log('✅ Sessions API Response:', sessionData);
    } catch (e) {
      console.log('❌ Sessions API failed:', e.message);
    }

    // 2. Check existing attendance records
    console.log('📋 2. Testing existing attendance...');
    try {
      const attendanceResponse = await fetch('/api/attendance/courses/cmdyt7jx30007ngafndajz1af/attendance?date=2025-08-06');
      const attendanceData = await attendanceResponse.json();
      console.log('✅ Attendance API Response:', attendanceData);
    } catch (e) {
      console.log('❌ Attendance API failed:', e.message);
    }

    // 3. Let's manually query what exists in the database via students API
    console.log('📋 3. Checking what attendance records actually exist...');
    try {
      // Get all students first
      const studentsResponse = await fetch('/api/attendance/students?batch=cmdyt7d8f0005ng6fegxwrq4b&subject=cmdyt7jx30007ngafndajz1af');
      const studentsData = await studentsResponse.json();
      
      console.log('👥 Total students:', studentsData.data?.length);
      
      if (studentsData.data && studentsData.data.length > 0) {
        const firstStudent = studentsData.data[0];
        
        // Check the raw attendance records structure
        console.log('📊 Raw student data structure:');
        console.log('- attendanceHistory:', firstStudent.attendanceHistory);
        console.log('- sessionAttendanceHistory:', firstStudent.sessionAttendanceHistory);
        console.log('- attendanceStats:', firstStudent.attendanceStats);
        
        // Log all keys to see what's available
        console.log('🔑 Available keys in student object:', Object.keys(firstStudent));
      }
    } catch (e) {
      console.log('❌ Students detailed check failed:', e.message);
    }

    // 4. Let's try to understand what table structure we should be using
    console.log('📋 4. Database structure analysis...');
    console.log('💡 Based on Prisma schema, we should check:');
    console.log('- TimetableEntry (for scheduled classes)');
    console.log('- AttendanceSession (for attendance sessions)');
    console.log('- AttendanceRecord (for individual attendance records)');
    
  } catch (error) {
    console.error('❌ Schema debug failed:', error);
  }
};

debugSchema();

// Helper function to test the API with different approaches
const testDifferentApproaches = async () => {
  console.log('🔬 TESTING DIFFERENT APPROACHES TO GET SCHEDULED SESSIONS...');
  
  const subjectId = 'cmdyt7jx30007ngafndajz1af';
  const date = '2025-08-06';
  
  // Approach 1: Try to get timetable entries for this week
  console.log('📅 Approach 1: Timetable entries...');
  try {
    // This might not exist as an endpoint, but let's see
    const timetableResponse = await fetch(`/api/timetable/entries?subject=${subjectId}&date=${date}`);
    const timetableData = await timetableResponse.json();
    console.log('✅ Timetable entries:', timetableData);
  } catch (e) {
    console.log('❌ Timetable approach failed:', e.message);
  }
  
  console.log('💡 Next steps:');
  console.log('1. Check Prisma schema file');
  console.log('2. Look at database tables directly');
  console.log('3. Find how sessions are actually stored');
};

testDifferentApproaches();