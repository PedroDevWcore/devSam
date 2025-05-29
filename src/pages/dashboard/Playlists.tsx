import React, { useEffect, useState } from 'react';
import { ChevronLeft, PlusCircle, X, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Playlist {
  id: number;
  nome: string;
  quantidadeVideos: number;
  duracaoTotal: number; // em segundos
}

const Playlists: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nomePlaylist, setNomePlaylist] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const carregarPlaylists = async () => {
    setStatus(null);
    try {
      const { data } = await api.get<Playlist[]>('/playlists');
      setPlaylists(data);
    } catch {
      setStatus('Erro ao carregar playlists');
    }
  };

  useEffect(() => {
    carregarPlaylists();
  }, []);

  const salvarPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      if (editingId !== null) {
        await api.put(`/playlists/${editingId}`, { nome: nomePlaylist });
        setStatus('Playlist atualizada com sucesso!');
      } else {
        await api.post('/playlists', { nome: nomePlaylist });
        setStatus('Playlist criada com sucesso!');
      }
      setShowModal(false);
      setNomePlaylist('');
      setEditingId(null);
      await carregarPlaylists();
    } catch (error: any) {
      setStatus(error.response?.data?.error || 'Erro ao salvar playlist');
    } finally {
      setLoading(false);
    }
  };

  const abrirEditar = (playlist: Playlist) => {
    setNomePlaylist(playlist.nome);
    setEditingId(playlist.id);
    setShowModal(true);
    setStatus(null);
  };

  const deletarPlaylist = async (id: number) => {
    if (!window.confirm('Confirma a exclusão desta playlist?')) return;
    setStatus(null);
    try {
      await api.delete(`/playlists/${id}`);
      setStatus('Playlist deletada com sucesso!');
      await carregarPlaylists();
    } catch {
      setStatus('Erro ao deletar playlist');
    }
  };

  const formatarDuracao = (segundos: number) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Playlists</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
            setNomePlaylist('');
            setStatus(null);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Criar Playlist
        </button>
      </div>

      {status && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md">
          {status}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left text-sm font-medium text-gray-700 border-b">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Qtd. Vídeos</th>
              <th className="px-4 py-2">Duração</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((playlist, index) => (
              <tr key={playlist.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">
                  {playlist.nome} ({playlist.quantidadeVideos} vídeo{playlist.quantidadeVideos !== 1 ? 's' : ''}, {formatarDuracao(playlist.duracaoTotal)})
                </td>
                <td className="px-4 py-2">{playlist.quantidadeVideos}</td>
                <td className="px-4 py-2">{formatarDuracao(playlist.duracaoTotal)}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => abrirEditar(playlist)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar"
                  >
                    <Edit2 className="inline-block w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletarPlaylist(playlist.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Excluir"
                  >
                    <Trash2 className="inline-block w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Editar Playlist' : 'Nova Playlist'}
            </h2>
            <form onSubmit={salvarPlaylist} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Playlist</label>
                <input
                  type="text"
                  value={nomePlaylist}
                  onChange={(e) => setNomePlaylist(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded ${
                    loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;
