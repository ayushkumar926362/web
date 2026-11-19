// Public: koi bhi Verify ID se certificate ki asliyat check kar sakta hai (login nahi chahiye)
const { r, limit, ip } = require("../lib/redis");

module.exports = async (req, res) => {
  try {
    if (!(await limit("v:" + ip(req), 30, 600)))
      return res.status(429).json({ error: "Too many attempts. Please try again later" });
    const id = String(req.query.id || "").toUpperCase().replace(/[^A-F0-9]/g, "");
    const raw = id.length === 10 ? await r("GET", "vid:" + id) : null;
    if (!raw) return res.status(404).json({ error: "Verify ID not found. Please check the ID" });
    res.json({ valid: true, ...JSON.parse(raw) });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
