const { r, auth } = require("../lib/redis");
const PLANS = require("../lib/plans");

module.exports = async (req, res) => {
  try {
    const key = await auth(req);
    if (!key) return res.status(401).json({ error: "Please log in" });
    const plan = PLANS[Number((req.body || {}).plan)];
    if (!plan) return res.status(400).json({ error: "Invalid plan" });
    const basic = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
    const rz = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + basic, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: plan.p * 100, currency: "INR", receipt: "ka_" + Date.now() })
    });
    const o = await rz.json();
    if (!rz.ok) return res.status(502).json({ error: "Could not create the payment order" });
    await r("SET", "order:" + o.id, JSON.stringify({ key, plan: Number(req.body.plan) }), "EX", 60 * 60 * 24 * 7);
    res.json({ orderId: o.id, amount: o.amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
