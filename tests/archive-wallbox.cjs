const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Execute the actual dashboard functions without starting Firebase or the app.
const source = fs.readFileSync(path.join(__dirname, "../docs/script.js"), "utf8")
  .replace(/\ninit\(\);\s*$/, "");
const nodes = {};
const context = vm.createContext({
  document: { getElementById: id => nodes[id] ??= { innerHTML: "", classList: { toggle() {} } } },
});
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
run(`
  state.archive.location = "aspangstrasse";
  globalThis.aug = {
    fromDate: parseDate("2026-08-01"), toDate: parseDate("2026-08-31"),
    kwh: 579.36, gesamt_inkl_ust: 146.36, energiekosten: 76.41
  };
  state.wallbox.charges = [
    {date: "2026-08-01", kwh: 14}, {date: "2026-08-31", kwh: 400},
    {date: "2026-09-01", kwh: 40}
  ];
`);
assert.equal(run("wallboxKwhInPeriod(aug.fromDate, aug.toDate)"), 414);
assert.equal(run("wallboxUnbilled(aug.toDate).kwh"), 40);
assert.equal(run("wallboxCostShare(aug, 414).toFixed(2)"), "104.59");
run("renderArchiveSummary([aug])");
assert.match(nodes.archiveSummary.innerHTML, /≈ 105 EUR/);
assert.match(nodes.archiveSummary.innerHTML, /Kosten anteilig, inkl\. Fixkosten/);
assert.match(nodes.archiveSummary.innerHTML, /Nur erfasste Ladungen/);
assert.match(nodes.archiveSummary.innerHTML, /71%/);

run(`
  globalThis.current = {...aug, kwh: 100, gesamt_inkl_ust: 30};
  globalThis.old = {...current, fromDate: parseDate("2026-05-01"), toDate: parseDate("2026-05-31")};
  state.wallbox.charges = [{date: "2026-08-15", kwh: 50}];
  renderArchiveSummary([current, old]);
`);
assert.match(nodes.archiveSummary.innerHTML, /Wallbox: 50,0 kWh/);
assert.match(nodes.archiveSummary.innerHTML, /1 von 2 Rechnungen ohne Ladedaten/);
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /%/);
run("renderArchiveSummary([current])");
assert.match(nodes.archiveSummary.innerHTML, /50%/);
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /ohne Ladedaten/);

for (const location of ["all", "rennweg"]) {
  run(`state.archive.location = "${location}"; renderArchiveSummary([current]);`);
  assert.equal(run("archiveWallboxInfo(current)"), null);
  assert.doesNotMatch(nodes.archiveSummary.innerHTML, /archive-foot-wallbox/);
}
run('state.archive.location = "aspangstrasse"; state.wallbox.charges = []; renderArchiveSummary([current]);');
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /archive-foot-wallbox/);

run('state.wallbox.charges = [{date: "2026-08-15", kwh: 150}]; renderArchiveSummary([current]);');
assert.equal(run("archiveWallboxInfo(current).cost"), null);
assert.match(nodes.archiveSummary.innerHTML, /passt nicht zum Rechnungsverbrauch/);
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /≈|%/);
run("renderArchiveSummary([current, {...current, kwh: 1000}])");
assert.match(nodes.archiveSummary.innerHTML, /passt nicht zum Rechnungsverbrauch/);
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /≈|%/);
assert.doesNotMatch(nodes.archiveSummary.innerHTML, /inkl\. Fixkosten/);
assert.equal(run("archiveWallboxInfo({...current, kwh: 0}).inconsistent"), true);

run(`
  globalThis.getFilteredArchiveEntries = () => [current];
  renderArchiveTable();
`);
assert.match(nodes.archiveTableBody.innerHTML, /passt nicht zum Rechnungsverbrauch/);
assert.doesNotMatch(nodes.archiveTableBody.innerHTML, /≈/);
console.log("PASS: cost allocation, date boundaries, filters, missing history, inconsistent row and summary");
