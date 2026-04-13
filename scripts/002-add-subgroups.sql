-- Migración aditiva: agrega subgrupos sin modificar tablas existentes

-- Tabla de subgrupos
-- Un subgrupo pertenece a un grupo principal y tiene un subconjunto de sus miembros
CREATE TABLE IF NOT EXISTS subgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, name)
);

-- Miembros de cada subgrupo (solo pueden ser miembros del grupo padre)
CREATE TABLE IF NOT EXISTS subgroup_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id UUID NOT NULL REFERENCES subgroups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subgroup_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subgroups_group_id ON subgroups(group_id);
CREATE INDEX IF NOT EXISTS idx_subgroup_members_subgroup_id ON subgroup_members(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_subgroup_members_user_id ON subgroup_members(user_id);