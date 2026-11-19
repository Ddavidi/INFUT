const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const mobileDir = path.join(rootDir, 'mobile');
const rootPrismaClientDir = path.join(rootDir, 'node_modules', '.prisma', 'client');
const backendPrismaClientDir = path.join(rootDir, 'backend', 'node_modules', '.prisma', 'client');

console.log('1. Generating Prisma Client into root node_modules...');
execSync('npx prisma generate --schema=prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: rootDir,
});

if (fs.existsSync(rootPrismaClientDir) && fs.existsSync(backendPrismaClientDir)) {
  console.log('2. Syncing Prisma Client files to backend/node_modules/.prisma/client...');
  for (const entry of fs.readdirSync(backendPrismaClientDir)) {
    if (entry.includes('.tmp')) {
      try {
        fs.unlinkSync(path.join(backendPrismaClientDir, entry));
      } catch {
        // ignore locked tmp files
      }
    }
  }

  for (const entry of fs.readdirSync(rootPrismaClientDir)) {
    const src = path.join(rootPrismaClientDir, entry);
    const dest = path.join(backendPrismaClientDir, entry);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true, force: true });
      continue;
    }
    if (entry === 'query_engine-windows.dll.node' && fs.existsSync(dest)) {
      continue;
    }
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      console.warn(`Skipped locked file ${entry}:`, err.message);
    }
  }
}

if (!fs.existsSync(path.join(mobileDir, 'node_modules', 'expo'))) {
  console.log('3. Installing mobile dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: mobileDir });
} else {
  console.log('3. Mobile dependencies already installed.');
}

console.log('4. Exporting Expo Web static bundle...');
execSync('npx expo export --platform web', {
  stdio: 'inherit',
  cwd: mobileDir,
  env: {
    ...process.env,
    EXPO_NO_TELEMETRY: '1',
  },
});
