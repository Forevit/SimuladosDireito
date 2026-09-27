const test = require("node:test");
const assert = require("node:assert/strict");
const answerQuestion = require("../api/questions/answer.js");

function createResponse(){
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value){ this.headers[name.toLowerCase()] = value; },
    status(code){ this.statusCode = code; return this; },
    json(value){ this.body = value; return this; }
  };
}

async function invoke({ method = "POST", body = { questionId: "42", answer: "B" }, headers = { authorization: "Bearer valid-session" } } = {}){
  const res = createResponse();
  await answerQuestion({ method, body, headers }, res);
  return res;
}

test("answers only after validating the user session and requests the answer server-side", async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if(String(url).includes("/auth/v1/user")) return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
    return new Response(JSON.stringify([{ correct: "B", explanation_a: "A", explanation_b: "B", explanation_c: null, explanation_d: "D" }]), { status: 200 });
  };
  try {
    const response = await invoke();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      is_correct: true,
      correct_answer: "B",
      explanations: { A: "A", B: "B", C: "", D: "D" }
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.headers.Authorization, "Bearer valid-session");
    assert.equal(calls[0].options.headers.apikey, "sb_publishable_t8gBrQRy-O4f_7t3mBMrLQ_JZfWPvQw");
    assert.equal(calls[0].options.headers.Authorization.includes("server-secret"), false);
    assert.match(calls[1].url, /correct%2Cexplanation_a/);
    assert.equal(calls[1].options.headers.Authorization, "Bearer server-secret");
    assert.match(response.headers["cache-control"], /no-store/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("rejects methods and invalid answers before network access", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("unexpected network request"); };
  try {
    const method = await invoke({ method: "GET" });
    assert.equal(method.statusCode, 405);
    assert.equal(method.headers.allow, "POST");
    const invalid = await invoke({ body: { questionId: "42", answer: "E" } });
    assert.equal(invalid.statusCode, 400);
    const invalidId = await invoke({ body: { questionId: "42,correct", answer: "A" } });
    assert.equal(invalidId.statusCode, 400);
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps sensitive columns out of every browser-side question query", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const law = fs.readFileSync(path.join(__dirname, "../direito/app.js"), "utf8");
  const technology = fs.readFileSync(path.join(__dirname, "../tecnologia/app.js"), "utf8");
  for(const source of [law, technology]){
    const selections = [...source.matchAll(/\.select\("([^"]+)"\)/g)].map(match => match[1]);
    const questionSelections = selections.filter(selection => selection.split(",").some(column => ["statement", "option_a", "option_b", "option_c", "option_d"].includes(column)));
    assert.ok(questionSelections.length > 0);
    assert.ok(questionSelections.every(selection => !/(^|,)(correct|explanation_[abcd])($|,)/.test(selection)));
    assert.doesNotMatch(source, /\.select\([^\n]*(?:correct|explanation_[abcd])/);
  }
});

test("rejects an invalid session without querying the question table", async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return new Response("{}", { status: 401 }); };
  try {
    const response = await invoke();
    assert.equal(response.statusCode, 401);
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("returns 404 for a valid session and missing question", async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  const originalFetch = global.fetch;
  global.fetch = async url => String(url).includes("/auth/v1/user")
    ? new Response(JSON.stringify({ id: "user-1" }), { status: 200 })
    : new Response("[]", { status: 200 });
  try {
    const response = await invoke();
    assert.equal(response.statusCode, 404);
  } finally {
    global.fetch = originalFetch;
  }
});
