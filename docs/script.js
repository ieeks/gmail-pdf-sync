const DEMO_DATA = {
  rennweg: [
    {
      rechnungsdatum: "2023-02-05",
      zeitraum_von: "2022-02-01",
      zeitraum_bis: "2023-01-31",
      kwh: 1680,
      energiekosten: 211.42,
      netzgebuehren: 136.5,
      steuern: 74.22,
      gesamt_inkl_ust: 422.14,
      rechnungsnummer: "VR-RW-2023-0205",
    },
    {
      rechnungsdatum: "2024-02-05",
      zeitraum_von: "2023-02-01",
      zeitraum_bis: "2024-01-31",
      kwh: 1820,
      energiekosten: 238.6,
      netzgebuehren: 144.15,
      steuern: 85.1,
      gesamt_inkl_ust: 467.85,
      rechnungsnummer: "VR-RW-2024-0205",
    },
    {
      rechnungsdatum: "2025-02-03",
      zeitraum_von: "2024-02-01",
      zeitraum_bis: "2025-01-31",
      kwh: 1950,
      energiekosten: 255.1,
      netzgebuehren: 148.9,
      steuern: 92.4,
      gesamt_inkl_ust: 496.4,
      rechnungsnummer: "VR-RW-2025-0203",
    },
    {
      rechnungsdatum: "2026-02-04",
      zeitraum_von: "2025-02-01",
      zeitraum_bis: "2026-01-31",
      kwh: 1780,
      energiekosten: 242.2,
      netzgebuehren: 141.7,
      steuern: 86.6,
      gesamt_inkl_ust: 470.5,
      rechnungsnummer: "VR-RW-2026-0204",
    },
  ],
  aspangstrasse: [
    {
      rechnungsdatum: "2023-02-05",
      zeitraum_von: "2022-02-01",
      zeitraum_bis: "2023-01-31",
      kwh: 3120,
      energiekosten: 378.4,
      netzgebuehren: 206.8,
      steuern: 118.1,
      gesamt_inkl_ust: 703.3,
      rechnungsnummer: "VR-AS-2023-0205",
    },
    {
      rechnungsdatum: "2024-02-05",
      zeitraum_von: "2023-02-01",
      zeitraum_bis: "2024-01-31",
      kwh: 3240,
      energiekosten: 392.3,
      netzgebuehren: 214.4,
      steuern: 126.5,
      gesamt_inkl_ust: 733.2,
      rechnungsnummer: "VR-AS-2024-0205",
    },
    {
      rechnungsdatum: "2025-02-03",
      zeitraum_von: "2024-02-01",
      zeitraum_bis: "2025-01-31",
      kwh: 3580,
      energiekosten: 436.2,
      netzgebuehren: 221.8,
      steuern: 138.6,
      gesamt_inkl_ust: 796.6,
      rechnungsnummer: "VR-AS-2025-0203",
    },
    {
      rechnungsdatum: "2026-02-04",
      zeitraum_von: "2025-02-01",
      zeitraum_bis: "2026-01-31",
      kwh: 3410,
      energiekosten: 424.1,
      netzgebuehren: 217.2,
      steuern: 134.8,
      gesamt_inkl_ust: 776.1,
      rechnungsnummer: "VR-AS-2026-0204",
    },
  ],
};

const STORAGE_KEYS = {
  activeScreen: "voltmetric-active-screen",
  settings: "voltmetric-prototype-settings",
};

const SCREEN_META = {
  overview: {
    title: "Overview",
    subtitle: "Kuratiertes Billing-Overview fuer Rennweg und Aspangstrasse.",
  },
  detail: {
    title: "Insights",
    subtitle: "Monatlich normalisierte Trends, Kostenkurven und Standortvergleich.",
  },
  archive: {
    title: "Billing Archive",
    subtitle: "Filterbares Rechnungsarchiv mit modalem Preview-Prototyp.",
  },
  settings: {
    title: "Settings",
    subtitle: "Gmail-Labels, Meter Points und Dashboard-Defaults als UI-Prototyp.",
  },
};

const DEFAULT_SETTINGS = {
  gmailAccount: "manuel.rechnungen@gmail.com",
  gmailLabel: "Rechnungen",
  syncFrequency: "daily",
  currency: "EUR",
  meterRennweg: "AT002000000000000000123456789",
  meterAspang: "AT0020000000000000987654321",
  baseDirectory: "/iCloud/Drive/Energy_Sync/Invoices",
  outputTarget: "/VoltMetric/Output/JSON",
  livePulse: true,
};

function getStoredActiveScreen() {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeScreen) || "overview";
  } catch (_error) {
    return "overview";
  }
}

const WALLBOX_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkCyR1nFg38VvJi6POYzfVblRuV5OIvwM",
  authDomain: "wallbox-manuel.firebaseapp.com",
  projectId: "wallbox-manuel",
  storageBucket: "wallbox-manuel.firebasestorage.app",
  messagingSenderId: "547824093655",
  appId: "1:547824093655:web:05c57f3e9a810edcce6392",
};

const state = {
  activeScreen: getStoredActiveScreen(),
  charts: {},
  data: null,
  wallbox: { byMonth: {}, byYear: {} },
  archive: {
    search: "",
    year: "all",
    location: "all",
  },
  settings: loadStoredSettings(),
  modalEntryId: null,
};

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_error) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveStoredSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (_error) {
    // Ignore storage failures in restricted contexts.
  }
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("de-AT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(value) {
  return `${formatNumber(value, 2)} EUR`;
}

function formatCompactCurrency(value) {
  return `${formatNumber(value, 0)} EUR`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthLabel(value) {
  return new Date(value).toLocaleDateString("de-AT", {
    month: "short",
    year: "2-digit",
  });
}

function formatPeriod(entry) {
  return `${formatDate(entry.zeitraumVon)} - ${formatDate(entry.zeitraumBis)}`;
}

function locationLabel(location) {
  return location === "rennweg" ? "Rennweg" : "Aspangstrasse";
}

function toNumber(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "0").replace(",", "."));
}

function parseDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function normalizeEntries(entries, location) {
  return entries
    .map((entry, index) => {
      const invoiceDate = parseDate(entry.rechnungsdatum);
      const fromDate = parseDate(entry.zeitraum_von || entry.rechnungsdatum);
      const toDate = parseDate(entry.zeitraum_bis || entry.rechnungsdatum);
      const total = toNumber(entry.gesamt_inkl_ust);
      const kwh = toNumber(entry.kwh);
      return {
        id: `${location}-${entry.rechnungsnummer || invoiceDate.toISOString() || index}`,
        location,
        locationLabel: locationLabel(location),
        rechnungsdatum: entry.rechnungsdatum,
        rechnungsnummer: entry.rechnungsnummer || `${location.toUpperCase()}-${invoiceDate.getFullYear()}-${index + 1}`,
        zeitraumVon: entry.zeitraum_von || entry.rechnungsdatum,
        zeitraumBis: entry.zeitraum_bis || entry.rechnungsdatum,
        invoiceDate,
        fromDate,
        toDate,
        year: invoiceDate.getFullYear(),
        kwh,
        energiekosten: toNumber(entry.energiekosten),
        netzgebuehren: toNumber(entry.netzgebuehren),
        steuern: toNumber(entry.steuern),
        gesamt_inkl_ust: total,
        centsPerKwh: kwh > 0 ? (total / kwh) * 100 : 0,
      };
    })
    .sort((a, b) => a.invoiceDate - b.invoiceDate);
}

async function loadLocationFile(path, fallback, location) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Fetch failed for ${path}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error(`Empty payload for ${path}`);
    }
    return { entries: normalizeEntries(payload, location), demo: false };
  } catch (_error) {
    return { entries: normalizeEntries(fallback, location), demo: true };
  }
}

async function loadData() {
  const [rennweg, aspang] = await Promise.all([
    loadLocationFile("../data/rennweg.json", DEMO_DATA.rennweg, "rennweg"),
    loadLocationFile("../data/aspangstrasse.json", DEMO_DATA.aspangstrasse, "aspangstrasse"),
  ]);

  const entries = [...rennweg.entries, ...aspang.entries].sort((a, b) => b.invoiceDate - a.invoiceDate);
  return {
    rennweg: rennweg.entries,
    aspangstrasse: aspang.entries,
    entries,
    demo: rennweg.demo || aspang.demo,
  };
}

async function loadWallboxData() {
  try {
    if (typeof firebase === "undefined") return { byMonth: {}, byYear: {} };
    const existing = firebase.apps.find((a) => a.name === "voltmetric-wallbox");
    const app = existing || firebase.initializeApp(WALLBOX_FIREBASE_CONFIG, "voltmetric-wallbox");
    const db = firebase.firestore(app);
    const doc = await db.collection("haushalte").doc("haushalt").get();
    if (!doc.exists) return { byMonth: {}, byYear: {} };
    const charges = doc.data().charges || [];
    const byMonth = {};
    const byYear = {};
    charges.forEach((c) => {
      if (!c.date || !c.kwh) return;
      const month = c.date.substring(0, 7);
      const year = Number(c.date.substring(0, 4));
      byMonth[month] = (byMonth[month] || 0) + Number(c.kwh);
      byYear[year] = (byYear[year] || 0) + Number(c.kwh);
    });
    return { byMonth, byYear };
  } catch (_err) {
    return { byMonth: {}, byYear: {} };
  }
}

function sumEntries(entries, key) {
  return entries.reduce((sum, entry) => sum + entry[key], 0);
}

function getLatestEntry(entries) {
  return [...entries].sort((a, b) => b.invoiceDate - a.invoiceDate)[0];
}

function buildYearBuckets(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    if (!map.has(entry.year)) {
      map.set(entry.year, {
        year: entry.year,
        rennwegKwh: 0,
        aspangKwh: 0,
        rennwegCost: 0,
        aspangCost: 0,
      });
    }
    const bucket = map.get(entry.year);
    const costKey = entry.location === "rennweg" ? "rennwegCost" : "aspangCost";
    const kwhKey = entry.location === "rennweg" ? "rennwegKwh" : "aspangKwh";
    bucket[costKey] += entry.gesamt_inkl_ust;
    bucket[kwhKey] += entry.kwh;
  });
  return [...map.values()].sort((a, b) => a.year - b.year);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function eachMonthBetween(startDate, endDate) {
  const months = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.length ? months : [new Date(startDate)];
}

function buildMonthlySeries(data) {
  const map = new Map();
  data.entries.forEach((entry) => {
    const months = eachMonthBetween(entry.fromDate, entry.toDate);
    const kwhPerMonth = entry.kwh / months.length;
    const costPerMonth = entry.gesamt_inkl_ust / months.length;
    months.forEach((month) => {
      const key = monthKey(month);
      if (!map.has(key)) {
        map.set(key, {
          label: new Date(month),
          rennwegKwh: 0,
          aspangKwh: 0,
          rennwegCost: 0,
          aspangCost: 0,
        });
      }
      const bucket = map.get(key);
      const prefix = entry.location === "rennweg" ? "rennweg" : "aspang";
      bucket[`${prefix}Kwh`] += kwhPerMonth;
      bucket[`${prefix}Cost`] += costPerMonth;
    });
  });

  return [...map.values()]
    .sort((a, b) => a.label - b.label)
    .slice(-18);
}

function getSummary(data) {
  const latestRennweg = getLatestEntry(data.rennweg);
  const latestAspang = getLatestEntry(data.aspangstrasse);
  return {
    totalKwh: sumEntries(data.entries, "kwh"),
    totalCost: sumEntries(data.entries, "gesamt_inkl_ust"),
    avgRennweg: latestRennweg.centsPerKwh,
    avgAspang: latestAspang.centsPerKwh,
    totalTaxes: sumEntries(data.entries, "steuern"),
    totalNetwork: sumEntries(data.entries, "netzgebuehren"),
    latestInvoice: data.entries[0],
    latestRennweg,
    latestAspang,
  };
}

function destroyCharts() {
  Object.values(state.charts).forEach((chart) => chart.destroy());
  state.charts = {};
}

function getCssValue(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function createChart(canvasId, config) {
  if (!window.Chart) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (state.charts[canvasId]) {
    state.charts[canvasId].data = config.data;
    state.charts[canvasId].update("none");
    return;
  }
  state.charts[canvasId] = new Chart(canvas, config);
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: "#334155",
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,
          font: {
            family: "Inter",
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#0f172a",
        bodyColor: "#0f172a",
        borderColor: "rgba(148, 163, 184, 0.20)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 14,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          font: {
            family: "Inter",
            weight: 600,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.16)",
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          font: {
            family: "Inter",
            weight: 600,
          },
        },
      },
    },
  };
}

function renderWallboxKennzahl() {
  const el = document.getElementById("wallboxKennzahl");
  if (!el) return;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const wallboxKwh = state.wallbox.byMonth[currentMonth] || 0;
  if (wallboxKwh === 0) {
    el.classList.add("hidden");
    return;
  }
  const latestAspang = state.data.aspangstrasse[state.data.aspangstrasse.length - 1];
  const monthlyAvg = latestAspang ? latestAspang.kwh / 12 : 0;
  const pct = monthlyAvg > 0 ? Math.round((wallboxKwh / monthlyAvg) * 100) : 0;
  el.classList.remove("hidden");
  el.innerHTML = `<span class="status-chip teal">⚡ ${formatNumber(wallboxKwh, 1)} kWh via Wallbox${pct > 0 ? ` · ${pct}% des Monatsverbrauchs` : ""}</span>`;
}

function renderOverviewCharts() {
  const yearly = buildYearBuckets(state.data.entries);
  const options = baseChartOptions();
  createChart("overviewConsumptionChart", {
    type: "bar",
    data: {
      labels: yearly.map((bucket) => String(bucket.year)),
      datasets: [
        {
          label: "Rennweg",
          data: yearly.map((bucket) => bucket.rennwegKwh),
          backgroundColor: "#008080",
          borderRadius: 6,
          stack: "rennweg",
        },
        {
          label: "Aspangstr. Haushalt",
          data: yearly.map((bucket) => Math.max(0, bucket.aspangKwh - (state.wallbox.byYear[bucket.year] || 0))),
          backgroundColor: "#5dcaa5",
          borderRadius: 0,
          stack: "aspang",
        },
        {
          label: "Aspangstr. Wallbox",
          data: yearly.map((bucket) => state.wallbox.byYear[bucket.year] || 0),
          backgroundColor: "#0f6e56",
          borderRadius: 6,
          stack: "aspang",
        },
      ],
    },
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins.tooltip,
          filter(item) {
            return item.dataset.label !== "Aspangstr. Haushalt";
          },
          callbacks: {
            label(context) {
              if (context.dataset.label === "Aspangstr. Wallbox") {
                const bucket = yearly[context.dataIndex];
                const wbKwh = state.wallbox.byYear[bucket.year] || 0;
                const hausKwh = Math.max(0, bucket.aspangKwh - wbKwh);
                if (wbKwh > 0) {
                  return `Aspangstr.: ${formatNumber(wbKwh)} kWh Wallbox · ${formatNumber(hausKwh)} kWh Haushalt · ${formatNumber(bucket.aspangKwh)} kWh gesamt`;
                }
                return `Aspangstrasse: ${formatNumber(bucket.aspangKwh)} kWh`;
              }
              return `${context.dataset.label}: ${formatNumber(context.parsed.y)} kWh`;
            },
          },
        },
      },
      scales: {
        ...options.scales,
        x: {
          ...options.scales.x,
          stacked: true,
        },
        y: {
          ...options.scales.y,
          stacked: true,
          ticks: {
            ...options.scales.y.ticks,
            callback(value) {
              return `${formatNumber(value)} kWh`;
            },
          },
        },
      },
    },
  });
  renderWallboxKennzahl();

  createChart("overviewCostChart", {
    type: "bar",
    data: {
      labels: yearly.map((bucket) => String(bucket.year)),
      datasets: [
        {
          label: "Rennweg",
          data: yearly.map((bucket) => bucket.rennwegCost),
          backgroundColor: "rgba(0, 128, 128, 0.78)",
          borderRadius: 12,
          stack: "cost",
        },
        {
          label: "Aspangstrasse",
          data: yearly.map((bucket) => bucket.aspangCost),
          backgroundColor: "rgba(0, 95, 184, 0.82)",
          borderRadius: 12,
          stack: "cost",
        },
      ],
    },
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins.tooltip,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        ...options.scales,
        x: {
          ...options.scales.x,
          stacked: true,
        },
        y: {
          ...options.scales.y,
          stacked: true,
          ticks: {
            ...options.scales.y.ticks,
            callback(value) {
              return `${formatNumber(value)} EUR`;
            },
          },
        },
      },
    },
  });
}

function renderDetailCharts() {
  const monthly = buildMonthlySeries(state.data);
  const options = baseChartOptions();

  createChart("detailTrendChart", {
    type: "bar",
    data: {
      labels: monthly.map((bucket) => formatMonthLabel(bucket.label)),
      datasets: [
        {
          type: "line",
          label: "Rennweg",
          data: monthly.map((bucket) => bucket.rennwegKwh),
          borderColor: "#008080",
          backgroundColor: "rgba(0, 128, 128, 0.14)",
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 4,
          order: 0,
        },
        {
          label: "Aspangstr. Haushalt",
          data: monthly.map((bucket) => {
            const wbKwh = state.wallbox.byMonth[monthKey(bucket.label)] || 0;
            return Math.max(0, bucket.aspangKwh - wbKwh);
          }),
          backgroundColor: "#5dcaa5",
          borderRadius: 0,
          stack: "aspang",
          order: 1,
        },
        {
          label: "Aspangstr. Wallbox",
          data: monthly.map((bucket) => state.wallbox.byMonth[monthKey(bucket.label)] || 0),
          backgroundColor: "#0f6e56",
          borderRadius: 4,
          stack: "aspang",
          order: 1,
        },
      ],
    },
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins.tooltip,
          filter(item) {
            return item.dataset.label !== "Aspangstr. Haushalt";
          },
          callbacks: {
            label(context) {
              if (context.dataset.label === "Aspangstr. Wallbox") {
                const bucket = monthly[context.dataIndex];
                const mk = monthKey(bucket.label);
                const wbKwh = state.wallbox.byMonth[mk] || 0;
                const hausKwh = Math.max(0, bucket.aspangKwh - wbKwh);
                if (wbKwh > 0) {
                  return `Aspangstr.: ${formatNumber(wbKwh)} kWh Wallbox · ${formatNumber(hausKwh)} kWh Haushalt · ${formatNumber(bucket.aspangKwh)} kWh gesamt`;
                }
                return `Aspangstrasse: ${formatNumber(bucket.aspangKwh)} kWh`;
              }
              return `${context.dataset.label}: ${formatNumber(context.parsed.y, 0)} kWh`;
            },
          },
        },
      },
      scales: {
        ...options.scales,
        x: { ...options.scales.x, stacked: true },
        y: {
          ...options.scales.y,
          stacked: true,
          ticks: {
            ...options.scales.y.ticks,
            callback(value) {
              return `${formatNumber(value)} kWh`;
            },
          },
        },
      },
    },
  });

  createChart("detailCostTrendChart", {
    type: "bar",
    data: {
      labels: monthly.map((bucket) => formatMonthLabel(bucket.label)),
      datasets: [
        {
          label: "Rennweg",
          data: monthly.map((bucket) => bucket.rennwegCost),
          backgroundColor: "rgba(0, 128, 128, 0.75)",
          borderRadius: 10,
          stack: "monthlyCost",
        },
        {
          label: "Aspangstrasse",
          data: monthly.map((bucket) => bucket.aspangCost),
          backgroundColor: "rgba(0, 95, 184, 0.82)",
          borderRadius: 10,
          stack: "monthlyCost",
        },
      ],
    },
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins.tooltip,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        ...options.scales,
        x: {
          ...options.scales.x,
          stacked: true,
        },
        y: {
          ...options.scales.y,
          stacked: true,
          ticks: {
            ...options.scales.y.ticks,
            callback(value) {
              return `${formatNumber(value)} EUR`;
            },
          },
        },
      },
    },
  });
}

function updateChartsForActiveScreen() {
  if (state.activeScreen === "overview") {
    renderOverviewCharts();
  }
  if (state.activeScreen === "detail") {
    renderDetailCharts();
  }
}

function setHeaderMeta() {
  const meta = SCREEN_META[state.activeScreen];
  document.getElementById("screenTitle").textContent = meta.title;
  document.getElementById("screenSubtitle").textContent = meta.subtitle;
}

function renderStatus() {
  const latest = state.data.entries[0];
  const mode = state.data.demo ? "Demo data" : "Live data";
  document.getElementById("headerDataMode").textContent = mode;
  document.getElementById("sidebarDataMode").textContent = mode;
  document.getElementById("sidebarLastUpdate").textContent = latest ? formatDate(latest.rechnungsdatum) : "-";
  const pulse = document.getElementById("sidebarPulse");
  pulse.style.display = state.settings.livePulse ? "inline-flex" : "none";
}

function renderOverview() {
  const summary = getSummary(state.data);

  document.getElementById("overviewHeroStats").innerHTML = `
    <div class="metric-card bg-white/12 text-white">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Total cost</p>
      <strong class="mt-2 block text-3xl font-extrabold">${formatCompactCurrency(summary.totalCost)}</strong>
    </div>
    <div class="metric-card bg-white/12 text-white">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Total kWh</p>
      <strong class="mt-2 block text-3xl font-extrabold">${formatNumber(summary.totalKwh)}</strong>
    </div>
    <div class="metric-card bg-white/12 text-white">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Latest invoice</p>
      <strong class="mt-2 block text-2xl font-extrabold">${summary.latestInvoice ? formatDate(summary.latestInvoice.rechnungsdatum) : "-"}</strong>
    </div>
  `;

  document.getElementById("snapshotCards").innerHTML = `
    <div class="snapshot-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Rennweg</p>
          <strong class="mt-2 block font-display text-3xl font-bold val-teal">${formatNumber(summary.latestRennweg.kwh)} <span class="text-base font-semibold">kWh</span></strong>
          <p class="mt-1 text-sm font-semibold val-amber">${formatCurrency(summary.latestRennweg.gesamt_inkl_ust)}</p>
        </div>
        <span class="status-chip teal">kWh</span>
      </div>
    </div>
    <div class="snapshot-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Aspangstrasse</p>
          <strong class="mt-2 block font-display text-3xl font-bold val-teal">${formatNumber(summary.latestAspang.kwh)} <span class="text-base font-semibold">kWh</span></strong>
          <p class="mt-1 text-sm font-semibold val-amber">${formatCurrency(summary.latestAspang.gesamt_inkl_ust)}</p>
        </div>
        <span class="status-chip teal">kWh</span>
      </div>
    </div>
    ${(function() {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const wallboxKwh = state.wallbox.byMonth[currentMonth] || 0;
      if (wallboxKwh === 0) return "";
      return `
    <div class="snapshot-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Wallbox · Aspangstr.</p>
          <strong class="mt-2 block font-display text-3xl font-bold val-teal">${formatNumber(wallboxKwh, 1)} <span class="text-base font-semibold">kWh</span></strong>
          <p class="mt-1 text-sm text-slate">aktueller Monat</p>
        </div>
        <span class="status-chip teal">EV</span>
      </div>
    </div>`;
    })()}
    <div class="snapshot-card">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Cost structure</p>
          <strong class="mt-2 block font-display text-3xl font-bold val-amber">${formatNumber(summary.totalTaxes + summary.totalNetwork, 2)} EUR</strong>
          <p class="mt-2 text-sm text-slate">${formatCurrency(summary.totalNetwork)} network · ${formatCurrency(summary.totalTaxes)} taxes</p>
        </div>
        <span class="status-chip amber">Tax aware</span>
      </div>
    </div>
  `;

  document.getElementById("kpiGrid").innerHTML = `
    <article class="panel-surface metric-card">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Portfolio kWh</p>
      <div class="mt-3 flex items-baseline gap-2">
        <strong class="big-num val-teal">${formatNumber(summary.totalKwh)}</strong>
        <span class="status-chip teal">kWh</span>
      </div>
      <p class="mt-2 text-sm text-slate">Kumuliert ueber beide Standorte</p>
    </article>
    <article class="panel-surface metric-card">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Portfolio cost</p>
      <div class="mt-3 flex items-baseline gap-2">
        <strong class="big-num val-amber">${formatNumber(summary.totalCost, 0)}</strong>
        <span class="status-chip amber">EUR</span>
      </div>
      <p class="mt-2 text-sm text-slate">Gesamt inklusive Netz und Steuer</p>
    </article>
    <article class="panel-surface metric-card">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Rennweg avg</p>
      <div class="mt-3 flex items-baseline gap-2">
        <strong class="big-num val-teal">${formatNumber(summary.avgRennweg, 1)}</strong>
        <span class="big-num-unit">ct/kWh</span>
      </div>
      <p class="mt-2 text-sm text-slate">ct/kWh auf letzter Rechnung</p>
    </article>
    <article class="panel-surface metric-card">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Aspang avg</p>
      <div class="mt-3 flex items-baseline gap-2">
        <strong class="big-num val-amber">${formatNumber(summary.avgAspang, 1)}</strong>
        <span class="big-num-unit">ct/kWh</span>
      </div>
      <p class="mt-2 text-sm text-slate">ct/kWh mit Wallbox-Profil</p>
    </article>
  `;

  document.getElementById("recentLogs").innerHTML = state.data.entries.slice(0, 5).map((entry) => `
    <div class="log-card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-display text-lg font-bold tracking-tight text-ink">${entry.rechnungsnummer}</p>
          <p class="mt-1 text-sm text-slate">${entry.locationLabel} · ${formatDate(entry.rechnungsdatum)}</p>
        </div>
        <span class="status-chip ${entry.location === "rennweg" ? "bg-secondary/15 text-secondary" : "bg-primary/12 text-primary"}">${entry.locationLabel}</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2 text-sm text-slate">
        <span>${formatNumber(entry.kwh)} kWh</span>
        <span>·</span>
        <span>${formatCurrency(entry.gesamt_inkl_ust)}</span>
      </div>
    </div>
  `).join("");
}

function renderDetail() {
  const locations = [
    { key: "rennweg", entries: state.data.rennweg, badge: "Residential" },
    { key: "aspangstrasse", entries: state.data.aspangstrasse, badge: "Wallbox" },
  ];

  document.getElementById("detailLocationCards").innerHTML = locations.map(({ key, entries, badge }) => {
    const latest = getLatestEntry(entries);
    const totalCost = sumEntries(entries, "gesamt_inkl_ust");
    const totalKwh = sumEntries(entries, "kwh");
    const badgeClass = key === "rennweg" ? "bg-secondary/15 text-secondary" : "bg-accent/16 text-[#8A5A00]";
    return `
      <article class="panel-surface rounded-[2rem] p-5 md:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Location detail</p>
            <h3 class="mt-2 font-display text-3xl font-bold tracking-tight">${locationLabel(key)}</h3>
          </div>
          <span class="status-chip ${badgeClass}">${badge}</span>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="metric-card bg-slate-50/80">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Latest total</p>
            <strong class="mt-2 block text-3xl font-extrabold">${formatCurrency(latest.gesamt_inkl_ust)}</strong>
          </div>
          <div class="metric-card bg-slate-50/80">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Total kWh</p>
            <strong class="mt-2 block text-3xl font-extrabold">${formatNumber(totalKwh)}</strong>
          </div>
          <div class="metric-card bg-slate-50/80">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Latest period</p>
            <strong class="mt-2 block text-2xl font-extrabold">${formatDate(latest.zeitraumBis)}</strong>
          </div>
        </div>
        <p class="mt-4 text-sm leading-7 text-slate">Letzte Rechnung: ${formatPeriod(latest)}. Gesamt im Datensatz: ${formatCompactCurrency(totalCost)} bei ${entries.length} archivierten Statements.</p>
      </article>
    `;
  }).join("");

  document.getElementById("detailInvoices").innerHTML = locations.map(({ key, entries, badge }) => `
    <section class="space-y-3 rounded-[1.7rem] bg-white/78 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="font-display text-2xl font-bold tracking-tight">${locationLabel(key)}</p>
          <p class="text-sm text-slate">${badge === "Wallbox" ? "Wallbox profile active" : "Residential profile"}</p>
        </div>
        <span class="status-chip ${key === "rennweg" ? "bg-secondary/15 text-secondary" : "bg-accent/16 text-[#8A5A00]"}">${badge}</span>
      </div>
      ${[...entries].sort((a, b) => b.invoiceDate - a.invoiceDate).map((entry) => `
        <button class="archive-row flex w-full items-center justify-between rounded-[1.3rem] bg-slate-50/90 px-4 py-4 text-left" data-entry-id="${entry.id}" type="button">
          <div>
            <p class="font-semibold text-ink">${entry.rechnungsnummer}</p>
            <p class="mt-1 text-sm text-slate">${formatDate(entry.rechnungsdatum)} · ${formatNumber(entry.kwh)} kWh</p>
          </div>
          <div class="text-right">
            <p class="font-display text-xl font-bold tracking-tight text-ink">${formatCurrency(entry.gesamt_inkl_ust)}</p>
            <p class="text-sm text-slate">${formatNumber(entry.centsPerKwh, 1)} ct/kWh</p>
          </div>
        </button>
      `).join("")}
    </section>
  `).join("");
}

function renderArchiveFilters() {
  const years = [...new Set(state.data.entries.map((entry) => entry.year))].sort((a, b) => b - a);
  const select = document.getElementById("archiveYear");
  const current = state.archive.year;
  select.innerHTML = `<option value="all">Alle Jahre</option>${years.map((year) => `<option value="${year}">${year}</option>`).join("")}`;
  select.value = years.includes(Number(current)) ? current : "all";
}

function getFilteredArchiveEntries() {
  const term = state.archive.search.trim().toLowerCase();
  return state.data.entries.filter((entry) => {
    const matchesSearch = !term || [
      entry.rechnungsnummer,
      entry.locationLabel,
      formatDate(entry.rechnungsdatum),
      formatDate(entry.zeitraumVon),
      formatDate(entry.zeitraumBis),
    ].join(" ").toLowerCase().includes(term);
    const matchesYear = state.archive.year === "all" || String(entry.year) === String(state.archive.year);
    const matchesLocation = state.archive.location === "all" || entry.location === state.archive.location;
    return matchesSearch && matchesYear && matchesLocation;
  });
}

function renderArchiveTable() {
  const entries = getFilteredArchiveEntries();
  const tbody = document.getElementById("archiveTableBody");
  const empty = document.getElementById("archiveEmpty");

  tbody.innerHTML = entries.map((entry) => `
    <tr class="archive-row" data-entry-id="${entry.id}">
      <td class="px-5">
        <div class="min-w-[12rem]">
          <p class="font-semibold text-ink">${entry.rechnungsnummer}</p>
          <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate">${formatDate(entry.rechnungsdatum)}</p>
        </div>
      </td>
      <td class="px-5">
        <span class="status-chip ${entry.location === "rennweg" ? "bg-secondary/15 text-secondary" : "bg-primary/12 text-primary"}">${entry.locationLabel}</span>
      </td>
      <td class="px-5 text-slate">${formatDate(entry.zeitraumVon)} - ${formatDate(entry.zeitraumBis)}</td>
      <td class="px-5 font-semibold text-ink">${formatNumber(entry.kwh)}</td>
      <td class="px-5 text-slate">${formatCurrency(entry.energiekosten)}</td>
      <td class="px-5 font-display text-lg font-bold tracking-tight text-ink">${formatCurrency(entry.gesamt_inkl_ust)}</td>
      <td class="px-5">
        <button class="action-secondary !min-h-0 !rounded-xl !px-4 !py-2 text-sm" type="button">Open PDF</button>
      </td>
    </tr>
  `).join("");

  empty.classList.toggle("hidden", entries.length !== 0);
}

function renderSettings() {
  const settings = state.settings;
  document.getElementById("gmailAccount").value = settings.gmailAccount;
  document.getElementById("gmailLabel").value = settings.gmailLabel;
  document.getElementById("syncFrequency").value = settings.syncFrequency;
  document.getElementById("currency").value = settings.currency;
  document.getElementById("meterRennweg").value = settings.meterRennweg;
  document.getElementById("meterAspang").value = settings.meterAspang;
  document.getElementById("baseDirectory").value = settings.baseDirectory;
  document.getElementById("outputTarget").value = settings.outputTarget;
  document.getElementById("livePulse").checked = settings.livePulse;
}

function activateScreen(screen) {
  state.activeScreen = screen;
  try {
    localStorage.setItem(STORAGE_KEYS.activeScreen, screen);
  } catch (_error) {
    // Ignore storage failures in restricted contexts.
  }
  document.querySelectorAll("[data-screen]").forEach((section) => {
    section.classList.toggle("screen-active", section.dataset.screen === screen);
  });
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    const active = button.dataset.screenTarget === screen;
    button.classList.toggle("nav-pill-active", active && button.classList.contains("nav-pill"));
    button.classList.toggle("mobile-nav-pill-active", active && button.classList.contains("mobile-nav-pill"));
  });
  // Mobile Glance: switch between glance view (overview) and desktop screens
  document.body.classList.toggle("m-desktop-screen", screen !== "overview");
  setHeaderMeta();
  requestAnimationFrame(() => updateChartsForActiveScreen());
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

function getEntryById(id) {
  return state.data.entries.find((entry) => entry.id === id);
}

function buildModalPreview(entry) {
  return `
    <div class="faux-pdf" data-watermark="VERBUND">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <div class="pdf-line h-4 w-24"></div>
          <div class="pdf-line h-3 w-36"></div>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span class="material-symbols-outlined">bolt</span>
        </div>
      </div>

      <div class="mt-6 grid gap-3">
        <div class="pdf-line h-3 w-full"></div>
        <div class="pdf-line h-3 w-4/5"></div>
        <div class="pdf-line h-3 w-3/5"></div>
      </div>

      <div class="mt-8 grid grid-cols-3 gap-3">
        <div class="h-28 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60"></div>
        <div class="h-28 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60"></div>
        <div class="h-28 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60"></div>
      </div>

      <div class="mt-8 rounded-[1.5rem] bg-slate-50/80 p-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Invoice</p>
            <p class="mt-2 font-display text-2xl font-bold tracking-tight">${entry.rechnungsnummer}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Total</p>
            <p class="mt-2 font-display text-2xl font-bold tracking-tight text-primary">${formatCurrency(entry.gesamt_inkl_ust)}</p>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-center gap-3 text-slate">
        <div class="icon-button !h-11 !w-11"><span class="material-symbols-outlined">zoom_in</span></div>
        <div class="icon-button !h-11 !w-11"><span class="material-symbols-outlined">download</span></div>
        <div class="icon-button !h-11 !w-11"><span class="material-symbols-outlined">open_in_full</span></div>
      </div>
    </div>
  `;
}

function openModal(entryId) {
  const entry = getEntryById(entryId);
  if (!entry) return;
  state.modalEntryId = entryId;
  const modal = document.getElementById("invoiceModal");
  document.getElementById("modalTitle").textContent = entry.rechnungsnummer;
  document.getElementById("modalSubtitle").textContent = `${entry.locationLabel} · ${formatPeriod(entry)}`;
  document.getElementById("modalPreview").innerHTML = buildModalPreview(entry);
  document.getElementById("modalMeta").innerHTML = `
    <div class="metric-card bg-slate-50/90">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Date</p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight">${formatDate(entry.rechnungsdatum)}</p>
    </div>
    <div class="metric-card bg-slate-50/90">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Consumption</p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight">${formatNumber(entry.kwh)} kWh</p>
    </div>
    <div class="metric-card bg-slate-50/90">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Energy cost</p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight">${formatCurrency(entry.energiekosten)}</p>
    </div>
    <div class="metric-card bg-slate-50/90">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Network + tax</p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight">${formatCurrency(entry.netzgebuehren + entry.steuern)}</p>
    </div>
    <div class="metric-card bg-slate-50/90">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Total cost</p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight text-primary">${formatCurrency(entry.gesamt_inkl_ust)}</p>
    </div>
  `;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("invoiceModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function attachEvents() {
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.addEventListener("click", () => {
      activateScreen(button.dataset.screenTarget);
    });
  });

  document.getElementById("manualSyncButton").addEventListener("click", () => {
    showToast(state.data.demo ? "Demo mode active. JSON files are empty or unavailable." : "Live JSON loaded successfully.");
  });

  document.getElementById("archiveSearch").addEventListener("input", (event) => {
    state.archive.search = event.target.value;
    renderArchiveTable();
  });

  document.getElementById("archiveYear").addEventListener("change", (event) => {
    state.archive.year = event.target.value;
    renderArchiveTable();
  });

  document.getElementById("archiveLocation").addEventListener("change", (event) => {
    state.archive.location = event.target.value;
    renderArchiveTable();
  });

  document.getElementById("archiveTableBody").addEventListener("click", (event) => {
    const row = event.target.closest("[data-entry-id]");
    if (row) openModal(row.dataset.entryId);
  });

  document.getElementById("detailInvoices").addEventListener("click", (event) => {
    const target = event.target.closest("[data-entry-id]");
    if (target) openModal(target.dataset.entryId);
  });

  document.getElementById("invoiceModal").addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal='true']")) {
      closeModal();
    }
  });

  document.getElementById("closeModalButton").addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = {
      gmailAccount: document.getElementById("gmailAccount").value.trim(),
      gmailLabel: document.getElementById("gmailLabel").value.trim(),
      syncFrequency: document.getElementById("syncFrequency").value,
      currency: document.getElementById("currency").value,
      meterRennweg: document.getElementById("meterRennweg").value.trim(),
      meterAspang: document.getElementById("meterAspang").value.trim(),
      baseDirectory: document.getElementById("baseDirectory").value.trim(),
      outputTarget: document.getElementById("outputTarget").value.trim(),
      livePulse: document.getElementById("livePulse").checked,
    };
    saveStoredSettings(state.settings);
    renderStatus();
    document.getElementById("settingsNotice").textContent = `Gespeichert um ${new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}`;
    showToast("Settings stored locally.");
  });

  document.getElementById("addPointButton").addEventListener("click", () => {
    showToast("Prototype only. Add-point flow can be wired to your final config model.");
  });

  document.getElementById("globalSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    state.archive.search = event.target.value;
    document.getElementById("archiveSearch").value = event.target.value;
    activateScreen("archive");
    renderArchiveTable();
  });
}

function renderMobileGlance() {
  const summary = getSummary(state.data);
  const now = new Date();
  const monthLabel = now.toLocaleDateString("de-AT", { month: "short", year: "numeric" });

  // Top bar sub
  const mTopSub = document.getElementById("mTopSub");
  if (mTopSub) mTopSub.textContent = `${monthLabel} · beide Standorte`;

  // Hero: combined latest billing period totals
  const combinedKwh = summary.latestRennweg.kwh + summary.latestAspang.kwh;
  const combinedCost = summary.latestRennweg.gesamt_inkl_ust + summary.latestAspang.gesamt_inkl_ust;

  // Delta vs previous year
  const yearly = buildYearBuckets(state.data.entries);
  let deltaChip = "";
  if (yearly.length >= 2) {
    const ly = yearly[yearly.length - 1];
    const py = yearly[yearly.length - 2];
    const lyTotal = ly.rennwegKwh + ly.aspangKwh;
    const pyTotal = py.rennwegKwh + py.aspangKwh;
    if (pyTotal > 0) {
      const delta = Math.round(((lyTotal - pyTotal) / pyTotal) * 100);
      deltaChip = `<div class="m-hero-chip">${delta > 0 ? "+" : ""}${delta}% vs. Vorjahr</div>`;
    }
  }

  const mHeroCard = document.getElementById("mHeroCard");
  if (mHeroCard) {
    mHeroCard.innerHTML = `
      <div class="m-hero-eyebrow">Gesamtverbrauch · ${monthLabel}</div>
      <div class="m-hero-big">${formatNumber(combinedKwh)}<span class="m-hero-unit">kWh</span></div>
      <div class="m-hero-cost">Kosten gesamt <strong>${formatNumber(combinedCost, 2)} EUR</strong></div>
      <div class="m-hero-meta">
        <div class="m-hero-chip">Rennweg</div>
        <div class="m-hero-chip">Aspangstr.</div>
        ${deltaChip}
      </div>`;
  }

  // Pills grid
  const mPillsRow = document.getElementById("mPillsRow");
  if (mPillsRow) {
    mPillsRow.innerHTML = `
      <div class="m-metric-pill">
        <div class="m-pill-label">Rennweg</div>
        <div class="m-pill-num">${formatNumber(summary.latestRennweg.kwh)}<span class="m-pill-unit"> kWh</span></div>
        <div class="m-pill-sub">${formatNumber(summary.latestRennweg.gesamt_inkl_ust, 2)} EUR</div>
      </div>
      <div class="m-metric-pill">
        <div class="m-pill-label">Aspangstr.</div>
        <div class="m-pill-num">${formatNumber(summary.latestAspang.kwh)}<span class="m-pill-unit"> kWh</span></div>
        <div class="m-pill-sub">${formatNumber(summary.latestAspang.gesamt_inkl_ust, 2)} EUR</div>
      </div>`;
  }

  // Wallbox card
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const wallboxKwh = state.wallbox.byMonth[currentMonth] || 0;
  const mWallboxCard = document.getElementById("mWallboxCard");
  if (mWallboxCard) {
    if (wallboxKwh > 0) {
      const monthlyAvg = summary.latestAspang.kwh > 0 ? summary.latestAspang.kwh / 12 : 1;
      const pct = Math.min(100, Math.round((wallboxKwh / monthlyAvg) * 100));
      mWallboxCard.style.display = "";
      mWallboxCard.innerHTML = `
        <div class="m-wallbox-header">
          <span class="m-wallbox-title">Wallbox · Aspangstr.</span>
          <span class="m-wallbox-badge">⚡ ${formatNumber(wallboxKwh, 1)} kWh</span>
        </div>
        <div class="m-progress-track">
          <div class="m-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="m-progress-labels">
          <span class="m-prog-label">${pct}% des Monatsverbrauchs</span>
          <span class="m-prog-val">BYD Seal U</span>
        </div>`;
    } else {
      mWallboxCard.style.display = "none";
    }
  }

  // Log list — 3 most recent entries
  const mLogList = document.getElementById("mLogList");
  if (mLogList) {
    mLogList.innerHTML = state.data.entries.slice(0, 3).map((entry) => {
      const dotClass = "m-log-dot-teal"; // all Verbund entries = teal
      const amount = formatNumber(entry.gesamt_inkl_ust, 2) + " EUR";
      return `
        <div class="m-log-row">
          <span class="m-log-dot ${dotClass}"></span>
          <div class="m-log-info">
            <div class="m-log-name">Verbund · ${entry.locationLabel}</div>
            <div class="m-log-date">${formatDate(entry.rechnungsdatum)}</div>
          </div>
          <span class="m-log-amount">${amount}</span>
        </div>`;
    }).join("");
  }
}

function renderApp() {
  renderStatus();
  renderOverview();
  renderMobileGlance();
  renderDetail();
  renderArchiveFilters();
  renderArchiveTable();
  renderSettings();
  activateScreen(state.activeScreen);
}

async function init() {
  [state.data, state.wallbox] = await Promise.all([loadData(), loadWallboxData()]);
  attachEvents();
  renderApp();
}

init();
