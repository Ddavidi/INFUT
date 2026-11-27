const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

// Sempre sincroniza: o cache de build da Vercel restaura um node_modules antigo, e pular
// a instalacao deixava de fora dependencias novas (ex.: vitest, usado nos testes do build).
// Com o cache, o npm so baixa o que mudou.
console.log('Installing root dependencies...');
execSync('npm install --include=dev --no-audit --no-fund', { stdio: 'inherit', cwd: rootDir });
