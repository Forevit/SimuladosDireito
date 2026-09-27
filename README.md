# Luiza — Plataforma de Estudos

> Um espaço de estudos feito especialmente para a Luiza. ❤️

Plataforma educacional em português do Brasil com atividades de **Direito**, **Tecnologia** e **Inteligência Artificial**. O site reúne questões, simulados e desafios para praticar conteúdos no próprio ritmo.

- **Site:** [luiza.eduardoferreira.space](https://luiza.eduardoferreira.space/)
- **Desenvolvimento:** [Eduardo Ferreira](https://eduardoferreira.space/)
- **Contato:** contato@eduardoferreira.space

## Áreas

| Caminho | Conteúdo |
| --- | --- |
| `/` | Apresentação da plataforma, escolha da área, informações e contato |
| `/direito/` | Questões por matéria, simulados e desafio diário de Direito |
| `/tecnologia/` | Questões por tema e desafio diário de Tecnologia |
| `/inteligencia-artificial/` | Questões por tópico e desafio diário de Inteligência Artificial |

### Tecnologia

As questões são agrupadas por assunto usando o valor `subject`. As chaves recomendadas são `redes`, `infraestrutura`, `seguranca`, `sistemas_operacionais`, `linux`, `windows`, `virtualizacao`, `cloud`, `banco_de_dados`, `programacao`, `devops` e `hardware`. A interface também tenta reconhecer os nomes exibidos desses temas.

### Inteligência Artificial

A área de **Inteligência Artificial** usa a matéria cadastrada no Supabase e as relações `subjects` e `topics` (`questions.subject_id` e `questions.topic_id`). Seus tópicos e questões são carregados do banco; tópicos sem questões mostram um estado vazio próprio até receberem conteúdo.

Uma sessão de tema sorteia até 10 questões. Os desafios diários de Tecnologia e Inteligência Artificial precisam de pelo menos 5 questões difíceis e salvam o resultado no navegador, naquele dispositivo. O desafio diário de Direito é registrado no Supabase e limitado por usuário e data.

## Funcionalidades

- Simulados com seleção aleatória de questões e explicações das alternativas.
- Áreas separadas para Direito, Tecnologia e Inteligência Artificial.
- Desafios diários com cinco questões difíceis.
- Temas claro e escuro, com preferência salva entre as páginas.
- Layout adaptado para celular e desktop.
- Acesso às atividades sem criar uma conta com senha; a aplicação usa autenticação anônima do Supabase para as operações que precisam de identificação.
- Progresso de sessões em andamento, histórico, estatísticas, sequência de estudos e conquistas salvos localmente no navegador.
- Recomendações de matérias e tópicos baseadas nas respostas de sessões concluídas no próprio navegador.
- A Home consulta o número atual de questões, matérias e tópicos e indica quando cada desafio diário tem questões suficientes.

O histórico local não é sincronizado entre dispositivos e pode ser apagado ao limpar os dados do navegador. Sessões incompletas podem ser retomadas no mesmo dispositivo.

## Tecnologias e serviços

- HTML, CSS e JavaScript sem framework de interface.
- Supabase Auth e banco PostgreSQL para questões e tentativas de Direito.
- Vercel para hospedagem e Cloudflare para DNS.
- Fontes DM Sans, Space Grotesk e IBM Plex Mono.

## Executar localmente

Clone o repositório e inicie um servidor HTTP na pasta do projeto:

```bash
git clone https://github.com/Forevit/SimuladosDireito.git
cd SimuladosDireito
python -m http.server 8000
```

Depois abra <http://localhost:8000>. A comunicação com o Supabase requer conexão com a internet. Não abra o arquivo diretamente com `file://`.

## Arquivos de descoberta e indexação

- [`robots.txt`](./robots.txt) informa aos rastreadores que o site pode ser visitado e aponta para o sitemap.
- [`sitemap.xml`](./sitemap.xml) lista as URLs canônicas da Home e das áreas.
- [`llms.txt`](./llms.txt) apresenta as páginas e informações principais em Markdown.
- [`humans.txt`](./humans.txt) registra créditos, contato e tecnologias.
- [`site.webmanifest`](./site.webmanifest) descreve o nome, ícones e cores do site para navegadores.

Depois do deploy, o sitemap pode ser enviado no Google Search Console para facilitar a descoberta das páginas. Isso não garante indexação: os mecanismos de busca decidem quais páginas rastrear e incluir nos resultados.

## Dados e privacidade

A tabela `questions` contém enunciados, alternativas, respostas, explicações e dificuldade. O desafio diário de Direito usa a tabela `daily_attempts`. As questões aparecem dinamicamente conforme o conteúdo cadastrado no Supabase; por isso, os assuntos e quantidades disponíveis podem mudar.

## Segurança

O arquivo [`vercel.json`](./vercel.json) configura cabeçalhos HTTP de segurança para as páginas publicadas. A auditoria somente de leitura [`supabase/security_audit.sql`](./supabase/security_audit.sql) lista o estado de RLS, políticas, privilégios, ACLs e definições das funções no schema `public`; revise os resultados antes de mudar regras no banco. A auditoria de conteúdo [`supabase/content_audit.sql`](./supabase/content_audit.sql) procura duplicidades, campos incompletos, distribuição de dificuldade e disponibilidade dos desafios, sem alterar registros. A chave publishable do Supabase aparece no JavaScript do navegador por projeto: ela não é uma senha e só é segura com RLS e privilégios mínimos configurados corretamente. Nunca coloque chaves `secret` ou `service_role` no site.

O gabarito é consultado somente pelo endpoint server-side [`api/questions/answer.js`](./api/questions/answer.js), depois da confirmação. Antes disso, o frontend carrega apenas enunciados e alternativas e persiste IDs/resultados mínimos. Para ativar em um deploy novo, configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do Vercel e execute [`supabase/question-answer-security.sql`](./supabase/question-answer-security.sql) no Supabase. Consulte [`docs/security-question-answer.md`](./docs/security-question-answer.md) para o fluxo e as verificações.

O projeto é educacional e independente. Não possui vínculo oficial com a OAB ou com a FGV. As questões voltadas ao Direito são apresentadas como prática para estudos, não como orientação jurídica.

## Desenvolvimento

Feito por Eduardo Ferreira com código, infraestrutura e ❤️ para a Luiza.

A Google tag ainda não está configurada porque o projeto não tem um identificador do Google Analytics ou do Google Tag Manager.
