// Debug Attendance History Data
// Run this in the browser console on the attendance page

console.log('🔍 DEBUGGING ATTENDANCE HISTORY DATA');

// 1. Check what data is being passed to attendance history components
const attendanceHistoryElements = document.querySelectorAll('[data-student-id]');
console.log('📊 Found attendance rows:', attendanceHistoryElements.length);

// 2. Check the current URL parameters
const url = new URL(window.location);
const urlParams = {
  batch: url.searchParams.get('batch'),
  subject: url.searchParams.get('subject'),
  date: url.searchParams.get('date')
};
console.log('🔗 URL Parameters:', urlParams);

// 3. Check localStorage for any cached data
const cachedData = Object.keys(localStorage).filter(key => 
  key.includes('attendance') || key.includes('student')
);
console.log('💾 Cached attendance data keys:', cachedData);

// 4. Check network requests to the attendance API
console.log('🌐 Monitoring network requests...');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/api/attendance')) {
    console.log('📡 Attendance API Request:', args[0]);
    return originalFetch.apply(this, args).then(response => {
      return response.clone().json().then(data => {
        console.log('📥 Attendance API Response:', {
          url: args[0],
          data: data
        });
        if (data.data && data.data.length > 0) {
          console.log('👨‍🎓 First student attendance history:', data.data[0].attendanceHistory);
          console.log('📅 Sessions attendance history:', data.data[0].sessionAttendanceHistory);
        }
        return response;
      }).catch(() => response);
    });
  }
  return originalFetch.apply(this, args);
};

// 5. Check React component state (if using React DevTools)
console.log('⚛️  To check React state:');
console.log('- Open React DevTools');
console.log('- Find AttendancePageProduction component');
console.log('- Check students prop data');
console.log('- Look at attendanceData prop');

// 6. Manual API test
const testAPI = async () => {
  const currentParams = new URLSearchParams(window.location.search);
  const testUrl = `/api/attendance/students?${currentParams.toString()}`;
  
  console.log('🧪 Testing API directly:', testUrl);
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('🔬 Direct API Test Results:');
    console.log('- Success:', data.success);
    console.log('- Total students:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      const firstStudent = data.data[0];
      console.log('👤 First Student Data:');
      console.log('- ID:', firstStudent.id);
      console.log('- Name:', firstStudent.name);
      console.log('- Attendance History:', firstStudent.attendanceHistory);
      console.log('- Session Attendance:', firstStudent.sessionAttendanceHistory);
      
      // Check if attendance history has any data
      if (firstStudent.attendanceHistory.length === 0) {
        console.log('❌ No attendance history found!');
      } else {
        console.log('✅ Attendance history found:', firstStudent.attendanceHistory.length, 'records');
        firstStudent.attendanceHistory.forEach((record, index) => {
          console.log(`📋 Record ${index + 1}:`, record);
        });
      }
    }
  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
};

// Run the API test
testAPI();

// 7. Check for any React Query cache
if (window.__REACT_QUERY_DEVTOOLS__) {
  console.log('🔍 React Query cache available - check devtools');
}

console.log('✅ Debug setup complete. Check the logs above and network tab.');
console.log('💡 Tip: Try changing the date and see if new requests are made.');