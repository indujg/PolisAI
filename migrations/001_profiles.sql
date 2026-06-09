-- Run this in your Supabase SQL Editor (safe to re-run)

-- 1. Create enum (skip if already exists)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'policy_maker', 'researcher', 'citizen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT         NOT NULL,
    full_name   TEXT,
    role        user_role    NOT NULL DEFAULT 'citizen'::user_role,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Trigger: auto-create profile on signup (defensive cast)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role := 'citizen'::user_role;
    v_role_raw TEXT;
BEGIN
    v_role_raw := NEW.raw_user_meta_data->>'role';
    IF v_role_raw IS NOT NULL AND v_role_raw != '' THEN
        BEGIN
            v_role := v_role_raw::user_role;
        EXCEPTION WHEN invalid_text_representation THEN
            v_role := 'citizen'::user_role;
        END;
    END IF;

    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        v_role
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON profiles;
CREATE POLICY "users_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON profiles;
CREATE POLICY "users_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);
