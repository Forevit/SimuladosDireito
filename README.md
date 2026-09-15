# ⚖️ Simulados da Luiza

> Um cantinho de estudos feito especialmente para a Luiza. ❤️

Site de simulados jurídicos desenvolvido para auxiliar nos estudos para a **OAB**, com questões organizadas por matéria, sorteio de perguntas e explicações após cada resposta.

🌐 **Acesse:** https://luiza.eduardoferreira.space/

---

## ✨ Funcionalidades

* 📚 Simulados separados por matéria
* 🎲 Questões sorteadas a cada rodada
* 📝 10 questões por simulado
* ⚖️ Desafio Diário com 5 questões difíceis
* 📅 Controle de um desafio diário por usuário
* ✅ Correção imediata das respostas
* 💡 Explicação das alternativas
* 📊 Resultado com percentual de aproveitamento
* ❤️ Mensagem especial ao acertar 5/5 no desafio diário
* 📱 Interface responsiva para celular e desktop
* 🌙 Interface moderna em dark mode
* 🔐 Identificação anônima dos usuários através do Supabase

---

## 📚 Matérias

O banco de questões atualmente contempla:

* Direito Civil
* Processo Civil
* Direito Penal
* Processo Penal
* Direito do Trabalho
* Direito Empresarial
* Direito Ambiental
* Oratória Jurídica

---

## 🧠 Como funciona

### Simulado por matéria

Ao escolher uma matéria, o sistema:

1. Consulta as questões disponíveis.
2. Sorteia uma combinação de questões.
3. Apresenta uma questão por vez.
4. Corrige a resposta imediatamente.
5. Mostra a explicação da alternativa.
6. Apresenta o resultado ao final.

Cada nova tentativa pode gerar uma combinação diferente de questões.

### ⚡ Desafio Diário

O Desafio Diário possui uma dinâmica especial:

* 5 questões;
* somente questões difíceis;
* questões selecionadas entre todas as matérias;
* uma tentativa por usuário a cada dia;
* resultado armazenado no banco;
* mensagem especial quando o resultado é **5/5**.

---

## 🛠️ Tecnologias

| Tecnologia | Utilização                    |
| ---------- | ----------------------------- |
| HTML5      | Estrutura da aplicação        |
| CSS3       | Interface e responsividade    |
| JavaScript | Lógica do quiz                |
| Supabase   | Banco de dados e autenticação |
| PostgreSQL | Armazenamento das questões    |
| Vercel     | Hospedagem                    |
| Cloudflare | DNS e domínio                 |

### Interface

A identidade visual utiliza como referência o portfólio do Eduardo Ferreira, mantendo uma estética moderna baseada em:

* Dark mode
* Glassmorphism
* Gradientes
* Azul `#38bdf8`
* Indigo `#818cf8`
* Verde `#34d399`
* Fundo `#050a1a`
* **Space Grotesk**
* **JetBrains Mono**

---

## 🔐 Segurança

O projeto utiliza o **Supabase Anonymous Auth** para identificar cada visitante sem exigir cadastro ou senha.

A identidade criada pelo Supabase é utilizada para controlar o Desafio Diário.

### Boas práticas utilizadas

* Não utilizar `service_role` no frontend
* Não expor senha do banco
* Não expor JWT Secret
* Utilizar somente a chave pública do Supabase no cliente
* Consultar somente as colunas necessárias
* Validar matérias e alternativas
* Escapar conteúdo antes de inseri-lo no HTML
* Utilizar RLS no Supabase para proteção dos dados

> As regras de segurança do banco devem ser mantidas e revisadas diretamente no projeto Supabase.

---

## 🗄️ Banco de dados

### `questions`

Tabela responsável pelo banco de questões.

```text
questions
├── id
├── subject
├── statement
├── option_a
├── option_b
├── option_c
├── option_d
├── correct
├── explanation_a
├── explanation_b
├── explanation_c
├── explanation_d
├── difficulty
└── created_at
```

### `daily_attempts`

Responsável pelo controle do Desafio Diário.

```text
daily_attempts
├── id
├── user_id
├── attempt_date
├── score
├── completed
├── message_shown
└── created_at
```

A combinação:

```text
user_id + attempt_date
```

garante que cada usuário tenha um único desafio diário registrado por data.

---

## 🚀 Executando localmente

Clone o repositório:

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

Como o projeto utiliza HTML, CSS e JavaScript, pode ser executado com qualquer servidor HTTP local.

Com Python:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

> Evite abrir o arquivo diretamente com `file://`, principalmente por causa da comunicação com o Supabase.

---

## ☁️ Deploy

O projeto utiliza:

```text
GitHub
   ↓
Vercel
   ↓
Cloudflare
   ↓
luiza.eduardoferreira.space
```

### Fluxo de publicação

1. Alterar o código localmente.
2. Fazer commit.
3. Enviar para o GitHub.
4. A Vercel detecta a alteração.
5. A nova versão é publicada automaticamente.

---

## 🌐 Produção

**Site:**

https://luiza.eduardoferreira.space/

**Repositório:**

`GitHub → repositório privado/público do projeto`

**Hospedagem:**

Vercel

**DNS:**

Cloudflare

---

## 🎨 Favicon

O site utiliza o mesmo conjunto de identidade do portfólio do Eduardo Ferreira.

Arquivos esperados:

```text
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
site.webmanifest
```

---

## ❤️ Uma parte importante

Esse projeto não foi criado apenas como mais um site de questões.

A ideia é ser um pequeno espaço de estudos feito especialmente para a Luiza — com uma experiência mais leve, personalizada e, principalmente, com algumas surpresas no caminho. ⚖️❤️

---

## ⚠️ Aviso

Este projeto é **pessoal e educacional**.

As questões são organizadas com inspiração no estilo de preparação para a OAB/FGV.

O projeto **não possui vínculo oficial com a OAB ou com a FGV**.

---

## 👨‍💻 Desenvolvimento

Desenvolvido por **Eduardo Ferreira**.

Made with code, infrastructure and ❤️.
