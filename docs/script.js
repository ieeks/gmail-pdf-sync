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
  sidebarCollapsed: "voltmetric-sidebar-collapsed",
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
  computed: { yearly: null, monthly: null },
  archive: {
    search: "",
    year: "all",
    location: "all",
  },
  settings: { ...DEFAULT_SETTINGS }, // overwritten in init() after Firestore load
  modalEntryId: null,
};

// ── Firebase helper ──────────────────────────────────────────────
function getFirestoreDb() {
  if (typeof firebase === "undefined") return null;
  try {
    const existing = firebase.apps.find((a) => a.name === "voltmetric-wallbox");
    const app = existing || firebase.initializeApp(WALLBOX_FIREBASE_CONFIG, "voltmetric-wallbox");
    return firebase.firestore(app);
  } catch (_e) {
    return null;
  }
}

// ── Settings: Firestore-first, localStorage as cache ────────────
async function loadSettings() {
  // Seed from localStorage so UI is never blank
  let settings = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_e) {}

  // Overwrite from Firestore if reachable
  try {
    const db = getFirestoreDb();
    if (db) {
      const doc = await db.collection("config").doc("settings").get();
      if (doc.exists) {
        settings = { ...DEFAULT_SETTINGS, ...doc.data() };
        // Keep localStorage in sync as fast cache
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      }
    }
  } catch (_e) {}

  return settings;
}

async function saveSettings(settings) {
  // Write localStorage immediately (instant feedback)
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (_e) {}

  // Write Firestore, return whether it succeeded
  try {
    const db = getFirestoreDb();
    if (db) {
      await db.collection("config").doc("settings").set(settings);
      return true;
    }
  } catch (_e) {}
  return false;
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

function daysAgo(dateObj) {
  const days = Math.floor((Date.now() - dateObj.getTime()) / 86400000);
  if (days === 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
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

async function loadInvoicesFromFirestore() {
  try {
    const db = getFirestoreDb();
    if (!db) return null;
    const snapshot = await db.collection("invoices").get();
    if (snapshot.empty) return null;
    const raw = [];
    snapshot.forEach((doc) => raw.push(doc.data()));
    return raw;
  } catch (_err) {
    return null;
  }
}

async function loadData() {
  // Firestore-first: versuche Rechnungen aus Firestore zu laden
  const firestoreRaw = await loadInvoicesFromFirestore();

  let rennwegEntries, aspangEntries, demo;

  if (firestoreRaw && firestoreRaw.length > 0) {
    const rw = firestoreRaw.filter((e) => e.location === "rennweg");
    const as = firestoreRaw.filter((e) => e.location === "aspangstrasse");
    rennwegEntries = normalizeEntries(rw.length > 0 ? rw : DEMO_DATA.rennweg, "rennweg");
    aspangEntries = normalizeEntries(as.length > 0 ? as : DEMO_DATA.aspangstrasse, "aspangstrasse");
    demo = rw.length === 0 && as.length === 0;
  } else {
    // Fallback: JSON-Dateien
    const [rennweg, aspang] = await Promise.all([
      loadLocationFile("../data/rennweg.json", DEMO_DATA.rennweg, "rennweg"),
      loadLocationFile("../data/aspangstrasse.json", DEMO_DATA.aspangstrasse, "aspangstrasse"),
    ]);
    rennwegEntries = rennweg.entries;
    aspangEntries = aspang.entries;
    demo = rennweg.demo || aspang.demo;
  }

  const entries = [...rennwegEntries, ...aspangEntries].sort((a, b) => b.invoiceDate - a.invoiceDate);
  return {
    rennweg: rennwegEntries,
    aspangstrasse: aspangEntries,
    entries,
    demo,
  };
}

async function loadWallboxData() {
  try {
    const db = getFirestoreDb();
    if (!db) return { byMonth: {}, byYear: {} };
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
        backgroundColor: "#0D1B2E",
        titleColor: "#ffffff",
        bodyColor: "rgba(255,255,255,0.78)",
        borderColor: "rgba(0,194,168,0.25)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
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
  el.innerHTML = `<span class="tag tag-teal">⚡ ${formatNumber(wallboxKwh, 1)} kWh via Wallbox${pct > 0 ? ` · ${pct}% des Monatsverbrauchs` : ""}</span>`;
}

function renderOverviewCharts() {
  const yearly = state.computed.yearly;
  const options = baseChartOptions();
  createChart("overviewConsumptionChart", {
    type: "bar",
    data: {
      labels: yearly.map((bucket) => String(bucket.year)),
      datasets: [
        {
          label: "Rennweg",
          data: yearly.map((bucket) => bucket.rennwegKwh),
          backgroundColor: "rgba(0,194,168,0.88)",
          borderRadius: 6,
          stack: "rennweg",
        },
        {
          label: "Aspangstr. Haushalt",
          data: yearly.map((bucket) => Math.max(0, bucket.aspangKwh - (state.wallbox.byYear[bucket.year] || 0))),
          backgroundColor: "rgba(245,158,11,0.75)",
          borderRadius: 0,
          stack: "aspang",
        },
        {
          label: "Aspangstr. Wallbox",
          data: yearly.map((bucket) => state.wallbox.byYear[bucket.year] || 0),
          backgroundColor: "rgba(109,212,200,0.82)",
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
          backgroundColor: "rgba(0,194,168,0.82)",
          borderRadius: 12,
          stack: "cost",
        },
        {
          label: "Aspangstrasse",
          data: yearly.map((bucket) => bucket.aspangCost),
          backgroundColor: "rgba(245,158,11,0.82)",
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
  const monthly = state.computed.monthly;
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
          borderColor: "rgba(0,194,168,0.88)",
          backgroundColor: "rgba(0,194,168,0.10)",
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
          backgroundColor: "rgba(245,158,11,0.70)",
          borderRadius: 0,
          stack: "aspang",
          order: 1,
        },
        {
          label: "Aspangstr. Wallbox",
          data: monthly.map((bucket) => state.wallbox.byMonth[monthKey(bucket.label)] || 0),
          backgroundColor: "rgba(109,212,200,0.75)",
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
          backgroundColor: "rgba(0,194,168,0.82)",
          borderRadius: 10,
          stack: "monthlyCost",
        },
        {
          label: "Aspangstrasse",
          data: monthly.map((bucket) => bucket.aspangCost),
          backgroundColor: "rgba(245,158,11,0.82)",
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

function renderChartWhenVisible(canvasId, renderFn) {
  if (state.charts[canvasId]) return; // already initialised — createChart will update
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0) {
        ro.disconnect();
        renderFn();
        return;
      }
    }
  });
  ro.observe(canvas);
}

function updateChartsForActiveScreen() {
  if (state.activeScreen === "overview") {
    renderChartWhenVisible("overviewConsumptionChart", renderOverviewCharts);
  }
  if (state.activeScreen === "detail") {
    renderChartWhenVisible("detailTrendChart", renderDetailCharts);
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

  // ① Hero Card
  document.getElementById("heroCard").innerHTML = `
    <div class="hero-card">
      <div>
        <div class="hero-eyebrow">Gesamtüberblick – beide Standorte</div>
        <div class="hero-top">
          <div>
            <div class="hero-kwh">${formatNumber(summary.totalKwh)}<span class="hero-kwh-u"> kWh</span></div>
            <div class="hero-eur">${formatNumber(summary.totalCost, 0)} € Gesamtkosten</div>
          </div>
          <div class="hero-trend">
            <svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l4 5H2z"/></svg>
            ${state.data.demo ? "Demo" : "Live-Daten"}
          </div>
        </div>
      </div>
      <div class="hero-subcards">
        <div class="hero-sc">
          <div class="hero-sc-label">Rennweg</div>
          <div class="hero-sc-kwh">${formatNumber(summary.latestRennweg.kwh)} <span>kWh</span></div>
          <div class="hero-sc-meta">${formatNumber(summary.latestRennweg.gesamt_inkl_ust, 2)} € · ${formatNumber(summary.avgRennweg, 1)} ct/kWh</div>
        </div>
        <div class="hero-sc">
          <div class="hero-sc-label">Aspangstraße</div>
          <div class="hero-sc-kwh">${formatNumber(summary.latestAspang.kwh)} <span>kWh</span></div>
          <div class="hero-sc-meta">${formatNumber(summary.latestAspang.gesamt_inkl_ust, 2)} € · ${formatNumber(summary.avgAspang, 1)} ct/kWh</div>
        </div>
        <div class="hero-sc">
          <div class="hero-sc-label">Letzte Rechnung</div>
          <div class="hero-sc-kwh" style="font-size:14px;letter-spacing:-.3px">${summary.latestInvoice ? formatDate(summary.latestInvoice.rechnungsdatum) : "—"}</div>
          <div class="hero-sc-meta">${summary.latestInvoice ? daysAgo(summary.latestInvoice.invoiceDate) : "—"}</div>
        </div>
      </div>
    </div>
  `;

  // ② Rennweg Location Card
  document.getElementById("rwCard").innerHTML = `
    <div class="loc-card">
      <div>
        <span class="lc-eyebrow">Letzte Rechnung</span>
        <span class="lc-loc" style="color:var(--teal-dk)">Rennweg</span>
      </div>
      <div class="lc-kwh" style="color:var(--teal)">${formatNumber(summary.latestRennweg.kwh)} <span>kWh</span></div>
      <div class="lc-row">
        <div class="lc-eur" style="margin-bottom:0">${formatNumber(summary.latestRennweg.gesamt_inkl_ust, 2)} €</div>
        <div class="ct-badge teal">${formatNumber(summary.avgRennweg, 1)} ct/kWh</div>
      </div>
      <div class="lc-divider"></div>
      <div class="lc-vs-label">Abrechnungszeitraum</div>
      <div class="lc-vs-val" style="color:var(--muted);font-size:11px;font-family:'IBM Plex Mono',monospace">
        ${summary.latestRennweg.zeitraumVon ? formatDate(summary.latestRennweg.zeitraumVon) : "—"}
      </div>
    </div>
  `;

  // ③ Aspangstraße Location Card
  document.getElementById("asCard").innerHTML = `
    <div class="loc-card">
      <div>
        <span class="lc-eyebrow">Letzte Rechnung</span>
        <span class="lc-loc" style="color:var(--amber)">Aspangstraße</span>
      </div>
      <div class="lc-kwh" style="color:var(--amber)">${formatNumber(summary.latestAspang.kwh)} <span>kWh</span></div>
      <div class="lc-row">
        <div class="lc-eur" style="margin-bottom:0">${formatNumber(summary.latestAspang.gesamt_inkl_ust, 2)} €</div>
        <div class="ct-badge amber">${formatNumber(summary.avgAspang, 1)} ct/kWh</div>
      </div>
      <div class="lc-divider"></div>
      <div class="lc-vs-label">Abrechnungszeitraum</div>
      <div class="lc-vs-val" style="color:var(--muted);font-size:11px;font-family:'IBM Plex Mono',monospace">
        ${summary.latestAspang.zeitraumVon ? formatDate(summary.latestAspang.zeitraumVon) : "—"}
      </div>
    </div>
  `;

  // ④ KPI Grid
  const wallboxThisYear = state.wallbox.byYear[new Date().getFullYear()] || 0;
  document.getElementById("kpiGrid").innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Ø Kosten / kWh <i class="kpi-label-info">i</i></div>
      <div class="kpi-dual">
        <div>
          <div class="kpi-dual-val teal">${formatNumber(summary.avgRennweg, 1)} ct/kWh</div>
          <div class="kpi-dual-loc">Rennweg</div>
        </div>
        <div>
          <div class="kpi-dual-val amber">${formatNumber(summary.avgAspang, 1)} ct/kWh</div>
          <div class="kpi-dual-loc">Aspangstr.</div>
        </div>
      </div>
      <div class="kpi-dual-footer">Beide Standorte</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon-float amber">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
      </div>
      <div class="kpi-label">Kosten gesamt</div>
      <div class="kpi-val">${formatNumber(summary.totalCost, 0)} <span class="ku">€</span></div>
      <div class="kpi-sub-label">inkl. Netz &amp; Steuern</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon-float green">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
      </div>
      <div class="kpi-label">Verbrauch gesamt</div>
      <div class="kpi-val">${formatNumber(summary.totalKwh)} <span class="ku">kWh</span></div>
      <div class="kpi-sub-label">beide Standorte</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon-float indigo">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/></svg>
      </div>
      <div class="kpi-label">Wallbox (Aspangstr.)</div>
      <div class="kpi-val">${formatNumber(wallboxThisYear, 1)} <span class="ku">kWh</span></div>
      <div class="kpi-sub-label">dieses Jahr</div>
    </div>
  `;

  // ⑤ Letzte Rechnungen
  const recentEntries = state.data.entries.slice(0, 4);
  document.getElementById("recentLogs").innerHTML = `
    <div class="inv-panel">
      <div class="inv-panel-head">
        <div class="inv-panel-title">Letzte Rechnungen</div>
      </div>
      ${recentEntries.map((entry) => `
        <div class="inv-row" data-entry-id="${entry.id}" tabindex="0" role="button">
          <div class="inv-row-top">
            <span class="inv-nr">${entry.rechnungsnummer}</span>
            <span class="inv-date">${formatDate(entry.rechnungsdatum)}</span>
          </div>
          <div class="inv-row-bot">
            <span class="inv-loc-pill ${entry.location === "rennweg" ? "rw" : "as"}">
              <span class="dot"></span>${entry.locationLabel}
            </span>
            <span class="inv-meta">${formatNumber(entry.kwh)} kWh</span>
            <span class="inv-meta">${formatNumber(entry.gesamt_inkl_ust, 2)} €</span>
            <span class="inv-ct-sm">${formatNumber(entry.centsPerKwh, 1)} ct/kWh</span>
          </div>
        </div>
      `).join("")}
      <div class="inv-panel-foot">
        <button class="btn-all" data-screen-target="archive" type="button">
          Alle Rechnungen
          <svg viewBox="0 0 16 16" fill="currentColor" style="width:11px;height:11px"><path d="M1 8a.5.5 0 01.5-.5h11.793l-3.147-3.146a.5.5 0 01.708-.708l4 4a.5.5 0 010 .708l-4 4a.5.5 0 01-.708-.708L13.293 8.5H1.5A.5.5 0 011 8z"/></svg>
        </button>
      </div>
    </div>
  `;

  // ⑥ Kosten/kWh Vergleich
  const maxCt = Math.max(summary.avgRennweg, summary.avgAspang) || 1;
  document.getElementById("kostenVergleich").innerHTML = `
    <div class="kosten-card">
      <div class="section-title">Kosten pro kWh – Vergleich</div>
      <div class="cmp-row">
        <div class="cmp-label-row">
          <span class="cmp-name">Rennweg</span>
          <span class="cmp-val teal">${formatNumber(summary.avgRennweg, 1)} ct/kWh</span>
        </div>
        <div class="cmp-bar-bg"><div class="cmp-bar teal" style="width:${Math.round(summary.avgRennweg / maxCt * 100)}%"></div></div>
      </div>
      <div class="cmp-row">
        <div class="cmp-label-row">
          <span class="cmp-name">Aspangstraße</span>
          <span class="cmp-val amber">${formatNumber(summary.avgAspang, 1)} ct/kWh</span>
        </div>
        <div class="cmp-bar-bg"><div class="cmp-bar amber" style="width:${Math.round(summary.avgAspang / maxCt * 100)}%"></div></div>
      </div>
      <div class="cmp-avg">Letzte abgerechnete Periode</div>
    </div>
  `;

  // ⑦ Top Kennzahlen
  const avgCt = summary.totalKwh > 0 ? (summary.totalCost / summary.totalKwh * 100) : 0;
  document.getElementById("topKennzahlen").innerHTML = `
    <div class="kennzahlen-card">
      <div class="section-title" style="padding-right:36px">Top-Kennzahlen</div>
      <div class="kz-ico">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
      </div>
      <div class="kz-list">
        <div class="kz-row"><span class="kz-key">Gesamtverbrauch</span><span class="kz-val">${formatNumber(summary.totalKwh)} kWh</span></div>
        <div class="kz-row"><span class="kz-key">Gesamtkosten</span><span class="kz-val">${formatNumber(summary.totalCost, 0)} €</span></div>
        <div class="kz-row"><span class="kz-key">Ø Kosten / kWh</span><span class="kz-val">${formatNumber(avgCt, 1)} ct/kWh</span></div>
        <div class="kz-row"><span class="kz-key">Letzte Rechnung</span><span class="kz-val">${summary.latestInvoice ? daysAgo(summary.latestInvoice.invoiceDate) : "—"}</span></div>
      </div>
    </div>
  `;
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
    const isRw = key === "rennweg";
    return `
      <div class="panel detail-loc-card ${isRw ? "detail-loc-card-rw" : "detail-loc-card-as"}">
        <div class="detail-loc-header">
          <span class="loc-badge ${isRw ? "loc-badge-rw" : "loc-badge-as"}"><span class="loc-badge-dot"></span>${locationLabel(key)}</span>
          <div class="detail-loc-name">${locationLabel(key)}</div>
          <span class="detail-loc-avg ${isRw ? "detail-loc-avg-teal" : "detail-loc-avg-amber"}">${formatNumber(latest.centsPerKwh, 1)} ct/kWh</span>
        </div>
        <div class="detail-loc-kpis">
          <div class="detail-loc-kpi">
            <span class="sl">Latest total</span>
            <div class="detail-loc-kpi-val">${formatCurrency(latest.gesamt_inkl_ust)}</div>
          </div>
          <div class="detail-loc-kpi">
            <span class="sl">Total kWh</span>
            <div class="detail-loc-kpi-val">${formatNumber(totalKwh)}</div>
          </div>
          <div class="detail-loc-kpi">
            <span class="sl">Latest period</span>
            <div class="detail-loc-kpi-val" style="font-size:13px">${formatDate(latest.zeitraumBis)}</div>
          </div>
        </div>
        <div class="detail-loc-note">Letzte Rechnung: ${formatPeriod(latest)}. Gesamt: ${formatCompactCurrency(totalCost)} bei ${entries.length} Statements.</div>
      </div>
    `;
  }).join("");

  const colDivider = `<div class="billing-divider"></div>`;
  document.getElementById("detailInvoices").innerHTML = locations.map(({ key, entries }, i) => `
    ${i > 0 ? colDivider : ""}
    <div class="billing-col">
      <div class="billing-col-head ${key === "rennweg" ? "billing-col-head-rw" : "billing-col-head-as"}">
        <span class="loc-badge ${key === "rennweg" ? "loc-badge-rw" : "loc-badge-as"}"><span class="loc-badge-dot"></span></span>
        <span class="billing-col-name">${locationLabel(key)}</span>
      </div>
      ${[...entries].sort((a, b) => b.invoiceDate - a.invoiceDate).map((entry) => `
        <div class="billing-row" data-entry-id="${entry.id}" style="cursor:pointer">
          <div class="billing-row-left">
            <div class="billing-row-id">${entry.rechnungsnummer}</div>
            <div class="billing-row-sub">${formatDate(entry.rechnungsdatum)} · ${formatNumber(entry.kwh)} kWh</div>
          </div>
          <div class="billing-row-right">
            <div class="billing-row-eur">${formatCurrency(entry.gesamt_inkl_ust)}</div>
            <div class="${key === "rennweg" ? "billing-row-ct-rw" : "billing-row-ct-as"}">${formatNumber(entry.centsPerKwh, 1)} ct/kWh</div>
          </div>
        </div>
      `).join("")}
    </div>
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
  const container = document.getElementById("archiveTableBody");
  const empty = document.getElementById("archiveEmpty");

  container.innerHTML = entries.map((entry) => `
    <div class="archive-table-row" data-entry-id="${entry.id}">
      <div>
        <div class="archive-row-id">${entry.rechnungsnummer}</div>
        <div class="archive-row-date">${formatDate(entry.rechnungsdatum)}</div>
      </div>
      <div>
        <span class="loc-badge ${entry.location === "rennweg" ? "loc-badge-rw" : "loc-badge-as"}">
          <span class="loc-badge-dot"></span>${entry.locationLabel}
        </span>
      </div>
      <div class="archive-row-period">${formatDate(entry.zeitraumVon)} – ${formatDate(entry.zeitraumBis)}</div>
      <div class="archive-row-kwh">${formatNumber(entry.kwh)}</div>
      <div class="archive-row-net">${formatCurrency(entry.energiekosten)}</div>
      <div class="archive-row-total">${formatCurrency(entry.gesamt_inkl_ust)}</div>
      <div>
        <button class="btn-pdf ${entry.location === "rennweg" ? "btn-pdf-rw" : "btn-pdf-as"}" type="button">Open</button>
      </div>
    </div>
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
  const lpt = document.getElementById("livePulseToggle");
  if (lpt) lpt.classList.toggle("on", settings.livePulse);
}

const domCache = { screens: null, navButtons: null };

function activateScreen(screen) {
  state.activeScreen = screen;
  try {
    localStorage.setItem(STORAGE_KEYS.activeScreen, screen);
  } catch (_error) {
    // Ignore storage failures in restricted contexts.
  }
  domCache.screens.forEach((section) => {
    section.classList.toggle("screen-active", section.dataset.screen === screen);
  });
  domCache.navButtons.forEach((button) => {
    const active = button.dataset.screenTarget === screen;
    button.classList.toggle("nav-item-active", active && button.classList.contains("nav-item"));
    button.classList.toggle("mobile-nav-pill-active", active && button.classList.contains("mobile-nav-pill"));
  });
  // Mobile Glance: switch between glance view (overview) and desktop screens
  document.body.classList.toggle("m-desktop-screen", screen !== "overview");
  setHeaderMeta();
  updateChartsForActiveScreen();
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
      <div style="display:flex;justify-content:space-between;gap:1rem;margin-bottom:1.5rem">
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <div class="pdf-line" style="height:16px;width:6rem"></div>
          <div class="pdf-line" style="height:11px;width:9rem"></div>
        </div>
        <div style="width:40px;height:40px;border-radius:10px;background:rgba(0,194,168,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2L6 9H9L8 16L12 9H9Z" fill="rgba(0,194,168,0.85)"/>
          </svg>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:2rem">
        <div class="pdf-line" style="height:10px;width:100%"></div>
        <div class="pdf-line" style="height:10px;width:80%"></div>
        <div class="pdf-line" style="height:10px;width:60%"></div>
      </div>
      <div class="pdf-block-grid">
        <div class="pdf-block"></div>
        <div class="pdf-block"></div>
        <div class="pdf-block"></div>
      </div>
      <div class="pdf-invoice-box">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#96a8bc;margin-bottom:4px">Invoice</div>
            <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0D1B2E">${entry.rechnungsnummer}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#96a8bc;margin-bottom:4px">Total</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:16px;color:#009e88">${formatCurrency(entry.gesamt_inkl_ust)}</div>
          </div>
        </div>
      </div>
      <div class="pdf-actions">
        <div class="pdf-action-btn" title="Zoom">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M12 12L16 16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="7.5" y1="5.2" x2="7.5" y2="9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="5.2" y1="7.5" x2="9.8" y2="7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="pdf-action-btn" title="Download">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2.5V11M5.5 8L9 11.5L12.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2.5 14.5H15.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
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
    <div class="modal-meta-card">
      <span class="modal-meta-label">Date</span>
      <div class="modal-meta-value">${formatDate(entry.rechnungsdatum)}</div>
    </div>
    <div class="modal-meta-card">
      <span class="modal-meta-label">Consumption</span>
      <div class="modal-meta-value">${formatNumber(entry.kwh)}<span style="font-size:12px;font-weight:400;color:#96a8bc"> kWh</span></div>
    </div>
    <div class="modal-meta-card">
      <span class="modal-meta-label">Energy cost</span>
      <div class="modal-meta-value">${formatCurrency(entry.energiekosten)}</div>
    </div>
    <div class="modal-meta-card">
      <span class="modal-meta-label">Network + tax</span>
      <div class="modal-meta-value">${formatCurrency(entry.netzgebuehren + entry.steuern)}</div>
    </div>
    <div class="modal-meta-card">
      <span class="modal-meta-label">Total cost</span>
      <div class="modal-meta-value modal-meta-total">${formatCurrency(entry.gesamt_inkl_ust)}</div>
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

function initSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("sidebarToggleBtn");
  try {
    if (localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true") {
      sidebar.classList.add("sidebar-collapsed");
    }
  } catch (_e) {}
  btn.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("sidebar-collapsed");
    try { localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed); } catch (_e) {}
  });
}

function attachEvents() {
  domCache.screens = Array.from(document.querySelectorAll("[data-screen]"));
  domCache.navButtons = Array.from(document.querySelectorAll("[data-screen-target]"));

  domCache.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateScreen(button.dataset.screenTarget);
    });
  });

  initSidebarToggle();

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

  // Delegated handler for dynamically-rendered data-screen-target elements (e.g. btn-all in recentLogs)
  document.querySelector(".screens").addEventListener("click", (event) => {
    const target = event.target.closest("[data-screen-target]");
    if (target && !domCache.navButtons.includes(target)) {
      activateScreen(target.dataset.screenTarget);
    }
  });

  // Delegated handler for invoice rows in recentLogs
  document.querySelector(".screens").addEventListener("click", (event) => {
    const row = event.target.closest("#recentLogs [data-entry-id]");
    if (row) openModal(row.dataset.entryId);
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

  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
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
    const notice = document.getElementById("settingsNotice");
    notice.textContent = "Speichert…";
    const savedToFirestore = await saveSettings(state.settings);
    renderStatus();
    const time = new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
    notice.textContent = `${savedToFirestore ? "Firestore" : "Lokal"} · ${time}`;
    notice.classList.toggle("saved", savedToFirestore);
    showToast(savedToFirestore ? "In Firestore gespeichert." : "Lokal gespeichert — Firestore nicht erreichbar.");
  });

  document.getElementById("addPointButton").addEventListener("click", () => {
    showToast("Prototype only. Add-point flow can be wired to your final config model.");
  });

  const livePulseToggle = document.getElementById("livePulseToggle");
  const livePulseCb = document.getElementById("livePulse");
  if (livePulseToggle && livePulseCb) {
    livePulseToggle.classList.toggle("on", livePulseCb.checked);
    livePulseToggle.addEventListener("click", () => {
      livePulseCb.checked = !livePulseCb.checked;
      livePulseToggle.classList.toggle("on", livePulseCb.checked);
    });
  }

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
  const yearly = state.computed.yearly;
  let deltaChip = "";
  if (yearly.length >= 2) {
    const ly = yearly[yearly.length - 1];
    const py = yearly[yearly.length - 2];
    const lyTotal = ly.rennwegKwh + ly.aspangKwh;
    const pyTotal = py.rennwegKwh + py.aspangKwh;
    if (pyTotal > 0) {
      const delta = Math.round(((lyTotal - pyTotal) / pyTotal) * 100);
      deltaChip = `<span class="m-chip m-chip-neutral">${delta > 0 ? "+" : ""}${delta}% vs. Vorjahr</span>`;
    }
  }

  const mHeroCard = document.getElementById("mHeroCard");
  if (mHeroCard) {
    mHeroCard.innerHTML = `
      <div class="m-hero-eyebrow">Gesamtverbrauch · ${monthLabel}</div>
      <div class="m-hero-big">${formatNumber(combinedKwh)}<span class="m-hero-unit">kWh</span></div>
      <div class="m-hero-cost">Kosten gesamt <strong>${formatNumber(combinedCost, 2)} EUR</strong></div>
      <div class="m-hero-chips">
        <span class="m-chip">Rennweg</span>
        <span class="m-chip">Aspangstr.</span>
        ${deltaChip}
      </div>`;
  }

  // Location split cards
  const mPillsRow = document.getElementById("mPillsRow");
  if (mPillsRow) {
    mPillsRow.innerHTML = `
      <div class="m-loc-card m-loc-card-rw">
        <span class="m-loc-name m-loc-name-rw">Rennweg</span>
        <div class="m-loc-kwh">${formatNumber(summary.latestRennweg.kwh)}<span class="m-loc-unit"> kWh</span></div>
        <div class="m-loc-eur">${formatNumber(summary.latestRennweg.gesamt_inkl_ust, 2)} EUR</div>
      </div>
      <div class="m-loc-card m-loc-card-as">
        <span class="m-loc-name m-loc-name-as">Aspangstr.</span>
        <div class="m-loc-kwh">${formatNumber(summary.latestAspang.kwh)}<span class="m-loc-unit"> kWh</span></div>
        <div class="m-loc-eur">${formatNumber(summary.latestAspang.gesamt_inkl_ust, 2)} EUR</div>
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
          <span class="m-wallbox-kwh">⚡ ${formatNumber(wallboxKwh, 1)} kWh</span>
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
      const dotClass = entry.location === "rennweg" ? "m-log-dot-teal" : "m-log-dot-amber";
      const amountClass = entry.location === "rennweg" ? "m-log-amount-rw" : "m-log-amount-as";
      const amount = formatNumber(entry.gesamt_inkl_ust, 2) + " EUR";
      return `
        <div class="m-log-row">
          <span class="m-log-dot ${dotClass}"></span>
          <div class="m-log-info">
            <div class="m-log-name">Verbund · ${entry.locationLabel}</div>
            <div class="m-log-date">${formatDate(entry.rechnungsdatum)}</div>
          </div>
          <span class="${amountClass}">${amount}</span>
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
  [state.data, state.wallbox, state.settings] = await Promise.all([
    loadData(),
    loadWallboxData(),
    loadSettings(),
  ]);
  state.computed.yearly = buildYearBuckets(state.data.entries);
  state.computed.monthly = buildMonthlySeries(state.data);
  attachEvents();
  renderApp();
}

init();
