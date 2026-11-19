// Certificate ki validation + number + issue date (server hi set karta hai)
const crypto = require("crypto");
const str = (v, n) => String(v || "").trim().slice(0, n);
const iso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
const FUM = { alp: ["PHOSPHINE", "ALP"], mb: ["METHYL BROMIDE", "MB"] };
const ist = () => new Date(Date.now() + 19800000);
const today = () => ist().toISOString().slice(0, 10);
function fy() { // Indian financial year, jaise Oct 2026 => "2627"
  const d = ist(), y = d.getUTCFullYear(), a = d.getUTCMonth() + 1 >= 4 ? y : y - 1;
  return String(a % 100).padStart(2, "0") + String((a + 1) % 100).padStart(2, "0");
}
const NEED = [["country", "Importing country"], ["fumDate", "Date of fumigation"], ["port", "Port of loading"],
  ["place", "Place of fumigation"], ["dose", "Dosage"], ["hours", "Duration (hours)"], ["expName", "Exporter name"],
  ["impName", "Importer name"], ["cargo", "Cargo description"], ["qty", "Quantity"]];

function validate(b) {
  const f = FUM[b.fum || "alp"];
  const num = (v) => (+v > 0 ? String(+(+v).toFixed(2)) : "");
  const c = {
    country: str(b.country, 60).toUpperCase(), fum: f ? f[0] : "", fumCode: f ? f[1] : "",
    fumDate: iso(b.fumDate), degasDate: iso(b.degasDate), port: str(b.port, 80), place: str(b.place, 120),
    dose: num(b.dose), hours: num(b.hours), temp: str(b.temp, 10), hum: str(b.hum, 10),
    gastight: b.gastight === "No" ? "No" : "Yes", container: str(b.container, 200) || "Sheeted Stack",
    expName: str(b.expName, 120), expAddr: str(b.expAddr, 300), impName: str(b.impName, 120), impAddr: str(b.impAddr, 300),
    cargo: str(b.cargo, 250), qty: str(b.qty, 120), pack: str(b.pack, 120), mark: str(b.mark, 120) || "As per invoice",
    invNo: str(b.invNo, 60), invDate: iso(b.invDate)
  };
  if (!f) return { error: "Select a valid fumigant" };
  const miss = NEED.find(([k]) => !c[k]);
  return miss ? { error: miss[1] + " is required" } : { c };
}
function finish(c, u, serial) {
  return { ...c, no: u.prefix + "/" + c.fumCode + "/" + fy() + "/" + String(serial).padStart(4, "0"),
    vid: crypto.randomBytes(5).toString("hex").toUpperCase(), issue: today() };
}
// Public verify page par yahi dikhta hai
const pub = (c, u) => ({ no: c.no, company: u.name, issue: c.issue, fum: c.fum, fumDate: c.fumDate, port: c.port,
  country: c.country, impName: c.impName, expName: c.expName, cargo: c.cargo, container: c.container });
module.exports = { validate, finish, pub, FUM };
