-- setup_schema.sql

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create boards table
CREATE TABLE boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' NOT NULL,
  priority TEXT DEFAULT 'medium' NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES profiles(id),
  position_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_log table
CREATE TABLE activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles (for assignment), but only update their own
CREATE POLICY "Profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Boards: Users can read and write boards they own or are assigned tasks in (simplified: everyone can see all boards for now, or just owner)
CREATE POLICY "Boards are viewable by authenticated users." ON boards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert boards." ON boards FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own boards." ON boards FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own boards." ON boards FOR DELETE USING (auth.uid() = owner_id);

-- Tasks: Viewable by authenticated users
CREATE POLICY "Tasks are viewable by authenticated users." ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert tasks." ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update tasks." ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete tasks." ON tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Activity Log
CREATE POLICY "Activity log viewable by authenticated users." ON activity_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert activity log." ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 1. EVOLUÇÃO DA TABELA DE TAREFAS
-- Adicionando data de início e controle de tempo total gasto
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_minutes_spent INTEGER DEFAULT 0;

-- 2. SUPORTE A MÚLTIPLOS USUÁRIOS (COLABORADORES)
-- A coluna 'assigned_to' atual continuará sendo o "Responsável Principal"
-- Esta nova tabela permitirá adicionar outros envolvidos (ex: Desenvolvedor + Testador)
CREATE TABLE IF NOT EXISTS task_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'collaborator', -- ex: 'tester', 'viewer', 'dev'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(task_id, user_id)
);

-- 3. SISTEMA DE COMENTÁRIOS E CHAT INTERNO
-- Aqui é onde as @menções e o histórico de erros da homologação ficarão registrados
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SEGURANÇA (RLS) PARA AS NOVAS TABELAS
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para Colaboradores
CREATE POLICY "Collaborators viewable by team" ON task_collaborators 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage collaborators" ON task_collaborators 
FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para Comentários
CREATE POLICY "Comments viewable by team" ON task_comments 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can post comments" ON task_comments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON task_comments 
FOR DELETE USING (auth.uid() = user_id);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_task_id ON task_collaborators(task_id);

-- Adiciona uma coluna para salvar a configuração de colunas do quadro
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '[
  {"id": "todo", "title": "A Fazer"},
  {"id": "in-progress", "title": "Em Execução"},
  {"id": "done", "title": "Concluído"}
]'::jsonb;

-- 1. Criar a função que gera o log de atividade automaticamente
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o status foi alterado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (task_id, board_id, user_id, action, details)
    VALUES (
      NEW.id,
      NEW.board_id,
      auth.uid(), -- Pega o ID do utilizador logado que fez a ação
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'task_title', NEW.title
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o Gatilho (Trigger) na tabela 'tasks'
DROP TRIGGER IF EXISTS on_task_status_change ON tasks;

CREATE TRIGGER on_task_status_change
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_status_change();

  ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_read_notifications_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;