ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS emirates_id_front_url text,
ADD COLUMN IF NOT EXISTS emirates_id_back_url text;