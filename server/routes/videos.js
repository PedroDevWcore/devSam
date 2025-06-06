import express from 'express';
import { supabase, supabaseAuthMiddleware } from '../supabaseClient.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import multer from 'multer';
import { promisify } from 'util';

const router = express.Router();
const ffprobePromise = promisify(ffmpeg.ffprobe);

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

const upload = multer({ storage });

router.get('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const folderId = parseInt(req.query.folder_id, 10);
    const id_user = req.user.id;

    if (isNaN(folderId)) {
      return res.status(400).json({ error: 'Parâmetro folder_id inválido' });
    }

    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('id_user', id_user)
      .single();

    if (folderError || !folder) {
      return res.status(403).json({ error: 'Pasta não encontrada ou não pertence ao usuário' });
    }

    const { data, error } = await supabase
      .from('videos')
      .select('id, nome, duracao, filename, tamanho, url, created_at')
      .eq('id_folder', folderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar vídeos', details: err.message });
  }
});

router.post('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { nome, filename, id_folder, duracao, tamanho, url } = req.body;
    if (!nome || !filename || !id_folder) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const { data, error } = await supabase
      .from('videos')
      .insert([{ nome, filename, id_folder, duracao, tamanho, url }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar vídeo', details: err.message });
  }
});

router.post('/upload', supabaseAuthMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { folder_id } = req.body;
    const id_user = req.user.id;
    const parsedFolderId = parseInt(folder_id, 10);

    if (isNaN(parsedFolderId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Parâmetro folder_id inválido' });
    }

    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', parsedFolderId)
      .eq('id_user', id_user)
      .single();

    if (folderError || !folder) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Pasta não encontrada ou não pertence ao usuário' });
    }

    const metadata = await ffprobePromise(req.file.path);
    const duration = metadata.format.duration;
    const size = req.file.size;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/videos/${req.file.filename}`;

    const { data, error } = await supabase
      .from('videos')
      .insert([{
        nome: req.file.originalname,
        filename: req.file.filename,
        id_folder: parsedFolderId,
        duracao: duration,
        tamanho: size,
        url,
      }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro no processamento do vídeo', details: err.message });
  }
});

export default router;
