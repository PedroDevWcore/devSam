import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Play, Square, Settings, Wifi, WifiOff, Eye, Clock } from 'lucide-react';

type Platform = {
  id: string;
  nome: string;
  codigo: string;
  icone: string;
  rtmp_base_url: string;
};

type UserPlatform = {
  id: string;
  id_platform: string;
  stream_key: string;
  titulo_padrao?: string;
  descricao_padrao?: string;
  streaming_platforms: Platform;
};

type Playlist = {
  id: number;
  nome: string;
};

type ActiveTransmission = {
  id: string;
  titulo: string;
  status: string;
  data_inicio: string;
  wowza_stream_name: string;
  transmission_platforms: Array<{
    status: string;
    user_streaming_platforms: {
      streaming_platforms: Platform;
    };
  }>;
};

const IniciarTransmissao: React.FC = () => {
  const { getToken } = useAuth();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [userPlatforms, setUserPlatforms] = useState<UserPlatform[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTransmission, setActiveTransmission] = useState<ActiveTransmission | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    selectedPlatforms: [] as string[],
    id_playlist: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showPlatformConfig, setShowPlatformConfig] = useState(false);
  const [platformConfig, setPlatformConfig] = useState({
    id_platform: '',
    stream_key: '',
    titulo_padrao: '',
    descricao_padrao: ''
  });

  useEffect(() => {
    loadData();
    checkActiveTransmission();
    
    // Verificar transmissão ativa a cada 30 segundos
    const interval = setInterval(checkActiveTransmission, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Carregar plataformas disponíveis
      const platformsRes = await fetch('/api/streaming/platforms');
      const platformsData = await platformsRes.json();
      setPlatforms(platformsData);

      // Carregar plataformas configuradas pelo usuário
      const userPlatformsRes = await fetch('/api/streaming/user-platforms', { headers });
      const userPlatformsData = await userPlatformsRes.json();
      setUserPlatforms(userPlatformsData);

      // Carregar playlists
      const playlistsRes = await fetch('/api/playlists', { headers });
      const playlistsData = await playlistsRes.json();
      setPlaylists(playlistsData);

    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    }
  };

  const checkActiveTransmission = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setActiveTransmission(data);
    } catch (error) {
      console.error('Erro ao verificar transmissão ativa:', error);
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platformId)
        ? prev.selectedPlatforms.filter(id => id !== platformId)
        : [...prev.selectedPlatforms, platformId]
    }));
  };

  const handleStartTransmission = async () => {
    if (!formData.titulo || formData.selectedPlatforms.length === 0) {
      toast.error('Título e pelo menos uma plataforma são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: formData.titulo,
          descricao: formData.descricao,
          platforms: formData.selectedPlatforms,
          id_playlist: formData.id_playlist || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao iniciar transmissão');
      }

      const data = await response.json();
      toast.success(`Transmissão iniciada! ${data.platforms_configured}/${data.total_platforms} plataformas configuradas`);
      
      // Mostrar dados de conexão
      toast.info(`RTMP: ${data.rtmp_url}\nStream Key: ${data.stream_key}`, {
        autoClose: 10000
      });

      checkActiveTransmission();
      setFormData({
        titulo: '',
        descricao: '',
        selectedPlatforms: [],
        id_playlist: ''
      });

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTransmission = async () => {
    if (!activeTransmission) return;

    if (!confirm('Deseja realmente parar a transmissão?')) return;

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/streaming/stop/${activeTransmission.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao parar transmissão');
      }

      toast.success('Transmissão finalizada com sucesso');
      setActiveTransmission(null);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao parar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformConfig = async () => {
    if (!platformConfig.id_platform || !platformConfig.stream_key) {
      toast.error('Plataforma e Stream Key são obrigatórios');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/user-platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(platformConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configuração');
      }

      toast.success('Plataforma configurada com sucesso');
      setShowPlatformConfig(false);
      setPlatformConfig({
        id_platform: '',
        stream_key: '',
        titulo_padrao: '',
        descricao_padrao: ''
      });
      loadData();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configuração');
    }
  };

  const getUnconfiguredPlatforms = () => {
    const configuredIds = userPlatforms.map(up => up.id_platform);
    return platforms.filter(p => !configuredIds.includes(p.id));
  };

  const getPlatformIcon = (codigo: string) => {
    switch (codigo) {
      case 'youtube': return '🔴';
      case 'facebook': return '🔵';
      case 'twitch': return '🟣';
      case 'instagram': return '🟠';
      case 'tiktok': return '⚫';
      default: return '📺';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Transmissão</h1>
        <div className="flex items-center gap-2">
          {activeTransmission ? (
            <div className="flex items-center gap-2 text-green-600">
              <Wifi className="h-5 w-5" />
              <span className="font-medium">Transmitindo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <WifiOff className="h-5 w-5" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Transmissão Ativa */}
      {activeTransmission && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-green-800">Transmissão Ativa</h2>
            <button
              onClick={handleStopTransmission}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Parar Transmissão
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Título</h3>
              <p className="text-gray-900">{activeTransmission.titulo}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Iniciada em</h3>
              <p className="text-gray-900">
                {new Date(activeTransmission.data_inicio).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium text-gray-700 mb-2">Plataformas</h3>
            <div className="flex flex-wrap gap-2">
              {activeTransmission.transmission_platforms.map((tp, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    tp.status === 'ativa' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <span>{getPlatformIcon(tp.user_streaming_platforms.streaming_platforms.codigo)}</span>
                  <span>{tp.user_streaming_platforms.streaming_platforms.nome}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    tp.status === 'ativa' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Formulário de Nova Transmissão */}
      {!activeTransmission && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Nova Transmissão</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Transmissão *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o título da transmissão"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Playlist (Opcional)
                </label>
                <select
                  value={formData.id_playlist}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_playlist: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma playlist</option>
                  {playlists.map(playlist => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição da transmissão"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Plataformas de Transmissão *
                </label>
                <button
                  onClick={() => setShowPlatformConfig(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Configurar Plataforma
                </button>
              </div>

              {userPlatforms.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma plataforma configurada</p>
                  <button
                    onClick={() => setShowPlatformConfig(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Configurar primeira plataforma
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPlatforms.map(userPlatform => (
                    <div
                      key={userPlatform.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.selectedPlatforms.includes(userPlatform.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePlatformToggle(userPlatform.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getPlatformIcon(userPlatform.streaming_platforms.codigo)}
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {userPlatform.streaming_platforms.nome}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {userPlatform.titulo_padrao || 'Configurado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStartTransmission}
                disabled={loading || !formData.titulo || formData.selectedPlatforms.length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                {loading ? 'Iniciando...' : 'Iniciar Transmissão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Plataforma */}
      {showPlatformConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configurar Plataforma
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma
                </label>
                <select
                  value={platformConfig.id_platform}
                  onChange={(e) => setPlatformConfig(prev => ({ ...prev, id_platform: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma plataforma</option>
                  {getUnconfiguredPlatforms().map(platform => (
                    <option key={platform.id} value={platform.id}>
                      {platform.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream Key
                </label>
                <input
                  type="password"
                  value={platformConfig.stream_key}
                  onChange={(e) => setPlatformConfig(prev => ({ ...prev, stream_key: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Cole sua stream key aqui"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título Padrão (Opcional)
                </label>
                <input
                  type="text"
                  value={platformConfig.titulo_padrao}
                  onChange={(e) => setPlatformConfig(prev => ({ ...prev, titulo_padrao: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Título padrão para esta plataforma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição Padrão (Opcional)
                </label>
                <textarea
                  value={platformConfig.descricao_padrao}
                  onChange={(e) => setPlatformConfig(prev => ({ ...prev, descricao_padrao: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição padrão para esta plataforma"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPlatformConfig(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlatformConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IniciarTransmissao;