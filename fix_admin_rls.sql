-- Run this in Supabase SQL editor to fix admin subject creation + uploads

-- 1) Create helper role-check functions
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'superadmin'
  );
$$;

-- 2) Recreate policies that relied on JWT role claims / recursive user checks
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Superadmin can manage all users" ON public.users;
CREATE POLICY "Superadmin can manage all users"
  ON public.users FOR ALL
  USING (public.is_superadmin_user());

DROP POLICY IF EXISTS "Admins can create subjects" ON public.subjects;
CREATE POLICY "Admins can create subjects"
  ON public.subjects FOR INSERT
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
  ON public.subjects FOR UPDATE
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can read all attempts" ON public.student_attempts;
CREATE POLICY "Admins can read all attempts"
  ON public.student_attempts FOR SELECT
  USING (public.is_admin_user());

-- 3) Quick verification (run as logged-in admin in SQL editor with Auth context if available)
-- SELECT auth.uid(), public.is_admin_user(), public.is_superadmin_user();
