-- Execute no SQL Editor do Supabase após revisar o schema.
-- Mantém a leitura pública dos campos usados para renderizar as questões,
-- mas remove o acesso direto ao gabarito e às explicações.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.questions FROM anon, authenticated;

GRANT SELECT (
  id,
  subject,
  subject_id,
  topic_id,
  statement,
  option_a,
  option_b,
  option_c,
  option_d,
  difficulty
)
ON TABLE public.questions TO anon, authenticated;

DO $$
BEGIN
  IF has_column_privilege('anon', 'public.questions', 'correct', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'correct', 'SELECT')
     OR has_column_privilege('anon', 'public.questions', 'explanation_a', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explanation_a', 'SELECT')
     OR has_column_privilege('anon', 'public.questions', 'explanation_b', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explanation_b', 'SELECT')
     OR has_column_privilege('anon', 'public.questions', 'explanation_c', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explanation_c', 'SELECT')
     OR has_column_privilege('anon', 'public.questions', 'explanation_d', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explanation_d', 'SELECT') THEN
    RAISE EXCEPTION 'As roles públicas ainda conseguem ler colunas sensíveis de public.questions. A transação será revertida.';
  END IF;
END;
$$;

COMMIT;

-- A policy RLS de SELECT existente permanece ativa. Confirme também que
-- anon/authenticated têm SELECT em id, subject, subject_id, topic_id,
-- statement, option_a..d e difficulty, e NÃO têm SELECT nas colunas sensíveis.
SELECT
  role_rows.role_name,
  column_rows.column_name,
  has_column_privilege(role_rows.role_name, 'public.questions', column_rows.column_name, 'SELECT') AS can_select
FROM (VALUES ('anon'), ('authenticated')) AS role_rows(role_name)
CROSS JOIN (VALUES
  ('id'), ('subject'), ('subject_id'), ('topic_id'), ('statement'),
  ('option_a'), ('option_b'), ('option_c'), ('option_d'), ('difficulty'),
  ('correct'), ('explanation_a'), ('explanation_b'), ('explanation_c'), ('explanation_d')
) AS column_rows(column_name)
ORDER BY role_rows.role_name, column_rows.column_name;
