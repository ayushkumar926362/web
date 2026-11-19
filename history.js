// Company ki apni history: pagination + search + export (companyId = login email)
const { r, auth } = require("../lib/redis");
const PAGE = 50;

module.exports = async (req, res) => {
  try {
    const key = await auth(req);
    if (!key) return res.status(401).json({ error: "Please log in" });
    const b = req.body || {};
    const p = Math.max(0, Math.floor(+b.page || 0));
    const q = String(b.q || "").trim().toLowerCase().slice(0, 60);
    if (b.all || q) {
      let all = (await r("LRANGE", "certs:" + key, -5000, -1)).map(JSON.parse).reverse();
      if (q) all = all.filter((c) => [c.no, c.vid, c.expName, c.impName, c.cargo, c.container, c.country, c.fumDate, c.issue].join(" ").toLowerCase().includes(q));
      return res.json(b.all ? { items: all } : { items: all.slice(p * PAGE, p * PAGE + PAGE), total: all.length });
    }
    const total = Number(await r("LLEN", "certs:" + key)) || 0;
    const raw = await r("LRANGE", "certs:" + key, -(p + 1) * PAGE, -p * PAGE - 1);
    res.json({ items: raw.map(JSON.parse).reverse(), total });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
