const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw";


function sendJson(res, status, body){
  res.status(status).json(body);
}

async function answerQuestion(req, res){
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Vary", "Authorization");

  if(req.method !== "POST"){
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método não permitido." });
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body
    : null;
  const questionId = String(body?.questionId ?? "");
  const answer = body?.answer;
  if(!/^\d{1,20}$/.test(questionId) || !["A", "B", "C", "D"].includes(answer)){
    return sendJson(res, 400, { error: "Questão ou alternativa inválida." });
  }

  const authorization = req.headers?.authorization || req.headers?.Authorization || "";
  const tokenMatch = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!tokenMatch || !supabaseUrl || !serviceRoleKey){
    return sendJson(res, tokenMatch ? 500 : 401, { error: tokenMatch ? "Serviço temporariamente indisponível." : "Sessão inválida." });
  }

  const accessToken = tokenMatch[1];
  try {
    const sessionResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });
    if(!sessionResponse.ok) return sendJson(res, 401, { error: "Sessão inválida ou expirada." });

    const questionUrl = new URL(`${supabaseUrl}/rest/v1/questions`);
    questionUrl.searchParams.set("select", "correct,explanation_a,explanation_b,explanation_c,explanation_d");
    questionUrl.searchParams.set("id", `eq.${questionId}`);
    questionUrl.searchParams.set("limit", "1");
    const questionResponse = await fetch(questionUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      cache: "no-store"
    });
    if(!questionResponse.ok) throw new Error("Supabase question lookup failed");

    const rows = await questionResponse.json();
    const question = Array.isArray(rows) ? rows[0] : null;
    if(!question) return sendJson(res, 404, { error: "Questão não encontrada." });
    if(!["A", "B", "C", "D"].includes(question.correct)) throw new Error("Invalid correct answer in question bank");

    return sendJson(res, 200, {
      is_correct: answer === question.correct,
      correct_answer: question.correct,
      explanations: {
        A: question.explanation_a || "",
        B: question.explanation_b || "",
        C: question.explanation_c || "",
        D: question.explanation_d || ""
      }
    });
  } catch(_error){
    return sendJson(res, 500, { error: "Não foi possível corrigir a resposta agora." });
  }
}

answerQuestion.config = { api: { bodyParser: { sizeLimit: "2kb" } } };
module.exports = answerQuestion;
