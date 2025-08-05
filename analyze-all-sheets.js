const XLSX = require('xlsx');

try {
  console.log('📊 Analyzing All Sheets in Timetable Excel...\n');
  
  // Read the Excel file
  const workbook = XLSX.readFile('Time Table_Block_ July to December 2025_Odd Sem.xlsx');
  
  console.log('📋 All Available Sheets:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`  ${index + 1}. "${name}"`);
  });
  
  // Look for sheets that might contain "SAM", "Beta", or similar
  const potentialSheets = workbook.SheetNames.filter(name => 
    name.toLowerCase().includes('sam') || 
    name.toLowerCase().includes('beta') ||
    name.toLowerCase().includes('7') ||
    name.toLowerCase().includes('ux')
  );
  
  console.log('\n🔍 Sheets containing SAM, Beta, 7, or UX:');
  potentialSheets.forEach(name => {
    console.log(`  • "${name}"`);
  });
  
  // Let's examine the Sem 7 Bdes UX sheet in detail for Week 1
  const targetSheet = 'Sem 7 Bdes UX ';
  if (workbook.Sheets[targetSheet]) {
    console.log(`\n📖 Detailed Analysis of "${targetSheet}" Sheet:`);
    
    const worksheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the header row (contains time slots)
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i].some(cell => 
        typeof cell === 'string' && cell.includes('9:30') && cell.includes('10:30')
      )) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex !== -1) {
      console.log(`\n🕒 Time Slot Headers (Row ${headerRowIndex + 1}):`);
      const headers = data[headerRowIndex];
      headers.forEach((header, index) => {
        if (header) {
          console.log(`  Column ${index}: "${header}"`);
        }
      });
      
      // Find Week 1 data (July 21-25)
      console.log('\n📅 Week 1 Data (July 21-25):');
      for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 8, data.length); i++) {
        const row = data[i];
        if (row && row.length > 2) {
          const week = row[0] || '';
          const date = row[1] || '';
          const day = row[2] || '';
          
          // Convert Excel date number to readable date if needed
          let displayDate = date;
          if (typeof date === 'number' && date > 40000) {
            const excelDate = new Date((date - 25569) * 86400 * 1000);
            displayDate = excelDate.toLocaleDateString();
          }
          
          console.log(`  Week ${week}, ${displayDate} (${day}):`);
          
          // Show time slot data
          const timeSlots = [
            '9:30-10:30',
            '10:30-11:30', 
            '11:30-12:30',
            'Lunch',
            '1:30-2:30',
            '2:30-3:30',
            '3:30-4:30'
          ];
          
          for (let j = 4; j < Math.min(row.length, 11); j++) {
            if (row[j]) {
              const slotIndex = j - 4;
              if (slotIndex < timeSlots.length) {
                console.log(`    ${timeSlots[slotIndex]}: ${row[j]}`);
              }
            }
          }
          console.log('');
        }
      }
    }
  }
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
}