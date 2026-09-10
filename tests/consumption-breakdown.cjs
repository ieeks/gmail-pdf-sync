const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const nodes = {};
const ctx = vm.createContext({document: {getElementById: id => nodes[id] ||= {value: "", innerHTML: ""}}});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../docs/script.js"), "utf8").replace(/\ninit\(\);\s*$/, ""), ctx);
const run = source => vm.runInContext(source, ctx);
run(`
  state.data = {entries: [
    ...normalizeEntries([{rechnungsnummer:"rw",rechnungsdatum:"2026-09-07",zeitraum_von:"2026-08-01",zeitraum_bis:"2026-08-31",kwh:316.17,gesamt_inkl_ust:86.08}], "rennweg"),
    ...normalizeEntries([{rechnungsnummer:"as",rechnungsdatum:"2026-09-07",zeitraum_von:"2026-08-01",zeitraum_bis:"2026-08-31",kwh:579.36,gesamt_inkl_ust:146.36},
      {rechnungsnummer:"july",rechnungsdatum:"2026-08-07",zeitraum_von:"2026-07-01",zeitraum_bis:"2026-07-31",kwh:327.87,gesamt_inkl_ust:89.24}], "aspangstrasse")
  ]};
  state.wallbox.charges=[{date:"2026-08-15",kwh:414},{date:"2026-09-01",kwh:100}];
  renderConsumptionBreakdown();
`);
const html = () => nodes.consumptionBreakdown.innerHTML;
assert.equal(nodes.consumptionMonth.value, "2026-08");
for (const value of ["316 kWh", "165 kWh", "414 kWh", "895 kWh"]) assert(html().includes(value));
// Die Balken müssen sich exakt auf die Gesamtzeile addieren (Largest-Remainder),
// und die exakten Wallbox-kWh dürfen dabei nicht verschoben werden.
const kwhValues = html().match(/(\d+) kWh/g).map(v => parseInt(v));
assert.equal(kwhValues[0] + kwhValues[1] + kwhValues[2], kwhValues[3]);
assert(html().includes("414 kWh"));
assert(html().includes("Aspang · Haushalt"));
run("state.wallbox.charges=[];renderConsumptionBreakdown()");
assert(html().includes("Aspang · gesamt"));
assert(html().includes("579 kWh"));
assert(!html().includes("Aspang · Haushalt"));
run('state.wallbox.charges=[{date:"2026-08-15",kwh:600}];renderConsumptionBreakdown()');
assert(html().includes("passen nicht zusammen"));
assert(!html().includes("600 kWh"));
nodes.consumptionMonth.value = "2026-07";
run("renderConsumptionBreakdown()");
assert(html().includes("328 kWh"));
assert(html().includes("Erfasster Standort gesamt"));
assert(!html().includes("895 kWh"));
// Monat ohne Aspang-Rechnung: das benennen, nicht als Ladedaten-Problem ausgeben
run(`
  state.data={entries:normalizeEntries([{rechnungsnummer:"rw",rechnungsdatum:"2026-05-07",zeitraum_von:"2026-04-21",zeitraum_bis:"2026-04-30",kwh:74.55,gesamt_inkl_ust:22.2}],"rennweg")};
  state.wallbox.charges=[];
  document.getElementById("consumptionMonth").value="";
  renderConsumptionBreakdown();
`);
assert(html().includes("keine Rechnung für Aspangstraße"));
assert(!html().includes("Keine vollständige Zuordnung"));
assert(!html().includes("als Gesamtverbrauch angezeigt"));
assert(html().includes("75 kWh"));

run("state.data.entries=[];renderConsumptionBreakdown()");
assert(html().includes("Noch keine Rechnungsdaten"));
assert(nodes.consumptionMonth.disabled);
console.log("PASS: August split, latest month, missing/invalid wallbox, month selection, missing location, empty data");
