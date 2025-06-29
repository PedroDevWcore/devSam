export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: {
          id: number
          nome: string | null
          id_user: string | null
          created_at: string | null
          descricao: string | null
          quantidadePlaylists: number | null
        }
        Insert: {
          id?: number
          nome?: string | null
          id_user?: string | null
          created_at?: string | null
          descricao?: string | null
          quantidadePlaylists?: number | null
        }
        Update: {
          id?: number
          nome?: string | null
          id_user?: string | null
          created_at?: string | null
          descricao?: string | null
          quantidadePlaylists?: number | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string
          duracaoTotal: number | null
          id: number
          id_user: string | null
          nome: string | null
          quantidadeVideos: number | null
        }
        Insert: {
          created_at?: string
          duracaoTotal?: number | null
          id?: number
          id_user?: string | null
          nome?: string | null
          quantidadeVideos?: number | null
        }
        Update: {
          created_at?: string
          duracaoTotal?: number | null
          id?: number
          id_user?: string | null
          nome?: string | null
          quantidadeVideos?: number | null
        }
        Relationships: []
      }
      playlists_agendamentos: {
        Row: {
          created_at: string | null
          data: string
          dias_da_semana: string[] | null
          frequencia: string
          id: number
          id_playlist: number
          id_playlist_finalizacao: number | null
          id_user: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          dias_da_semana?: string[] | null
          frequencia: string
          id?: number
          id_playlist: number
          id_playlist_finalizacao?: number | null
          id_user?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          dias_da_semana?: string[] | null
          frequencia?: string
          id?: number
          id_playlist?: number
          id_playlist_finalizacao?: number | null
          id_user?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_agendamentos_id_playlist_finalizacao_fkey"
            columns: ["id_playlist_finalizacao"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_agendamentos_id_playlist_fkey"
            columns: ["id_playlist"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          bitrate: number | null
          email: string
          espaco: number | null
          espectadores: number | null
          id: string
          nome: string | null
          streamings: number | null
        }
        Insert: {
          bitrate?: number | null
          email: string
          espaco?: number | null
          espectadores?: number | null
          id?: string
          nome?: string | null
          streamings?: number | null
        }
        Update: {
          bitrate?: number | null
          email?: string
          espaco?: number | null
          espectadores?: number | null
          id?: string
          nome?: string | null
          streamings?: number | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string | null
          descricao: string | null
          duracao: number | null
          filename: string | null
          id: number
          id_playlist: number | null
          nome: string
          tamanho: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          duracao?: number | null
          filename?: string | null
          id?: number
          id_playlist?: number | null
          nome: string
          tamanho?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          duracao?: number | null
          filename?: string | null
          id?: number
          id_playlist?: number | null
          nome?: string
          tamanho?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      playlist_videos: {
        Row: {
          id: number
          id_playlist: number
          id_video: number
          ordem: number
        }
        Insert: {
          id?: number
          id_playlist: number
          id_video: number
          ordem: number
        }
        Update: {
          id?: number
          id_playlist?: number
          id_video?: number
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_videos_id_playlist_fkey"
            columns: ["id_playlist"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_videos_id_video_fkey"
            columns: ["id_video"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_playlists_with_stats_for_user: {
        Args: { p_id_user: string }
        Returns: {
          id: string
          nome: string
          quantidade_videos: number
          duracao_total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
