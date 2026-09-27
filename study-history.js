(() => {
  "use strict";
  const STORAGE_KEY = "luiza-study-history-v1";
  const MAX_RECORDS = 250;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      return value.filter(item => item && typeof item === "object" && typeof item.id === "string" &&
        Number.isInteger(Number(item.total)) && Number(item.total) > 0 && Number(item.total) <= 50).map(item => ({
        id: item.id.slice(0, 100),
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "",
        createdAt: Number(item.createdAt) || 0,
        area: ["law", "technology", "ai"].includes(item.area) ? item.area : "technology",
        content: String(item.content || "Estudos").slice(0, 120),
        subjectKey: String(item.subjectKey || "").slice(0, 80),
        topicId: Number.isInteger(Number(item.topicId)) && Number(item.topicId) > 0 ? Number(item.topicId) : null,
        type: ["study", "challenge", "review"].includes(item.type) ? item.type : "study",
        correct: Math.max(0, Math.min(Number(item.total), Number(item.correct) || 0)),
        total: Number(item.total),
        answers: Array.isArray(item.answers) ? item.answers.slice(0, Number(item.total)).filter(answer => answer && typeof answer === "object").map(answer => ({
          isCorrect: Boolean(answer.isCorrect),
          difficulty: String(answer.difficulty || "").slice(0, 24)
        })) : []
      }));
    } catch (_) {
      return [];
    }
  }

  function record(entry) {
    if (!entry || typeof entry.id !== "string" || !entry.id || !Number.isInteger(entry.total) || entry.total < 1) return false;
    const records = read();
    if (records.some(item => item.id === entry.id)) return false;
    records.push({
      id: entry.id,
      date: String(entry.date || ""),
      createdAt: Number(entry.createdAt) || Date.now(),
      area: ["law", "technology", "ai"].includes(entry.area) ? entry.area : "technology",
      content: String(entry.content || "Estudos").slice(0, 120),
      subjectKey: String(entry.subjectKey || "").slice(0, 80),
      topicId: entry.topicId !== null && entry.topicId !== undefined && entry.topicId !== "" && Number.isInteger(Number(entry.topicId)) ? Number(entry.topicId) : null,
      type: ["study", "challenge", "review"].includes(entry.type) ? entry.type : "study",
      correct: Math.max(0, Math.min(entry.total, Number(entry.correct) || 0)),
      total: entry.total,
      answers: Array.isArray(entry.answers) ? entry.answers.slice(0, entry.total).map(answer => ({
        isCorrect: Boolean(answer?.isCorrect),
        difficulty: String(answer?.difficulty || "").slice(0, 24)
      })) : []
    });
    records.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
      return true;
    } catch (error) {
      console.warn("Não foi possível salvar o histórico de estudos neste navegador.", error);
      return false;
    }
  }

  function summarize(records = read()) {
    const questions = records.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const correct = records.reduce((sum, item) => sum + (Number(item.correct) || 0), 0);
    const dates = [...new Set(records.map(item => item.date).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort().reverse();
    let streak = 0;
    const dateAt = offset => {
      const now = new Date();
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    };
    let cursor = dates.includes(dateAt(0)) ? 0 : dates.includes(dateAt(1)) ? 1 : -1;
    if (cursor >= 0) {
      while (dates.includes(dateAt(cursor))) { streak++; cursor++; }
    }
    const today = dateAt(0);
    const todayQuestions = records.filter(item => item.date === today).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    return {
      records,
      questions,
      correct,
      accuracy: questions ? Math.round(correct / questions * 100) : 0,
      sessions: records.filter(item => item.type !== "review").length,
      reviews: records.filter(item => item.type === "review").length,
      challenges: records.filter(item => item.type === "challenge").length,
      streak,
      todayQuestions,
      recent: records.slice(0, 6)
    };
  }

  window.LuizaStudyHistory = { read, record, summarize, storageKey: STORAGE_KEY };
})();
