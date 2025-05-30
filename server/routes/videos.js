import express from 'express';
import { supabase, supabaseAuthMiddleware } from '../supabaseClient.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import multer from 'multer';
import { promisify } from 'util';

const router = express.Router();

// --- Promisify ffprobe para usar async/await ---
const ffprobePromise = promisify(ffmpeg.ffprobe);

// --- Configuração do Multer para Upload de Arquivos ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'videos/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// --- Rotas da API de Vídeos ---

router.get('/', async (req, res) => {
  try {
    const playlistId = parseInt(req.query.playlist_id, 10);
    if (isNaN(playlistId)) {
      return res.status(400).json({ error: 'Parâmetro playlist_id inválido' });
    }

    const { data, error } = await supabase
      .from('videos')
      .select('id, nome, duracao, filename, id_playlist')
      .eq('id_playlist', playlistId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Erro Supabase GET videos:', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar vídeos:', err);
    res.status(500).json({ error: 'Erro ao buscar vídeos', details: err.message });
  }
});

router.post('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { nome, filename, id_playlist, duracao } = req.body;
    if (!nome || !filename || !id_playlist) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const { data, error } = await supabase
      .from('videos')
      .insert([{ nome, filename, id_playlist, duracao }])
      .select();

    if (error) {
      console.error('Erro Supabase POST videos:', error);
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Erro ao criar vídeo:', err);
    res.status(500).json({ error: 'Erro ao criar vídeo', details: err.message });
  }
});

router.put('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nome } = req.body;
    if (isNaN(id) || !nome) {
      return res.status(400).json({ error: 'ID ou nome inválido' });
    }

    const { data, error } = await supabase
      .from('videos')
      .update({ nome })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro Supabase PUT videos:', error);
      throw error;
    }
    if (data.length === 0) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.json(data[0]);
  } catch (err) {
    console.error('Erro ao editar vídeo:', err);
    res.status(500).json({ error: 'Erro ao editar vídeo', details: err.message });
  }
});

router.delete('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { data: videoData, error: fetchError } = await supabase
      .from('videos')
      .select('filename')
      .eq('id', id)
      .single();

    if (fetchError || !videoData) {
      console.warn(`Não foi possível encontrar o filename para o vídeo ID ${id}. O arquivo local pode não ser deletado.`);
    } else {
      const filePathToDelete = `videos/${videoData.filename}`;
      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
        console.log(`Arquivo local ${filePathToDelete} deletado.`);
      }
    }

    const { error: deleteError } = await supabase.from('videos').delete().eq('id', id);
    if (deleteError) {
      console.error('Erro Supabase DELETE videos:', deleteError);
      throw deleteError;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir vídeo:', err);
    res.status(500).json({ error: 'Erro ao excluir vídeo', details: err.message });
  }
});

router.post('/upload', supabaseAuthMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo foi enviado.' });
    }

    const { playlist_id } = req.body;
    const parsedPlaylistId = parseInt(playlist_id, 10);

    if (isNaN(parsedPlaylistId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Parâmetro id_playlist inválido' });
    }

    // Obter metadados do vídeo via ffprobe promisificado
    const metadata = await ffprobePromise(req.file.path);

    const duration = metadata.format.duration;
    const size = req.file.size;

    const { data, error } = await supabase
      .from('videos')
      .insert([{ nome: req.file.originalname, filename: req.file.filename, id_playlist: parsedPlaylistId, duracao: duration, tamanho: size }])
      .select();

    if (error) {
      fs.unlinkSync(req.file.path);
      console.error('Erro Supabase INSERT videos:', error);
      throw error;
    }

    res.status(201).json(data[0]);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Erro no processamento do vídeo:', err);
    res.status(500).json({ error: 'Erro no processamento do vídeo', details: err.message });
  }
});

export default router;
