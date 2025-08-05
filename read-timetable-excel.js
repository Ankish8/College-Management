const XLSX = require('xlsx');
const fs = require('fs');

try {
  console.log('📊 Reading Timetable Excel File...\n');
  
  // Read the Excel file
  const workbook = XLSX.readFile('Time Table_Block_ July to December 2025_Odd Sem.xlsx');
  
  console.log('📋 Available sheets:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });
  
  // Look for B-Des UX Sem 7 sheet
  const targetSheets = workbook.SheetNames.filter(name => 
    name.toLowerCase().includes('b') && 
    name.toLowerCase().includes('des') &&
    name.toLowerCase().includes('7')
  );
  
  console.log('\n🎯 Sheets that might contain B-Des UX Sem 7:');
  targetSheets.forEach(name => {
    console.log(`  • ${name}`);
  });
  
  if (targetSheets.length > 0) {
    const sheetName = targetSheets[0];
    console.log(`\n📖 Reading sheet: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('\n📊 First 20 rows of the sheet:');
    data.slice(0, 20).forEach((row, index) => {
      if (row && row.length > 0) {
        console.log(`Row ${index + 1}:`, row.slice(0, 10).join(' | '));
      }
    });
    
    // Save raw data for inspection
    fs.writeFileSync('timetable-raw-data.json', JSON.stringify({
      sheetName: sheetName,
      data: data
    }, null, 2));
    
    console.log('\n✅ Raw data saved to timetable-raw-data.json');
  } else {
    console.log('\n❌ No B-Des UX Sem 7 sheet found. Available sheets:');
    workbook.SheetNames.forEach(name => console.log(`  • ${name}`));
  }
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
}