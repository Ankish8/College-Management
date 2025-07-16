const { exec } = require('child_process');

console.log('Testing API endpoint...');

// Test the API endpoint directly
exec('curl -X GET "http://localhost:3000/api/faculty" -H "Content-Type: application/json"', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log('API Response:', stdout);
});