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
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Number of students:', jsonData.length);
  console.log('\nFirst few rows:');
  console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
  
  console.log('\nColumn headers:');
  console.log(Object.keys(jsonData[0] || {}));
  
  // Save as JSON for easier processing
  const fs = require('fs');
  fs.writeFileSync('students-data.json', JSON.stringify(jsonData, null, 2));
  console.log('\nData saved to students-data.json');
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  console.log('Please install xlsx package: npm install xlsx');
}