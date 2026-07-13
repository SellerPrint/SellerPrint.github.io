/**
 * scripts/lib/discovery-store.js
 * Registre des IDs déjà évalués par scripts/discover-products.js, pour ne
 * pas re-scraper/re-vérifier indéfiniment les mêmes candidats à chaque run.
 * Un candidat rejeté est réessayé après COOLDOWN_DAYS (le blocage était
 * peut-être temporaire — anti-bot, rupture de stock passagère...).
 */
const fs = require("fs");
const path = require("path");

const SEEN_PATH = path.join(__dirname, "..", "..", "products.discovery-seen.json");
const COOLDOWN_DAYS = 30;

function readSeen() {
  if (!fs.existsSync(SEEN_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
  } catch (_) {
    return {};
  }
}

function writeSeen(seen) {
  fs.writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2));
}

function shouldSkip(seen, id) {
  const entry = seen[id];
  if (!entry) return false;
  if (entry.status === "added") return true; // déjà dans products.js normalement
  const ageDays = (Date.now() - new Date(entry.checkedAt).getTime()) / 86400000;
  return ageDays < COOLDOWN_DAYS;
}

function markSeen(seen, id, status, reason) {
  seen[id] = { status, reason: reason || null, checkedAt: new Date().toISOString() };
}

module.exports = { SEEN_PATH, readSeen, writeSeen, shouldSkip, markSeen };
