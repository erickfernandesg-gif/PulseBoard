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
