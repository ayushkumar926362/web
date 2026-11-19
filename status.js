const { r, auth } = require("../lib/redis");

module.exports = async (req, res) => {
  try {
    const key = await auth(req);
    if (!key) return res.status(401).json({ error: "Please log in" });
    const [raw, cr, sp, certs] = await Promise.all([
      r("GET", "user:" + key), r("GET", "credits:" + key),
      r("GET", "spent:" + key), r("LLEN", "certs:" + key)
    ]);
    const { salt, hash, rsalt, rhash, ...pub } = JSON.parse(raw);
    res.json({
      user: pub,
      credits: Number(cr) || 0, spent: Number(sp) || 0, total: Number(certs) || 0
    });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
