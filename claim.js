// Payment verify + auto-unlock credits (webhook ki zaroorat nahi)
const crypto = require("crypto");
const { r, auth } = require("../lib/redis");
const PLANS = require("../lib/plans");

// Ek hi payment do baar credit na de: sab kuch ek atomic step me
const LUA = `if redis.call('SET',KEYS[1],ARGV[1],'NX') then
  redis.call('INCRBY',KEYS[2],ARGV[2]); redis.call('INCRBY',KEYS[3],ARGV[3]); return 1
else return 0 end`;

module.exports = async (req, res) => {
  try {
    const key = await auth(req);
    if (!key) return res.status(401).json({ error: "Please log in" });
    const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body || {};
    if (!oid || !pid || !sig) return res.status(400).json({ error: "Payment details are incomplete" });

    const expect = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(oid + "|" + pid).digest("hex");
    const a = Buffer.from(expect), b = Buffer.from(String(sig));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: "Payment could not be verified" });

    const raw = await r("GET", "order:" + oid);
    const o = raw && JSON.parse(raw);
    if (!o || o.key !== key) return res.status(403).json({ error: "This order does not belong to you" });

    const plan = PLANS[o.plan];
    const added = await r("EVAL", LUA, 3, "paid:" + oid, "credits:" + key, "spent:" + key, pid, plan.c, plan.p);
    res.json({ ok: true, added: Number(added) === 1 ? plan.c : 0 });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
