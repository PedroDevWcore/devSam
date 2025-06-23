import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Calendar, Clock, Plus, Edit2, Trash2, Play, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Platform = {
  id: string;
  nome: string;
  codigo: string;
  icone: string;
};

type UserPlatform = {
  id: string;
  streaming_platforms: Platform;
};

type Playlist = {
  id: number;
  nome: string;
};

type ScheduledTransmission = {
  id: string;
  titulo: string;
  descricao?: string;
  data_agendada: string;
  frequencia: string;
  dias_semana?: number[];
  ativo: boolean;
  proxima_execucao?: string;
  ultima_execucao?: string;
  configuracoes: {
    platforms: string[];
  };
  playlists: {
    nome: string;
  };
};

const AgendamentosTransmissao: React.FC = () => {
  const { getToken } = useAuth();
  const [scheduledTransmissions, setScheduledTransmissions] = useState<ScheduledTransmission[]>([]);
  const [userPlatforms, setUserPlatforms] = useState<UserPlatform[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    id_playlist: '',
    data_agendada: '',
    hora_agendada: '',
    frequencia: 'uma_vez',
    dias_semana: [] as number[],
    platforms: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Carregar agendamentos
      const scheduledRes = await fetch('/api/scheduled-transmissions', { headers });
      const scheduledData = await scheduledRes.json();
      setScheduledTransmissions(scheduledData);

      // Carregar plataformas do usuário
      const platformsRes = await fetch('/api/streaming/user-platforms', { headers });
      const platformsData = await platformsRes.json();
      setUserPlatforms(platformsData);

      // Carregar playlists
      const playlistsRes = await fetch('/api/playlists', { headers });
      const playlistsData = await playlistsRes.json();
      setPlaylists(playlistsData);

    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.id_playlist || !formData.data_agendada || !formData.hora_agendada || formData.platforms.length === 0) {
      toast.error('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const dataHoraAgendada = `${formData.data_agendada}T${formData.hora_agendada}:00`;

      const payload = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        id_playlist: parseInt(formData.id_playlist),
        data_agendada: dataHoraAgendada,
        frequencia: formData.frequencia,
        dias_semana: formData.frequencia === 'dias_da_semana' ? formData.dias_semana : null,
        platforms: formData.platforms,
        configuracoes: {
          platforms: formData.platforms
        }
      };

      const url = editingId 
        ? `/api/scheduled-transmissions/${editingId}`
        : '/api/scheduled-transmissions';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar agendamento');
      }

      toast.success(editingId ? 'Agendamento atualizado!' : 'Agendamento criado!');
      setShowModal(false);
      resetForm();
      loadData();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transmission: ScheduledTransmission) => {
    const dataAgendada = parseISO(transmission.data_agendada);
    
    setFormData({
      titulo: transmission.titulo,
      descricao: transmission.descricao || '',
      id_playlist: transmission.playlists ? String(transmission.playlists) : '',
      data_agendada: format(dataAgendada, 'yyyy-MM-dd'),
      hora_agendada: format(dataAgendada, 'HH:mm'),
      frequencia: transmission.frequencia,
      dias_semana: transmission.dias_semana || [],
      platforms: transmission.configuracoes?.platforms || []
    });
    
    setEditingId(transmission.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/scheduled-transmissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir agendamento');
      }

      toast.success('Agendamento excluído!');
      loadData();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir agendamento');
    }
  };

  const handleExecuteNow = async (id: string) => {
    if (!confirm('Deseja executar este agendamento agora?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/scheduled-transmissions/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao executar agendamento');
      }

      toast.success('Transmissão iniciada com sucesso!');
      loadData();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao executar agendamento');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      id_playlist: '',
      data_agendada: '',
      hora_agendada: '',
      frequencia: 'uma_vez',
      dias_semana: [],
      platforms: []
    });
    setEditingId(null);
  };

  const handlePlatformToggle = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(day)
        ? prev.dias_semana.filter(d => d !== day)
        : [...prev.dias_semana, day]
    }));
  };

  const getFrequenciaLabel = (frequencia: string) => {
    const labels = {
      'uma_vez': 'Uma vez',
      'diariamente': 'Diariamente',
      'semanalmente': 'Semanalmente',
      'dias_da_semana': 'Dias da semana'
    };
    return labels[frequencia as keyof typeof labels] || frequencia;
  };

  const getDaysLabel = (dias: number[]) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias.map(d => dayNames[d]).join(', ');
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos de Transmissão</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Novo Agendamento
        </button>
      </div>

      {/* Lista de Agendamentos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {scheduledTransmissions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento</h3>
            <p className="text-gray-500 mb-4">Crie seu primeiro agendamento de transmissão</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Criar Agendamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transmissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Playlist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agendamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plataformas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledTransmissions.map((transmission) => (
                  <tr key={transmission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transmission.titulo}
                        </div>
                        {transmission.descricao && (
                          <div className="text-sm text-gray-500">
                            {transmission.descricao}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transmission.playlists?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(transmission.data_agendada), 'dd/MM/yyyy HH:mm')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getFrequenciaLabel(transmission.frequencia)}
                        {transmission.dias_semana && transmission.dias_semana.length > 0 && (
                          <span> - {getDaysLabel(transmission.dias_semana)}</span>
                        )}
                      </div>
                      {transmission.proxima_execucao && (
                        <div className="text-xs text-blue-600">
                          Próxima: {format(parseISO(transmission.proxima_execucao), 'dd/MM HH:mm')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {transmission.configuracoes?.platforms?.map((platformId) => {
                          const userPlatform = userPlatforms.find(up => up.id === platformId);
                          return userPlatform ? (
                            <span
                              key={platformId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                            >
                              {getPlatformIcon(userPlatform.streaming_platforms.codigo)}
                              {userPlatform.streaming_platforms.nome}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transmission.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transmission.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExecuteNow(transmission.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Executar agora"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(transmission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transmission.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Playlist *
                  </label>
                  <select
                    value={formData.id_playlist}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_playlist: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
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
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.data_agendada}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_agendada: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.hora_agendada}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora_agendada: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequência
                  </label>
                  <select
                    value={formData.frequencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequencia: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="uma_vez">Uma vez</option>
                    <option value="diariamente">Diariamente</option>
                    <option value="semanalmente">Semanalmente</option>
                    <option value="dias_da_semana">Dias da semana</option>
                  </select>
                </div>
              </div>

              {formData.frequencia === 'dias_da_semana' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dias da Semana
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDayToggle(index)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          formData.dias_semana.includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataformas *
                </label>
                {userPlatforms.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma plataforma configurada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userPlatforms.map(userPlatform => (
                      <div
                        key={userPlatform.id}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                          formData.platforms.includes(userPlatform.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlatformToggle(userPlatform.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getPlatformIcon(userPlatform.streaming_platforms.codigo)}
                          </span>
                          <span className="font-medium">
                            {userPlatform.streaming_platforms.nome}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendamentosTransmissao;