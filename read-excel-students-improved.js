const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'Student List-JSDN (January-June 2025) revised on 17.2.25.xlsx');

try {
  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  console.log('Sheet name:', sheetName);
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log('Range:', range);
  
  // Convert to JSON with range starting from row 4 (skip headers)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    range: 3, // Start from row 4 (0-indexed, so 3)
    defval: '' // Default value for empty cells
  });
  
  console.log('Number of student records:', jsonData.length);
  
  // Filter out empty rows
  const studentData = jsonData.filter(row => {
    const values = Object.values(row);
    return values.some(val => val && val.toString().trim() !== '');
  });
  
  console.log('Number of valid student records:', studentData.length);
  
  if (studentData.length > 0) {
    console.log('\nFirst student record:');
    console.log(JSON.stringify(studentData[0], null, 2));
    
    console.log('\nColumn headers (keys):');
    console.log(Object.keys(studentData[0]));
    
    // Try to identify the structure
    console.log('\nSample data structure:');
    studentData.slice(0, 3).forEach((student, index) => {
      console.log(`\nStudent ${index + 1}:`, Object.values(student).slice(0, 5));
    });
  }
  
  // Save processed data
  const fs = require('fs');
  fs.writeFileSync('students-data-processed.json', JSON.stringify(studentData, null, 2));
  console.log('\nProcessed data saved to students-data-processed.json');
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
}