const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'Student List-JSDN (January-June 2025) revised on 17.2.25.xlsx');

try {
  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  
  console.log('📋 ALL SHEETS IN THE EXCEL FILE:');
  console.log('================================');
  
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`${index + 1}. "${sheetName}"`);
    
    // Get basic info about each sheet
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const totalRows = range.e.r + 1;
    const totalCols = range.e.c + 1;
    
    console.log(`   - Rows: ${totalRows}, Columns: ${totalCols}`);
    
    // Try to get a few sample cells to understand structure
    const sampleData = XLSX.utils.sheet_to_json(worksheet, { 
      range: 0,
      header: 1,
      defval: ''
    }).slice(0, 5);
    
    console.log(`   - Sample data rows: ${sampleData.length}`);
    console.log('');
  });
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
}