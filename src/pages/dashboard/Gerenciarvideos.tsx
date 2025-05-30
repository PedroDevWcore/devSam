import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

type Playlist = {
  id: number;
  nome: string;
};

type Video = {
  id: number;
  nome: string;
  playlist_id: number;
  duracao?: number;
  tamanho?: number;
};

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  } else {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}

function formatarTamanho(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default function GerenciarVideos() {
  const { getToken } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSelecionada, setPlaylistSelecionada] = useState<Playlist | null>(null);
  const [novoPlaylistNome, setNovoPlaylistNome] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    if (playlistSelecionada) {
      fetchVideos(playlistSelecionada.id);
    } else {
      setVideos([]);
    }
  }, [playlistSelecionada]);

  const fetchPlaylists = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/playlists", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setPlaylists(data);
      if (data.length > 0) setPlaylistSelecionada(data[0]);
    } catch (error) {
      console.error("Erro ao buscar playlists:", error);
      toast.error("Erro ao carregar playlists");
    }
  };

  const fetchVideos = async (playlist_id: number) => {
  try {
    const token = await getToken();
    const response = await fetch(`/api/videos?playlist_id=${playlist_id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Pode lançar erro para o catch
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setVideos(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Erro ao buscar vídeos:", error);
    toast.error("Erro ao carregar vídeos");
    setVideos([]); // garantir que videos seja array
  }
};


  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const videosOnly = Array.from(files).filter(f => f.type.startsWith("video/"));
    if (videosOnly.length !== files.length) {
      toast.error("Apenas arquivos de vídeo são permitidos");
      e.target.value = "";
      setUploadFiles(null);
      return;
    }

    // Validar tamanho máximo (exemplo: 2GB por arquivo)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB em bytes
    const oversizedFiles = videosOnly.filter(f => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`Arquivos muito grandes: ${oversizedFiles.map(f => f.name).join(", ")}`);
      e.target.value = "";
      setUploadFiles(null);
      return;
    }

    setUploadFiles(files);
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  };

  const uploadVideos = async () => {
    if (!playlistSelecionada || !uploadFiles || uploadFiles.length === 0) {
      toast.error("Selecione uma playlist e ao menos um arquivo para upload");
      return;
    }
    setUploading(true);

    try {
      const token = await getToken();
      
      for (const file of Array.from(uploadFiles)) {
        const formData = new FormData();
        formData.append("video", file);
        formData.append("playlist_id", playlistSelecionada.id.toString());
        
        const duracao = await getVideoDuration(file);
        formData.append("duracao", duracao.toString());
        formData.append("tamanho", file.size.toString());

        try {
          const response = await fetch("/api/videos/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) throw new Error(`Erro ao enviar ${file.name}`);

          const videoData = await response.json();
          setVideos(prev => [...prev, {
            ...videoData,
            nome: file.name,
            duracao,
            tamanho: file.size
          }]);

          toast.success(`${file.name} enviado com sucesso!`);
        } catch (error) {
          console.error(`Erro ao enviar ${file.name}:`, error);
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro no upload de vídeos");
    } finally {
      setUploading(false);
      setUploadFiles(null);
      const inputFile = document.getElementById("input-upload-videos") as HTMLInputElement;
      if (inputFile) inputFile.value = "";
    }
  };

  const criarPlaylist = async () => {
    if (!novoPlaylistNome.trim()) return;
    
    try {
      const token = await getToken();
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: novoPlaylistNome.trim() })
      });

      if (!response.ok) throw new Error("Erro ao criar playlist");

      const novaPlaylist = await response.json();
      setPlaylists(prev => [...prev, novaPlaylist]);
      setNovoPlaylistNome("");
      toast.success("Playlist criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar playlist:", error);
      toast.error("Erro ao criar playlist");
    }
  };

  const deletarPlaylist = async (id: number) => {
    if (!confirm("Confirma a exclusão da playlist?")) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Erro ao deletar playlist");

      setPlaylists(prev => prev.filter(pl => pl.id !== id));
      if (playlistSelecionada?.id === id) {
        setPlaylistSelecionada(null);
        setVideos([]);
      }
      toast.success("Playlist excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar playlist:", error);
      toast.error("Erro ao excluir playlist");
    }
  };

  const deletarVideo = async (id: number) => {
    if (!confirm("Confirma a exclusão do vídeo?")) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Erro ao deletar vídeo");

      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success("Vídeo excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar vídeo:", error);
      toast.error("Erro ao excluir vídeo");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col md:flex-row gap-6 min-h-[600px]">
      <section className="md:w-1/3 bg-white p-5 rounded-lg shadow-md flex flex-col">
        <h2 className="text-2xl font-semibold mb-5 text-gray-800">Playlists</h2>
        <ul className="flex-grow overflow-auto max-h-[400px] space-y-2">
          {playlists.map((playlist) => (
            <li
              key={playlist.id}
              className={`flex justify-between items-center p-3 rounded cursor-pointer select-none
                ${
                  playlistSelecionada?.id === playlist.id
                    ? "bg-blue-200 font-semibold"
                    : "hover:bg-blue-50"
                }`}
              onClick={() => setPlaylistSelecionada(playlist)}
              title={`Selecionar playlist ${playlist.nome}`}
            >
              <span>{playlist.nome}</span>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={(e) => {
                  e.stopPropagation();
                  deletarPlaylist(playlist.id);
                }}
                aria-label="Excluir playlist"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            className="flex-grow border border-gray-300 rounded px-3 py-2 focus:outline-blue-500"
            placeholder="Nova playlist..."
            value={novoPlaylistNome}
            onChange={(e) => setNovoPlaylistNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarPlaylist()}
          />
          <button
            className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 transition"
            onClick={criarPlaylist}
          >
            +
          </button>
        </div>
      </section>

      <section className="md:w-2/3 bg-white p-5 rounded-lg shadow-md flex flex-col">
        <h2 className="text-2xl font-semibold mb-5 text-gray-800">
          Vídeos da playlist:{" "}
          <span className="font-normal text-gray-600">
            {playlistSelecionada?.nome ?? "-"}
          </span>
        </h2>

        <div className="mb-4 flex items-center gap-4">
          <input
            id="input-upload-videos"
            type="file"
            accept="video/*"
            multiple
            onChange={handleFilesChange}
            disabled={!playlistSelecionada || uploading}
            className="border border-gray-300 rounded px-3 py-2 cursor-pointer"
          />
          <button
            onClick={uploadVideos}
            disabled={!uploadFiles || uploadFiles.length === 0 || uploading}
            className={`px-5 py-2 rounded text-white ${
              !uploadFiles || uploadFiles.length === 0 || uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            } transition`}
          >
            {uploading ? "Enviando..." : "Enviar vídeos"}
          </button>
        </div>

        <ul className="flex-grow overflow-auto max-h-[400px] space-y-3 border border-gray-200 rounded p-3">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex justify-between items-center p-3 rounded bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col">
                <span className="font-medium">{video.nome}</span>
                <span className="text-sm text-gray-600">
                  {video.duracao !== undefined && `${formatarDuracao(video.duracao)} • `}
                  {video.tamanho !== undefined && formatarTamanho(video.tamanho)}
                </span>
              </div>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => deletarVideo(video.id)}
                aria-label="Excluir vídeo"
              >
                🗑️
              </button>
            </li>
          ))}
          {videos.length === 0 && (
            <li className="text-center text-gray-500 py-4">
              Nenhum vídeo nesta playlist.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}