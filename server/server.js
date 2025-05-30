import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xszslyefernwixtgbroh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzenNseWVmZXJud2l4dGdicm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjI5NjcsImV4cCI6MjA2Mzc5ODk2N30.6lqJmSpahpp52J7kkDAVdQByu-AAww-CkcF1p5tLd4o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.use(cors());
app.use(express.json());

const uploadFolder = './uploads';
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

// Serve arquivos estáticos para acesso pelo frontend
app.use('/uploads', express.static(path.resolve(uploadFolder)));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${baseName}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

async function supabaseAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não enviado' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token inválido' });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Usuário não autenticado' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno na autenticação' });
  }
}

// --- Playlists ---

app.get('/api/playlists', async (req, res) => {
  try {
    const { data, error } = await supabase.from('playlists').select('id, nome').order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar playlists', details: err.message });
  }
});

app.post('/api/playlists', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome da playlist é obrigatório' });
    const id_user = req.user.id;
    const { data, error } = await supabase.from('playlists').insert([{ nome, id_user }]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar playlist', details: err.message });
  }
});

app.put('/api/playlists/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const idNum = parseInt(req.params.id, 10);
    const { nome } = req.body;
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    if (!nome) return res.status(400).json({ error: 'Nome da playlist é obrigatório' });

    const { data, error } = await supabase
      .from('playlists')
      .update({ nome })
      .eq('id', idNum)
      .eq('id_user', req.user.id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Playlist não encontrada ou sem permissão' });

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar playlist', details: err.message });
  }
});

app.delete('/api/playlists/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const idNum = parseInt(req.params.id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });

    const { data, error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', idNum)
      .eq('id_user', req.user.id);

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Playlist não encontrada ou sem permissão' });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir playlist', details: err.message });
  }
});

// --- Vídeos ---

app.get('/api/videos', async (req, res) => {
  try {
    const playlistId = parseInt(req.query.playlist_id, 10);
    if (isNaN(playlistId)) return res.status(400).json({ error: 'playlist_id inválido' });
    const { data, error } = await supabase
      .from('videos')
      .select('id, nome, descricao, url, duracao, playlist_id')
      .eq('playlist_id', playlistId)
      .order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar vídeos', details: err.message });
  }
});

app.post('/api/videos', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { nome, descricao, playlist_id } = req.body;
    if (!nome || !playlist_id) return res.status(400).json({ error: 'Nome e playlist_id são obrigatórios' });
    // Opcional: checar se playlist_id pertence ao usuário, para maior segurança

    const { data, error } = await supabase.from('videos').insert([{ nome, descricao: descricao || null, playlist_id }]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar vídeo', details: err.message });
  }
});

app.put('/api/videos/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nome, descricao } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Opcional: para maior segurança, garantir que o vídeo pertença a playlist do usuário
    const { data, error } = await supabase
      .from('videos')
      .update({ nome, descricao: descricao || null })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar vídeo', details: err.message });
  }
});

app.delete('/api/videos/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { data, error } = await supabase.from('videos').delete().eq('id', id);
    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar vídeo', details: err.message });
  }
});

// Upload múltiplo de vídeos com extração de duração
app.post('/api/videos/upload', supabaseAuthMiddleware, upload.array('videos'), async (req, res) => {
  try {
    const playlist_id = parseInt(req.body.playlist_id, 10);
    const descricao = req.body.descricao || null;
    if (isNaN(playlist_id)) return res.status(400).json({ error: 'playlist_id inválido' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });

    const insertedVideos = [];
    for (const file of req.files) {
      try {
        const nome = file.filename;
        const url = path.posix.join('uploads', nome);
        const duracao = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(file.path, (err, metadata) => {
            if (err) {
              console.warn(`Erro ao extrair duração do arquivo ${file.filename}:`, err.message);
              resolve(null); // Continua mesmo erro
            } else {
              resolve(metadata.format.duration);
            }
          });
        });

        const { data, error } = await supabase
          .from('videos')
          .insert([{ nome, descricao, url, duracao, playlist_id }])
          .select();

        if (error) {
          console.warn(`Erro ao inserir vídeo ${nome} no banco:`, error.message);
          continue; // Continua com próximos arquivos
        }
        insertedVideos.push(data[0]);
      } catch (err) {
        console.warn(`Erro interno no processamento do arquivo ${file.filename}:`, err.message);
      }
    }

    if (insertedVideos.length === 0) {
      return res.status(500).json({ error: 'Falha ao inserir vídeos' });
    }

    res.status(201).json(insertedVideos);
  } catch (err) {
    res.status(500).json({ error: 'Erro no upload de vídeos', details: err.message });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
