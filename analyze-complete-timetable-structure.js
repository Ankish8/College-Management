const XLSX = require('xlsx');
const fs = require('fs');

try {
  console.log('📊 Complete Timetable Structure Analysis...\n');
  
  // Read the Excel file
  const workbook = XLSX.readFile('Time Table_Block_ July to December 2025_Odd Sem.xlsx');
  
  const targetSheet = 'Sem 7 Bdes UX ';
  if (!workbook.Sheets[targetSheet]) {
    console.error(`❌ Sheet "${targetSheet}" not found`);
    return;
  }

  const worksheet = workbook.Sheets[targetSheet];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`📖 Analyzing sheet: "${targetSheet}"`);
  console.log(`📋 Total rows in sheet: ${data.length}\n`);

  // Find all header rows (time slot definitions)
  const headerRows = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].some(cell => 
      typeof cell === 'string' && 
      (cell.includes('9:30') || cell.includes('9:15')) && 
      (cell.includes('AM') || cell.includes('PM'))
    )) {
      headerRows.push(i);
    }
  }

  console.log(`🕒 Found ${headerRows.length} time slot header sections:`);
  headerRows.forEach((rowIndex, sectionIndex) => {
    console.log(`\n📅 Section ${sectionIndex + 1} - Time Slots (Row ${rowIndex + 1}):`);
    const headers = data[rowIndex];
    headers.forEach((header, colIndex) => {
      if (header && typeof header === 'string' && header.includes(':')) {
        console.log(`   Column ${colIndex}: "${header}"`);
      }
    });
  });

  // Analyze each section for weekly data
  console.log('\n\n📊 DETAILED WEEKLY ANALYSIS:\n');
  
  let allWeeksData = [];
  
  for (let sectionIndex = 0; sectionIndex < headerRows.length; sectionIndex++) {
    const headerRowIndex = headerRows[sectionIndex];
    const nextHeaderRowIndex = sectionIndex + 1 < headerRows.length ? 
      headerRows[sectionIndex + 1] : data.length;
    
    console.log(`\n🗂️  SECTION ${sectionIndex + 1} (Rows ${headerRowIndex + 1} to ${nextHeaderRowIndex}):`);
    
    // Look for section title (usually 2-3 rows before header)
    for (let i = Math.max(0, headerRowIndex - 5); i < headerRowIndex; i++) {
      if (data[i] && data[i].length > 0) {
        const row = data[i];
        if (row.some(cell => cell && typeof cell === 'string' && 
            (cell.includes('July') || cell.includes('August') || cell.includes('September') || 
             cell.includes('October') || cell.includes('November') || cell.includes('December')))) {
          console.log(`📆 Date Range: ${row.join(' | ')}`);
        }
      }
    }
    
    // Extract weekly data from this section
    let currentWeek = null;
    for (let i = headerRowIndex + 1; i < nextHeaderRowIndex; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;
      
      const weekNum = row[0];
      const date = row[1];
      const day = row[2];
      
      if (weekNum && typeof weekNum === 'number') {
        currentWeek = weekNum;
      }
      
      if (date && day) {
        // Convert Excel date number to readable date
        let displayDate = date;
        if (typeof date === 'number' && date > 40000) {
          const excelDate = new Date((date - 25569) * 86400 * 1000);
          displayDate = excelDate.toISOString().split('T')[0];
        }
        
        // Extract time slot data
        const timeSlotData = [];
        for (let col = 4; col < Math.min(row.length, 11); col++) {
          if (row[col] && typeof row[col] === 'string') {
            timeSlotData.push(row[col].trim());
          } else {
            timeSlotData.push(null);
          }
        }
        
        const weekData = {
          section: sectionIndex + 1,
          week: currentWeek,
          date: displayDate,
          day: day,
          subjects: timeSlotData,
          hasData: timeSlotData.some(slot => slot && slot.length > 0)
        };
        
        allWeeksData.push(weekData);
        
        if (weekData.hasData) {
          console.log(`\n   Week ${currentWeek || '?'} - ${displayDate} (${day}):`);
          timeSlotData.forEach((subject, index) => {
            if (subject) {
              const timeSlotNames = [
                '9:30-10:30', '10:30-11:30', '11:30-12:30', 
                'LUNCH', '1:30-2:30', '2:30-3:30', '3:30-4:30'
              ];
              console.log(`      ${timeSlotNames[index] || `Slot ${index + 1}`}: ${subject}`);
            }
          });
        }
      }
    }
  }

  // Generate summary
  console.log('\n\n📈 COMPLETE SEMESTER SUMMARY:\n');
  
  const weekMap = {};
  allWeeksData.forEach(data => {
    if (!weekMap[data.week]) {
      weekMap[data.week] = [];
    }
    weekMap[data.week].push(data);
  });

  const sortedWeeks = Object.keys(weekMap).sort((a, b) => Number(a) - Number(b));
  
  sortedWeeks.forEach(weekNum => {
    const weekDays = weekMap[weekNum];
    const daysWithData = weekDays.filter(d => d.hasData);
    
    if (daysWithData.length > 0) {
      console.log(`\n🗓️  WEEK ${weekNum}:`);
      console.log(`   📅 Date Range: ${daysWithData[0].date} to ${daysWithData[daysWithData.length - 1].date}`);
      
      // Find unique subjects for this week
      const weekSubjects = new Set();
      daysWithData.forEach(day => {
        day.subjects.forEach(subject => {
          if (subject && subject.length > 0 && !subject.toLowerCase().includes('lunch')) {
            weekSubjects.add(subject);
          }
        });
      });
      
      console.log(`   📚 Subjects/Activities: ${Array.from(weekSubjects).join(', ')}`);
      console.log(`   📊 Days with data: ${daysWithData.length}`);
    }
  });

  // Save complete analysis
  const analysisData = {
    totalSections: headerRows.length,
    totalRows: data.length,
    weeksFound: sortedWeeks.length,
    weeklyData: allWeeksData.filter(d => d.hasData),
    summary: {
      sectionsAnalyzed: headerRows.length,
      weeksWithData: sortedWeeks.filter(w => weekMap[w].some(d => d.hasData)).length,
      totalDaysWithData: allWeeksData.filter(d => d.hasData).length
    }
  };

  fs.writeFileSync('complete-timetable-analysis.json', JSON.stringify(analysisData, null, 2));
  
  console.log('\n\n✅ Analysis completed!');
  console.log(`📄 Detailed data saved to: complete-timetable-analysis.json`);
  console.log(`📊 Total weeks found: ${sortedWeeks.length}`);
  console.log(`📚 Weeks with actual data: ${sortedWeeks.filter(w => weekMap[w].some(d => d.hasData)).length}`);

} catch (error) {
  console.error('❌ Error analyzing Excel file:', error.message);
}