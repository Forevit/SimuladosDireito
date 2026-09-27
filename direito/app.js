/* ====================== CONFIG SUPABASE ====================== */
const SUPABASE_URL = "https://ftzmtjlhtmnjsjnkmgvc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw";

const BANK_AREA_KEY = document.body.dataset.area || "law";
let sb = null;
if(typeof window.supabase?.createClient === "function"){
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
}

let lastLoadError = null;
let currentUser = null;

const SUBJECT_LABELS = {
  civil: "Direito Civil",
  processo_civil: "Processo Civil",
  penal: "Prática Penal",
  processo_penal: "Processo Penal",
  trabalhista: "Prática Trabalhista",
  empresarial: "Direito Empresarial",
  ambiental: "Direito Ambiental",
  oratoria: "Oratória Jurídica"
};

/* Mensagens fofas — sorteada quando ela zera o Desafio Diário (5/5) */
const CUTE_MESSAGES = [
  "5/5. Meu amor é oficialmente mais inteligente que eu. ❤️",
  "Gabaritou! A futura doutora não decepciona. 🥹❤️",
  "5/5. Orgulho da minha futura advogada. ⚖️❤️",
  "Acertou tudo. Agora vem cá ganhar seu prêmio: um beijo. 😘",
  "5/5. Além de linda, ainda sabe das coisas. Difícil competir. ❤️",
  "Gabaritou! Eu já sabia que você era incrível. 🥰",
  "5/5. Tá explicado por que eu sou tão apaixonado. ❤️",
  "Mais uma vez, você provando que é fora da curva. 💛",
  "5/5. A inteligência e a beleza resolveram morar na mesma pessoa. 😌❤️",
  "Gabaritou. A OAB que lute. ⚖️🔥",
  "5/5. Doutora, posso ser seu cliente favorito? 👀❤️",
  "Acertou tudo! Sabia que meu orgulho não cabia nesse site. 🥹",
  "5/5. Meu amor é oficialmente uma máquina de acertar questões. ❤️",
  "Gabaritou de novo. Assim você me deixa ainda mais apaixonado. 🥰",
  "5/5. Linda, inteligente e ainda é minha. Dei sorte demais. ❤️",
  "Você acertou tudo. Eu continuo errando uma coisa: como consegui alguém tão incrível? ❤️",
  "5/5. Caso encerrado: você é perfeita. ⚖️❤️",
  "Veredito final: absolutamente maravilhosa. ❤️",
  "5/5. Sentença: você merece muitos beijinhos. 😘",
  "Gabaritou! Recurso negado para qualquer pessoa que diga o contrário: você é incrível. ❤️",
  "5/5. Provas suficientes: eu te amo muito. ❤️⚖️",
  "Caso encerrado. A futura doutora venceu mais uma. 🥰",
  "5/5. Excelência, posso pedir um abraço? ❤️",
  "Acertou tudo. Pena que não existe questão sobre o quanto eu te amo. 🥹❤️",
  "5/5. Você ganha o quiz e eu ganho o privilégio de te amar. ❤️",
  "Gabaritou. E eu aqui, todo bobo, admirando você. 🥰",
  "5/5. Mais uma vitória pra conta da minha garota. ❤️",
  "Veredito: inteligente demais e linda demais. ❤️",
  "5/5. A banca tentou, mas não foi dessa vez. 😌⚖️",
  "Gabaritou! Agora oficialmente não tenho argumentos contra você. 😂❤️",
  "5/5. Eu já sabia que você ia conseguir. Tenho fé na minha futura doutora. ❤️",
  "Questões: 5. Você: 5. Eu: completamente apaixonado. ❤️",
  "5/5. Mais uma prova de que eu escolhi a mulher certa. ❤️",
  "Acertou tudo. Agora pode cobrar seu pagamento em beijos. 😘",
  "5/5. Parabéns, amor. Você é simplesmente incrível. ❤️",
  "Gabaritou! Meu coração também já foi gabaritado por você. 🥹❤️",
  "5/5. A futura advogada tá impossível hoje. 😮‍💨❤️",
  "Decisão unânime: você é maravilhosa. ❤️",
  "5/5. Recurso inexistente. Você simplesmente arrasou. ⚖️❤️",
  "Fim de jogo: 5/5 e um namorado completamente apaixonado. ❤️",
  "Você acertou as 5. Mas quem ganhou fui eu quando te encontrei. ❤️",
  "5/5. E ainda assim, a melhor coisa que você já acertou foi me escolher. 🥹❤️",
  "Você pode até ter acertado as questões, mas foi eu quem acertou escolhendo você. ❤️",
  "5/5. Agora chega de prova. Vem receber seu beijo. 😘",
  "Parabéns, amor. Eu tenho muito orgulho de você. ❤️",
  "Mais uma vez você conseguiu. E eu vou estar aqui, sempre torcendo por você. ❤️",
  "5/5. Que sorte a minha poder acompanhar você conquistando seus sonhos. 🥹❤️",
  "Você gabaritou. Eu só queria aproveitar pra dizer: te amo. ❤️",
  "Meu resultado favorito sempre vai ser você. ❤️",
  "5/5. Agora vem cá, futura doutora. Tenho uma surpresa pra você. ❤️"
];

/* ====================== ESTADO GLOBAL ====================== */
let ALL_QUESTIONS = [];
let BANK_BY_SUBJECT = {};
let dailyStatusToday = null;
let lastRenderedScreen = null;
let lastRenderedQuestionIndex = null;

let state = {
  screen: "loading",
  subjectKey: null,
  roundQuestions: [],
  currentIndex: 0,
  answered: false,
  selectedOption: null,
  score: 0,
  isDaily: false,
  dailyMessage: null
};

/* ====================== HELPERS ====================== */
function esc(str){
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

function shuffle(array){
  const arr = array.slice();
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashStringToInt(str){
  let hash = 0;
  for(let i = 0; i < str.length; i++){
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function mulberry32(seed){
  let a = seed;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seedStr){
  const rand = mulberry32(hashStringToInt(seedStr));
  const arr = array.slice();
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function todayStr(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickRandomQuestions(subjectKey, count){
  const bank = BANK_BY_SUBJECT[subjectKey] || [];
  const n = Math.min(count, bank.length);
  return shuffle(bank).slice(0, n);
}

async function fetchQuestionRows(){
  const cacheKey = `luiza-question-bank-v1-${BANK_AREA_KEY}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if(cached && Date.now() - cached.savedAt < 60_000 && Array.isArray(cached.rows)) return cached.rows;
  } catch(_){ /* Storage can be disabled; fetch directly. */ }

  const subjectKeys = Object.keys(SUBJECT_LABELS);
  const subjectAliases = BANK_AREA_KEY === "technology" ? ["seguranca_da_informacao"] : [];
  const { data, error } = await sb
    .from("questions")
    .select("id,subject,statement,option_a,option_b,option_c,option_d,correct,explanation_a,explanation_b,explanation_c,explanation_d,difficulty")
    .in("subject", [...subjectKeys, ...subjectAliases]);
  if(error) throw error;

  const rows = data || [];
  try { sessionStorage.setItem(cacheKey, JSON.stringify({savedAt:Date.now(),rows})); } catch(_){ /* Cache is optional. */ }
  return rows;
}

function getDailyQuestions(){
  const pool = ALL_QUESTIONS.filter(q => q.difficulty === "dificil");
  const shuffled = seededShuffle(pool, todayStr());
  return shuffled.slice(0, 5);
}

function pickCuteMessage(){
  return CUTE_MESSAGES[Math.floor(Math.random() * CUTE_MESSAGES.length)];
}

function getSafeErrorMessage(err){
  if(err?.code === "23505") return "O desafio de hoje já foi registrado.";
  if(!sb) return "O componente de conexão não carregou. Confira a internet e recarregue a página.";
  if(!navigator.onLine || /failed to fetch|networkerror|network request failed|timeout/i.test(String(err?.message || ""))) return "Sem conexão com o servidor agora. Confira sua internet e tente novamente.";
  if(err?.message?.toLowerCase().includes("anonymous")) return "Não consegui iniciar sua sessão. O acesso anônimo precisa estar ativo no serviço de estudos.";
  if(err?.code === "42501" || err?.status === 403) return "O banco recusou o acesso às questões. Tente novamente mais tarde.";
  if(err?.code === "42P01" || err?.code === "PGRST205") return "O banco de questões está indisponível no momento. Tente novamente mais tarde.";
  return "Não foi possível concluir esta operação agora. Tente novamente.";
}

/* ====================== AUTENTICAÇÃO ANÔNIMA ======================
   Cada navegador recebe uma identidade própria do Supabase Auth.
   Isso é melhor que IP/cookie criado manualmente porque o Supabase
   entrega um UUID + JWT que o RLS consegue validar com auth.uid().
=================================================================== */
async function ensureAnonymousSession(){
  const { data: sessionData, error: sessionError } = await sb.auth.getSession();
  if(sessionError) throw sessionError;

  if(sessionData.session?.user){
    currentUser = sessionData.session.user;
    return currentUser;
  }

  const { data, error } = await sb.auth.signInAnonymously();
  if(error) throw error;
  if(!data.user) throw new Error("Sessão anônima não criada.");

  currentUser = data.user;
  return currentUser;
}

/* ====================== CARREGAMENTO ====================== */
async function loadEverything(){
  if(!sb){
    lastLoadError = getSafeErrorMessage(new Error("Supabase client unavailable"));
    state.screen = "error";
    render();
    return;
  }
  state.screen = "loading";
  lastLoadError = null;
  render();

  try {
    await ensureAnonymousSession();

    /* Nunca mais usamos select("*"). Apenas as colunas que o site realmente usa. */
    const questions = await fetchQuestionRows();

    ALL_QUESTIONS = (questions || []).map(row => ({
      id: row.id,
      subject: row.subject,
      statement: row.statement,
      options: {
        A: row.option_a,
        B: row.option_b,
        C: row.option_c,
        D: row.option_d
      },
      correct: row.correct,
      explanations: {
        A: row.explanation_a,
        B: row.explanation_b,
        C: row.explanation_c,
        D: row.explanation_d
      },
      difficulty: row.difficulty
    }));

    BANK_BY_SUBJECT = {};
    ALL_QUESTIONS.forEach(q => {
      if(!BANK_BY_SUBJECT[q.subject]) BANK_BY_SUBJECT[q.subject] = [];
      BANK_BY_SUBJECT[q.subject].push(q);
    });

    const { data: dailyRow, error: dErr } = await sb
      .from("daily_attempts")
      .select("id,attempt_date,score,completed,message_shown,created_at")
      .eq("attempt_date", todayStr())
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if(dErr) throw dErr;
    dailyStatusToday = dailyRow || null;

    state.screen = "home";
    render();
  } catch(err){
    console.error("Falha ao carregar o aplicativo:", err);
    lastLoadError = getSafeErrorMessage(err);
    state.screen = "error";
    render();
  }
}

/* ====================== AÇÕES ====================== */
function startQuiz(subjectKey){
  if(!Object.prototype.hasOwnProperty.call(SUBJECT_LABELS, subjectKey)) return;

  state.screen = "quiz";
  state.subjectKey = subjectKey;
  state.roundQuestions = pickRandomQuestions(subjectKey, 10);
  state.currentIndex = 0;
  state.answered = false;
  state.selectedOption = null;
  state.confirmedAnswer = false;
  state.score = 0;
  state.isDaily = false;
  state.dailyMessage = null;
  render();
  document.querySelector(".question-card .statement")?.focus();
}

function startDaily(){
  if(!currentUser) return;
  if(dailyStatusToday?.completed) return;

  const dailyQuestions = getDailyQuestions();
  if(dailyQuestions.length < 5){
    lastLoadError = "Ainda não existem 5 questões difíceis disponíveis para o desafio de hoje.";
    state.screen = "error";
    render();
    return;
  }

  state.screen = "daily-quiz";
  state.roundQuestions = dailyQuestions;
  state.currentIndex = 0;
  state.answered = false;
  state.selectedOption = null;
  state.confirmedAnswer = false;
  state.score = 0;
  state.isDaily = true;
  state.dailyMessage = null;
  render();
  document.querySelector(".question-card .statement")?.focus();
}

function selectOption(letter){
  if(state.confirmedAnswer) return;
  if(!["A","B","C","D"].includes(letter)) return;

  // Apenas seleciona. A resposta só é avaliada após a confirmação.
  state.selectedOption = letter;
  state.answered = true;
  render();
  document.querySelector(`[data-option="${letter}"]`)?.focus({preventScroll:true});
}

function confirmAnswer(){
  if(!state.answered || state.confirmedAnswer) return;
  const q = state.roundQuestions[state.currentIndex];
  if(!q) return;
  state.confirmedAnswer = true;
  if(state.selectedOption === q.correct) state.score++;
  render();
  document.getElementById("next-question")?.focus();
}

async function nextQuestion(){
  if(!state.confirmedAnswer) return;

  if(state.currentIndex < state.roundQuestions.length - 1){
    state.currentIndex++;
    state.answered = false;
    state.selectedOption = null;
    state.confirmedAnswer = false;
    render();
    document.querySelector(".question-card .statement")?.focus();
    return;
  }

  if(state.isDaily){
    let message = null;
    if(state.score === state.roundQuestions.length){
      message = pickCuteMessage();
    }
    state.dailyMessage = message;

    try {
      const payload = {
        user_id: currentUser.id,
        attempt_date: todayStr(),
        score: state.score,
        completed: true,
        message_shown: message
      };

      const { data, error } = await sb
        .from("daily_attempts")
        .upsert(payload, { onConflict: "user_id,attempt_date" })
        .select("id,attempt_date,score,completed,message_shown,created_at")
        .single();

      if(error) throw error;
      dailyStatusToday = data;
    } catch(err){
      console.error("Falha ao registrar o daily:", err);
      lastLoadError = getSafeErrorMessage(err);
      state.screen = "error";
      render();
      return;
    }

    state.screen = "daily-result";
    render();
    document.querySelector(".result-wrap")?.focus();
  } else {
    state.screen = "result";
    render();
    document.querySelector(".result-wrap")?.focus();
  }
}

function goHome(){
  state = {
    screen: "home",
    subjectKey: null,
    roundQuestions: [],
    currentIndex: 0,
    answered: false,
    selectedOption: null,
    confirmedAnswer: false,
    score: 0,
    isDaily: false,
    dailyMessage: null
  };
  render();
  document.getElementById("header-title")?.focus();
}

function retrySameSubject(){
  if(state.subjectKey) startQuiz(state.subjectKey);
}

/* ====================== RENDER ====================== */
function renderHeader(){
  const titleEl = document.getElementById("header-title");
  const inner = document.getElementById("header-inner");

  let backHtml = "";
  if(state.screen !== "home" && state.screen !== "loading" && state.screen !== "error"){
    backHtml = `<button type="button" class="back-link" data-action="home">&larr; voltar às matérias</button>`;
  }

  if(state.screen === "loading"){
    inner.innerHTML = `<p class="kicker">ESTUDOS EM DIREITO</p><h1>Carregando questões…</h1>`;
  } else if(state.screen === "error"){
    inner.innerHTML = `<p class="kicker">ESTUDOS EM DIREITO</p><h1>Não consegui carregar</h1>`;
  } else if(state.screen === "home"){
    inner.innerHTML = `
      <p class="kicker">PREPARAÇÃO PARA OAB · FGV</p>
      <h1>Escolha a matéria</h1>
      <p class="sub">Pratique com questões jurídicas por matéria. Selecione uma alternativa, confirme sua resposta e veja as explicações para aprender com cada rodada.</p>
    `;
  } else if(state.screen === "quiz"){
    inner.innerHTML = `${backHtml}<p class="kicker">${esc(SUBJECT_LABELS[state.subjectKey].toUpperCase())}</p><h1>Simulado em andamento</h1>`;
  } else if(state.screen === "result"){
    inner.innerHTML = `${backHtml}<p class="kicker">${esc(SUBJECT_LABELS[state.subjectKey].toUpperCase())}</p><h1>Resultado do simulado</h1>`;
  } else if(state.screen === "daily-quiz"){
    inner.innerHTML = `${backHtml}<p class="kicker">DESAFIO DIÁRIO — ${esc(todayStr())}</p><h1>5 questões difíceis de hoje</h1>`;
  } else if(state.screen === "daily-result"){
    inner.innerHTML = `${backHtml}<p class="kicker">DESAFIO DIÁRIO — ${esc(todayStr())}</p><h1>Resultado de hoje</h1>`;
  }
  const heading = inner.querySelector("h1");
  if(heading){ heading.id = "header-title"; heading.tabIndex = -1; }
}

function renderLoading(){
  document.getElementById("main").innerHTML = `<p class="center-note" role="status" aria-live="polite">Conectando ao banco de questões…</p>`;
}

function renderError(){
  document.getElementById("main").innerHTML = `
    <section class="state-message" role="alert" aria-live="assertive">
      <h2>Não consegui carregar</h2>
      <p>${esc(lastLoadError || "Não foi possível carregar as questões agora. Confira sua conexão e tente novamente.")}</p>
      <br><br>
      <button type="button" class="primary retry" data-action="${sb ? "retry" : "reload"}">${sb ? "Tentar novamente" : "Recarregar página"}</button>
    </section>
  `;
}

function renderDailyCard(){
  const total = 5;
  const availableQuestions = getDailyQuestions().length;
  if(dailyStatusToday?.completed){
    const score = Number.isInteger(dailyStatusToday.score) ? dailyStatusToday.score : 0;
    const perfect = score === total;
    return `
      <div class="daily-card">
        <p class="kicker">DESAFIO DIÁRIO — ${esc(todayStr())}</p>
        <h2>Você já jogou hoje</h2>
        <div class="done-row">
          <span class="done-score">${score}/${total}</span>
          <span style="font-size:13.5px;color:#cdd6e4;">Volte amanhã pra um novo desafio.</span>
        </div>
        ${perfect && dailyStatusToday.message_shown ? `<div class="done-msg">${esc(dailyStatusToday.message_shown)}</div>` : ""}
      </div>
    `;
  }
  return `
    <div class="daily-card">
      <p class="kicker">DESAFIO DIÁRIO — ${esc(todayStr())}</p>
      <h2>5 questões difíceis, sorteadas entre todas as matérias</h2>
      <p class="desc">O mesmo desafio vale para você durante o dia. Acerte as 5 e algo especial aparece no final.</p>
      ${availableQuestions < total ? `<p class="daily-availability" id="daily-availability">O desafio precisa de pelo menos 5 questões difíceis. Disponíveis: ${availableQuestions}/${total}.</p>` : ""}
      <button type="button" class="primary rose" data-action="daily" ${availableQuestions < total ? 'disabled aria-describedby="daily-availability"' : ""}>Começar desafio de hoje &rarr;</button>
    </div>
  `;
}

function renderHome(){
  const main = document.getElementById("main");
  const keys = Object.keys(SUBJECT_LABELS).filter(k => BANK_BY_SUBJECT[k] && BANK_BY_SUBJECT[k].length);
  let rows = keys.map((key, i) => {
    const label = SUBJECT_LABELS[key];
    const count = BANK_BY_SUBJECT[key].length;
    const num = String(i + 1).padStart(2, "0");
    return `
      <button type="button" class="subject-row" data-subject="${esc(key)}">
        <span class="num">${num}</span>
        <span class="title">${esc(label)}</span>
        <span class="meta">${count} no banco</span>
        <span class="arrow">&rarr;</span>
      </button>
    `;
  }).join("");

  const emptyState = !keys.length ? `<section class="empty-state" role="status" aria-live="polite"><h2>O banco desta área está vazio</h2><p>Assim que as questões forem cadastradas, as matérias aparecerão aqui para você começar a praticar.</p></section>` : "";

  main.innerHTML = `
    ${renderDailyCard()}
    <p class="intro-note">Cada simulado sorteia 10 questões do banco daquela matéria. Escolha uma alternativa e confirme quando tiver certeza. Só depois da confirmação o site revela o resultado e a explicação.</p>
    ${emptyState}
    <div class="subject-grid">${rows}</div>
  `;

  main.querySelectorAll("[data-subject]").forEach(button => {
    button.addEventListener("click", () => startQuiz(button.dataset.subject));
  });
}

function renderQuizLike(isDaily){
  const main = document.getElementById("main");
  const q = state.roundQuestions[state.currentIndex];
  if(!q) return;

  const total = state.roundQuestions.length;
  const pct = Math.round(((state.currentIndex + 1) / total) * 100);
  const letters = ["A","B","C","D"];

  let optionsHtml = letters.map(letter => {
    let cls = "option";
    if(state.confirmedAnswer){
      cls += " locked";
      if(letter === q.correct) cls += " correct";
      else if(letter === state.selectedOption) cls += " incorrect";
      else cls += " dim";
    } else if(letter === state.selectedOption){
      cls += " selected";
    }

    return `
      <button type="button" class="${cls}" data-option="${letter}" aria-pressed="${state.selectedOption === letter}" ${state.confirmedAnswer ? "disabled" : ""}>
        <span class="letter">${letter}</span>
        <span>${esc(q.options[letter])}</span>
      </button>
    `;
  }).join("");

  let explanationHtml = "";
  if(state.confirmedAnswer){
    const isRight = state.selectedOption === q.correct;
    if(isRight){
      explanationHtml = `<div class="explanation right" role="status" aria-live="polite"><span class="head">Por que está certa</span>${esc(q.explanations[q.correct])}</div>`;
    } else {
      explanationHtml = `
        <div class="explanation wrong" role="status" aria-live="polite"><span class="head">Por que a alternativa ${esc(state.selectedOption)} está errada</span>${esc(q.explanations[state.selectedOption])}</div>
        <div class="explanation right" style="margin-top:12px;" role="status" aria-live="polite"><span class="head">Por que a alternativa ${esc(q.correct)} está certa</span>${esc(q.explanations[q.correct])}</div>
      `;
    }
  }

  const isLast = state.currentIndex === total - 1;

  const confirmHtml = state.selectedOption && !state.confirmedAnswer ? `
    <div class="answer-confirm">
      <p>Você marcou <strong>${esc(state.selectedOption)}</strong>. Quer confirmar sua resposta?</p>
      <button type="button" class="primary ${isDaily ? "rose" : ""}" id="confirm-answer">Confirmar resposta &rarr;</button>
    </div>
  ` : "";

  main.innerHTML = `
    <div class="progress-row">
      <span class="progress-label">${state.currentIndex + 1} / ${total}</span>
      <div class="progress-track" role="progressbar" aria-label="Progresso das questões" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${state.currentIndex + 1}" aria-valuetext="Questão ${state.currentIndex + 1} de ${total}"><div class="progress-fill ${isDaily ? "rose" : ""}" style="width:${pct}%"></div></div>
      <span class="progress-label">${state.score} acertos</span>
    </div>
    <div class="question-card ${isDaily ? "daily" : ""}">
      <p class="art-label">QUESTÃO ${state.currentIndex + 1}${isDaily ? `<span class="subject-badge">${esc(SUBJECT_LABELS[q.subject] || q.subject)}</span>` : ""}</p>
      <p class="statement" tabindex="-1" aria-live="polite" aria-atomic="true">${esc(q.statement)}</p>
    </div>
    <div class="options" role="group" aria-label="Alternativas da questão">${optionsHtml}</div>
    ${confirmHtml}
    ${explanationHtml}
    ${state.confirmedAnswer ? `
      <div class="next-row">
        <button type="button" class="primary ${isDaily ? "rose" : ""}" id="next-question">${isLast ? "Ver resultado final" : "Próxima questão"} &rarr;</button>
      </div>
    ` : ""}
  `;

  main.querySelectorAll("[data-option]").forEach(button => {
    button.addEventListener("click", () => selectOption(button.dataset.option));
  });

  const nextButton = document.getElementById("next-question");
  if(nextButton) nextButton.addEventListener("click", nextQuestion);
}

function renderResult(){
  const main = document.getElementById("main");
  const total = state.roundQuestions.length;
  const pct = total ? Math.round((state.score / total) * 100) : 0;

  let msg;
  if(pct >= 80) msg = "Excelente domínio da matéria — esse desempenho já está no nível de aprovação.";
  else if(pct >= 60) msg = "Bom resultado. Vale revisar os pontos que geraram dúvida e repetir o simulado.";
  else msg = "Ainda dá pra melhorar bastante. Recomendo revisar a matéria e tentar de novo — os erros de agora viram acerto na próxima rodada.";

  main.innerHTML = `
    <div class="result-wrap" tabindex="-1">
      <p class="result-label">DESEMPENHO NESTA RODADA</p>
      <p class="result-score">${state.score}<span>/${total}</span></p>
      <p class="result-label">${pct}% DE APROVEITAMENTO</p>
      <p class="result-msg">${esc(msg)}</p>
      <div class="result-actions">
        <button type="button" class="primary" id="retry-subject">Refazer este simulado &rarr;</button>
        <button type="button" class="ghost" id="choose-subject">Escolher outra matéria</button>
      </div>
    </div>
  `;

  document.getElementById("retry-subject").addEventListener("click", retrySameSubject);
  document.getElementById("choose-subject").addEventListener("click", goHome);
}

function renderDailyResult(){
  const main = document.getElementById("main");
  const total = state.roundQuestions.length;
  const perfect = state.score === total;

  main.innerHTML = `
    <div class="result-wrap" tabindex="-1">
      <p class="result-label">DESAFIO DIÁRIO — ${esc(todayStr())}</p>
      <p class="result-score">${state.score}<span>/${total}</span></p>
      ${perfect ? `<div class="cute-message">${esc(state.dailyMessage)}</div>` : `<p class="result-msg">Quase lá! Amanhã tem um novo desafio — bora tentar de novo.</p>`}
      <div class="result-actions">
        <button type="button" class="ghost" id="back-home">Voltar ao início</button>
      </div>
    </div>
  `;

  document.getElementById("back-home").addEventListener("click", goHome);
}

function bindStaticActions(){
  document.querySelectorAll('[data-action="home"]').forEach(el => {
    el.addEventListener("click", goHome);
  });
  document.querySelectorAll('[data-action="retry"]').forEach(el => {
    el.addEventListener("click", loadEverything);
  });
  document.querySelectorAll('[data-action="reload"]').forEach(el => {
    el.addEventListener("click", () => window.location.reload());
  });
  document.querySelectorAll('[data-action="daily"]').forEach(el => {
    el.addEventListener("click", startDaily);
  });
}

function render(){
  const main = document.getElementById("main");
  main.setAttribute("aria-busy", String(state.screen === "loading"));
  renderHeader();
  if(state.screen === "loading") renderLoading();
  else if(state.screen === "error") renderError();
  else if(state.screen === "home") renderHome();
  else if(state.screen === "quiz") renderQuizLike(false);
  else if(state.screen === "result") renderResult();
  else if(state.screen === "daily-quiz") renderQuizLike(true);
  else if(state.screen === "daily-result") renderDailyResult();
  bindStaticActions();
  if(lastRenderedScreen !== state.screen || lastRenderedQuestionIndex !== state.currentIndex){
    window.scrollTo({top: 0, behavior: "auto"});
  }
  lastRenderedScreen = state.screen;
  lastRenderedQuestionIndex = state.currentIndex;
}

/* Se a sessão expirar, recarrega a identidade antes da próxima operação. */
if(sb) sb.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
});

document.getElementById("main").addEventListener("click", (event) => {
  if(event.target.closest("#confirm-answer")) confirmAnswer();
});

if(sb) loadEverything();
else {
  lastLoadError = getSafeErrorMessage(new Error("Supabase client unavailable"));
  state.screen = "error";
  render();
}
