-- Exponha apenas os campos públicos das questões por uma view dedicada.
-- Execute no SQL Editor do Supabase e depois aguarde/recarregue o schema cache.
BEGIN;

CREATE OR REPLACE VIEW public.questions_public AS
SELECT
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
FROM public.questions;

-- O cliente lê somente a view; o gabarito permanece acessível apenas pelo
-- endpoint server-side /api/questions/answer, usando a service role.
REVOKE ALL PRIVILEGES ON TABLE public.questions FROM anon, authenticated;
REVOKE SELECT (correct, explanation_a, explanation_b, explanation_c, explanation_d)
  ON TABLE public.questions FROM anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.questions_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.questions_public TO anon, authenticated;

COMMIT;

NOTIFY pgrst, ' reload schema';

-- Esperado: a view tem SELECT para anon/authenticated e as colunas sensíveis
-- continuam sem SELECT direto pelas roles públicas.
SELECT
  has_table_privilege('anon', 'public.questions_public', 'SELECT') AS anon_can_read_safe_view,
  has_table_privilege('authenticated', 'public.questions_public', 'SELECT') AS authenticated_can_read_safe_view,
  has_column_privilege('anon', 'public.questions', 'correct', 'SELECT') AS anon_can_read_answer_directly,
  has_column_privilege('authenticated', 'public.questions', 'correct', 'SELECT') AS authenticated_can_read_answer_directly,
  has_column_privilege('anon', 'public.questions', 'explanation_a', 'SELECT') AS anon_can_read_explanations_directly,
  has_column_privilege('authenticated', 'public.questions', 'explanation_a', 'SELECT') AS authenticated_can_read_explanations_directly;
