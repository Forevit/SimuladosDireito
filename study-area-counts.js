(() => {
  "use strict";
  const SUPABASE_URL = "https://ftzmtjlhtmnjsjnkmgvc.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw";
  const LAW_SUBJECTS = ["civil", "processo_civil", "penal", "processo_penal", "trabalhista", "processo_trabalho", "empresarial", "ambiental", "oratoria", "Direito Civil", "Processo Civil", "Prática Penal", "Processo Penal", "Direito do Trabalho", "Processo do Trabalho", "Direito Empresarial", "Direito Ambiental", "Oratória Jurídica"];
  const TECHNOLOGY_SUBJECTS = ["redes", "infraestrutura", "seguranca", "seguranca_da_informacao", "sistemas_operacionais", "linux", "windows", "virtualizacao", "cloud", "banco_de_dados", "programacao", "devops", "hardware", "ciberseguranca", "active_directory", "powershell", "git", "docker", "apis", "Redes", "Infraestrutura", "Segurança da Informação", "Sistemas Operacionais", "Linux", "Windows", "Virtualização", "Cloud", "Banco de Dados", "Programação"];

  async function requestCount(table, filters) {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.set("select", "id");
    Object.entries(filters).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Prefer: "count=exact", Range: "0-0" }
    });
    if (!response.ok) throw new Error(`Contagem indisponível para ${table}: ${response.status}`);
    const range = response.headers.get("content-range") || "";
    const match = range.match(/\/(\d+)$/);
    if (!match) throw new Error(`Resposta sem contagem exata para ${table}.`);
    return Number(match[1]);
  }

  async function requestRows(table, filters, columns) {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.set("select", columns);
    Object.entries(filters).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Prefer: "count=exact", Range: "0-0" }
    });
    if (!response.ok) throw new Error(`Conteúdo indisponível para ${table}: ${response.status}`);
    return response.json();
  }

  function updateArea(prefix, values) {
    const put = (key, value) => {
      const node = document.querySelector(`[data-area-fact="${prefix}-${key}"]`);
      if (node) node.textContent = String(value);
    };
    put("questions", values.questions == null ? "Indisponível" : values.questions.toLocaleString("pt-BR"));
    if(values.subjects != null) put("subjects", values.subjects.toLocaleString("pt-BR"));
    if(values.topics != null) put("topics", values.topics.toLocaleString("pt-BR"));
    const daily = values.difficult == null ? "Desafio diário indisponível" : values.difficult >= 5 ? "Desafio diário liberado" : `Desafio: ${values.difficult}/5 difíceis`;
    put("daily", daily);
  }

  function markUnavailable(prefix, keys) {
    keys.forEach(key => {
      const node = document.querySelector(`[data-area-fact="${prefix}-${key}"]`);
      if (node) node.textContent = "Indisponível";
    });
  }

  async function loadMetrics(prefix, questionFilters, catalogRequest) {
    const [questionsResult, catalogResult, difficultResult] = await Promise.allSettled([
      requestCount("questions", questionFilters),
      catalogRequest(),
      requestCount("questions", { ...questionFilters, difficulty: "eq.dificil" })
    ]);
    const values = {
      questions: questionsResult.status === "fulfilled" ? questionsResult.value : null,
      difficult: difficultResult.status === "fulfilled" ? difficultResult.value : null
    };
    if(prefix === "ai") values.topics = catalogResult.status === "fulfilled" ? catalogResult.value : null;
    else values.subjects = catalogResult.status === "fulfilled" ? catalogResult.value : null;
    updateArea(prefix, values);
    markUnavailable(prefix, [
      ...(questionsResult.status === "rejected" ? ["questions"] : []),
      ...(catalogResult.status === "rejected" ? [prefix === "ai" ? "topics" : "subjects"] : []),
      ...(difficultResult.status === "rejected" ? ["daily"] : [])
    ]);
  }

  const loads = [
    loadMetrics("law", { subject: `in.(${LAW_SUBJECTS.join(",")})` }, () => requestCount("subjects", { area_id: "eq.1", active: "eq.true" })),
    loadMetrics("technology", { subject: `in.(${TECHNOLOGY_SUBJECTS.join(",")})` }, () => requestCount("subjects", { area_id: "eq.2", active: "eq.true", slug: "neq.inteligencia-artificial" })),
    (async () => {
      const [subject] = await requestRows("subjects", { slug: "eq.inteligencia-artificial", active: "eq.true" }, "id");
      if (!subject) throw new Error("Matéria de IA indisponível.");
      await loadMetrics("ai", { subject_id: `eq.${subject.id}` }, () => requestCount("topics", { subject_id: `eq.${subject.id}`, active: "eq.true", parent_topic_id: "is.null" }));
    })()
  ];

  Promise.allSettled(loads).then(results => {
    ["law", "technology", "ai"].forEach((prefix, index) => {
      if (results[index].status === "rejected") markUnavailable(prefix, prefix === "ai" ? ["questions", "topics", "daily"] : ["questions", "subjects", "daily"]);
    });
  });
})();
