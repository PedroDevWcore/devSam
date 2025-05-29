import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const DadosConexao: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Dados de Conexão</h1>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Informações do Servidor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">URL de Streaming (RTMP)</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  rtmp://servidor.exemplo.com/live
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('rtmp://servidor.exemplo.com/live')}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Chave de Stream</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  stream_key_example_123456
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('stream_key_example_123456')}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">URL de Reprodução (HLS)</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  https://servidor.exemplo.com/live/playlist.m3u8
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('https://servidor.exemplo.com/live/playlist.m3u8')}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Servidor FTP</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  ftp://ftp.exemplo.com
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('ftp://ftp.exemplo.com')}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Usuário FTP</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  usuario_ftp
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('usuario_ftp')}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Senha FTP</h3>
              <div className="mt-1 flex items-center">
                <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full">
                  ••••••••••••
                </span>
                <button 
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  onClick={() => navigator.clipboard.writeText('senha_exemplo_segura')}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Configurações Recomendadas</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">OBS Studio</h3>
            <p className="text-gray-600 mb-4">Configurações recomendadas para transmissão com OBS Studio</p>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Taxa de bits de vídeo: <span className="font-medium">2500 Kbps</span></li>
                <li>Taxa de bits de áudio: <span className="font-medium">128 Kbps</span></li>
                <li>Resolução: <span className="font-medium">1280x720 (720p)</span></li>
                <li>FPS: <span className="font-medium">30</span></li>
                <li>Preset de codificação: <span className="font-medium">veryfast</span></li>
                <li>Perfil: <span className="font-medium">main</span></li>
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Streamlabs</h3>
            <p className="text-gray-600 mb-4">Configurações recomendadas para transmissão com Streamlabs</p>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Taxa de bits de vídeo: <span className="font-medium">2500 Kbps</span></li>
                <li>Taxa de bits de áudio: <span className="font-medium">128 Kbps</span></li>
                <li>Resolução: <span className="font-medium">1280x720 (720p)</span></li>
                <li>FPS: <span className="font-medium">30</span></li>
                <li>Preset de codificação: <span className="font-medium">veryfast</span></li>
                <li>Perfil: <span className="font-medium">main</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DadosConexao;