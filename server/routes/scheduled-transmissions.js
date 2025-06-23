import express from 'express';
import { supabase, supabaseAuthMiddleware } from '../supabaseClient.js';

const router = express.Router();

// GET /api/scheduled-transmissions - Listar transmissões agendadas
router.get('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scheduled_transmissions')
      .select(`
        *,
        playlists (nome)
      `)
      .eq('id_user', req.user.id)
      .order('proxima_execucao', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transmissões agendadas', details: err.message });
  }
});

// POST /api/scheduled-transmissions - Criar transmissão agendada
router.post('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const {
      id_playlist,
      titulo,
      descricao,
      data_agendada,
      frequencia,
      dias_semana,
      platforms,
      configuracoes
    } = req.body;

    if (!id_playlist || !titulo || !data_agendada || !platforms || platforms.length === 0) {
      return res.status(400).json({ 
        error: 'Playlist, título, data agendada e plataformas são obrigatórios' 
      });
    }

    // Verificar se a playlist pertence ao usuário
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id_playlist)
      .eq('id_user', req.user.id)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ error: 'Playlist não encontrada' });
    }

    // Verificar se as plataformas pertencem ao usuário
    const { data: userPlatforms, error: platformsError } = await supabase
      .from('user_streaming_platforms')
      .select('id')
      .eq('id_user', req.user.id)
      .in('id', platforms);

    if (platformsError || userPlatforms.length !== platforms.length) {
      return res.status(400).json({ error: 'Uma ou mais plataformas não estão configuradas' });
    }

    const { data, error } = await supabase
      .from('scheduled_transmissions')
      .insert({
        id_user: req.user.id,
        id_playlist,
        titulo,
        descricao,
        data_agendada,
        frequencia: frequencia || 'uma_vez',
        dias_semana,
        configuracoes: {
          ...configuracoes,
          platforms
        }
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar transmissão agendada', details: err.message });
  }
});

// PUT /api/scheduled-transmissions/:id - Atualizar transmissão agendada
router.put('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.id_user;
    delete updateData.created_at;

    const { data, error } = await supabase
      .from('scheduled_transmissions')
      .update(updateData)
      .eq('id', id)
      .eq('id_user', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Transmissão agendada não encontrada' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transmissão agendada', details: err.message });
  }
});

// DELETE /api/scheduled-transmissions/:id - Deletar transmissão agendada
router.delete('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('scheduled_transmissions')
      .delete()
      .eq('id', id)
      .eq('id_user', req.user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar transmissão agendada', details: err.message });
  }
});

// POST /api/scheduled-transmissions/:id/execute - Executar transmissão agendada manualmente
router.post('/:id/execute', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar transmissão agendada
    const { data: scheduledTransmission, error: stError } = await supabase
      .from('scheduled_transmissions')
      .select(`
        *,
        playlists (nome)
      `)
      .eq('id', id)
      .eq('id_user', req.user.id)
      .single();

    if (stError || !scheduledTransmission) {
      return res.status(404).json({ error: 'Transmissão agendada não encontrada' });
    }

    // Executar transmissão usando o endpoint de streaming
    const streamingResponse = await fetch(`${req.protocol}://${req.get('host')}/api/streaming/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        titulo: scheduledTransmission.titulo,
        descricao: scheduledTransmission.descricao,
        id_playlist: scheduledTransmission.id_playlist,
        platforms: scheduledTransmission.configuracoes?.platforms || []
      })
    });

    if (!streamingResponse.ok) {
      const errorData = await streamingResponse.json();
      throw new Error(errorData.error || 'Erro ao iniciar transmissão');
    }

    const transmissionData = await streamingResponse.json();

    // Atualizar última execução
    await supabase
      .from('scheduled_transmissions')
      .update({ ultima_execucao: new Date().toISOString() })
      .eq('id', id);

    res.json({
      message: 'Transmissão agendada executada com sucesso',
      transmission: transmissionData
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao executar transmissão agendada', details: err.message });
  }
});

export default router;