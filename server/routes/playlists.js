import express from 'express';
import { supabase, supabaseAuthMiddleware } from '../supabaseClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('playlists').select('id, nome').order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar playlists', details: err.message });
  }
});

router.post('/', supabaseAuthMiddleware, async (req, res) => {
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

router.put('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const idNum = parseInt(req.params.id, 10);
    const { nome } = req.body;
    if (isNaN(idNum) || !nome) return res.status(400).json({ error: 'Dados inválidos' });

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

router.delete('/:id', supabaseAuthMiddleware, async (req, res) => {
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

export default router;
