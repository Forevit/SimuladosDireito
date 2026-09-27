/* ====================== CONFIG SUPABASE ====================== */
const SUPABASE_URL = "https://ftzmtjlhtmnjsjnkmgvc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw";
const AREA = document.body.dataset.area || "technology";

const BANK_AREA_KEY = document.body.dataset.area || "technology";
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
  redes: "Redes",
  infraestrutura: "Infraestrutura",
  seguranca: "Segurança da Informação",
  sistemas_operacionais: "Sistemas Operacionais",
  linux: "Linux",
  windows: "Windows",
  virtualizacao: "Virtualização",
  cloud: "Cloud e Computação em Nuvem",
  banco_de_dados: "Banco de Dados",
  programacao: "Programação",
  devops: "DevOps",
  hardware: "Hardware",
  ciberseguranca: "Cibersegurança",
  active_directory: "Active Directory",
  powershell: "PowerShell",
  git: "Git",
  docker: "Docker",
  apis: "APIs",
  inteligencia_artificial: "Inteligência Artificial"
};
const AI_SUBJECT_SLUG = "inteligencia-artificial";
const TECH_AREA_ID = 2;

const TECH_MESSAGES = [
  "Stack resolvida. Mais uma camada de conhecimento. 🧩",
  "Mais uma questão dominada. Continue praticando. ⚙️",
  "Debugue os erros, aprenda com eles e siga em frente. 💻",
  "Conhecimento técnico se constrói na prática. Mandou bem! 🚀",
  "Tudo certo nesta rodada. Seu próximo desafio já está esperando. ✨"
];

/* ====================== ESTADO GLOBAL ====================== */
let ALL_QUESTIONS = [];
let BANK_BY_SUBJECT = {};
let BANK_BY_TOPIC = {};
let AI_SUBJECT = null;
let AI_TOPICS = [];
let dailyStatusToday = null;
let lastRenderedScreen = null;
let lastRenderedQuestionIndex = null;

let state = {
  screen: "loading",
  subjectKey: null,
  topicId: null,
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

function normalizeSubject(value){
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function resolveSubjectKey(value){
  const normalized = normalizeSubject(value);
  if(Object.prototype.hasOwnProperty.call(SUBJECT_LABELS, normalized)) return normalized;
  return Object.keys(SUBJECT_LABELS).find(key => normalizeSubject(SUBJECT_LABELS[key]) === normalized) || null;
}

function subjectLabel(value){
  const key = resolveSubjectKey(value);
  return key ? SUBJECT_LABELS[key] : String(value ?? "");
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

function dailyStorageKey(){
  const prefix = BANK_AREA_KEY === "technology" ? "luiza-tech-daily" : `luiza-${BANK_AREA_KEY}-daily`;
  return `${prefix}-${todayStr()}`;
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
  if(BANK_AREA_KEY === "ai") return [];
  const cacheKey = `luiza-question-bank-v2-safe-${BANK_AREA_KEY}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if(cached && Date.now() - cached.savedAt < 60_000 && Array.isArray(cached.rows)) return cached.rows;
  } catch(_){ /* Storage can be disabled; fetch directly. */ }

  const subjectEntries = Object.entries(SUBJECT_LABELS).filter(([key]) => key !== "inteligencia_artificial");
  const subjectKeys = subjectEntries.map(([key]) => key);
  const subjectLabels = subjectEntries.map(([, label]) => label);
  const subjectAliases = BANK_AREA_KEY === "technology" ? ["seguranca_da_informacao"] : [];
  const rows = await fetchAllRows(() => sb
    .from("questions")
    .select("id,subject,subject_id,topic_id,statement,option_a,option_b,option_c,option_d,difficulty")
    .in("subject", [...subjectKeys, ...subjectLabels, ...subjectAliases])
    .order("id", { ascending: true }));
  try { sessionStorage.setItem(cacheKey, JSON.stringify({savedAt:Date.now(),rows})); } catch(_){ /* Cache is optional. */ }
  return rows;
}

async function fetchAIContent(){
  const { data: subject, error: subjectError } = await sb
    .from("subjects")
    .select("id,area_id,name,slug,description,active")
    .eq("area_id", TECH_AREA_ID)
    .eq("slug", AI_SUBJECT_SLUG)
    .eq("active", true)
    .maybeSingle();
  if(subjectError) throw subjectError;
  if(!subject) return { subject: null, topics: [], questions: [] };

  const [{ data: topics, error: topicsError }, questions] = await Promise.all([
    sb.from("topics")
      .select("id,subject_id,parent_topic_id,name,slug,description,active")
      .eq("subject_id", subject.id)
      .eq("active", true)
      .order("id"),
    fetchAllRows(() => sb.from("questions")
      .select("id,subject,subject_id,topic_id,statement,option_a,option_b,option_c,option_d,difficulty")
      .eq("subject_id", subject.id)
      .order("id", { ascending: true }))
  ]);
  if(topicsError) throw topicsError;
  return { subject, topics: topics || [], questions: questions || [] };
}

function pickRandomQuestionsForTopic(topicId, count){
  const topicIds = getTopicTreeIds(topicId);
  const bank = topicIds.flatMap(id => BANK_BY_TOPIC[id] || []);
  return shuffle(bank).slice(0, Math.min(count, bank.length));
}

function getTopicTreeIds(topicId){
  const ids = [Number(topicId)];
  const pending = [...ids];
  while(pending.length){
    const parentId = pending.pop();
    AI_TOPICS.filter(topic => Number(topic.parent_topic_id) === parentId).forEach(child => {
      const childId = Number(child.id);
      if(!ids.includes(childId)){
        ids.push(childId);
        pending.push(childId);
      }
    });
  }
  return ids;
}

function getDailyQuestions(){
  const pool = ALL_QUESTIONS.filter(q => q.difficulty === "dificil" && resolveSubjectKey(q.subject));
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
    if(saved.topicId && !AI_TOPICS.some(topic => Number(topic.id) === Number(saved.topicId))) return null;
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
      topicId: state.topicId,
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
  const topic = AI_TOPICS.find(item => Number(item.id) === Number(state.topicId));
  window.LuizaStudyHistory.record({
    id: state.sessionId,
    date: todayStr(),
    createdAt: Date.now(),
    area: BANK_AREA_KEY,
    content: type === "challenge" ? "Desafio diário" : topic?.name || SUBJECT_LABELS[state.subjectKey] || "Tecnologia",
    subjectKey: state.subjectKey || "",
    topicId: state.topicId,
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
    const key = BANK_AREA_KEY === "ai" ? Number(record.topicId) : record.subjectKey;
    if(!key) return;
    const mapKey = String(key);
    const topic = BANK_AREA_KEY === "ai" ? AI_TOPICS.find(item => Number(item.id) === Number(key)) : null;
    const group = groups.get(mapKey) || { key, label: topic?.name || SUBJECT_LABELS[record.subjectKey] || record.content, correct: 0, total: 0 };
    (record.answers || []).forEach(answer => { group.total++; if(answer.isCorrect) group.correct++; });
    groups.set(mapKey, group);
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
    topicId: saved.topicId || null,
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

function getSavedStudyTitle(saved){
  if(saved.topicId) return AI_TOPICS.find(topic => Number(topic.id) === Number(saved.topicId))?.name || "Inteligência Artificial";
  return SUBJECT_LABELS[saved.subjectKey] || "Estudos";
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
  const rows = ["A", "B", "C", "D"].map(letter => {
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
    topicId: state.topicId,
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
  return TECH_MESSAGES[Math.floor(Math.random() * TECH_MESSAGES.length)];
}

function getSafeErrorMessage(err){
  if(err?.code === "23505") return "O desafio de hoje já foi registrado.";
  if(!sb) return "O componente de conexão não carregou. Confira a internet e recarregue a página.";
  if(!navigator.onLine || /failed to fetch|networkerror|network request failed|timeout/i.test(String(err?.message || ""))) return "Sem conexão com o servidor agora. Confira sua internet e tente novamente.";
  if(err?.message?.toLowerCase().includes("anonymous")) return "Não consegui iniciar sua sessão. Ative o acesso anônimo no Supabase.";
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

    /* Mantém o carregamento legado e adiciona IA pela relação matéria/tópico. */
    const [legacyQuestions, aiContent] = await Promise.all([
      fetchQuestionRows(),
      BANK_AREA_KEY === "ai" ? fetchAIContent() : Promise.resolve({ subject: null, topics: [], questions: [] })
    ]);
    AI_SUBJECT = aiContent.subject;
    AI_TOPICS = aiContent.topics;
    const rowsById = new Map();
    [...legacyQuestions, ...aiContent.questions].forEach(row => rowsById.set(String(row.id), row));
    const questions = [...rowsById.values()].map(row => ({
      ...row,
      subject: Number(row.subject_id) === Number(AI_SUBJECT?.id) ? "inteligencia_artificial" : row.subject
    }));

    ALL_QUESTIONS = (questions || []).map(row => ({
      id: row.id,
      subject: row.subject,
      subjectId: row.subject_id,
      topicId: row.topic_id,
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
    BANK_BY_TOPIC = {};
    ALL_QUESTIONS.forEach(q => {
      const subjectKey = resolveSubjectKey(q.subject);
      if(!subjectKey) return;
      if(!BANK_BY_SUBJECT[subjectKey]) BANK_BY_SUBJECT[subjectKey] = [];
      BANK_BY_SUBJECT[subjectKey].push(q);
      if(q.topicId !== null && q.topicId !== undefined){
        const topicKey = Number(q.topicId);
        if(!BANK_BY_TOPIC[topicKey]) BANK_BY_TOPIC[topicKey] = [];
        BANK_BY_TOPIC[topicKey].push(q);
      }
    });

    if(AREA === "law"){
      const { data: dailyRow, error: dErr } = await sb
        .from("daily_attempts")
        .select("id,attempt_date,score,completed,message_shown,created_at")
        .eq("attempt_date", todayStr())
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if(dErr) throw dErr;
      dailyStatusToday = dailyRow || null;
    } else {
      try {
        const savedDaily = JSON.parse(localStorage.getItem(dailyStorageKey()) || "null");
        dailyStatusToday = savedDaily?.completed ? savedDaily : null;
      } catch(_){
        dailyStatusToday = null;
      }
    }

    state.screen = BANK_AREA_KEY === "ai" ? "ai-topics" : "home";
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
  if(subjectKey === "inteligencia_artificial"){
    state.screen = "ai-topics";
    state.subjectKey = subjectKey;
    state.topicId = null;
    render();
    document.getElementById("header-title")?.focus();
    return;
  }
  if(!(BANK_BY_SUBJECT[subjectKey] || []).length) return;

  state.screen = "quiz";
  state.subjectKey = subjectKey;
  state.topicId = null;
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

function startTopicQuiz(topicId){
  const topic = AI_TOPICS.find(item => Number(item.id) === Number(topicId));
  if(!topic) return;
  state.subjectKey = "inteligencia_artificial";
  state.topicId = Number(topic.id);
  state.roundQuestions = pickRandomQuestionsForTopic(topic.id, 10);
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
  state.screen = state.roundQuestions.length ? "quiz" : "topic-empty";
  state.sessionId = newSessionId();
  saveStudyProgress();
  render();
  document.getElementById("header-title")?.focus();
}

function goAiTopics(){
  state.screen = "ai-topics";
  state.subjectKey = "inteligencia_artificial";
  state.topicId = null;
  state.roundQuestions = [];
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
  state.sessionId = null;
  render();
  document.getElementById("header-title")?.focus();
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

    if(AREA !== "law"){
      dailyStatusToday = {
        attempt_date: todayStr(),
        score: state.score,
        completed: true,
        message_shown: message
      };
      try {
        localStorage.setItem(dailyStorageKey(), JSON.stringify(dailyStatusToday));
      } catch(err){
        console.warn("Não foi possível salvar o desafio diário neste navegador:", err);
      }
      recordStudySession("challenge");
      state.screen = "daily-result";
      render();
      document.querySelector(".result-wrap")?.focus();
      return;
    }

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
    topicId: null,
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
  if(state.topicId){ startTopicQuiz(state.topicId); return; }
  if(state.subjectKey) startQuiz(state.subjectKey);
}

/* ====================== RENDER ====================== */
function renderHeader(){
  const titleEl = document.getElementById("header-title");
  const inner = document.getElementById("header-inner");

  let backHtml = "";
  if(state.screen === "review-quiz" || state.screen === "review-complete"){
    backHtml = `<button type="button" class="back-link" data-action="review-back">&larr; voltar ao resultado</button>`;
  } else if(state.screen === "ai-topics"){
    backHtml = BANK_AREA_KEY === "ai"
      ? `<a class="back-link" href="/">&larr; voltar às áreas</a>`
      : `<button type="button" class="back-link" data-action="home">&larr; voltar à Tecnologia</button>`;
  } else if(state.subjectKey === "inteligencia_artificial" && state.screen !== "home" && state.screen !== "loading" && state.screen !== "error"){
    backHtml = `<button type="button" class="back-link" data-action="ai-topics">&larr; voltar aos tópicos de IA</button>`;
  } else if(state.screen !== "home" && state.screen !== "loading" && state.screen !== "error"){
    backHtml = `<button type="button" class="back-link" data-action="home">&larr; voltar às matérias</button>`;
  }

  if(state.screen === "loading"){
    inner.innerHTML = `<p class="kicker">${BANK_AREA_KEY === "ai" ? "ESTUDOS EM INTELIGÊNCIA ARTIFICIAL" : "ESTUDOS EM TECNOLOGIA"}</p><h1>Carregando os conteúdos…</h1>`;
  } else if(state.screen === "error"){
    inner.innerHTML = `<p class="kicker">${BANK_AREA_KEY === "ai" ? "ESTUDOS EM INTELIGÊNCIA ARTIFICIAL" : "ESTUDOS EM TECNOLOGIA"}</p><h1>Não consegui carregar</h1>`;
  } else if(state.screen === "home"){
    inner.innerHTML = `
      <p class="kicker">ESTUDOS EM TECNOLOGIA</p>
      <h1>Escolha um conteúdo</h1>
      <p class="sub">Questões por tema, simulados e desafios para aprender praticando. A cada rodada, você responde, confirma e confere a explicação.</p>
    `;
  } else if(state.screen === "quiz"){
    const title = state.topicId ? AI_TOPICS.find(topic => Number(topic.id) === Number(state.topicId))?.name : SUBJECT_LABELS[state.subjectKey];
    inner.innerHTML = `${backHtml}<p class="kicker">${esc((title || SUBJECT_LABELS[state.subjectKey]).toUpperCase())}</p><h1>Sessão em andamento</h1>`;
  } else if(state.screen === "result"){
    const title = state.topicId ? AI_TOPICS.find(topic => Number(topic.id) === Number(state.topicId))?.name : SUBJECT_LABELS[state.subjectKey];
    inner.innerHTML = `${backHtml}<p class="kicker">${esc((title || SUBJECT_LABELS[state.subjectKey]).toUpperCase())}</p><h1>Resultado do simulado</h1>`;
  } else if(state.screen === "ai-topics"){
    inner.innerHTML = `${backHtml}<p class="kicker">ÁREA DE ESTUDO</p><h1>Inteligência Artificial</h1><p class="sub">Explore os tópicos e pratique com questões explicadas. Matemática para IA aparece como um único tópico de estudo.</p>`;
  } else if(state.screen === "topic-empty"){
    const topic = AI_TOPICS.find(item => Number(item.id) === Number(state.topicId));
    inner.innerHTML = `${backHtml}<p class="kicker">INTELIGÊNCIA ARTIFICIAL</p><h1>${esc(topic?.name || "Tópico")}</h1>`;
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
  const availableDailyQuestions = getDailyQuestions().length;
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
      <h2>5 questões difíceis de ${AREA === "ai" ? "Inteligência Artificial" : "Tecnologia"}</h2>
      <p class="desc">Questões sorteadas entre os temas da área. Confira cada explicação e acompanhe o resultado da rodada.</p>
      ${availableDailyQuestions < total ? `<p class="daily-availability" id="daily-availability">O desafio será liberado quando houver pelo menos 5 questões difíceis cadastradas. Disponíveis: ${availableDailyQuestions}/${total}.</p>` : ""}
      <button type="button" class="primary rose" data-action="daily" ${availableDailyQuestions < total ? 'disabled aria-describedby="daily-availability"' : ""}>Começar desafio de hoje &rarr;</button>
    </div>
  `;
}

function renderHome(){
  const main = document.getElementById("main");
  const keys = Object.keys(SUBJECT_LABELS).filter(key => key !== "inteligencia_artificial");
  let rows = keys.map((key, i) => {
    const label = SUBJECT_LABELS[key];
    const count = (BANK_BY_SUBJECT[key] || []).length;
    const num = String(i + 1).padStart(2, "0");
    return `
      <button type="button" class="subject-row" data-subject="${esc(key)}" ${count ? "" : "disabled"}>
        <span class="num">${num}</span>
        <span class="title">${esc(label)}</span>
        <span class="meta">${count ? `${count} no banco` : "0 questões"}</span>
        <span class="arrow">&rarr;</span>
      </button>
    `;
  }).join("");

  const hasUsableQuestions = ALL_QUESTIONS.some(q => resolveSubjectKey(q.subject));
  const emptyState = !hasUsableQuestions ? `<section class="empty-state" role="status" aria-live="polite"><h2>O banco desta área está vazio</h2><p>Assim que as questões forem cadastradas, os temas aparecerão aqui para você começar a praticar.</p></section>` : "";
  const saved = readStudyProgress();
  const savedPercent = saved ? Math.round(((saved.currentIndex + (saved.answers?.[saved.currentIndex] ? 1 : 0)) / saved.roundQuestions.length) * 100) : 0;
  const continueCard = saved ? `<section class="continue-card" aria-labelledby="continue-title"><div><p class="result-label">SUA ÚLTIMA SESSÃO</p><h2 id="continue-title">Continue de onde parou</h2><p>${esc(getSavedStudyTitle(saved))} · Questão ${saved.currentIndex + 1} de ${saved.roundQuestions.length}</p><p class="continue-percent">${savedPercent}% concluído</p></div><button type="button" class="primary" data-action="resume">Continuar sessão &rarr;</button></section>` : "";
  const recommendation = getStudyRecommendation();
  const recommendationCard = recommendation && (BANK_AREA_KEY === "ai" ? AI_TOPICS.some(topic => Number(topic.id) === Number(recommendation.key)) : BANK_BY_SUBJECT[recommendation.key]?.length) ? `<section class="recommend-card"><div><p class="result-label">SUGESTÃO COM BASE NO SEU HISTÓRICO</p><h2>Vale revisar ${esc(recommendation.label)}</h2><p>${recommendation.correct} acertos em ${recommendation.total} respostas neste conteúdo.</p></div><button type="button" class="primary" data-recommend-content="${esc(recommendation.key)}">Praticar agora &rarr;</button></section>` : "";

  main.innerHTML = `
    ${renderDailyCard()}
    ${continueCard}
    ${recommendationCard}
    <p class="intro-note">Cada sessão sorteia até 10 questões do tema escolhido. Selecione uma alternativa e confirme para ver a resposta e as explicações.</p>
    ${emptyState}
    <div class="subject-grid">${rows}</div>
  `;

  main.querySelectorAll("[data-subject]").forEach(button => {
    button.addEventListener("click", () => startQuiz(button.dataset.subject));
  });
  main.querySelectorAll("[data-recommend-content]").forEach(button => button.addEventListener("click", () => BANK_AREA_KEY === "ai" ? startTopicQuiz(button.dataset.recommendContent) : startQuiz(button.dataset.recommendContent)));
}

function renderAITopics(){
  const main = document.getElementById("main");
  const roots = AI_TOPICS.filter(topic => !topic.parent_topic_id);
  const rows = roots.map((topic, index) => {
    const count = getTopicTreeIds(topic.id).reduce((sum, id) => sum + (BANK_BY_TOPIC[id] || []).length, 0);
    return `<button type="button" class="ai-topic-row" data-topic="${Number(topic.id)}"><span class="num">${String(index + 1).padStart(2,"0")}</span><span class="title">${esc(topic.name)}</span><span class="meta">${count} questões</span><span class="arrow" aria-hidden="true">→</span></button>`;
  }).join("");
  const empty = !AI_TOPICS.length ? `<section class="empty-state" role="status"><h2>Nenhum tópico cadastrado</h2><p>Os tópicos de Inteligência Artificial ainda não estão disponíveis no banco de estudos.</p></section>` : "";
  const saved = readStudyProgress();
  const savedPercent = saved ? Math.round(((saved.currentIndex + (saved.answers?.[saved.currentIndex] ? 1 : 0)) / saved.roundQuestions.length) * 100) : 0;
  const continueCard = saved ? `<section class="continue-card" aria-labelledby="continue-title"><div><p class="result-label">SUA ÚLTIMA SESSÃO</p><h2 id="continue-title">Continue de onde parou</h2><p>${esc(getSavedStudyTitle(saved))} · Questão ${saved.currentIndex + 1} de ${saved.roundQuestions.length}</p><p class="continue-percent">${savedPercent}% concluído</p></div><button type="button" class="primary" data-action="resume">Continuar sessão &rarr;</button></section>` : "";
  const recommendation = getStudyRecommendation();
  const recommendationCard = recommendation && AI_TOPICS.some(topic => Number(topic.id) === Number(recommendation.key)) ? `<section class="recommend-card"><div><p class="result-label">SUGESTÃO COM BASE NO SEU HISTÓRICO</p><h2>Vale revisar ${esc(recommendation.label)}</h2><p>${recommendation.correct} acertos em ${recommendation.total} respostas neste tópico.</p></div><button type="button" class="primary" data-recommend-content="${esc(recommendation.key)}">Praticar agora &rarr;</button></section>` : "";
  main.innerHTML = `${BANK_AREA_KEY === "ai" ? renderDailyCard() : ""}${continueCard}${recommendationCard}<p class="intro-note">Escolha um tópico para iniciar uma sessão de até 10 questões. Cada resposta inclui explicações para ajudar na revisão.</p>${empty}<div class="ai-topic-list">${rows}</div>`;
  main.querySelectorAll("[data-topic]").forEach(button => button.addEventListener("click", () => startTopicQuiz(button.dataset.topic)));
  main.querySelectorAll("[data-recommend-content]").forEach(button => button.addEventListener("click", () => startTopicQuiz(button.dataset.recommendContent)));
}

function renderTopicEmpty(){
  const topic = AI_TOPICS.find(item => Number(item.id) === Number(state.topicId));
  document.getElementById("main").innerHTML = `<section class="empty-state topic-empty-state" role="status"><span class="topic-empty-icon" aria-hidden="true">✦</span><h2>Este tópico ainda não tem questões</h2><p>${esc(topic?.name || "Este tópico")} já está organizado na área de Inteligência Artificial. Assim que houver questões vinculadas, elas aparecerão aqui.</p><button type="button" class="primary" data-action="ai-topics">Ver outros tópicos</button></section>`;
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
      <span class="progress-label">${state.currentIndex + 1} / ${total}</span>
      <div class="progress-track" role="progressbar" aria-label="Progresso das questões" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${state.currentIndex + 1}" aria-valuetext="Questão ${state.currentIndex + 1} de ${total}"><div class="progress-fill ${isDaily ? "rose" : ""}" style="width:${pct}%"></div></div>
      <span class="progress-label">${state.score} acertos</span>
    </div>
    <div class="question-card ${isDaily ? "daily" : ""}">
      <p class="art-label">QUESTÃO ${state.currentIndex + 1}${isDaily ? `<span class="subject-badge">${esc(subjectLabel(q.subject))}</span>` : ""}</p>
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
  if(AREA !== "law"){
    if(pct >= 80) msg = "Ótimo resultado. Você está consolidando bem esse conteúdo técnico.";
    else if(pct >= 60) msg = "Boa rodada. Revise os pontos que deram dúvida e tente mais uma vez.";
    else msg = "Cada erro aponta o que vale revisar. Continue praticando; conhecimento técnico vem com prática.";
  } else if(pct >= 80) msg = "Excelente domínio da matéria — esse desempenho já está no nível de aprovação.";
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
        <button type="button" class="ghost" id="choose-subject">${state.subjectKey === "inteligencia_artificial" ? "Ver outros tópicos" : "Escolher outra matéria"}</button>
      </div>
    </div>
  `;

  document.getElementById("retry-subject").addEventListener("click", retrySameSubject);
  document.getElementById("review-errors")?.addEventListener("click", startReview);
  document.getElementById("choose-subject").addEventListener("click", state.subjectKey === "inteligencia_artificial" ? goAiTopics : goHome);
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
      ${perfect ? `<div class="cute-message">${esc(state.dailyMessage)}</div>` : `<p class="result-msg">Cada erro mostra um ponto para revisar. Continue praticando e tente novamente quando quiser.</p>`}
      <p class="result-msg">Seu próximo desafio diário fica disponível amanhã.</p>
      <div class="result-actions">
        ${stats.incorrect ? `<button type="button" class="primary" id="review-errors">Revisar ${stats.incorrect} ${stats.incorrect === 1 ? "erro" : "erros"} &rarr;</button>` : ""}
        <button type="button" class="ghost" id="back-home">Voltar ao início</button>
      </div>
    </div>
  `;

  document.getElementById("review-errors")?.addEventListener("click", startReview);
  document.getElementById("back-home").addEventListener("click", BANK_AREA_KEY === "ai" ? goAiTopics : goHome);
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
  document.querySelectorAll('[data-action="ai-topics"]').forEach(el => el.addEventListener("click", goAiTopics));
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
  else if(state.screen === "ai-topics") renderAITopics();
  else if(state.screen === "topic-empty") renderTopicEmpty();
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
