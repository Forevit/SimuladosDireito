# Segurança do gabarito das questões

## Problema

Antes, o navegador recebia `correct` e as explicações junto com cada questão. Esses campos podiam ser vistos antes da resposta nas ferramentas do navegador e acabavam incluídos no cache de sessão e no progresso salvo.

## Fluxo atualizado

1. O frontend consulta somente identificador, matéria/tópicos, enunciado, alternativas e dificuldade.
2. O cache de questões guarda somente esses dados seguros. O progresso persistido guarda IDs, posição, alternativa selecionada, resultado booleano e informações mínimas da sessão.
3. Ao confirmar, o frontend envia `questionId` e `answer` para `POST /api/questions/answer`, autenticado com o access token da sessão anônima do Supabase.
4. O endpoint valida o token usando a chave publishable e consulta as colunas sensíveis com `SUPABASE_SERVICE_ROLE_KEY`, apenas no servidor.
5. O resultado e as explicações são retornados sem cache e ficam somente em memória no navegador após a confirmação.

O endpoint é same-origin (`/api/questions/answer`); a diretiva `connect-src 'self'` já presente no CSP permite a chamada, então não foi necessário liberar outro domínio.

O endpoint não consegue provar que uma pessoa clicou no botão: qualquer usuário pode chamar uma API pública por conta própria. A alteração impede que o banco envie o gabarito no carregamento inicial e o mantém fora de storage; não impede inspeção do resultado que o próprio endpoint entrega depois de uma tentativa.

## Variáveis do Vercel

Configure para Production, Preview e Development:

- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role`/secret, somente no ambiente server-side do Vercel. Nunca usar prefixo `NEXT_PUBLIC_` nem incluí-la no frontend.

A chave publishable usada para validar a sessão é pública e fica no arquivo da função; ela não tem privilégios administrativos. Se a chave publishable do projeto mudar, atualize também `SUPABASE_PUBLISHABLE_KEY` em `api/questions/answer.js`.

## Banco de dados

Execute `supabase/question-answer-security.sql` no SQL Editor do Supabase. A transação revoga acesso de tabela e concede apenas `SELECT` nas colunas necessárias; ela aborta se anon/authenticated ainda puderem ler qualquer coluna sensível. A política RLS vigente não é alterada. Verifique o resultado e mantenha o endpoint indisponível até aplicar a migração e configurar as variáveis do Vercel.

## Verificação manual após deploy

1. Abra Direito, Tecnologia e Inteligência Artificial; no carregamento inicial, o frontend consulta apenas a view `questions_public`, que não contém `correct` nem `explanation_*`.
2. Antes de confirmar, verifique que a resposta não está em memória da página, localStorage ou sessionStorage. As chaves de cache antigas e o progresso legado são removidos.
3. Confirme uma alternativa: deve ocorrer um `POST /api/questions/answer`, seguido da correção e explicações.
4. Teste o endpoint sem token (401), método diferente de POST (405), alternativa inválida (400) e ID inexistente (404).
5. Consulte diretamente as colunas `correct` e `explanation_a` a `explanation_d` com `anon` e `authenticated`; o Supabase deve negar a consulta.
6. Recarregue uma sessão em andamento; ela deve ser reconstruída pelos IDs sem guardar gabarito no storage.

F12/DevTools não é a vulnerabilidade: tudo que o servidor envia ao navegador pode ser inspecionado. A proteção consiste em não enviar o gabarito até o pedido de correção.
