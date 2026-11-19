// Company profile = jo cheezein har certificate par default aati hain
const str = (v, n) => String(v || "").trim().slice(0, n);
const img = (v) => (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v || "") && v.length <= 200000 ? v : "");

function clean(b) {
  const p = {
    name: str(b.name, 120), addr: str(b.addr, 250), offices: str(b.offices, 500), mob: str(b.mob, 10),
    dppqs: str(b.dppqs, 60), dppqsDate: /^\d{4}-\d{2}-\d{2}$/.test(b.dppqsDate) ? b.dppqsDate : "",
    opName: str(b.opName, 80), opAcc: str(b.opAcc, 60),
    prefix: str(b.prefix, 20).toUpperCase().replace(/[^A-Z0-9\/-]/g, ""),
    logo: img(b.logo), stamp: img(b.stamp)
  };
  const need = [["name", "Company name"], ["addr", "Registered address"], ["dppqs", "DPPQS registration number"],
    ["dppqsDate", "DPPQS registration date"], ["opName", "Accredited operator name"], ["opAcc", "Accreditation number"],
    ["prefix", "Certificate number prefix"]];
  const miss = need.find(([k]) => !p[k]);
  if (miss) return { error: miss[1] + " is required" };
  if (!/^[6-9]\d{9}$/.test(p.mob)) return { error: "Enter a valid 10-digit mobile number" };
  return { p };
}
module.exports = { clean };
