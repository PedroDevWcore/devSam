import express from 'express';
import cors from 'cors';
import { supabase, supabaseAuthMiddleware } from './supabaseClient.js';
import playlistsRoutes from './routes/playlists.js';
import videosRoutes from './routes/videos.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/playlists', playlistsRoutes);
app.use('/api/videos', videosRoutes);

// Porta e host para aceitar conexões externas
const port = 3001;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Servidor rodando na porta ${port} e host ${host}`);
});
