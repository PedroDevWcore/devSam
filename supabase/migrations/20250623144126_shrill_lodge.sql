/*
  # Sistema de Gerenciamento de Streaming com Wowza

  1. Novas Tabelas
    - `streaming_platforms` - Plataformas de transmissão (YouTube, Facebook, etc.)
    - `user_streaming_platforms` - Configurações das plataformas por usuário
    - `transmissions` - Transmissões ativas/históricas
    - `scheduled_transmissions` - Transmissões agendadas
    - `transmission_platforms` - Relação entre transmissões e plataformas

  2. Atualizações
    - Atualizar tabela `servers` com campos específicos do Wowza
    - Adicionar campos de configuração para streaming

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para proteger dados sensíveis dos servidores
*/

-- Tabela de plataformas de streaming disponíveis
CREATE TABLE IF NOT EXISTS streaming_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text UNIQUE NOT NULL, -- youtube, facebook, twitch, etc
  icone text,
  rtmp_base_url text,
  requer_stream_key boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Configurações das plataformas por usuário
CREATE TABLE IF NOT EXISTS user_streaming_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_platform uuid NOT NULL REFERENCES streaming_platforms(id) ON DELETE CASCADE,
  stream_key text NOT NULL,
  rtmp_url text,
  titulo_padrao text,
  descricao_padrao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(id_user, id_platform)
);

-- Transmissões (ativas e históricas)
CREATE TABLE IF NOT EXISTS transmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_server uuid REFERENCES servers(id) ON DELETE SET NULL,
  id_playlist integer REFERENCES playlists(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'preparando' CHECK (status IN ('preparando', 'ativa', 'pausada', 'finalizada', 'erro')),
  tipo text NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual', 'agendada', 'playlist')),
  data_inicio timestamptz,
  data_fim timestamptz,
  wowza_application_name text,
  wowza_stream_name text,
  configuracoes jsonb DEFAULT '{}',
  erro_detalhes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transmissões agendadas
CREATE TABLE IF NOT EXISTS scheduled_transmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_playlist integer NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  data_agendada timestamptz NOT NULL,
  frequencia text DEFAULT 'uma_vez' CHECK (frequencia IN ('uma_vez', 'diariamente', 'semanalmente', 'dias_da_semana')),
  dias_semana integer[],
  ativo boolean DEFAULT true,
  ultima_execucao timestamptz,
  proxima_execucao timestamptz,
  configuracoes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relação entre transmissões e plataformas
CREATE TABLE IF NOT EXISTS transmission_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transmission uuid NOT NULL REFERENCES transmissions(id) ON DELETE CASCADE,
  id_user_platform uuid NOT NULL REFERENCES user_streaming_platforms(id) ON DELETE CASCADE,
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'erro', 'finalizada')),
  wowza_publisher_name text,
  erro_detalhes text,
  created_at timestamptz DEFAULT now()
);

-- Atualizar tabela servers com campos específicos do Wowza
DO $$
BEGIN
  -- Adicionar campos específicos do Wowza se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'wowza_rest_port') THEN
    ALTER TABLE servers ADD COLUMN wowza_rest_port integer DEFAULT 8087;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'wowza_username') THEN
    ALTER TABLE servers ADD COLUMN wowza_username text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'wowza_password') THEN
    ALTER TABLE servers ADD COLUMN wowza_password text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'wowza_application') THEN
    ALTER TABLE servers ADD COLUMN wowza_application text DEFAULT 'live';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'tipo_servidor') THEN
    ALTER TABLE servers ADD COLUMN tipo_servidor text DEFAULT 'wowza' CHECK (tipo_servidor IN ('wowza', 'nginx', 'srs'));
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE streaming_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaming_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmission_platforms ENABLE ROW LEVEL SECURITY;

-- Políticas para streaming_platforms (público para leitura)
CREATE POLICY "Todos podem ver plataformas ativas"
  ON streaming_platforms
  FOR SELECT
  TO public
  USING (ativo = true);

-- Políticas para user_streaming_platforms
CREATE POLICY "Usuários podem gerenciar suas plataformas"
  ON user_streaming_platforms
  FOR ALL
  TO authenticated
  USING (auth.uid() = id_user)
  WITH CHECK (auth.uid() = id_user);

-- Políticas para transmissions
CREATE POLICY "Usuários podem gerenciar suas transmissões"
  ON transmissions
  FOR ALL
  TO authenticated
  USING (auth.uid() = id_user)
  WITH CHECK (auth.uid() = id_user);

-- Políticas para scheduled_transmissions
CREATE POLICY "Usuários podem gerenciar transmissões agendadas"
  ON scheduled_transmissions
  FOR ALL
  TO authenticated
  USING (auth.uid() = id_user)
  WITH CHECK (auth.uid() = id_user);

-- Políticas para transmission_platforms
CREATE POLICY "Usuários podem ver plataformas de suas transmissões"
  ON transmission_platforms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transmissions t 
      WHERE t.id = transmission_platforms.id_transmission 
      AND t.id_user = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir plataformas em suas transmissões"
  ON transmission_platforms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transmissions t 
      WHERE t.id = transmission_platforms.id_transmission 
      AND t.id_user = auth.uid()
    )
  );

-- Inserir plataformas padrão
INSERT INTO streaming_platforms (nome, codigo, icone, rtmp_base_url, requer_stream_key) VALUES
  ('YouTube', 'youtube', 'youtube', 'rtmp://a.rtmp.youtube.com/live2/', true),
  ('Facebook', 'facebook', 'facebook', 'rtmps://live-api-s.facebook.com:443/rtmp/', true),
  ('Twitch', 'twitch', 'twitch', 'rtmp://live.twitch.tv/app/', true),
  ('Instagram', 'instagram', 'instagram', 'rtmps://live-upload.instagram.com:443/rtmp/', true),
  ('TikTok', 'tiktok', 'video', 'rtmp://push.tiktokcdn.com/live/', true)
ON CONFLICT (codigo) DO NOTHING;

-- Função para calcular próxima execução de agendamentos
CREATE OR REPLACE FUNCTION calculate_next_execution(
  data_agendada timestamptz,
  frequencia text,
  dias_semana integer[]
) RETURNS timestamptz AS $$
DECLARE
  next_exec timestamptz;
  current_day integer;
  target_day integer;
  days_ahead integer;
BEGIN
  CASE frequencia
    WHEN 'uma_vez' THEN
      RETURN data_agendada;
    WHEN 'diariamente' THEN
      next_exec := data_agendada;
      WHILE next_exec <= now() LOOP
        next_exec := next_exec + interval '1 day';
      END LOOP;
      RETURN next_exec;
    WHEN 'semanalmente' THEN
      next_exec := data_agendada;
      WHILE next_exec <= now() LOOP
        next_exec := next_exec + interval '1 week';
      END LOOP;
      RETURN next_exec;
    WHEN 'dias_da_semana' THEN
      IF dias_semana IS NULL OR array_length(dias_semana, 1) = 0 THEN
        RETURN NULL;
      END IF;
      
      next_exec := data_agendada;
      current_day := extract(dow from now());
      
      -- Encontrar o próximo dia da semana
      FOR i IN 0..6 LOOP
        target_day := dias_semana[((current_day + i) % array_length(dias_semana, 1)) + 1];
        days_ahead := (target_day - current_day + 7) % 7;
        
        IF days_ahead = 0 AND extract(hour from now()) >= extract(hour from data_agendada) THEN
          days_ahead := 7;
        END IF;
        
        next_exec := date_trunc('day', now()) + interval '1 day' * days_ahead + 
                    (extract(hour from data_agendada) * interval '1 hour') +
                    (extract(minute from data_agendada) * interval '1 minute');
        
        IF next_exec > now() THEN
          RETURN next_exec;
        END IF;
      END LOOP;
      
      RETURN next_exec;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar próxima execução
CREATE OR REPLACE FUNCTION update_next_execution()
RETURNS TRIGGER AS $$
BEGIN
  NEW.proxima_execucao := calculate_next_execution(
    NEW.data_agendada,
    NEW.frequencia,
    NEW.dias_semana
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_execution
  BEFORE INSERT OR UPDATE ON scheduled_transmissions
  FOR EACH ROW
  EXECUTE FUNCTION update_next_execution();