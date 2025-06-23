import express from 'express';
import { supabase, supabaseAuthMiddleware } from '../supabaseClient.js';
import axios from 'axios';

const router = express.Router();

// Classe para gerenciar conexões com Wowza
class WowzaManager {
  constructor(serverConfig) {
    this.baseUrl = `http://${serverConfig.ip}:${serverConfig.wowza_rest_port || 8087}`;
    this.auth = {
      username: serverConfig.wowza_username,
      password: serverConfig.wowza_password
    };
    this.application = serverConfig.wowza_application || 'live';
  }

  async createApplication(applicationName) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/servers/_defaultServer_/applications`,
        {
          name: applicationName,
          appType: 'Live',
          description: `Application for ${applicationName}`,
          streamConfig: {
            restartOnEncoderReconnect: true,
            streamType: 'live'
          }
        },
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar aplicação Wowza:', error.response?.data || error.message);
      throw error;
    }
  }

  async createPublisher(applicationName, streamName, publisherName, rtmpUrl, streamKey) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/servers/_defaultServer_/applications/${applicationName}/publishers`,
        {
          name: publisherName,
          description: `Publisher for ${streamName}`,
          serverName: '_defaultServer_',
          applicationName: applicationName,
          streamName: streamName,
          profile: 'rtmp',
          host: this.extractHostFromRtmpUrl(rtmpUrl),
          port: this.extractPortFromRtmpUrl(rtmpUrl),
          userName: '',
          password: '',
          streamFile: streamKey,
          sendOriginalTimecodes: false,
          sendSSL: rtmpUrl.startsWith('rtmps')
        },
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar publisher Wowza:', error.response?.data || error.message);
      throw error;
    }
  }

  async startPublisher(applicationName, publisherName) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/v2/servers/_defaultServer_/applications/${applicationName}/publishers/${publisherName}/actions/start`,
        {},
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao iniciar publisher Wowza:', error.response?.data || error.message);
      throw error;
    }
  }

  async stopPublisher(applicationName, publisherName) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/v2/servers/_defaultServer_/applications/${applicationName}/publishers/${publisherName}/actions/stop`,
        {},
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao parar publisher Wowza:', error.response?.data || error.message);
      throw error;
    }
  }

  extractHostFromRtmpUrl(rtmpUrl) {
    const match = rtmpUrl.match(/rtmps?:\/\/([^:\/]+)/);
    return match ? match[1] : '';
  }

  extractPortFromRtmpUrl(rtmpUrl) {
    const match = rtmpUrl.match(/rtmps?:\/\/[^:]+:(\d+)/);
    return match ? parseInt(match[1]) : (rtmpUrl.startsWith('rtmps') ? 443 : 1935);
  }
}

// GET /api/streaming/platforms - Listar plataformas disponíveis
router.get('/platforms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streaming_platforms')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar plataformas', details: err.message });
  }
});

// GET /api/streaming/user-platforms - Listar plataformas configuradas pelo usuário
router.get('/user-platforms', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_streaming_platforms')
      .select(`
        *,
        streaming_platforms (
          nome,
          codigo,
          icone,
          rtmp_base_url
        )
      `)
      .eq('id_user', req.user.id)
      .eq('ativo', true);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar plataformas do usuário', details: err.message });
  }
});

// POST /api/streaming/user-platforms - Configurar plataforma para usuário
router.post('/user-platforms', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { id_platform, stream_key, titulo_padrao, descricao_padrao } = req.body;

    if (!id_platform || !stream_key) {
      return res.status(400).json({ error: 'Platform ID e Stream Key são obrigatórios' });
    }

    // Buscar dados da plataforma
    const { data: platform, error: platformError } = await supabase
      .from('streaming_platforms')
      .select('*')
      .eq('id', id_platform)
      .single();

    if (platformError || !platform) {
      return res.status(404).json({ error: 'Plataforma não encontrada' });
    }

    const { data, error } = await supabase
      .from('user_streaming_platforms')
      .upsert({
        id_user: req.user.id,
        id_platform,
        stream_key,
        rtmp_url: platform.rtmp_base_url,
        titulo_padrao,
        descricao_padrao,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao configurar plataforma', details: err.message });
  }
});

// POST /api/streaming/start - Iniciar transmissão
router.post('/start', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { titulo, descricao, platforms, id_playlist } = req.body;

    if (!titulo || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Título e pelo menos uma plataforma são obrigatórios' });
    }

    // Buscar servidor do usuário
    const { data: servers, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .limit(1);

    if (serverError || !servers || servers.length === 0) {
      return res.status(404).json({ error: 'Nenhum servidor configurado' });
    }

    const server = servers[0];
    const wowza = new WowzaManager(server);

    // Criar transmissão
    const streamName = `stream_${Date.now()}`;
    const applicationName = server.wowza_application || 'live';

    const { data: transmission, error: transmissionError } = await supabase
      .from('transmissions')
      .insert({
        id_user: req.user.id,
        id_server: server.id,
        id_playlist,
        titulo,
        descricao,
        status: 'preparando',
        tipo: 'manual',
        wowza_application_name: applicationName,
        wowza_stream_name: streamName
      })
      .select()
      .single();

    if (transmissionError) throw transmissionError;

    // Configurar publishers para cada plataforma
    const publisherPromises = platforms.map(async (platformId) => {
      try {
        // Buscar configuração da plataforma do usuário
        const { data: userPlatform, error: userPlatformError } = await supabase
          .from('user_streaming_platforms')
          .select(`
            *,
            streaming_platforms (nome, codigo, rtmp_base_url)
          `)
          .eq('id', platformId)
          .eq('id_user', req.user.id)
          .single();

        if (userPlatformError || !userPlatform) {
          throw new Error(`Plataforma ${platformId} não configurada para o usuário`);
        }

        const publisherName = `${userPlatform.streaming_platforms.codigo}_${Date.now()}`;
        
        // Criar publisher no Wowza
        await wowza.createPublisher(
          applicationName,
          streamName,
          publisherName,
          userPlatform.rtmp_url,
          userPlatform.stream_key
        );

        // Registrar no banco
        const { data: transmissionPlatform, error: tpError } = await supabase
          .from('transmission_platforms')
          .insert({
            id_transmission: transmission.id,
            id_user_platform: userPlatform.id,
            wowza_publisher_name: publisherName,
            status: 'ativa'
          })
          .select()
          .single();

        if (tpError) throw tpError;

        // Iniciar publisher
        await wowza.startPublisher(applicationName, publisherName);

        return transmissionPlatform;
      } catch (error) {
        console.error(`Erro ao configurar plataforma ${platformId}:`, error);
        
        // Registrar erro no banco
        await supabase
          .from('transmission_platforms')
          .insert({
            id_transmission: transmission.id,
            id_user_platform: platformId,
            status: 'erro',
            erro_detalhes: error.message
          });

        return null;
      }
    });

    const results = await Promise.allSettled(publisherPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    // Atualizar status da transmissão
    const finalStatus = successCount > 0 ? 'ativa' : 'erro';
    await supabase
      .from('transmissions')
      .update({
        status: finalStatus,
        data_inicio: new Date().toISOString()
      })
      .eq('id', transmission.id);

    res.json({
      transmission,
      platforms_configured: successCount,
      total_platforms: platforms.length,
      rtmp_url: `rtmp://${server.ip}:1935/${applicationName}`,
      stream_key: streamName
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar transmissão', details: err.message });
  }
});

// POST /api/streaming/stop/:id - Parar transmissão
router.post('/stop/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar transmissão
    const { data: transmission, error: transmissionError } = await supabase
      .from('transmissions')
      .select('*')
      .eq('id', id)
      .eq('id_user', req.user.id)
      .single();

    if (transmissionError || !transmission) {
      return res.status(404).json({ error: 'Transmissão não encontrada' });
    }

    // Buscar servidor
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', transmission.id_server)
      .single();

    if (serverError || !server) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const wowza = new WowzaManager(server);

    // Buscar e parar todos os publishers
    const { data: transmissionPlatforms, error: tpError } = await supabase
      .from('transmission_platforms')
      .select('*')
      .eq('id_transmission', id)
      .eq('status', 'ativa');

    if (tpError) throw tpError;

    const stopPromises = transmissionPlatforms.map(async (tp) => {
      try {
        if (tp.wowza_publisher_name) {
          await wowza.stopPublisher(
            transmission.wowza_application_name,
            tp.wowza_publisher_name
          );
        }

        await supabase
          .from('transmission_platforms')
          .update({ status: 'finalizada' })
          .eq('id', tp.id);

        return true;
      } catch (error) {
        console.error(`Erro ao parar publisher ${tp.wowza_publisher_name}:`, error);
        
        await supabase
          .from('transmission_platforms')
          .update({ 
            status: 'erro',
            erro_detalhes: error.message 
          })
          .eq('id', tp.id);

        return false;
      }
    });

    await Promise.allSettled(stopPromises);

    // Atualizar transmissão
    await supabase
      .from('transmissions')
      .update({
        status: 'finalizada',
        data_fim: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ message: 'Transmissão finalizada com sucesso' });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao parar transmissão', details: err.message });
  }
});

// GET /api/streaming/transmissions - Listar transmissões do usuário
router.get('/transmissions', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transmissions')
      .select(`
        *,
        playlists (nome),
        transmission_platforms (
          status,
          user_streaming_platforms (
            streaming_platforms (nome, codigo, icone)
          )
        )
      `)
      .eq('id_user', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transmissões', details: err.message });
  }
});

// GET /api/streaming/active - Buscar transmissão ativa
router.get('/active', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transmissions')
      .select(`
        *,
        playlists (nome),
        transmission_platforms (
          status,
          user_streaming_platforms (
            streaming_platforms (nome, codigo, icone)
          )
        )
      `)
      .eq('id_user', req.user.id)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    res.json(data[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transmissão ativa', details: err.message });
  }
});

export default router;