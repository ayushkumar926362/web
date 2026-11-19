// Upstash Redis REST helper + login token check
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function r(...cmd) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd.map(String))
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}

// Ek hi network call me bahut saare commands (bulk ke liye)
async function pipe(cmds) {
  const res = await fetch(URL_ + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((c) => c.map(String)))
  });
  const d = await res.json();
  if (!Array.isArray(d)) throw new Error("pipeline failed");
  d.forEach((x) => { if (x.error) throw new Error(x.error); });
  return d;
}

async function auth(req) {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  return r("GET", "token:" + t);
}

// Rate limit: "max" koshish "sec" second me
async function limit(k, max, sec) {
  const n = await r("INCR", "rl:" + k);
  if (n === 1) await r("EXPIRE", "rl:" + k, sec);
  return n <= max;
}
const ip = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";

module.exports = { r, pipe, auth, limit, ip };
