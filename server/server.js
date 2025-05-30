// server.js
import express from 'express';
import cors from 'cors';
import { supabase, supabaseAuthMiddleware } from './supabaseClient.js';
import playlistsRoutes from './routes/playlists.js';
import videosRoutes from './routes/videos.js';
import agendamentosRoutes from './routes/agendamentos.js';

const app = express();
app.use(cors());
app.use(express.json());

// Rota para o caminho raiz
app.get('/', (req, res) => {
  // Verifique se o usuário está autenticado
  if (!req.user) {
    // Se não estiver autenticado, redirecione para a página de login
    return res.redirect('/login');
  }
  // Se estiver autenticado, redirecione para a página principal
  res.redirect('/dashboard');
});

// Outras rotas da API
app.use('/api/playlists', playlistsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);

const port = 3001;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
