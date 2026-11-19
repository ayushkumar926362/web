const crypto = require("crypto");
const { r, limit, ip } = require("../lib/redis");
const { clean } = require("../lib/profile");

const hash = (p, s) => crypto.scryptSync(p, s, 32).toString("hex");
const same = (a, b) => { a = Buffer.from(a); b = Buffer.from(b); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const str = (v, n) => String(v || "").trim().slice(0, n);
const norm = (c) => String(c || "").toUpperCase().replace(/[^A-F0-9]/g, "");
const newCode = () => crypto.randomBytes(8).toString("hex").toUpperCase().match(/.{4}/g).join("-");
// Password aur recovery code dono salt ke saath hash hokar save hote hain, asli text kabhi nahi
const secrets = (pass, code) => {
  const salt = crypto.randomBytes(16).toString("hex"), rsalt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: hash(pass, salt), rsalt, rhash: hash(norm(code), rsalt) };
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = req.body || {};
  const email = str(b.email, 120).toLowerCase(), key = email, pass = String(b.password || "");
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
    if (pass.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!(await limit("auth:" + ip(req), 30, 600))) return res.status(429).json({ error: "Too many attempts. Try again in 10 minutes" });

    let code = null;
    if (b.action === "register") {
      const v = clean(b);
      if (v.error) return res.status(400).json({ error: v.error });
      code = newCode();
      const ok = await r("SET", "user:" + key, JSON.stringify({ ...v.p, email, ...secrets(pass, code) }), "NX");
      if (!ok) return res.status(409).json({ error: "A company is already registered with this email" });
    } else {
      if (!(await limit("acct:" + key, 10, 3600))) return res.status(429).json({ error: "Too many attempts for this account. Try again in 1 hour" });
      const raw = await r("GET", "user:" + key);
      const u = raw && JSON.parse(raw);
      if (b.action === "reset") {
        if (!u || !u.rsalt || !same(hash(norm(b.code), u.rsalt), u.rhash))
          return res.status(401).json({ error: "Incorrect email or recovery code" });
        code = newCode(); // purana code ek baar me khatam, naya milega
        await r("SET", "user:" + key, JSON.stringify({ ...u, ...secrets(pass, code) }));
      } else if (!u || !same(hash(pass, u.salt), u.hash)) {
        return res.status(401).json({ error: "Incorrect email or password" });
      }
    }
    const token = crypto.randomBytes(32).toString("hex");
    await r("SET", "token:" + token, key, "EX", 60 * 60 * 24 * 30);
    res.json({ token, code });
  } catch (e) {
    res.status(500).json({ error: "Server error, please try again shortly" });
  }
};
