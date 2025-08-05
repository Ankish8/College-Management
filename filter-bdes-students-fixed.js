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
    console.log(`\n🔍 FILTERING: ${sheetLabel}`);
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
      
      console.log(`📊 Foundation Year Filtering:`);
      console.log(`- Total students: ${sheetData.rawData.length}`);
      console.log(`- Registered students: ${sheetData.rawData.filter(s => s['Registered/Not Registered'] === 'Registered').length}`);
      console.log(`- All streams found:`);
      
      // Show all unique streams
      const streams = [...new Set(sheetData.rawData.map(s => safeString(s['Stream'])).filter(Boolean))];
      streams.forEach(stream => {
        const count = sheetData.rawData.filter(s => 
          safeString(s['Stream']) === stream && 
          s['Registered/Not Registered'] === 'Registered'
        ).length;
        console.log(`  • ${stream}: ${count} registered students`);
      });
      
    } else {
      // For UX specific sheets, just filter by registration status
      const registrationKey = sheetData.rawData[0]['Registered/          Not Registered'] !== undefined 
        ? 'Registered/          Not Registered' 
        : 'Registered/Not Registered';
        
      filteredStudents = sheetData.rawData.filter(student => {
        return student[registrationKey] === 'Registered';
      });
      
      console.log(`📊 ${sheetLabel} Filtering:`);
      console.log(`- Total students: ${sheetData.rawData.length}`);
      console.log(`- Registered students: ${filteredStudents.length}`);
      console.log(`- Not registered: ${sheetData.rawData.length - filteredStudents.length}`);
    }
    
    // Clean up the student data - remove duplicate/empty columns
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
    
    console.log(`✅ Final filtered count: ${cleanedStudents.length} students`);
    
    if (cleanedStudents.length > 0) {
      console.log(`\n📋 Sample student (${sheetLabel}):`);
      console.log(JSON.stringify(cleanedStudents[0], null, 2));
    }
  });
  
  // Save filtered results
  fs.writeFileSync('bdes-filtered-students.json', JSON.stringify(filteredResults, null, 2));
  
  console.log('\n\n📊 FINAL SUMMARY:');
  console.log('='.repeat(50));
  let totalStudents = 0;
  
  Object.keys(filteredResults).forEach(sheetLabel => {
    const count = filteredResults[sheetLabel].totalFiltered;
    totalStudents += count;
    console.log(`${sheetLabel}: ${count} students`);
  });
  
  console.log(`\n🎯 TOTAL STUDENTS TO IMPORT: ${totalStudents}`);
  console.log('\n✅ Filtered data saved to: bdes-filtered-students.json');
  console.log('\n⚠️  Please review the filtered data before approving import!');
  
} catch (error) {
  console.error('Error filtering data:', error.message);
  console.error('Full error:', error);
}