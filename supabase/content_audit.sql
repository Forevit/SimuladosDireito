-- Auditoria somente de leitura do banco de questões.
-- Execute no SQL Editor do Supabase para revisar conteúdo antes de inserir novos lotes.

-- 1) Quantidade por área, matéria e dificuldade.
SELECT
  coalesce(a.name, CASE
    WHEN lower(trim(q.subject)) IN ('civil', 'processo_civil', 'penal', 'processo_penal', 'trabalhista', 'processo_trabalho', 'empresarial', 'ambiental', 'oratoria', 'direito civil', 'processo civil', 'prática penal', 'processo penal', 'direito do trabalho', 'processo do trabalho', 'direito empresarial', 'direito ambiental', 'oratória jurídica') THEN 'Direito'
    WHEN lower(trim(q.subject)) IN ('redes', 'infraestrutura', 'seguranca', 'seguranca_da_informacao', 'sistemas_operacionais', 'linux', 'windows', 'virtualizacao', 'cloud', 'banco_de_dados', 'programacao', 'devops', 'hardware', 'ciberseguranca', 'active_directory', 'powershell', 'git', 'docker', 'apis', 'redes de computadores', 'segurança da informação', 'sistemas operacionais', 'virtualização', 'banco de dados', 'programação', 'cibersegurança') THEN 'Tecnologia'
  END, 'Sem área vinculada') AS area,
  coalesce(s.name, q.subject, 'Sem matéria') AS subject,
  lower(trim(q.difficulty)) AS difficulty,
  count(q.id) AS questions
FROM public.questions AS q
LEFT JOIN public.subjects AS s ON s.id = q.subject_id
LEFT JOIN public.areas AS a ON a.id = s.area_id
GROUP BY a.name, q.subject, s.name, lower(trim(q.difficulty))
ORDER BY area, subject, difficulty;

-- 2) Matérias e tópicos ativos sem questões vinculadas.
SELECT
  a.name AS area,
  s.id AS subject_id,
  s.name AS subject,
  count(q.id) AS questions
FROM public.subjects AS s
LEFT JOIN public.areas AS a ON a.id = s.area_id
LEFT JOIN public.questions AS q ON q.subject_id = s.id
WHERE s.active IS TRUE
GROUP BY a.name, s.id, s.name
HAVING count(q.id) = 0
ORDER BY a.name, s.name;

SELECT
  s.name AS subject,
  t.id AS topic_id,
  t.name AS topic,
  count(q.id) AS questions
FROM public.topics AS t
JOIN public.subjects AS s ON s.id = t.subject_id
LEFT JOIN public.questions AS q ON q.topic_id = t.id
WHERE t.active IS TRUE
GROUP BY s.name, t.id, t.name
HAVING count(q.id) = 0
ORDER BY s.name, t.name;

-- 3) Possíveis duplicidades por enunciado normalizado.
SELECT
  lower(trim(regexp_replace(statement, '\s+', ' ', 'g'))) AS normalized_statement,
  count(*) AS occurrences,
  array_agg(id ORDER BY id) AS question_ids
FROM public.questions
GROUP BY lower(trim(regexp_replace(statement, '\s+', ' ', 'g')))
HAVING count(*) > 1
ORDER BY occurrences DESC, normalized_statement;

-- 4) Registros que precisam de revisão estrutural ou de explicações.
SELECT
  id,
  subject,
  subject_id,
  topic_id,
  difficulty,
  correct,
  CASE WHEN nullif(trim(statement), '') IS NULL THEN 'enunciado vazio' END AS issue_statement,
  CASE WHEN upper(trim(correct)) NOT IN ('A', 'B', 'C', 'D') THEN 'alternativa correta inválida' END AS issue_correct,
  CASE WHEN lower(trim(difficulty)) NOT IN ('facil', 'fácil', 'medio', 'médio', 'media', 'média', 'dificil', 'difícil') THEN 'dificuldade não padronizada' END AS issue_difficulty,
  CASE WHEN nullif(trim(option_a), '') IS NULL OR nullif(trim(option_b), '') IS NULL
         OR nullif(trim(option_c), '') IS NULL OR nullif(trim(option_d), '') IS NULL THEN 'alternativa vazia' END AS issue_options,
  CASE WHEN nullif(trim(explanation_a), '') IS NULL OR nullif(trim(explanation_b), '') IS NULL
         OR nullif(trim(explanation_c), '') IS NULL OR nullif(trim(explanation_d), '') IS NULL THEN 'explicação ausente' END AS issue_explanations
FROM public.questions
WHERE nullif(trim(statement), '') IS NULL
   OR upper(trim(correct)) NOT IN ('A', 'B', 'C', 'D')
   OR lower(trim(difficulty)) NOT IN ('facil', 'fácil', 'medio', 'médio', 'media', 'média', 'dificil', 'difícil')
   OR nullif(trim(option_a), '') IS NULL OR nullif(trim(option_b), '') IS NULL
   OR nullif(trim(option_c), '') IS NULL OR nullif(trim(option_d), '') IS NULL
   OR nullif(trim(explanation_a), '') IS NULL OR nullif(trim(explanation_b), '') IS NULL
   OR nullif(trim(explanation_c), '') IS NULL OR nullif(trim(explanation_d), '') IS NULL
ORDER BY id;

-- 5) Verificação de elegibilidade dos desafios (cinco questões difíceis).
WITH classified_questions AS (
  SELECT
    q.id,
    q.difficulty,
    CASE
      WHEN s.slug = 'inteligencia-artificial' OR lower(trim(q.subject)) IN ('inteligencia_artificial', 'inteligencia artificial', 'inteligência artificial') THEN 'Inteligência Artificial'
      WHEN a.id = 1 OR lower(trim(q.subject)) IN ('civil', 'processo_civil', 'penal', 'processo_penal', 'trabalhista', 'processo_trabalho', 'empresarial', 'ambiental', 'oratoria', 'direito civil', 'processo civil', 'prática penal', 'processo penal', 'direito do trabalho', 'processo do trabalho', 'direito empresarial', 'direito ambiental', 'oratória jurídica') THEN 'Direito'
      WHEN a.id = 2 OR lower(trim(q.subject)) IN ('redes', 'infraestrutura', 'seguranca', 'seguranca_da_informacao', 'sistemas_operacionais', 'linux', 'windows', 'virtualizacao', 'cloud', 'banco_de_dados', 'programacao', 'devops', 'hardware', 'ciberseguranca', 'active_directory', 'powershell', 'git', 'docker', 'apis', 'redes de computadores', 'segurança da informação', 'sistemas operacionais', 'virtualização', 'banco de dados', 'programação', 'cibersegurança') THEN 'Tecnologia'
      ELSE 'Sem área vinculada'
    END AS area
  FROM public.questions AS q
  LEFT JOIN public.subjects AS s ON s.id = q.subject_id
  LEFT JOIN public.areas AS a ON a.id = s.area_id
)
SELECT
  area,
  count(id) FILTER (WHERE difficulty = 'dificil') AS difficult_questions,
  count(id) FILTER (WHERE difficulty = 'dificil') >= 5 AS daily_challenge_available
FROM classified_questions
GROUP BY area
ORDER BY area;
