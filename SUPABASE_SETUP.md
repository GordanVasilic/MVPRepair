# Supabase Setup Instructions

Pošto ne mogu direktno pristupiti vašoj Supabase bazi podataka, molimo vas da pokrenete sljedeći SQL kod u Supabase SQL Editor-u:

## 1. Idite na Supabase Dashboard
- Otvorite https://supabase.com/dashboard
- Odaberite vaš projekt
- Idite na "SQL Editor" u lijevom meniju

## 2. Pokrenite sljedeći SQL kod:

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS issue_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_buildings ENABLE ROW LEVEL SECURITY;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'admin', 'technician')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  floors_config JSONB NOT NULL DEFAULT '{"floors": 4, "apartments_per_floor": 4}',
  model_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  apartment_number TEXT NOT NULL,
  floor INTEGER NOT NULL,
  rooms_config JSONB NOT NULL DEFAULT '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'closed')),
  assigned_to UUID REFERENCES users(id),
  location_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS issue_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, apartment_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_apartment_id ON issues(apartment_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issue_images_issue_id ON issue_images(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON user_buildings(user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON users TO anon, authenticated;
GRANT ALL ON users TO authenticated;

GRANT SELECT ON buildings TO anon, authenticated;
GRANT ALL ON buildings TO authenticated;

GRANT SELECT ON apartments TO anon, authenticated;
GRANT ALL ON apartments TO authenticated;

GRANT SELECT ON issues TO anon, authenticated;
GRANT ALL ON issues TO authenticated;

GRANT SELECT ON issue_images TO anon, authenticated;
GRANT ALL ON issue_images TO authenticated;

GRANT SELECT ON issue_comments TO anon, authenticated;
GRANT ALL ON issue_comments TO authenticated;

GRANT SELECT ON notifications TO anon, authenticated;
GRANT ALL ON notifications TO authenticated;

GRANT SELECT ON user_buildings TO anon, authenticated;
GRANT ALL ON user_buildings TO authenticated;

-- RLS Policies
-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Everyone can view buildings and apartments
CREATE POLICY "Anyone can view buildings" ON buildings FOR SELECT USING (true);
CREATE POLICY "Anyone can view apartments" ON apartments FOR SELECT USING (true);

-- Users can only see their own issues
CREATE POLICY "Users can view own issues" ON issues FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create issues" ON issues FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own issues" ON issues FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can only see images for their own issues
CREATE POLICY "Users can view own issue images" ON issue_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_images.issue_id AND issues.user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can upload images for own issues" ON issue_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_images.issue_id AND issues.user_id::text = auth.uid()::text)
);

-- Similar policies for comments and notifications
CREATE POLICY "Users can view comments on own issues" ON issue_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_comments.issue_id AND issues.user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can create comments" ON issue_comments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own building assignments" ON user_buildings FOR SELECT USING (auth.uid()::text = user_id::text);

-- Insert sample data
INSERT INTO buildings (id, name, address, floors_config) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Zgrada A', 'Zmaja od Bosne 1, Sarajevo', '{"floors": 4, "apartments_per_floor": 4}'),
('550e8400-e29b-41d4-a716-446655440001', 'Zgrada B', 'Titova 15, Sarajevo', '{"floors": 5, "apartments_per_floor": 3}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample apartments for Building A
INSERT INTO apartments (id, building_id, apartment_number, floor, rooms_config) VALUES 
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '1', 1, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '2', 1, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '3', 1, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '4', 1, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '5', 2, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '6', 2, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', '7', 2, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '8', 2, '{"rooms": ["Dnevna soba", "Kuhinja", "Spavaća soba", "Kupatilo"]}')
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for issue images
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-images', 'issue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for issue images
CREATE POLICY "Anyone can view issue images" ON storage.objects FOR SELECT USING (bucket_id = 'issue-images');
CREATE POLICY "Authenticated users can upload issue images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-images' AND auth.role() = 'authenticated');
```

## 3. Proverite da li su tabele kreirane
Nakon pokretanja SQL koda, idite na "Table Editor" i proverite da li su sve tabele kreirane:
- users
- buildings  
- apartments
- issues
- issue_images
- issue_comments
- notifications
- user_buildings

## 4. Proverite Storage
Idite na "Storage" i proverite da li je kreiran bucket "issue-images".

## 5. Pokrenite aplikaciju
Nakon što su tabele kreirane, možete pokrenuti aplikaciju sa `npm run dev`.