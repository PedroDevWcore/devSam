import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const pool = mysql.createPool({
  host: '104.251.209.68',
  port: 35689,
  user: 'admin',
  password: 'Adr1an@',
  database: 'db_SamCast',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const app = express();

app.use(cors());
app.use(bodyParser.json());

const uploadFolder = './uploads';
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${baseName}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

app.get('/api/playlists', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nome FROM playlists ORDER BY id');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar playlists' });
  }
});

app.post('/api/playlists', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome da playlist é obrigatório' });
    const [result] = await pool.query('INSERT INTO playlists (nome) VALUES (?)', [nome]);
    res.status(201).json({ id: result.insertId, nome });
  } catch {
    res.status(500).json({ error: 'Erro ao criar playlist' });
  }
});

app.put('/api/playlists/:id', async (req, res) => {
  try {
    const idNum = parseInt(req.params.id, 10);
    const { nome } = req.body;
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    if (!nome) return res.status(400).json({ error: 'Nome da playlist é obrigatório' });
    const [result] = await pool.query('UPDATE playlists SET nome = ? WHERE id = ?', [nome, idNum]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    const [rows] = await pool.query('SELECT id, nome FROM playlists WHERE id = ?', [idNum]);
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar playlist' });
  }
});

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const idNum = parseInt(req.params.id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    const [result] = await pool.query('DELETE FROM playlists WHERE id = ?', [idNum]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao excluir playlist' });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const playlistId = parseInt(req.query.playlist_id, 10);
    if (isNaN(playlistId)) return res.status(400).json({ error: 'playlist_id inválido' });
    const [rows] = await pool.query('SELECT id, nome, descricao, url, duracao, playlist_id FROM videos WHERE playlist_id = ? ORDER BY id', [playlistId]);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const { nome, descricao, playlist_id } = req.body;
    if (!nome || !playlist_id) return res.status(400).json({ error: 'Nome e playlist_id são obrigatórios' });
    const [result] = await pool.query('INSERT INTO videos (nome, descricao, playlist_id) VALUES (?, ?, ?)', [nome, descricao || null, playlist_id]);
    res.status(201).json({ id: result.insertId, nome, descricao, playlist_id });
  } catch {
    res.status(500).json({ error: 'Erro ao criar vídeo' });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nome, descricao } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const [result] = await pool.query('UPDATE videos SET nome = ?, descricao = ? WHERE id = ?', [nome, descricao || null, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });
    const [rows] = await pool.query('SELECT id, nome, descricao, url, duracao, playlist_id FROM videos WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar vídeo' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const [result] = await pool.query('DELETE FROM videos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar vídeo' });
  }
});

app.post('/api/videos/upload', upload.array('videos'), async (req, res) => {
  try {
    const { playlist_id, descricao } = req.body;
    if (!playlist_id) return res.status(400).json({ error: 'playlist_id é obrigatório' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });

    const insertedVideos = [];

    for (const file of req.files) {
      const nome = file.filename;
      const url = path.join('uploads', nome);
      const desc = descricao || null;

      const duracao = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file.path, (err, metadata) => {
          if (err) reject(err);
          else resolve(Math.floor(metadata.format.duration));
        });
      });

      const [result] = await pool.query(
        `INSERT INTO videos (nome, descricao, url, duracao, playlist_id) VALUES (?, ?, ?, ?, ?)`,
        [nome, desc, url, duracao, playlist_id]
      );

      insertedVideos.push({ id: result.insertId, nome, descricao: desc, url, duracao, playlist_id });
    }

    res.status(201).json({ message: 'Upload realizado com sucesso', videos: insertedVideos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload dos vídeos' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
