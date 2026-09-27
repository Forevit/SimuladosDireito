-- Auditoria somente de leitura para conferir a configuração do Supabase.
-- Execute no SQL Editor e revise os resultados antes de alterar políticas.

-- 1) Tabelas e views expostas no schema public e estado de RLS.
SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  c.relkind AS object_type,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  c.reloptions AS view_options
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm')
ORDER BY c.relkind, c.relname;

-- 2) Políticas RLS e suas expressões reais.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) Privilégios diretos das roles usadas pelo Data API.
-- RLS e GRANTs precisam ser revisados juntos.
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND lower(grantee) IN ('public', 'anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 4) Funções executáveis pelas roles públicas e se rodam como SECURITY DEFINER.
SELECT
  p.oid::regprocedure AS function_name,
  p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  p.proconfig AS function_settings
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.oid::regprocedure::text;
