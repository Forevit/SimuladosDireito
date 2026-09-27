(() => {
  "use strict";
  const history = window.LuizaStudyHistory;
  const root = document.querySelector("[data-study-dashboard]");
  if (!history || !root) return;

  const setText = (name, value) => {
    const node = root.querySelector(`[data-study-stat="${name}"]`);
    if (node) node.textContent = String(value);
  };
  const areaNames = { law: "Direito", technology: "Tecnologia", ai: "Inteligência Artificial" };
  const typeNames = { study: "Sessão", challenge: "Desafio diário", review: "Revisão" };
  const summary = history.summarize();
  setText("questions", summary.questions);
  setText("correct", summary.correct);
  setText("accuracy", `${summary.accuracy}%`);
  setText("sessions", summary.sessions);
  setText("challenges", summary.challenges);
  setText("streak", summary.streak);
  setText("today", summary.todayQuestions);

  const progress = root.querySelector("[data-study-goal-progress]");
  if (progress) {
    progress.value = Math.min(summary.todayQuestions, 10);
    progress.setAttribute("aria-valuetext", `${Math.min(summary.todayQuestions, 10)} de 10 questões estudadas hoje`);
  }
  const goalLabel = root.querySelector("[data-study-goal-label]");
  if (goalLabel) goalLabel.textContent = `${Math.min(summary.todayQuestions, 10)} / 10 questões hoje`;

  const recent = root.querySelector("[data-study-recent]");
  if (recent) {
    if (!summary.recent.length) {
      const empty = document.createElement("p");
      empty.className = "study-empty";
      empty.textContent = "Suas sessões concluídas aparecerão aqui. O histórico fica salvo apenas neste navegador.";
      recent.append(empty);
    } else {
      const list = document.createElement("ol");
      list.className = "study-history-list";
      summary.recent.forEach(item => {
        const row = document.createElement("li");
        const detail = document.createElement("div");
        const title = document.createElement("strong");
        const subtitle = document.createElement("span");
        const score = document.createElement("b");
        const date = String(item.date || "").split("-").reverse().join("/");
        title.textContent = item.content || "Estudos";
        subtitle.textContent = `${areaNames[item.area] || "Estudos"} · ${typeNames[item.type] || "Sessão"} · ${date}`;
        score.textContent = `${Number(item.correct) || 0}/${Number(item.total) || 0}`;
        detail.append(title, subtitle);
        row.append(detail, score);
        list.append(row);
      });
      recent.append(list);
    }
  }

  const badges = root.querySelector("[data-study-badges]");
  if (badges) {
    const earned = [];
    if (summary.sessions > 0) earned.push("Primeira sessão");
    if (summary.questions >= 100) earned.push("100 questões respondidas");
    if (summary.challenges > 0) earned.push("Primeiro desafio diário");
    if (summary.streak >= 7) earned.push("7 dias de estudo");
    if (!earned.length) earned.push("Conclua uma sessão para desbloquear sua primeira conquista.");
    earned.forEach(label => {
      const badge = document.createElement("span");
      badge.className = "study-badge";
      badge.textContent = label;
      badges.append(badge);
    });
  }
})();
