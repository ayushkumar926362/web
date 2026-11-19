// Bulk: ek request me 200 tak certificates. Credit ek hi baar atomic kat-te hain.
const { r, pipe, auth } = require("../lib/redis");
const { validate, finish, pub } = require("../lib/cert");
const MAX = 200;

module.exports = async (req, res) => {
  let key, n = 0, charged = false;
  try {
    key = await auth(req);
    if (!key) return res.status(401).json({ error: "Please log in" });
    const rows = (req.body || {}).rows;
    if (!Array.isArray(rows) || !rows.length || rows.length > MAX)
      return res.status(400).json({ error: "Send between 1 and " + MAX + " rows per request" });
    const clean = [];
    for (let i = 0; i < rows.length; i++) {
      const v = validate(rows[i] || {});
      if (v.error) return res.status(400).json({ error: "Row " + (i + 1) + ": " + v.error });
      clean.push(v.c);
    }
    n = clean.length;
    const left = await r("DECRBY", "credits:" + key, n);
    if (left < 0) {
      await r("INCRBY", "credits:" + key, n);
      return res.status(402).json({ error: "Not enough credits. Need " + n + ", you have " + (left + n) });
    }
    charged = true;
    const end = Number(await r("INCRBY", "certno:" + key, n));
    const u = JSON.parse(await r("GET", "user:" + key));
    const certs = clean.map((c, i) => finish(c, u, end - n + 1 + i));
    const cmds = [["RPUSH", "certs:" + key, ...certs.map((c) => JSON.stringify(c))]];
    certs.forEach((c) => cmds.push(["SET", "vid:" + c.vid, JSON.stringify(pub(c, u))]));
    await pipe(cmds);
    res.json({ certs, credits: left });
  } catch (e) {
    if (charged) { try { await r("INCRBY", "credits:" + key, n); } catch (_) {} }
    res.status(500).json({ error: "Server error. Credits were refunded, please try again" });
  }
};
