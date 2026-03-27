-- =======================================================================================
-- PULSEBOARD - SETUP SCHEMA CONSOLIDADO (NÍVEL ENTERPRISE)
-- =======================================================================================

-- 1. EXTENSÕES E FUNÇÕES DE SEGURANÇA BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para verificar se usuário logado é gestor/admin
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função genérica para atualizar a coluna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =======================================================================================
-- 2. CRIAÇÃO DE TABELAS (Ordem estruturada pelas Foreign Keys)
-- =======================================================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  last_read_notifications_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Isolamento de Dados Financeiros
CREATE TABLE IF NOT EXISTS user_rates (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  settings JSONB DEFAULT '[
    {"id": "todo", "title": "A Fazer"},
    {"id": "in-progress", "title": "Em Execução"},
    {"id": "done", "title": "Concluído"}
  ]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES profiles(id),
  position_index INTEGER DEFAULT 0 NOT NULL,
  total_minutes_spent INTEGER DEFAULT 0, -- Agora gerido automaticamente por Trigger!
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS time_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS task_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================================================
-- 3. TRIGGERS E FUNÇÕES DE NEGÓCIO (A Mágica Automática)
-- =======================================================================================

-- Trigger: Atualiza updated_at nas tarefas
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Atualiza updated_at no salário
DROP TRIGGER IF EXISTS update_user_rates_updated_at ON user_rates;
CREATE TRIGGER update_user_rates_updated_at
  BEFORE UPDATE ON user_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cadastro Automático de Usuário (Cria Perfil e Taxa Zerada)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Já cria o vínculo financeiro oculto com valor zero
  INSERT INTO public.user_rates (user_id, hourly_rate)
  VALUES (new.id, 0.00);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger de Auditoria: Loga quando move o card (Status Change)
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (task_id, board_id, user_id, action, details)
    VALUES (NEW.id, NEW.board_id, auth.uid(), 'status_changed',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'task_title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_status_change ON tasks;
CREATE TRIGGER on_task_status_change
  AFTER UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_status_change();

-- NOVO: Trigger de Auto-soma de Horas na Tarefa
CREATE OR REPLACE FUNCTION update_task_total_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE tasks SET total_minutes_spent = (
      SELECT COALESCE(SUM(minutes), 0) FROM time_logs WHERE task_id = NEW.task_id
    ) WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET total_minutes_spent = (
      SELECT COALESCE(SUM(minutes), 0) FROM time_logs WHERE task_id = OLD.task_id
    ) WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_time_log_change ON time_logs;
CREATE TRIGGER on_time_log_change
  AFTER INSERT OR UPDATE OR DELETE ON time_logs
  FOR EACH ROW EXECUTE FUNCTION update_task_total_minutes();

-- =======================================================================================
-- 4. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =======================================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Exclui políticas antigas para evitar conflitos (Segurança da refatoração)
DROP POLICY IF EXISTS "Todos podem ver equipes" ON teams;
DROP POLICY IF EXISTS "Gestores gerenciam equipes" ON teams;
DROP POLICY IF EXISTS "Gestores gerenciam taxas" ON user_rates;
DROP POLICY IF EXISTS "Leitura de time_logs" ON time_logs;
DROP POLICY IF EXISTS "Inserção de time_logs" ON time_logs;

-- Políticas de Teams
CREATE POLICY "Todos podem ver equipes" ON teams FOR SELECT USING (true);
CREATE POLICY "Gestores gerenciam equipes" ON teams FOR ALL USING (is_manager());

-- Políticas Financeiras (Custo/Hora) -> BLINDADO!
CREATE POLICY "Apenas gestores veem taxas" ON user_rates FOR SELECT USING (is_manager());
CREATE POLICY "Apenas gestores editam taxas" ON user_rates FOR ALL USING (is_manager());

-- Políticas de Time Tracking (Apontamento de horas)
CREATE POLICY "Gestores veem e editam tudo de horas" ON time_logs FOR ALL USING (is_manager());
CREATE POLICY "Usuário vê as próprias horas e do time" ON time_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuário insere as próprias horas" ON time_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário edita/deleta as próprias horas" ON time_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário deleta as próprias horas" ON time_logs FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_month VARCHAR(7);

CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- Ex: 'status_change'
  trigger_value VARCHAR(50) NOT NULL, -- Ex: 'done'
  action_type VARCHAR(50) NOT NULL, -- Ex: 'notify_manager', 'assign_user'
  action_payload VARCHAR(255), -- ID do usuário ou email
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE tasks ADD COLUMN is_blocked BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN blocker_reason TEXT;

-- Cria a tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Adiciona a coluna client_id na tabela de tarefas
ALTER TABLE tasks ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Adiciona a coluna de tempo estimado (em minutos, para manter o padrão)
ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER DEFAULT 0;

drop policy if exists "Todos podem ver equipes" on public.teams;
drop policy if exists "Gestores gerenciam equipes" on public.teams;

drop policy if exists "Perfis: self ou gestor" on public.profiles;

drop policy if exists "Apenas gestores veem taxas" on public.user_rates;
drop policy if exists "Apenas gestores editam taxas" on public.user_rates;

drop policy if exists "Gestores veem e editam tudo de horas" on public.time_logs;
drop policy if exists "Usuário vê apenas as próprias horas" on public.time_logs;
drop policy if exists "Usuário insere as próprias horas" on public.time_logs;
drop policy if exists "Usuário edita as próprias horas" on public.time_logs;
drop policy if exists "Usuário deleta as próprias horas" on public.time_logs;

drop policy if exists "Gestores veem todas as tarefas" on public.tasks;
drop policy if exists "Gestores veem todos os quadros" on public.boards;

-- Função base (a sua)
create or replace function public.is_manager()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','manager')
  );
end;
$$;

-- (re)habilita RLS (não mexe em dados)
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.user_rates enable row level security;
alter table public.boards enable row level security;
alter table public.tasks enable row level security;
alter table public.time_logs enable row level security;

-- Teams
create policy "Todos podem ver equipes"
on public.teams for select
using (true);

create policy "Gestores gerenciam equipes"
on public.teams for all
using (public.is_manager())
with check (public.is_manager());

-- Profiles (recomendado: user vê o próprio + gestor vê todos)
create policy "Perfis: self ou gestor"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.is_manager());

-- User Rates
create policy "Apenas gestores veem taxas"
on public.user_rates for select
using (public.is_manager());

create policy "Apenas gestores editam taxas"
on public.user_rates for all
using (public.is_manager())
with check (public.is_manager());

-- Time Logs (gestor vê tudo, user vê os seus)
create policy "Gestores veem e editam tudo de horas"
on public.time_logs for all
using (public.is_manager())
with check (public.is_manager());

create policy "Usuário vê apenas as próprias horas"
on public.time_logs for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuário insere as próprias horas"
on public.time_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Usuário edita as próprias horas"
on public.time_logs for update
to authenticated
using (auth.uid() = user_id);

create policy "Usuário deleta as próprias horas"
on public.time_logs for delete
to authenticated
using (auth.uid() = user_id);

-- Tasks / Boards (visão macro do gestor)
create policy "Gestores veem todas as tarefas"
on public.tasks for select
to authenticated
using (public.is_manager() or assigned_to = auth.uid());

create policy "Gestores veem todos os quadros"
on public.boards for select
to authenticated
using (public.is_manager() or owner_id = auth.uid());
commit;

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- 2. Criamos a política de UPDATE
-- Ela diz: "Permita o UPDATE se o ID do usuário logado for igual ao user_id do comentário"
CREATE POLICY "Users can update their own comments" 
ON task_comments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);