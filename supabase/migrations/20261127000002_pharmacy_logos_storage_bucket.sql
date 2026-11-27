-- QA-292: the pharmacy logo upload could not work.
--
-- The Profile page uploads the logo to the storage bucket "pharmacy-logos", but no migration
-- creates that bucket or any rule for it (dev has neither), so every upload failed. The page also
-- accepted any image type, including SVG.
--
-- This migration:
--   * creates the bucket (public, so the logo can be shown with a plain link): JPEG, PNG or WebP
--     only, at most 2 MB. If the bucket already exists, it gets these limits;
--   * lets a pharmacy member add, see and remove files only in the folder named after their own
--     pharmacy ("<organization id>/..."), and a super admin manage all of them.
-- Nobody else can add, change or remove a logo. Safe to run more than once.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pharmacy-logos', 'pharmacy-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- True when the first folder of the file path is a pharmacy the current user belongs to.
CREATE OR REPLACE FUNCTION public.can_manage_pharmacy_logo(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_current_user_ops_org(((storage.foldername(object_name))[1])::uuid, 'pharmacy')
    ELSE false
  END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname = 'pharmacy_logos_member_insert') THEN
    CREATE POLICY pharmacy_logos_member_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'pharmacy-logos' AND public.can_manage_pharmacy_logo(name));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname = 'pharmacy_logos_member_read') THEN
    CREATE POLICY pharmacy_logos_member_read ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'pharmacy-logos' AND public.can_manage_pharmacy_logo(name));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname = 'pharmacy_logos_member_delete') THEN
    CREATE POLICY pharmacy_logos_member_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'pharmacy-logos' AND public.can_manage_pharmacy_logo(name));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname = 'pharmacy_logos_admin_manage') THEN
    CREATE POLICY pharmacy_logos_admin_manage ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'pharmacy-logos' AND public.is_current_user_super_admin())
      WITH CHECK (bucket_id = 'pharmacy-logos' AND public.is_current_user_super_admin());
  END IF;
END;
$$;
