import express from 'express';
import cors from 'cors';
import { supabase, supabaseAuthMiddleware } from './supabaseClient.js';
import playlistsRoutes from './routes/playlists.js';
import videosRoutes from './routes/videos.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/playlists', playlistsRoutes);
app.use('/api/videos', videosRoutes);

const port = 3001;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
