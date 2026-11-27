const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const mobileDir = path.join(rootDir, 'mobile');
const rootPrismaClientDir = path.join(rootDir, 'node_modules', '.prisma', 'client');
const backendPrismaClientDir = path.join(rootDir, 'backend', 'node_modules', '.prisma', 'client');

// Testes das regras (rotacao, valores, placar) antes de tudo: se algum falhar,
// o build para aqui, sem tocar no banco, e o deploy anterior continua no ar.
console.log('Running unit tests...');
execSync('npx vitest run', { stdio: 'inherit', cwd: rootDir });

// 0. Migracoes aditivas e idempotentes (ADD COLUMN IF NOT EXISTS) antes de publicar o codigo novo.
//    Se falhar, o build falha e o deploy anterior continua no ar.
const migrationsDir = path.join(rootDir, 'backend', 'prisma', 'sql');
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (fs.existsSync(migrationsDir)) {
  const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  if (sqlFiles.length > 0) {
    if (!migrationUrl || !migrationUrl.startsWith('postgres')) {
      throw new Error('Nenhuma URL PostgreSQL disponivel no build para aplicar as migracoes.');
    }
    for (const file of sqlFiles) {
      console.log(`0. Aplicando migracao ${file}...`);
      execSync(
        `npx prisma db execute --schema=prisma/schema.prisma --file="${path.join(migrationsDir, file)}"`,
        { stdio: 'inherit', cwd: rootDir, env: { ...process.env, DATABASE_URL: migrationUrl } }
      );
    }
  }
}

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

// Sempre sincroniza: o cache de build da Vercel restaura um node_modules antigo,
// e pular a instalacao deixava de fora dependencias novas (ex.: @expo/vector-icons).
console.log('3. Syncing mobile dependencies...');
execSync('npm install --no-audit --no-fund', { stdio: 'inherit', cwd: mobileDir });

console.log('4. Exporting Expo Web static bundle...');
execSync('npx expo export --platform web', {
  stdio: 'inherit',
  cwd: mobileDir,
  env: {
    ...process.env,
    EXPO_NO_TELEMETRY: '1',
  },
});

const indexHtmlPath = path.join(mobileDir, 'dist', 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  if (!html.includes('rel="manifest"')) {
    const pwaTags = [
      '<link rel="preconnect" href="https://fonts.googleapis.com" />',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet" />',
      '<link rel="manifest" href="/manifest.json" />',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
      '<meta name="apple-mobile-web-app-title" content="INFUT" />',
      '<meta name="mobile-web-app-capable" content="yes" />',
      '<meta name="theme-color" content="#0A0D14" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:title" content="INFUT — Organize suas peladas sem bagunça" />',
      '<meta property="og:description" content="Confirme presença, copie a chave Pix, veja o sorteio de times e vote no MVP da pelada." />',
      '<meta property="og:url" content="https://infut.vercel.app" />',
      '<meta property="og:image" content="https://infut.vercel.app/icon-512.png" />',
    ].join('\n    ');
    html = html.replace('</head>', `    ${pwaTags}\n  </head>`);
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log('5. Injected PWA & OpenGraph tags into mobile/dist/index.html.');
  }
}
