// Deal Profitability Tracker - live calculation (browser copy).
//
// This is a line-for-line port of backend/tracker_calc.py, which is the
// authoritative version (the server recomputes everything on save). It exists
// only so numbers update instantly while typing. Both were verified against
// the Excel "Deal Margin Calculator" template and against each other.
//
// Money is in rupees; percentages are percent numbers (8 = 8%).

export const MAX_TERM_YEARS = 10;
export const INFRA_TARGET_PCT = 12;
export const GM_GREEN_PCT = 60;
export const GM_AMBER_PCT = 40;

const num = (v, d = 0) => {
  if (v === null || v === undefined || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const monthsActive = (year, termYears, durationMonths) => {
  if (year > termYears) return 0;
  return Math.max(0, Math.min(12, durationMonths - (year - 1) * 12));
};

export const gmBand = (revenue, gmPct) => {
  if (revenue <= 0) return 'none';
  if (gmPct > GM_GREEN_PCT) return 'green';
  if (gmPct < GM_AMBER_PCT) return 'red';
  return 'amber';
};

const margin = (revenue, cost) => {
  const gm = revenue - cost;
  const gmPct = revenue ? (gm / revenue) * 100 : 0;
  return { revenue, cost, gm, gm_pct: gmPct, band: gmBand(revenue, gmPct) };
};

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export function computeTracker(data) {
  const a = data.assumptions || {};
  const termYears = Math.trunc(num(a.term_years, 1)) || 1;
  const termMonths = termYears * 12;
  const revEsc = num(a.revenue_escalation_pct) / 100;
  const costEsc = num(a.cost_escalation_pct) / 100;

  const years = Array.from({ length: MAX_TERM_YEARS }, (_, i) => i + 1);
  const revFactor = years.map((y) => Math.pow(1 + revEsc, y - 1));
  const costFactor = years.map((y) => Math.pow(1 + costEsc, y - 1));

  // one-time charges
  let otRevenue = 0;
  let otDirectCost = 0;
  const oneTimeItems = (data.one_time_items || []).map((item) => {
    const rev = num(item.qty) * num(item.rate);
    const cost = num(item.qty) * num(item.cost_per_unit);
    otRevenue += rev;
    otDirectCost += cost;
    return { ...item, revenue: rev, cost };
  });

  // recurring charges
  let recMonthlyRevenue = 0;
  const infraBase = num((data.infra || {}).base_per_month);
  let infraMonthly = infraBase;
  const recurringItems = (data.recurring_items || []).map((item) => {
    const qty = num(item.qty);
    const monthlyRev = Math.max(qty * num(item.rate_per_month), num(item.min_bill_per_month));
    const lineInfra = num(item.infra_pupm) * qty;
    const duration = num(item.duration_months, 0) || termMonths;
    recMonthlyRevenue += monthlyRev;
    infraMonthly += lineInfra;
    return { ...item, duration_months: duration, monthly_revenue: monthlyRev, infra_monthly: lineInfra };
  });

  // delivery resources
  let resOneTimeCost = 0;
  let resRecurringMonthly = 0;
  const resources = (data.resources || []).map((item) => {
    const monthly = num(item.annual_ctc) / 12;
    const alloc = num(item.alloc_pct) / 100;
    const rtype = item.type === 'recurring' ? 'recurring' : 'one_time';
    let oneTimeCost = 0;
    let recurringMonthly = 0;
    let duration;
    if (rtype === 'one_time') {
      const months = num(item.months);
      oneTimeCost = monthly * alloc * months;
      duration = months;
    } else {
      duration = num(item.months, 0) || termMonths;
      recurringMonthly = monthly * alloc;
    }
    resOneTimeCost += oneTimeCost;
    resRecurringMonthly += recurringMonthly;
    return {
      ...item, type: rtype, monthly_cost: monthly, duration_months: duration,
      one_time_cost: oneTimeCost, recurring_monthly: recurringMonthly,
    };
  });

  // term schedule
  const revenueLines = recurringItems.map((item) => {
    const byYear = years.map((y, i) => item.monthly_revenue * revFactor[i] * monthsActive(y, termYears, item.duration_months));
    return { label: item.label || '(unnamed)', by_year: byYear, total: sum(byYear) };
  });

  const costLines = resources
    .filter((r) => r.type === 'recurring')
    .map((r) => {
      const byYear = years.map((y, i) => r.recurring_monthly * costFactor[i] * monthsActive(y, termYears, r.duration_months));
      return { label: r.role || '(unnamed role)', kind: 'resource', by_year: byYear, total: sum(byYear) };
    });
  const infraByYear = years.map((y, i) => infraMonthly * costFactor[i] * monthsActive(y, termYears, termMonths));
  costLines.push({ label: 'Infrastructure (hosting)', kind: 'infra', by_year: infraByYear, total: sum(infraByYear) });

  const totalRevByYear = years.map((_, i) => sum(revenueLines.map((l) => l.by_year[i])));
  const totalCostByYear = years.map((_, i) => sum(costLines.map((l) => l.by_year[i])));
  const gmByYear = totalRevByYear.map((r, i) => r - totalCostByYear[i]);
  const gmPctByYear = gmByYear.map((g, i) => (totalRevByYear[i] ? (g / totalRevByYear[i]) * 100 : 0));
  const recFullRev = sum(totalRevByYear);
  const recFullCost = sum(totalCostByYear);

  const oneTimeCostTotal = otDirectCost + resOneTimeCost;
  const summary = {
    one_time: margin(otRevenue, oneTimeCostTotal),
    recurring_month: margin(recMonthlyRevenue, resRecurringMonthly + infraMonthly),
    recurring_year1: margin(totalRevByYear[0], totalCostByYear[0]),
    recurring_full_term: margin(recFullRev, recFullCost),
    tcv: margin(otRevenue + recFullRev, oneTimeCostTotal + recFullCost),
  };

  const infraTotal = sum(infraByYear);
  const infraPct = recFullRev ? (infraTotal / recFullRev) * 100 : 0;
  const infraFlag = recFullRev <= 0 ? 'n/a' : infraPct > INFRA_TARGET_PCT ? 'HIGH' : 'OK';

  const tcv = summary.tcv;
  const neededGreen = tcv.cost / (1 - GM_GREEN_PCT / 100);
  const neededAmber = tcv.cost / (1 - GM_AMBER_PCT / 100);

  return {
    assumptions: { term_years: termYears, term_months: termMonths, revenue_escalation_pct: revEsc * 100, cost_escalation_pct: costEsc * 100 },
    one_time_items: oneTimeItems,
    recurring_items: recurringItems,
    resources,
    infra: { base_per_month: infraBase, monthly_total: infraMonthly },
    one_time: { revenue: otRevenue, direct_cost: otDirectCost, resource_cost: resOneTimeCost, cost: oneTimeCostTotal },
    recurring_monthly: { revenue: recMonthlyRevenue, resource_cost: resRecurringMonthly, infra_cost: infraMonthly, cost: resRecurringMonthly + infraMonthly },
    summary,
    schedule: {
      years, revenue_factor: revFactor, cost_factor: costFactor,
      revenue_lines: revenueLines, cost_lines: costLines,
      total_revenue: totalRevByYear, total_cost: totalCostByYear, gm: gmByYear, gm_pct: gmPctByYear,
    },
    benchmarks: {
      infra_pct: infraPct, infra_flag: infraFlag, infra_target_pct: INFRA_TARGET_PCT,
      gm_green_pct: GM_GREEN_PCT, gm_amber_pct: GM_AMBER_PCT,
    },
    insights: {
      revenue_needed_for_green: neededGreen,
      gap_to_green: Math.max(0, neededGreen - tcv.revenue),
      revenue_needed_for_amber: neededAmber,
      gap_to_amber: Math.max(0, neededAmber - tcv.revenue),
    },
  };
}


// ---------------------------------------------------------------------------
// Days in Sales Pipeline (DSP) from two typed dates (first proposal -> closed) - mirrors
// pipeline_from_manual in backend/tracker_calc.py. For a deal linked to a
// proposal the server works it out from the proposal's own history instead.
// Calendar days; the same day is 0 days.
// ---------------------------------------------------------------------------
const DAY_MS = 86400000;
const parseDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

// Today's date in the browser's own time zone (not UTC, which is a day behind before 5:30 am IST).
export const localToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function computeManualDsp(start, end, today = localToday()) {
  const s = parseDay(start);
  if (s === null) return { status: 'not_tracked', days: null, start: null, end: null, source: null };
  const e = parseDay(end);
  if (e !== null) {
    return { status: 'closed', days: Math.max(0, Math.round((e - s) / DAY_MS)), start, end, source: 'manual' };
  }
  return { status: 'in_pipeline', days: Math.max(0, Math.round((parseDay(today) - s) / DAY_MS)), start, end: null, source: 'manual' };
}
