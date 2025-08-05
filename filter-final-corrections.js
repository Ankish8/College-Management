const fs = require('fs');

// Helper function to safely convert to string
const safeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

try {
  // Read the raw data
  const rawData = JSON.parse(fs.readFileSync('bdes-raw-data.json', 'utf8'));
  
  const filteredResults = {};
  
  Object.keys(rawData).forEach(sheetLabel => {
    const sheetData = rawData[sheetLabel];
    console.log(`\n🔍 FILTERING WITH CORRECTIONS: ${sheetLabel}`);
    console.log('='.repeat(50));
    
    let filteredStudents = [];
    
    if (sheetLabel === 'B-Des UX 3 (Foundation)') {
      // For Foundation year, filter by Stream and Registration status
      filteredStudents = sheetData.rawData.filter(student => {
        const isRegistered = student['Registered/Not Registered'] === 'Registered';
        const streamText = safeString(student['Stream']).toLowerCase();
        const isUXStream = streamText.includes('ui') || streamText.includes('ux');
        
        return isRegistered && isUXStream;
      });
      
    } else if (sheetLabel === 'B-Des UX 7') {
      // For B-Des UX 7: Exclude Taniska Sharma specifically
      const registrationKey = 'Registered/          Not Registered';
      
      filteredStudents = sheetData.rawData.filter(student => {
        const studentName = safeString(student['Name of Student']).toLowerCase();
        const isRegistered = student[registrationKey] === 'Registered';
        
        // Exclude Taniska Sharma even if marked as registered
        if (studentName.includes('taniska') && studentName.includes('sharma')) {
          console.log(`❌ Excluding Taniska Sharma (Serial #${student['S.No']}) - User confirmed unregistered`);
          return false;
        }
        
        return isRegistered;
      });
      
    } else if (sheetLabel === 'B-Des UX 5') {
      // For B-Des UX 5: Include all with any form of registration
      const registrationKey = 'Registered/          Not Registered';
      
      filteredStudents = sheetData.rawData.filter(student => {
        const regStatus = safeString(student[registrationKey]).toLowerCase();
        
        // Accept "Registered" or any status with "subject to approved" (fee payment)
        const isRegistered = regStatus === 'registered' || 
                           regStatus.includes('subject to approved') ||
                           regStatus.includes('installment');
        
        if (regStatus.includes('subject to approved')) {
          console.log(`✅ Including student with fee payment pending: ${student['Name of Student']}`);
        }
        
        return isRegistered;
      });
    }
    
    // Clean up the student data
    const cleanedStudents = filteredStudents.map(student => {
      const cleaned = {
        serialNo: student['S.No'],
        studentId: safeString(student[' Reg No./ Student ID NO']),
        rollNumber: safeString(student['Roll No']),
        name: safeString(student['Name of Student']),
        contactNo: student['Student Contact No.'],
        personalEmail: safeString(student['Student Personal Email ID']),
        officialEmail: safeString(student['Student JLU Official Email ID']),
        registrationStatus: student['Registered/          Not Registered'] || student['Registered/Not Registered'],
        stream: safeString(student['Stream']) || `Bachelor of Design UX - Semester ${sheetData.semester}`
      };
      
      // Remove undefined/empty values
      Object.keys(cleaned).forEach(key => {
        if (!cleaned[key] || cleaned[key] === '') {
          delete cleaned[key];
        }
      });
      
      return cleaned;
    });
    
    filteredResults[sheetLabel] = {
      semester: sheetData.semester,
      totalFiltered: cleanedStudents.length,
      students: cleanedStudents
    };
    
    console.log(`✅ Final corrected count: ${cleanedStudents.length} students`);
  });
  
  // Save corrected results
  fs.writeFileSync('bdes-final-students.json', JSON.stringify(filteredResults, null, 2));
  
  console.log('\n\n📊 FINAL CORRECTED SUMMARY:');
  console.log('='.repeat(50));
  let totalStudents = 0;
  
  Object.keys(filteredResults).forEach(sheetLabel => {
    const count = filteredResults[sheetLabel].totalFiltered;
    totalStudents += count;
    console.log(`${sheetLabel}: ${count} students`);
  });
  
  console.log(`\n🎯 TOTAL STUDENTS TO IMPORT: ${totalStudents}`);
  console.log('\n✅ Final corrected data saved to: bdes-final-students.json');
  console.log('\n🚀 Ready for import approval!');
  
} catch (error) {
  console.error('Error applying corrections:', error.message);
}