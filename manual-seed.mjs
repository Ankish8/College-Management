import { spawn } from 'child_process';

console.log('Running database seed...');

const seedProcess = spawn('npx', ['tsx', 'src/lib/seed.ts'], {
  stdio: 'inherit',
  shell: true
});

seedProcess.on('error', (error) => {
  console.error('Error running seed:', error);
});

seedProcess.on('close', (code) => {
  console.log(`Seed process exited with code ${code}`);
});