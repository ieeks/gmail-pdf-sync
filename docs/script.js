const DEMO = {
  rennweg: [
    { zeitraum_von: "2023-02-01", zeitraum_bis: "2024-01-31", rechnungsdatum: "2024-02-05", kwh: 1820, energiekosten: 148.5, netzgebuehren: 138.2, steuern: 78.1, gesamt_inkl_ust: 437.6 },
    { zeitraum_von: "2024-02-01", zeitraum_bis: "2025-01-31", rechnungsdatum: "2025-02-03", kwh: 1950, energiekosten: 162.3, netzgebuehren: 144.8, steuern: 82.4, gesamt_inkl_ust: 469.5 },
    { zeitraum_von: "2025-02-01", zeitraum_bis: "2026-01-31", rechnungsdatum: "2026-02-04", kwh: 1780, energiekosten: 155, netzgebuehren: 141, steuern: 80.2, gesamt_inkl_ust: 450 },
  ],
  aspangstrasse: [
    { zeitraum_von: "2023-02-01", zeitraum_bis: "2024-01-31", rechnungsdatum: "2024-02-05", kwh: 3240, energiekosten: 272.1, netzgebuehren: 198.4, steuern: 112.3, gesamt_inkl_ust: 700.5 },
    { zeitraum_von: "2024-02-01", zeitraum_bis: "2025-01-31", rechnungsdatum: "2025-02-03", kwh: 3580, energiekosten: 298.2, netzgebuehren: 210.6, steuern: 121.8, gesamt_inkl_ust: 758.4 },
    { zeitraum_von: "2025-02-01", zeitraum_bis: "2026-01-31", rechnungsdatum: "2026-02-04", kwh: 3410, energiekosten: 285.5, netzgebuehren: 205.3, steuern: 118.6, gesamt_inkl_ust: 730.2 },
  ],
};

const THEME_STORAGE_KEY = "gmail-pdf-sync-theme";
const chartRegistry = [];

const fmt = (n, d = 0) => n.toLocaleString("de-AT", {
  minimumFractionDigits: d,
  maximumFractionDigits: d,
});

const fmtE = (n) => n.toLocaleString("de-AT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const label = (entry) => {
  const date = new Date(entry.rechnungsdatum);
  return date.toLocaleDateString("de-AT", { month: "short", year: "2-digit" });
};

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.checked = theme === "dark";
    toggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Ignore storage failures.
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
  void render();
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function loadData() {
  try {
    const [rennweg, aspangstrasse] = await Promise.all([
      fetch("../data/rennweg.json").then((response) => {
        if (!response.ok) throw new Error("rennweg.json missing");
        return response.json();
      }),
      fetch("../data/aspangstrasse.json").then((response) => {
        if (!response.ok) throw new Error("aspangstrasse.json missing");
        return response.json();
      }),
    ]);
    return { rennweg, aspangstrasse, demo: false };
  } catch (error) {
    console.warn("data/*.json nicht gefunden — zeige Demo-Daten");
    return { ...DEMO, demo: true };
  }
}

function destroyCharts() {
  while (chartRegistry.length) {
    const chart = chartRegistry.pop();
    chart.destroy();
  }
}

function buildChartDefaults() {
  const border = getCssVar("--border");
  const tick = getCssVar("--text-muted");
  const text = getCssVar("--text");
  const tooltipBg = getCssVar("--surface-solid");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: text,
        bodyColor: text,
        borderColor: border,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { color: border, drawBorder: false },
        ticks: { color: tick, font: { family: "Inter", size: 11 } },
      },
      y: {
        grid: { color: border, drawBorder: false },
        ticks: { color: tick, font: { family: "Inter", size: 11 } },
      },
    },
  };
}

function createBarChart(id, labels, datasets) {
  const defaults = buildChartDefaults();
  const chart = new Chart(document.getElementById(id), {
    type: "bar",
    data: { labels, datasets },
    options: {
      ...defaults,
      scales: {
        x: { ...defaults.scales.x },
        y: { ...defaults.scales.y },
      },
    },
  });
  chartRegistry.push(chart);
}

function buildSummaryCards(rennweg, aspang) {
  const lastR = rennweg[rennweg.length - 1];
  const lastA = aspang[aspang.length - 1];
  const totalKwhR = rennweg.reduce((sum, entry) => sum + entry.kwh, 0);
  const totalKwhA = aspang.reduce((sum, entry) => sum + entry.kwh, 0);
  const avgR = (lastR.gesamt_inkl_ust / lastR.kwh) * 100;
  const avgA = (lastA.gesamt_inkl_ust / lastA.kwh) * 100;

  return `
    <article class="summary-card">
      <div class="summary-head">
        <div class="summary-label">Letzte Rechnung</div>
        <span class="summary-badge summary-badge-rennweg">Rennweg</span>
      </div>
      <div class="summary-value rennweg">${fmtE(lastR.gesamt_inkl_ust)} €</div>
      <div class="summary-sub">${fmt(lastR.kwh)} kWh · ${fmt(avgR, 1)} ct/kWh</div>
    </article>
    <article class="summary-card">
      <div class="summary-head">
        <div class="summary-label">Letzte Rechnung</div>
        <span class="summary-badge summary-badge-aspang">Aspangstraße</span>
      </div>
      <div class="summary-value aspang">${fmtE(lastA.gesamt_inkl_ust)} €</div>
      <div class="summary-sub">${fmt(lastA.kwh)} kWh · ${fmt(avgA, 1)} ct/kWh</div>
    </article>
    <article class="summary-card">
      <div class="summary-head">
        <div class="summary-label">Gesamtverbrauch</div>
        <span class="summary-badge summary-badge-rennweg">Rennweg</span>
      </div>
      <div class="summary-value rennweg">${fmt(totalKwhR)}</div>
      <div class="summary-sub">${rennweg.length} Abrechnungen im Datensatz</div>
    </article>
    <article class="summary-card">
      <div class="summary-head">
        <div class="summary-label">Gesamtverbrauch</div>
        <span class="summary-badge summary-badge-aspang">Aspangstraße</span>
      </div>
      <div class="summary-value aspang">${fmt(totalKwhA)}</div>
      <div class="summary-sub">${aspang.length} Abrechnungen mit Wallbox</div>
    </article>
  `;
}

function buildHistory(entries) {
  return entries.map((entry) => {
    const ct = (entry.gesamt_inkl_ust / entry.kwh) * 100;
    const name = entry.haushalt === "rennweg" ? "Rennweg" : "Aspangstr.";
    const cls = entry.haushalt === "rennweg" ? "household-rennweg" : "household-aspang";
    const from = new Date(entry.zeitraum_von).toLocaleDateString("de-AT", { month: "2-digit", year: "2-digit" });
    const to = new Date(entry.zeitraum_bis).toLocaleDateString("de-AT", { month: "2-digit", year: "2-digit" });

    return `
      <tr>
        <td>${from} – ${to}</td>
        <td><span class="table-badge ${cls}">${name}</span></td>
        <td>${fmt(entry.kwh)}</td>
        <td>${fmtE(entry.energiekosten)}</td>
        <td>${fmtE(entry.netzgebuehren)}</td>
        <td class="total-cell">${fmtE(entry.gesamt_inkl_ust)}</td>
        <td>${fmt(ct, 1)}</td>
      </tr>
    `;
  }).join("");
}

async function render() {
  const data = await loadData();
  const { rennweg, aspangstrasse, demo } = data;

  destroyCharts();

  const allDates = [...rennweg, ...aspangstrasse]
    .map((entry) => entry.rechnungsdatum)
    .sort()
    .reverse();

  document.getElementById("dataModeBadge").textContent = demo ? "Demo-Daten" : "Live-Daten";
  document.getElementById("lastUpdate").textContent =
    "Stand: " + new Date(allDates[0]).toLocaleDateString("de-AT");

  document.getElementById("summaryCards").innerHTML = buildSummaryCards(rennweg, aspangstrasse);
  document.getElementById("mainContent").hidden = false;

  const labels = rennweg.map(label);
  const rennwegColor = getCssVar("--rennweg");
  const rennwegDim = getCssVar("--rennweg-dim");
  const aspangColor = getCssVar("--aspang");
  const aspangDim = getCssVar("--aspang-dim");

  createBarChart("chartVerbrauch", labels, [
    {
      label: "Rennweg kWh",
      data: rennweg.map((entry) => entry.kwh),
      backgroundColor: rennwegDim,
      borderColor: rennwegColor,
      borderWidth: 1.6,
      borderRadius: 6,
    },
    {
      label: "Aspangstraße kWh",
      data: aspangstrasse.map((entry) => entry.kwh),
      backgroundColor: aspangDim,
      borderColor: aspangColor,
      borderWidth: 1.6,
      borderRadius: 6,
    },
  ]);

  createBarChart("chartKostenR", rennweg.map(label), [
    { label: "Energiekosten", data: rennweg.map((entry) => entry.energiekosten), backgroundColor: rennwegColor, borderRadius: 5 },
    { label: "Netzgebühren", data: rennweg.map((entry) => entry.netzgebuehren), backgroundColor: "rgba(44, 165, 141, 0.38)", borderRadius: 5 },
    { label: "Steuern", data: rennweg.map((entry) => entry.steuern), backgroundColor: "rgba(44, 165, 141, 0.18)", borderRadius: 5 },
  ]);

  createBarChart("chartKostenA", aspangstrasse.map(label), [
    { label: "Energiekosten", data: aspangstrasse.map((entry) => entry.energiekosten), backgroundColor: aspangColor, borderRadius: 5 },
    { label: "Netzgebühren", data: aspangstrasse.map((entry) => entry.netzgebuehren), backgroundColor: "rgba(217, 107, 59, 0.36)", borderRadius: 5 },
    { label: "Steuern", data: aspangstrasse.map((entry) => entry.steuern), backgroundColor: "rgba(217, 107, 59, 0.16)", borderRadius: 5 },
  ]);

  const entries = [
    ...rennweg.map((entry) => ({ ...entry, haushalt: "rennweg" })),
    ...aspangstrasse.map((entry) => ({ ...entry, haushalt: "aspangstrasse" })),
  ].sort((a, b) => b.rechnungsdatum.localeCompare(a.rechnungsdatum));

  document.getElementById("historyBody").innerHTML = buildHistory(entries);
}

function init() {
  setTheme(getPreferredTheme());
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("change", toggleTheme);
  }
  void render();
}

init();
