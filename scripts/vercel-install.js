const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const hasRootPrisma = fs.existsSync(path.join(rootDir, 'node_modules', '@prisma', 'client'));

if (!hasRootPrisma) {
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: rootDir });
} else {
  console.log('Root dependencies already installed, skipping npm install.');
}
