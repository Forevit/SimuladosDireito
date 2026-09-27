/* ====================== CONFIG SUPABASE ====================== */
const SUPABASE_URL = "https://ftzmtjlhtmnjsjnkmgvc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw";

const BANK_AREA_KEY = document.body.dataset.area || "law";
try {
  ["law", "technology", "ai"].forEach(area => {
    sessionStorage.removeItem(`luiza-question-bank-v1-${area}`);
    sessionStorage.removeItem(`luiza-question-bank-v2-${area}`);
    localStorage.removeItem(`luiza-continue-${area}`);
  });
} catch(_){ /* Storage can be disabled. */ }
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
  processo_trabalho: "Processo do Trabalho",
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
  confirmedAnswer: false,
  answerResult: null,
  answerLoading: false,
  answerError: null,
  score: 0,
  isDaily: false,
  dailyMessage: null,
  answers: [],
  isReview: false,
  reviewOrigin: null,
  sessionId: null
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

async function fetchAllRows(queryFactory, pageSize = 500){
  const rows = [];
  for(let from = 0; ; from += pageSize){
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if(error) throw error;
    const page = data || [];
    rows.push(...page);
    if(page.length < pageSize) return rows;
  }
}

async function fetchQuestionRows(){
  const cacheKey = `luiza-question-bank-v2-safe-${BANK_AREA_KEY}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if(cached && Date.now() - cached.savedAt < 60_000 && Array.isArray(cached.rows)) return cached.rows;
  } catch(_){ /* Storage can be disabled; fetch directly. */ }

  const subjectKeys = Object.keys(SUBJECT_LABELS);
  const subjectAliases = BANK_AREA_KEY === "technology" ? ["seguranca_da_informacao"] : [];
  const rows = await fetchAllRows(() => sb
    .from("questions")
    .select("id,subject,statement,option_a,option_b,option_c,option_d,difficulty")
    .in("subject", [...subjectKeys, ...Object.values(SUBJECT_LABELS), ...subjectAliases])
    .order("id", { ascending: true }));
  try { sessionStorage.setItem(cacheKey, JSON.stringify({savedAt:Date.now(),rows})); } catch(_){ /* Cache is optional. */ }
  return rows;
}

function getDailyQuestions(){
  const pool = ALL_QUESTIONS.filter(q => q.difficulty === "dificil");
  const shuffled = seededShuffle(pool, todayStr());
  return shuffled.slice(0, 5);
}

const CONTINUE_KEY = `luiza-continue-v2-safe-${BANK_AREA_KEY}`;

function questionById(id){
  return ALL_QUESTIONS.find(question => String(question.id) === String(id)) || null;
}

function readStudyProgress(){
  try {
    const saved = JSON.parse(localStorage.getItem(CONTINUE_KEY) || "null");
    if(!saved || !Array.isArray(saved.questionIds) || !saved.questionIds.length ||
       !Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= saved.questionIds.length ||
       !Object.prototype.hasOwnProperty.call(SUBJECT_LABELS, saved.subjectKey)) return null;
    const roundQuestions = saved.questionIds.map(questionById);
    if(roundQuestions.some(question => !question)) return null;
    return { ...saved, roundQuestions };
  } catch(_){ return null; }
}

function saveStudyProgress(){
  if(state.screen !== "quiz" || state.isDaily || state.isReview || !state.roundQuestions.length) return;
  try {
    localStorage.setItem(CONTINUE_KEY, JSON.stringify({
      subjectKey: state.subjectKey,
      questionIds: state.roundQuestions.map(question => question.id),
      currentIndex: state.currentIndex,
      selectedOption: state.selectedOption,
      confirmedAnswer: state.confirmedAnswer,
      score: state.score,
      answers: state.answers.map(answer => answer ? { selectedOption: answer.selectedOption, isCorrect: Boolean(answer.isCorrect) } : null),
      sessionId: state.sessionId,
      savedAt: Date.now()
    }));
  } catch(err){ console.warn("Não foi possível salvar o progresso desta sessão:", err); }
}

function clearStudyProgress(){
  try { localStorage.removeItem(CONTINUE_KEY); } catch(_){ /* Storage is optional. */ }
}

function newSessionId(){
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function recordStudySession(type){
  if(!window.LuizaStudyHistory || !state.sessionId || !state.roundQuestions.length) return;
  window.LuizaStudyHistory.record({
    id: state.sessionId,
    date: todayStr(),
    createdAt: Date.now(),
    area: BANK_AREA_KEY,
    content: type === "challenge" ? "Desafio diário" : SUBJECT_LABELS[state.subjectKey] || "Direito",
    subjectKey: state.subjectKey || "",
    type,
    correct: state.score,
    total: state.roundQuestions.length,
    answers: state.answers
  });
}

function getStudyRecommendation(){
  if(!window.LuizaStudyHistory) return null;
  const groups = new Map();
  window.LuizaStudyHistory.read().filter(record => record.area === BANK_AREA_KEY && record.type === "study").forEach(record => {
    const key = record.subjectKey;
    if(!key) return;
    const group = groups.get(key) || { key, label: SUBJECT_LABELS[key] || record.content, correct: 0, total: 0 };
    (record.answers || []).forEach(answer => { group.total++; if(answer.isCorrect) group.correct++; });
    groups.set(key, group);
  });
  return [...groups.values()].filter(group => group.total >= 3 && group.correct / group.total < .7)
    .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total)[0] || null;
}

function resumeStudyProgress(){
  const saved = readStudyProgress();
  if(!saved) return;
  state = {
    ...state,
    screen: "quiz",
    subjectKey: saved.subjectKey,
    roundQuestions: saved.roundQuestions,
    currentIndex: saved.currentIndex,
    selectedOption: saved.selectedOption || null,
    answered: Boolean(saved.selectedOption),
    confirmedAnswer: false,
    answerResult: null,
    answerLoading: Boolean(saved.confirmedAnswer && saved.selectedOption),
    answerError: null,
    score: Number(saved.score) || 0,
    answers: Array.isArray(saved.answers) ? saved.answers : [],
    sessionId: saved.sessionId || newSessionId(),
    isDaily: false,
    isReview: false,
    reviewOrigin: null,
    dailyMessage: null
  };
  render();
  if(saved.confirmedAnswer && saved.selectedOption){
    fetchAnswerResult(saved.roundQuestions[saved.currentIndex].id, saved.selectedOption).then(result => {
      state.answerResult = result;
      state.confirmedAnswer = true;
      state.answerLoading = false;
      state.answerError = null;
      render();
      document.getElementById("next-question")?.focus();
    }).catch(() => {
      state.answerLoading = false;
      state.answerError = "Não consegui recuperar a correção. Confirme novamente para tentar.";
      render();
      document.getElementById("confirm-answer")?.focus();
    });
    return;
  }
  document.querySelector(state.confirmedAnswer ? "#next-question" : ".question-card .statement")?.focus();
}

function normalizeDifficulty(value){
  const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if(normalized.startsWith("fac")) return "facil";
  if(normalized.startsWith("med")) return "medio";
  if(normalized.startsWith("dif")) return "dificil";
  return "outro";
}

function getResultStats(questions = state.roundQuestions, answers = state.answers){
  const correct = answers.filter(answer => answer?.isCorrect).length;
  const incorrect = answers.filter(answer => answer && !answer.isCorrect).length;
  const difficultyRows = [
    ["facil", "Fácil"],
    ["medio", "Média"],
    ["dificil", "Difícil"]
  ].map(([key, label]) => {
    const indices = questions.map((question, index) => normalizeDifficulty(question.difficulty) === key ? index : -1).filter(index => index >= 0);
    const done = indices.filter(index => answers[index]).length;
    const hits = indices.filter(index => answers[index]?.isCorrect).length;
    return `<div class="difficulty-stat"><span>${label}</span><strong>${hits}/${done}</strong></div>`;
  }).join("");
  return { correct, incorrect, difficultyRows };
}

function renderAnswerExplanations(answerResult, selectedOption){
  const letters = ["A", "B", "C", "D"];
  const rows = letters.map(letter => {
    const explanation = answerResult?.explanations?.[letter];
    if(!explanation) return "";
    const status = letter === answerResult?.correct_answer ? "right" : letter === selectedOption ? "wrong" : "";
    const label = letter === answerResult?.correct_answer ? "correta" : letter === selectedOption ? "sua resposta" : "";
    return `<div class="explanation ${status}"><span class="head">Alternativa ${letter}${label ? ` · ${label}` : ""}</span>${esc(explanation)}</div>`;
  }).filter(Boolean).join("");
  return `<section class="explanation-list" aria-label="Explicações das alternativas"><h2>Explicações das alternativas</h2>${rows || '<p class="result-msg">Não há explicações cadastradas para esta questão.</p>'}</section>`;
}

function startReview(){
  const wrongQuestions = state.roundQuestions.filter((_, index) => state.answers[index] && !state.answers[index].isCorrect);
  if(!wrongQuestions.length) return;
  state.reviewOrigin = {
    screen: state.isDaily ? "daily-result" : "result",
    subjectKey: state.subjectKey,
    roundQuestions: state.roundQuestions,
    answers: state.answers,
    sessionId: state.sessionId,
    score: state.score,
    isDaily: state.isDaily,
    dailyMessage: state.dailyMessage
  };
  state.roundQuestions = wrongQuestions;
  state.answers = [];
  state.score = 0;
  state.currentIndex = 0;
  state.selectedOption = null;
  state.answered = false;
  state.confirmedAnswer = false;
  state.answerResult = null;
  state.answerLoading = false;
  state.answerError = null;
  state.isReview = true;
  state.sessionId = newSessionId();
  state.screen = "review-quiz";
  render();
  document.querySelector(".question-card .statement")?.focus();
}

function returnFromReview(){
  const origin = state.reviewOrigin;
  if(!origin) return goHome();
  state = {
    ...state,
    ...origin,
    screen: origin.screen,
    isReview: false,
    reviewOrigin: null,
    currentIndex: 0,
    selectedOption: null,
    answered: false,
    confirmedAnswer: false,
    answerResult: null,
    answerLoading: false,
    answerError: null
  };
  render();
  document.querySelector(".result-wrap")?.focus();
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

async function fetchAnswerResult(questionId, answer){
  const { data, error } = await sb.auth.getSession();
  if(error) throw error;
  const accessToken = data.session?.access_token;
  if(!accessToken) throw new Error("Sessão expirada. Recarregue e tente novamente.");
  const response = await fetch("/api/questions/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    body: JSON.stringify({ questionId: String(questionId), answer })
  });
  if(!response.ok) throw new Error("Não foi possível corrigir a resposta.");
  const result = await response.json();
  if(typeof result.is_correct !== "boolean" || !["A", "B", "C", "D"].includes(result.correct_answer)) throw new Error("Resposta inválida do servidor.");
  return result;
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
  state.answerResult = null;
  state.answerLoading = false;
  state.answerError = null;
  state.score = 0;
  state.isDaily = false;
  state.dailyMessage = null;
  state.answers = [];
  state.isReview = false;
  state.reviewOrigin = null;
  state.sessionId = newSessionId();
  saveStudyProgress();
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
  state.answerResult = null;
  state.answerLoading = false;
  state.answerError = null;
  state.score = 0;
  state.isDaily = true;
  state.dailyMessage = null;
  state.answers = [];
  state.isReview = false;
  state.reviewOrigin = null;
  state.sessionId = newSessionId();
  render();
  document.querySelector(".question-card .statement")?.focus();
}

function selectOption(letter){
  if(state.confirmedAnswer) return;
  if(!["A","B","C","D"].includes(letter)) return;

  // Apenas seleciona. A resposta só é avaliada após a confirmação.
  state.selectedOption = letter;
  state.answered = true;
  saveStudyProgress();
  render();
  document.querySelector(`[data-option="${letter}"]`)?.focus({preventScroll:true});
}

async function confirmAnswer(){
  if(!state.answered || state.confirmedAnswer || state.answerLoading) return;
  const q = state.roundQuestions[state.currentIndex];
  if(!q) return;
  state.answerLoading = true;
  state.answerError = null;
  render();
  try {
    const result = await fetchAnswerResult(q.id, state.selectedOption);
    state.answerResult = result;
    state.confirmedAnswer = true;
    state.answerLoading = false;
    state.answers[state.currentIndex] = { selectedOption: state.selectedOption, isCorrect: result.is_correct };
    state.score = state.answers.filter(answer => answer?.isCorrect).length;
    saveStudyProgress();
  } catch(error){
    state.answerLoading = false;
    state.answerError = error.message || "Não foi possível corrigir agora. Tente novamente.";
  }
  render();
  if(state.confirmedAnswer) document.getElementById("next-question")?.focus();
  else document.getElementById("confirm-answer")?.focus();
}

async function nextQuestion(){
  if(!state.confirmedAnswer) return;

  if(state.currentIndex < state.roundQuestions.length - 1){
    state.currentIndex++;
    state.answered = false;
    state.selectedOption = null;
    state.confirmedAnswer = false;
    state.answerResult = null;
    state.answerLoading = false;
    state.answerError = null;
    saveStudyProgress();
    render();
    document.querySelector(".question-card .statement")?.focus();
    return;
  }

  if(state.isReview){
    recordStudySession("review");
    state.screen = "review-complete";
    render();
    document.querySelector(".result-wrap")?.focus();
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
      recordStudySession("challenge");
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
    recordStudySession("study");
    clearStudyProgress();
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
    answerResult: null,
    answerLoading: false,
    answerError: null,
    score: 0,
    isDaily: false,
    dailyMessage: null,
    answers: [],
    isReview: false,
    reviewOrigin: null,
    sessionId: null
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
  if(state.screen === "review-quiz" || state.screen === "review-complete"){
    backHtml = `<button type="button" class="back-link" data-action="review-back">&larr; voltar ao resultado</button>`;
  } else if(state.screen !== "home" && state.screen !== "loading" && state.screen !== "error"){
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
  } else if(state.screen === "review-quiz"){
    inner.innerHTML = `${backHtml}<p class="kicker">REVISÃO DOS ERROS</p><h1>Vamos tentar novamente</h1>`;
  } else if(state.screen === "review-complete"){
    inner.innerHTML = `${backHtml}<p class="kicker">REVISÃO CONCLUÍDA</p><h1>Mais uma etapa vencida</h1>`;
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
  const saved = readStudyProgress();
  const savedPercent = saved ? Math.round(((saved.currentIndex + (saved.answers?.[saved.currentIndex] ? 1 : 0)) / saved.roundQuestions.length) * 100) : 0;
  const continueCard = saved ? `<section class="continue-card" aria-labelledby="continue-title"><div><p class="result-label">SUA ÚLTIMA SESSÃO</p><h2 id="continue-title">Continue de onde parou</h2><p>${esc(SUBJECT_LABELS[saved.subjectKey])} · Questão ${saved.currentIndex + 1} de ${saved.roundQuestions.length}</p><p class="continue-percent">${savedPercent}% concluído</p></div><button type="button" class="primary" data-action="resume">Continuar sessão &rarr;</button></section>` : "";
  const recommendation = getStudyRecommendation();
  const recommendationCard = recommendation && BANK_BY_SUBJECT[recommendation.key]?.length ? `<section class="recommend-card"><div><p class="result-label">SUGESTÃO COM BASE NO SEU HISTÓRICO</p><h2>Vale revisar ${esc(recommendation.label)}</h2><p>${recommendation.correct} acertos em ${recommendation.total} respostas nesta matéria.</p></div><button type="button" class="primary" data-recommend-subject="${esc(recommendation.key)}">Praticar agora &rarr;</button></section>` : "";

  main.innerHTML = `
    ${renderDailyCard()}
    ${continueCard}
    ${recommendationCard}
    <p class="intro-note">Cada simulado sorteia 10 questões do banco daquela matéria. Escolha uma alternativa e confirme quando tiver certeza. Só depois da confirmação o site revela o resultado e a explicação.</p>
    ${emptyState}
    <div class="subject-grid">${rows}</div>
  `;

  main.querySelectorAll("[data-subject]").forEach(button => {
    button.addEventListener("click", () => startQuiz(button.dataset.subject));
  });
  main.querySelectorAll("[data-recommend-subject]").forEach(button => button.addEventListener("click", () => startQuiz(button.dataset.recommendSubject)));
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
      if(letter === state.answerResult?.correct_answer) cls += " correct";
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
    explanationHtml = `<p class="answer-feedback ${state.answerResult?.is_correct ? "right" : "wrong"}" role="status" aria-live="polite">${state.answerResult?.is_correct ? "✓ Resposta correta." : `✕ Resposta incorreta. A alternativa ${esc(state.answerResult?.correct_answer)} é a correta.`}</p>${renderAnswerExplanations(state.answerResult, state.selectedOption)}`;
  }

  const isLast = state.currentIndex === total - 1;

  const confirmHtml = state.selectedOption && !state.confirmedAnswer ? `
    <div class="answer-confirm">
      <p>Você marcou <strong>${esc(state.selectedOption)}</strong>. Quer confirmar sua resposta?</p>
      ${state.answerError ? `<p role="alert">${esc(state.answerError)}</p>` : ""}
      <button type="button" class="primary ${isDaily ? "rose" : ""}" id="confirm-answer" ${state.answerLoading ? "disabled" : ""}>${state.answerLoading ? "Corrigindo…" : "Confirmar resposta →"}</button>
    </div>
  ` : "";

  main.innerHTML = `
    <div class="progress-row">
      <span class="progress-label">Questão ${state.currentIndex + 1} de ${total}</span>
      <div class="progress-track" role="progressbar" aria-label="Progresso das questões" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${state.currentIndex + 1}" aria-valuetext="Questão ${state.currentIndex + 1} de ${total}"><div class="progress-fill ${isDaily ? "rose" : ""}" style="width:${pct}%"></div></div>
      <span class="progress-label">${state.score} acertos</span>
    </div>
    <div class="question-card ${isDaily ? "daily" : ""}">
      <p class="art-label">QUESTÃO ${state.currentIndex + 1}${isDaily ? `<span class="subject-badge">${esc(SUBJECT_LABELS[q.subject] || q.subject)}</span>` : ""}</p>
      <h2 class="statement" tabindex="-1" aria-live="polite" aria-atomic="true">${esc(q.statement)}</h2>
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
  const stats = getResultStats();
  const hasErrors = stats.incorrect > 0;

  let msg;
  if(pct >= 80) msg = "Excelente domínio da matéria — esse desempenho já está no nível de aprovação.";
  else if(pct >= 60) msg = "Bom resultado. Vale revisar os pontos que geraram dúvida e repetir o simulado.";
  else msg = "Ainda dá pra melhorar bastante. Recomendo revisar a matéria e tentar de novo — os erros de agora viram acerto na próxima rodada.";

  main.innerHTML = `
    <div class="result-wrap" tabindex="-1">
      <p class="result-label">DESEMPENHO NESTA RODADA</p>
      <p class="result-score">${state.score}<span>/${total}</span></p>
      <p class="result-label">${pct}% DE APROVEITAMENTO</p>
      <div class="result-counts"><span>✓ ${stats.correct} acertos</span><span>✕ ${stats.incorrect} erros</span></div>
      <div class="difficulty-stats" aria-label="Acertos por dificuldade">${stats.difficultyRows}</div>
      <p class="result-msg">${esc(msg)}</p>
      <div class="result-actions">
        <button type="button" class="primary" id="retry-subject">Refazer este simulado &rarr;</button>
        ${hasErrors ? `<button type="button" class="ghost" id="review-errors">Revisar ${stats.incorrect} ${stats.incorrect === 1 ? "erro" : "erros"} &rarr;</button>` : ""}
        <button type="button" class="ghost" id="choose-subject">Escolher outra matéria</button>
      </div>
    </div>
  `;

  document.getElementById("retry-subject").addEventListener("click", retrySameSubject);
  document.getElementById("review-errors")?.addEventListener("click", startReview);
  document.getElementById("choose-subject").addEventListener("click", goHome);
}

function renderDailyResult(){
  const main = document.getElementById("main");
  const total = state.roundQuestions.length;
  const perfect = state.score === total;
  const stats = getResultStats();

  main.innerHTML = `
    <div class="result-wrap" tabindex="-1">
      <p class="result-label">DESAFIO DIÁRIO — ${esc(todayStr())}</p>
      <p class="result-score">${state.score}<span>/${total}</span></p>
      <p class="result-label">${total ? Math.round((state.score / total) * 100) : 0}% DE APROVEITAMENTO</p>
      <div class="result-counts"><span>✓ ${stats.correct} acertos</span><span>✕ ${stats.incorrect} erros</span></div>
      ${perfect ? `<div class="cute-message">${esc(state.dailyMessage)}</div>` : `<p class="result-msg">Quase lá! Amanhã tem um novo desafio — bora tentar de novo.</p>`}
      ${perfect ? `<p class="result-msg">Seu próximo desafio diário fica disponível amanhã.</p>` : ""}
      <div class="result-actions">
        ${stats.incorrect ? `<button type="button" class="primary" id="review-errors">Revisar ${stats.incorrect} ${stats.incorrect === 1 ? "erro" : "erros"} &rarr;</button>` : ""}
        <button type="button" class="ghost" id="back-home">Voltar ao início</button>
      </div>
    </div>
  `;

  document.getElementById("review-errors")?.addEventListener("click", startReview);
  document.getElementById("back-home").addEventListener("click", goHome);
}

function renderReviewComplete(){
  const stats = getResultStats();
  const total = state.roundQuestions.length;
  document.getElementById("main").innerHTML = `<div class="result-wrap" tabindex="-1"><p class="result-label">REVISÃO DOS ERROS</p><p class="result-score">${stats.correct}<span>/${total}</span></p><p class="result-msg">Você refez ${total} ${total === 1 ? "questão" : "questões"} que tinha errado. Volte ao resultado para conferir o desempenho original.</p><button type="button" class="primary" id="return-result">Voltar ao resultado &rarr;</button></div>`;
  document.getElementById("return-result").addEventListener("click", returnFromReview);
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
  document.querySelectorAll('[data-action="resume"]').forEach(el => el.addEventListener("click", resumeStudyProgress));
  document.querySelectorAll('[data-action="review-back"]').forEach(el => el.addEventListener("click", returnFromReview));
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
  else if(state.screen === "review-quiz") renderQuizLike(state.isDaily);
  else if(state.screen === "review-complete") renderReviewComplete();
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
