// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log('');
  console.log('  INFUT API');
  console.log('  ----------------------------');
  console.log('  Servidor rodando na porta: ' + PORT);
  console.log('  Health: http://localhost:' + PORT + '/api/health');
  console.log('  ----------------------------');
  console.log('');
});