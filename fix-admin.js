const { exec } = require('child_process');

// Run the seed command to fix the admin user
exec('npx tsx src/lib/seed.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
  console.log('Admin user fixed! Please refresh the page.');
});