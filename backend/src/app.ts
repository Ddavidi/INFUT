// src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import peladaRoutes from './routes/pelada.routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// Middlewares globais
app.use(cors());
// Limite maior para fotos de perfil/escudos (enviadas ja redimensionadas pelo app)
app.use(express.json({ limit: '3mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/peladas', peladaRoutes);

// Error handler (deve ser o ultimo)
app.use(errorMiddleware);

export default app;
