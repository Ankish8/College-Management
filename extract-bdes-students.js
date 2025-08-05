const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Read the Excel file
const filePath = path.join(__dirname, 'Student List-JSDN (January-June 2025) revised on 17.2.25.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  const sheetsToProcess = [
    { name: 'Bdes (UX) VI', semester: 7, label: 'B-Des UX 7' },
    { name: 'B Des (UX) IV', semester: 5, label: 'B-Des UX 5' },
    { name: 'B.Des-II (FY)', semester: 3, label: 'B-Des UX 3 (Foundation)' }
  ];
  
  const allStudentData = {};
  
  sheetsToProcess.forEach(sheetInfo => {
    console.log(`\n🔍 PROCESSING: ${sheetInfo.label} (${sheetInfo.name})`);
    console.log('='.repeat(60));
    
    const worksheet = workbook.Sheets[sheetInfo.name];
    
    // Convert to JSON starting from row 4 to skip headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      range: 3,
      defval: ''
    });
    
    console.log(`Raw records found: ${rawData.length}`);
    
    // Filter out empty rows
    const nonEmptyData = rawData.filter(row => {
      const values = Object.values(row);
      return values.some(val => val && val.toString().trim() !== '');
    });
    
    console.log(`Non-empty records: ${nonEmptyData.length}`);
    
    if (nonEmptyData.length > 0) {
      console.log('\n📋 Column Headers:');
      Object.keys(nonEmptyData[0]).forEach((key, index) => {
        console.log(`${index + 1}. "${key}"`);
      });
      
      console.log('\n📄 First 3 records:');
      nonEmptyData.slice(0, 3).forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`, JSON.stringify(record, null, 2));
      });
    }
    
    // Store the data for further processing
    allStudentData[sheetInfo.label] = {
      sheetName: sheetInfo.name,
      semester: sheetInfo.semester,
      rawData: nonEmptyData,
      filteredData: [] // Will be populated after filtering
    };
  });
  
  // Save raw data for inspection
  fs.writeFileSync('bdes-raw-data.json', JSON.stringify(allStudentData, null, 2));
  console.log('\n\n✅ Raw data saved to bdes-raw-data.json');
  console.log('\nNext step: Review the column headers and data structure to apply filters for:');
  console.log('- Registered students only');
  console.log('- Bachelor of Design UX/UI UX only');
  
} catch (error) {
  console.error('Error processing Excel file:', error.message);
}