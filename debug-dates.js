// Check what days the dates actually fall on
console.log('📅 Date verification for the week:');

const dates = [
  '2025-08-04',
  '2025-08-05', 
  '2025-08-06',
  '2025-08-07',
  '2025-08-08'
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

dates.forEach(dateStr => {
  const date = new Date(dateStr);
  const dayName = dayNames[date.getDay()];
  console.log(`  ${dateStr} = ${dayName}`);
});

console.log('\n🔍 Analysis:');
console.log('Database has Summer Internship on:');
console.log('  - TUESDAY Aug 4  (but UI shows it on Monday Aug 4)');
console.log('  - WEDNESDAY Aug 6 ✅');
console.log('  - THURSDAY Aug 7 ✅');

console.log('\nThe issue could be:');
console.log('1. UI is showing wrong dates for the week');
console.log('2. Database entries have wrong day_of_week values');
console.log('3. Date/day calculation mismatch somewhere');