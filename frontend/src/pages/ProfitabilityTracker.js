import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  Plus, X, ArrowLeft, FloppyDisk, GitBranch, Trash, MagnifyingGlass, Warning,
  CheckCircle, Lightbulb, ChartLineUp, LinkSimple, PencilSimple,
} from '@phosphor-icons/react';
import { computeTracker, computeManualDsp, localToday, MAX_TERM_YEARS } from '../utils/trackerCalc';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ------------------------------------------------------------------ */
/* formatting                                                          */
/* ------------------------------------------------------------------ */
const inr = (n) => {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? '-' : ''}₹${Math.abs(v).toLocaleString('en-IN')}`;
};
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const compactInr = (n) => {
  const v = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (v >= 1e7) return `${sign}${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${sign}${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(0)}K`;
  return `${sign}${v}`;
};
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const today = localToday;

const nextVersionLabel = (label) => {
  const m = /^[vV]?(\d+)(?:\.(\d+))?$/.exec((label || '').trim());
  if (m) return `v${parseInt(m[1], 10) + 1}.0`;
  return label ? `${label} (copy)` : 'v1.0';
};

// Next version label that this client does not already have (v5.0 -> v6.0, or v7.0 if v6.0 exists).
const nextFreeVersion = (clientName, version, all) => {
  const taken = new Set(all.filter((t) => t.client_name === clientName).map((t) => t.version));
  let v = nextVersionLabel(version);
  for (let guard = 0; taken.has(v) && guard < 100; guard += 1) v = nextVersionLabel(v);
  return v;
};

/* ------------------------------------------------------------------ */
/* form model                                                          */
/* ------------------------------------------------------------------ */
let keySeq = 0;
const nk = () => `row${++keySeq}`;

// The reusable lines of Botree's deal-margin template. Labels match the ones
// used when pulling lines from a proposal, so a pull fills these rows in.
const STANDARD_ONE_TIME = [
  'One-time setup fee', 'Integration fee', 'DMS training', 'SFA training',
  'Flexi DMS deployment', 'Customization', 'Workshop / data migration / audit',
];
const STANDARD_RECURRING = ['SFA users', 'DMS distributors', 'Flexi DMS users', 'Shared L1 support'];

const blankOneTime = (label = '') => ({ _k: nk(), label, qty: '', rate: '', cost_per_unit: '' });
const blankRecurring = (label = '') => ({
  _k: nk(), label, qty: '', rate_per_month: '', min_bill_per_month: '', duration_months: '', infra_pupm: '',
});
const blankResource = () => ({ _k: nk(), role: '', role_source: 'rate_card', annual_ctc: '', alloc_pct: '', type: 'one_time', months: '' });

const newForm = (cfg) => ({
  id: null, client_name: '', version: 'v1.0', deal_date: today(), proposal_id: '', parent_id: null, notes: '', created_by: null,
  pipeline_start: '', pipeline_end: '',
  assumptions: {
    term_years: cfg.defaults.term_years,
    revenue_escalation_pct: cfg.defaults.revenue_escalation_pct,
    cost_escalation_pct: cfg.defaults.cost_escalation_pct,
  },
  one_time_items: STANDARD_ONE_TIME.map(blankOneTime),
  recurring_items: STANDARD_RECURRING.map(blankRecurring),
  resources: [],
  infra: { base_per_month: '' },
});

const blankIfZero = (v) => (v === 0 || v === null || v === undefined ? '' : v);

const formFromDoc = (d) => ({
  id: d.id, client_name: d.client_name || '', version: d.version || 'v1.0', deal_date: d.deal_date || '',
  proposal_id: d.proposal_id || '', parent_id: d.parent_id || null, notes: d.notes || '', created_by: d.created_by || null,
  pipeline_start: d.pipeline_start || '', pipeline_end: d.pipeline_end || '',
  assumptions: {
    term_years: d.assumptions?.term_years ?? 3,
    revenue_escalation_pct: d.assumptions?.revenue_escalation_pct ?? 0,
    cost_escalation_pct: d.assumptions?.cost_escalation_pct ?? 0,
  },
  one_time_items: (d.one_time_items || []).map((r) => ({
    _k: nk(), label: r.label || '', qty: blankIfZero(r.qty), rate: blankIfZero(r.rate), cost_per_unit: blankIfZero(r.cost_per_unit),
  })),
  recurring_items: (d.recurring_items || []).map((r) => ({
    _k: nk(), label: r.label || '', qty: blankIfZero(r.qty), rate_per_month: blankIfZero(r.rate_per_month),
    min_bill_per_month: blankIfZero(r.min_bill_per_month), duration_months: blankIfZero(r.duration_months), infra_pupm: blankIfZero(r.infra_pupm),
  })),
  resources: (d.resources || []).map((r) => ({
    _k: nk(), role: r.role || '', role_source: r.role_source === 'rate_card' ? 'rate_card' : 'custom',
    annual_ctc: blankIfZero(r.annual_ctc), alloc_pct: blankIfZero(r.alloc_pct), type: r.type || 'one_time', months: blankIfZero(r.months),
  })),
  infra: { base_per_month: blankIfZero(d.infra?.base_per_month) },
});

const stripKeys = (rows) => rows.map(({ _k, ...rest }) => rest);
const payloadFromForm = (f) => ({
  client_name: f.client_name, version: f.version, deal_date: f.deal_date || null,
  proposal_id: f.proposal_id || null, notes: f.notes || null,
  pipeline_start: f.pipeline_start || null, pipeline_end: f.pipeline_end || null,
  assumptions: f.assumptions,
  one_time_items: stripKeys(f.one_time_items),
  recurring_items: stripKeys(f.recurring_items),
  resources: stripKeys(f.resources),
  infra: f.infra,
});
const snapshotOf = (f) => JSON.stringify(payloadFromForm(f));

/* ------------------------------------------------------------------ */
/* small presentational helpers                                        */
/* ------------------------------------------------------------------ */
const BAND_STYLES = {
  green: 'bg-green-100 text-green-800 border-green-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  none: 'bg-gray-100 text-gray-600 border-gray-300',
};
const BAND_LABEL = { green: 'Healthy', amber: 'Watch', red: 'Low', none: 'No revenue' };

const BandChip = ({ band, children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${BAND_STYLES[band] || BAND_STYLES.none}`}>
    {children}
  </span>
);

// Days in Sales Pipeline: first proposal -> approved.
const DSP_BAND = { approved: 'green', in_pipeline: 'amber', rejected: 'red', not_tracked: 'none' };
const DSP_LABEL = { approved: 'Approved', in_pipeline: 'In pipeline', rejected: 'Rejected', not_tracked: 'Not tracked' };
const dspDays = (d) => (d && d.days !== null && d.days !== undefined ? `${d.days} day${d.days === 1 ? '' : 's'}` : '—');

const NumInput = ({ value, onChange, disabled, placeholder = '0', testId, className = '' }) => (
  <Input
    type="number" inputMode="decimal" min="0" step="any" value={value ?? ''} disabled={disabled}
    placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId}
    className={`h-9 px-2 text-right bg-[#FFFFFF] text-[#1E1533] ${className}`}
  />
);

const TextInput = ({ value, onChange, disabled, placeholder, testId, className = '' }) => (
  <Input
    type="text" value={value ?? ''} disabled={disabled} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)} data-testid={testId}
    className={`h-9 px-2 bg-[#FFFFFF] text-[#1E1533] ${className}`}
  />
);

const Section = ({ title, hint, action, testId, children }) => (
  <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm p-5" data-testid={testId}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-lg font-bold text-[#1E1533]">{title}</h3>
        {hint && <p className="text-xs text-[#7A6B9E] mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Th = ({ children, right = false, className = '' }) => (
  <th className={`px-2 py-2 text-xs font-semibold text-[#5B4B7A] whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${className}`}>{children}</th>
);
const Calc = ({ children, bold = false }) => (
  <td className={`px-2 py-1 text-right text-sm whitespace-nowrap text-[#1E1533] ${bold ? 'font-bold' : ''}`}>{children}</td>
);
const RemoveBtn = ({ onClick, disabled, label }) => (
  <td className="px-1 py-1 text-right">
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="p-1 rounded text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <X size={16} />
    </button>
  </td>
);
const AddRowBtn = ({ onClick, disabled, children, testId }) => (
  <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={disabled} data-testid={testId}
    className="text-purple-700 hover:text-purple-800 mt-2">
    <Plus size={16} className="mr-1" />{children}
  </Button>
);

/* ------------------------------------------------------------------ */
/* warnings                                                            */
/* ------------------------------------------------------------------ */
const getWarnings = (form, result) => {
  const out = [];
  const termMonths = result.assumptions.term_months;
  if (result.benchmarks.infra_flag === 'HIGH') {
    out.push(`Hosting is ${pct(result.benchmarks.infra_pct)} of recurring revenue — the target is under ${result.benchmarks.infra_target_pct}%.`);
  }
  form.recurring_items.forEach((r, i) => {
    const name = r.label || `Recurring line ${i + 1}`;
    const calc = result.recurring_items[i];
    if (Number(r.qty) > 0 && calc.monthly_revenue === 0) out.push(`"${name}" has users but no rate or minimum bill, so it earns nothing.`);
    if (Number(r.duration_months) > termMonths) out.push(`"${name}" runs ${r.duration_months} months but the contract is ${termMonths} — only ${termMonths} months are counted.`);
  });
  form.resources.forEach((r, i) => {
    const name = r.role || `Resource ${i + 1}`;
    if (Number(r.alloc_pct) > 0 && !(Number(r.annual_ctc) > 0)) out.push(`"${name}" has an allocation but no annual CTC.`);
    if (r.type === 'one_time' && Number(r.alloc_pct) > 0 && !(Number(r.months) > 0)) out.push(`"${name}" is one-time but has no months, so no cost is counted.`);
    if (r.type === 'recurring' && Number(r.months) > termMonths) out.push(`"${name}" runs ${r.months} months but the contract is ${termMonths} — only ${termMonths} months are counted.`);
  });
  return out;
};

/* ------------------------------------------------------------------ */
/* live summary: a bar pinned under the top bar + a detail section     */
/* ------------------------------------------------------------------ */
const Kpi = ({ label, value, testId }) => (
  <div>
    <p className="text-xs text-[#7A6B9E] whitespace-nowrap">{label}</p>
    <p className="text-lg font-black text-[#1E1533] whitespace-nowrap" data-testid={testId}>{value}</p>
  </div>
);

// The app's top bar is sticky and 111px tall at every width, so the bar pins just below it.
// On phones it scrolls normally - pinned it would eat a quarter of the screen.
const SummaryStrip = ({ result, actions, dsp }) => {
  const tcv = result.summary.tcv;
  const b = result.benchmarks;
  const hostBand = b.infra_flag === 'HIGH' ? 'red' : b.infra_flag === 'OK' ? 'green' : 'none';
  return (
    <div
      className="md:sticky md:top-[111px] z-30 bg-[#FFFFFF] border border-[#E4DCF0] shadow-md px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-3"
      data-testid="tracker-strip"
    >
      <Kpi label="Total contract value" value={inr(tcv.revenue)} testId="tcv-revenue" />
      <Kpi label="Total cost" value={inr(tcv.cost)} testId="tcv-cost" />
      <Kpi label="Gross margin" value={inr(tcv.gm)} testId="tcv-gm" />
      <div>
        <p className="text-xs text-[#7A6B9E]">Gross margin %</p>
        <BandChip band={tcv.band}>{tcv.band === 'none' ? BAND_LABEL.none : `${BAND_LABEL[tcv.band]} · ${pct(tcv.gm_pct)}`}</BandChip>
      </div>
      <div>
        <p className="text-xs text-[#7A6B9E] whitespace-nowrap">Hosting vs recurring revenue</p>
        <span className="flex items-center gap-2">
          <span className="font-bold text-[#1E1533]" data-testid="infra-pct">{pct(b.infra_pct)}</span>
          <BandChip band={hostBand}>{b.infra_flag}</BandChip>
        </span>
      </div>
      <div>
        <p className="text-xs text-[#7A6B9E] whitespace-nowrap">Days in sales pipeline</p>
        <span className="flex items-center gap-2">
          <span className="font-bold text-[#1E1533] whitespace-nowrap" data-testid="dsp-days">{dspDays(dsp)}</span>
          <BandChip band={DSP_BAND[dsp.status]}>{DSP_LABEL[dsp.status]}</BandChip>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 md:ml-auto">{actions}</div>
    </div>
  );
};

const SummaryDetails = ({ result, warnings }) => {
  const s = result.summary;
  const b = result.benchmarks;
  const ins = result.insights;
  const tcv = s.tcv;
  const rows = [
    ['One-time', s.one_time],
    ['Recurring / month', s.recurring_month],
    ['Recurring / Year 1', s.recurring_year1],
    ['Recurring / full term', s.recurring_full_term],
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start" data-testid="tracker-summary">
      <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm p-5">
        <h3 className="text-lg font-bold text-[#1E1533] mb-2">Margin summary</h3>
        <div className="overflow-x-auto" data-testid="margin-table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4DCF0]">
                <Th>View</Th><Th right>Revenue</Th><Th right>Cost</Th><Th right>Gross margin</Th><Th right>GM %</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, m]) => (
                <tr key={label} className="border-b border-[#F1EBFA]">
                  <td className="px-2 py-2 text-[#1E1533] whitespace-nowrap">{label}</td>
                  <Calc>{inr(m.revenue)}</Calc><Calc>{inr(m.cost)}</Calc><Calc>{inr(m.gm)}</Calc>
                  <td className="px-2 py-2 text-right"><BandChip band={m.band}>{pct(m.gm_pct)}</BandChip></td>
                </tr>
              ))}
              <tr className="bg-[#F7F4FC]">
                <td className="px-2 py-2 font-bold text-[#1E1533] whitespace-nowrap">Total contract (TCV)</td>
                <Calc bold>{inr(tcv.revenue)}</Calc><Calc bold>{inr(tcv.cost)}</Calc><Calc bold>{inr(tcv.gm)}</Calc>
                <td className="px-2 py-2 text-right"><BandChip band={tcv.band}>{pct(tcv.gm_pct)}</BandChip></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#7A6B9E] mt-2">
          GM bands: <span className="text-green-700 font-semibold">green over {b.gm_green_pct}%</span> ·{' '}
          <span className="text-amber-700 font-semibold">amber {b.gm_amber_pct}–{b.gm_green_pct}%</span> ·{' '}
          <span className="text-red-700 font-semibold">red under {b.gm_amber_pct}%</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm p-5 space-y-3">
          <h3 className="text-lg font-bold text-[#1E1533]">Benchmarks &amp; insight</h3>
          <div className="flex items-center justify-between text-sm gap-3">
            <span className="text-[#5B4B7A]">Hosting vs recurring revenue (target under {b.infra_target_pct}%)</span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-bold text-[#1E1533]">{pct(b.infra_pct)}</span>
              <BandChip band={b.infra_flag === 'HIGH' ? 'red' : b.infra_flag === 'OK' ? 'green' : 'none'}>{b.infra_flag}</BandChip>
            </span>
          </div>

          {tcv.revenue > 0 && tcv.band !== 'green' && (
            <div className="flex gap-2 bg-[#F7F4FC] p-3 text-sm text-[#1E1533]" data-testid="tracker-insight">
              <Lightbulb size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                To reach {b.gm_green_pct}% GM at the current cost, total contract revenue needs to be{' '}
                <strong>{inr(ins.revenue_needed_for_green)}</strong> — <strong>{inr(ins.gap_to_green)}</strong> more than modelled.
                {tcv.band === 'red' && (
                  <div className="mt-1 text-xs text-[#5B4B7A]">
                    To get out of the red zone ({b.gm_amber_pct}%): {inr(ins.revenue_needed_for_amber)} ({inr(ins.gap_to_amber)} more).
                  </div>
                )}
              </div>
            </div>
          )}
          {tcv.revenue > 0 && tcv.band === 'green' && (
            <div className="flex gap-2 bg-green-50 p-3 text-sm text-green-800" data-testid="tracker-insight">
              <CheckCircle size={20} className="shrink-0 mt-0.5" /> This deal is above the {b.gm_green_pct}% target.
            </div>
          )}
          {tcv.revenue <= 0 && (
            <p className="text-sm text-[#7A6B9E]">Add revenue lines to see margins and insights.</p>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4" data-testid="tracker-warnings">
            <p className="flex items-center gap-2 font-semibold text-amber-800 text-sm mb-1">
              <Warning size={18} /> Check these inputs
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* term schedule + chart                                               */
/* ------------------------------------------------------------------ */
const ScheduleSection = ({ result }) => {
  const sch = result.schedule;
  const term = result.assumptions.term_years;
  const yrs = sch.years.slice(0, term);
  const idx = yrs.map((_, i) => i);
  const sumTo = (arr) => arr.slice(0, term).reduce((a, b) => a + b, 0);
  const fullRev = sumTo(sch.total_revenue);
  const fullCost = sumTo(sch.total_cost);
  const fullGm = fullRev - fullCost;

  const bm = result.benchmarks;
  const bandFor = (rev, g) => (rev > 0 ? (g > bm.gm_green_pct ? 'green' : g < bm.gm_amber_pct ? 'red' : 'amber') : 'none');

  const chartData = yrs.map((y, i) => ({ name: `Year ${y}`, Revenue: Math.round(sch.total_revenue[i]), Cost: Math.round(sch.total_cost[i]) }));

  const row = (key, label, values, full, opts = {}) => (
    <tr key={key} className={`border-b border-[#F1EBFA] ${opts.shade ? 'bg-[#F7F4FC]' : ''}`}>
      <td className={`px-2 py-1.5 text-sm text-[#1E1533] whitespace-nowrap ${opts.bold ? 'font-bold' : ''}`}>{label}</td>
      {values.map((v, i) => <Calc key={i} bold={opts.bold}>{v}</Calc>)}
      <Calc bold>{full}</Calc>
    </tr>
  );

  return (
    <Section
      title="Term schedule"
      hint="Recurring revenue and cost year by year, with revenue and cost escalation applied. Only months inside the contract term are counted."
      testId="tracker-schedule"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4DCF0]">
              <Th>&nbsp;</Th>
              {yrs.map((y) => <Th key={y} right>Year {y}</Th>)}
              <Th right>Full term</Th>
            </tr>
          </thead>
          <tbody>
            {row('rf', 'Revenue escalation factor', idx.map((i) => `×${sch.revenue_factor[i].toFixed(3)}`), '—')}
            {row('cf', 'Cost escalation factor', idx.map((i) => `×${sch.cost_factor[i].toFixed(3)}`), '—')}
            {sch.revenue_lines.map((l, n) => row(`rl${n}`, `Rev: ${l.label}`, idx.map((i) => inr(l.by_year[i])), inr(sumTo(l.by_year))))}
            {row('tr', 'Total recurring revenue', idx.map((i) => inr(sch.total_revenue[i])), inr(fullRev), { bold: true, shade: true })}
            {sch.cost_lines.map((l, n) => row(`cl${n}`, `Cost: ${l.label}`, idx.map((i) => inr(l.by_year[i])), inr(sumTo(l.by_year))))}
            {row('tc', 'Total recurring cost', idx.map((i) => inr(sch.total_cost[i])), inr(fullCost), { bold: true, shade: true })}
            {row('gm', 'Recurring gross margin', idx.map((i) => inr(sch.gm[i])), inr(fullGm), { bold: true })}
            <tr>
              <td className="px-2 py-1.5 text-sm text-[#1E1533]">Recurring GM %</td>
              {idx.map((i) => (
                <td key={i} className="px-2 py-1.5 text-right"><BandChip band={bandFor(sch.total_revenue[i], sch.gm_pct[i])}>{pct(sch.gm_pct[i])}</BandChip></td>
              ))}
              <td className="px-2 py-1.5 text-right">
                <BandChip band={result.summary.recurring_full_term.band}>{pct(result.summary.recurring_full_term.gm_pct)}</BandChip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 h-64" data-testid="tracker-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4DCF0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={compactInr} tick={{ fontSize: 12 }} width={56} />
            <Tooltip formatter={(v) => inr(v)} />
            <Legend />
            <Bar dataKey="Revenue" fill="#9B30FF" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Cost" fill="#E64AD1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* editor                                                              */
/* ------------------------------------------------------------------ */
const TrackerEditor = ({ form, setForm, config, proposals, canEdit, saving, dirty, nextVersion, onBack, onSave, onSaveAsVersion }) => {
  const result = useMemo(() => computeTracker(form), [form]);
  const warnings = useMemo(() => getWarnings(form, result), [form, result]);
  const [pulling, setPulling] = useState(false);
  const [linkedPipeline, setLinkedPipeline] = useState(null);
  const ro = !canEdit;

  // With a proposal linked, DSP comes from that proposal's own history (server-side, IST dates);
  // without one it is worked out here from the two dates typed on the tracker.
  useEffect(() => {
    if (!form.proposal_id) { setLinkedPipeline(null); return undefined; }
    let cancelled = false;
    axios.get(`${API}/profitability-trackers/pipeline/${form.proposal_id}`, { withCredentials: true })
      .then((r) => { if (!cancelled) setLinkedPipeline(r.data); })
      .catch(() => { if (!cancelled) setLinkedPipeline(null); });
    return () => { cancelled = true; };
  }, [form.proposal_id]);
  const dsp = form.proposal_id
    ? (linkedPipeline || { status: 'not_tracked', days: null, start: null, end: null })
    : computeManualDsp(form.pipeline_start, form.pipeline_end);
  const datesBackwards = !form.proposal_id && form.pipeline_start && form.pipeline_end && form.pipeline_end < form.pipeline_start;

  const setTop = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setAssump = (patch) => setForm((f) => ({ ...f, assumptions: { ...f.assumptions, ...patch } }));
  const updateRow = (list, key, patch) =>
    setForm((f) => ({ ...f, [list]: f[list].map((r) => (r._k === key ? { ...r, ...patch } : r)) }));
  const addRow = (list, row) => setForm((f) => ({ ...f, [list]: [...f[list], row] }));
  const removeRow = (list, key) => setForm((f) => ({ ...f, [list]: f[list].filter((r) => r._k !== key) }));

  const pullFromProposal = async () => {
    if (!form.proposal_id) return;
    setPulling(true);
    try {
      const { data } = await axios.get(`${API}/profitability-trackers/from-proposal/${form.proposal_id}`, { withCredentials: true });
      const upsert = (rows, incoming, factory, pick) => {
        const next = rows.slice();
        incoming.forEach((inc) => {
          const i = next.findIndex((r) => (r.label || '').trim().toLowerCase() === (inc.label || '').trim().toLowerCase());
          if (i >= 0) next[i] = { ...next[i], ...pick(inc) };
          else next.push({ ...factory(inc.label), ...pick(inc) });
        });
        return next;
      };
      setForm((f) => ({
        ...f,
        client_name: f.client_name || data.client_name || '',
        assumptions: {
          ...f.assumptions,
          term_years: data.term_years || f.assumptions.term_years,
          revenue_escalation_pct: data.revenue_escalation_pct ?? f.assumptions.revenue_escalation_pct,
        },
        one_time_items: upsert(f.one_time_items, data.one_time_items, blankOneTime, (x) => ({ qty: x.qty, rate: x.rate })),
        recurring_items: upsert(f.recurring_items, data.recurring_items, blankRecurring, (x) => ({
          qty: x.qty, rate_per_month: x.rate_per_month, min_bill_per_month: x.min_bill_per_month,
        })),
      }));
      toast.success(`Pulled ${data.one_time_items.length} one-time and ${data.recurring_items.length} recurring line(s) from the proposal. Add your costs next.`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not pull from the proposal');
    } finally {
      setPulling(false);
    }
  };

  const chooseRole = (key, value) => {
    if (value === '__custom__') updateRow('resources', key, { role: '', role_source: 'custom', annual_ctc: '' });
    else updateRow('resources', key, { role: value, role_source: 'rate_card', annual_ctc: config.roles[value].annual });
  };

  const a = form.assumptions;
  const termMonths = result.assumptions.term_months;

  const actions = (
    <>
      {canEdit && form.id && (
        <Button variant="outline" onClick={onSaveAsVersion} disabled={saving} className="bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0]" data-testid="tracker-save-version">
          <GitBranch size={18} className="mr-2" /> Save as {nextVersion}
        </Button>
      )}
      {canEdit && (
        <Button onClick={onSave} disabled={saving} className="text-white font-semibold shadow-md"
          style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }} data-testid="tracker-save">
          <FloppyDisk size={18} className="mr-2" /> {saving ? 'Saving…' : dirty || !form.id ? 'Save' : 'Saved'}
        </Button>
      )}
    </>
  );

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="tracker-editor">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button variant="outline" onClick={onBack} className="bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0]" data-testid="tracker-back">
          <ArrowLeft size={18} className="mr-2" /> Trackers
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-[#1E1533] flex items-center gap-2">
            <ChartLineUp size={26} className="text-purple-700" />
            {form.id ? `${form.client_name || 'Deal'} · ${form.version}` : 'New deal tracker'}
          </h2>
          {form.created_by && <p className="text-xs text-[#7A6B9E]">Created by {form.created_by.name}</p>}
        </div>
      </div>

      <SummaryStrip result={result} actions={actions} dsp={dsp} />

      {ro && (
        <div className="bg-[#F7F4FC] border border-[#E4DCF0] p-3 mt-4 text-sm text-[#5B4B7A]" data-testid="tracker-readonly">
          You can view this tracker but only its creator or an Admin can edit it. Use “New version” on the list to make your own copy.
        </div>
      )}

      <div className="space-y-5 mt-5">

          <Section title="Deal details" testId="tracker-details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Client name *</Label>
                <TextInput value={form.client_name} onChange={(v) => setTop({ client_name: v })} disabled={ro} placeholder="e.g. Michelin" testId="tracker-client" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label>Version</Label>
                <TextInput value={form.version} onChange={(v) => setTop({ version: v })} disabled={ro} placeholder="v1.0" testId="tracker-version" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label>Deal date</Label>
                <Input type="date" value={form.deal_date || ''} disabled={ro} onChange={(e) => setTop({ deal_date: e.target.value })}
                  className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-date" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Linked proposal (optional)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Select value={form.proposal_id || 'none'} disabled={ro} onValueChange={(v) => setTop({ proposal_id: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-proposal-select">
                        <SelectValue placeholder="None - standalone deal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None - standalone deal</SelectItem>
                        {proposals.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" disabled={ro || !form.proposal_id || pulling} onClick={pullFromProposal}
                    className="h-10 bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0] whitespace-nowrap" data-testid="tracker-pull">
                    <LinkSimple size={16} className="mr-1" /> {pulling ? 'Pulling…' : 'Pull revenue'}
                  </Button>
                </div>
                <p className="text-xs text-[#7A6B9E]">Pulls term, escalation and every revenue line from the proposal; costs stay for you to fill in.</p>
              </div>
              <div className="md:col-span-3 border-t border-[#F1EBFA] pt-4" data-testid="tracker-pipeline">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {form.proposal_id ? (
                    <>
                      <div className="space-y-1">
                        <Label>First proposal</Label>
                        <div className="h-10 flex items-center px-3 bg-[#F7F4FC] text-[#1E1533]" data-testid="pipeline-start-linked">{dsp.start ? formatDate(dsp.start) : '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <Label>{dsp.status === 'rejected' ? 'Rejected' : 'Approved'}</Label>
                        <div className="h-10 flex items-center px-3 bg-[#F7F4FC] text-[#1E1533]" data-testid="pipeline-end-linked">
                          {dsp.end ? formatDate(dsp.end) : dsp.status === 'in_pipeline' ? 'Still open — counting to today' : '—'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label>First proposal date</Label>
                        <Input type="date" value={form.pipeline_start || ''} disabled={ro} onChange={(e) => setTop({ pipeline_start: e.target.value })}
                          className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-pipeline-start" />
                      </div>
                      <div className="space-y-1">
                        <Label>Approved date (blank while open)</Label>
                        <Input type="date" value={form.pipeline_end || ''} disabled={ro} onChange={(e) => setTop({ pipeline_end: e.target.value })}
                          className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-pipeline-end" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <Label>Days in sales pipeline</Label>
                    <div className="h-10 flex items-center gap-2 px-3 bg-[#F7F4FC] text-[#1E1533] font-semibold">
                      {dspDays(dsp)} <BandChip band={DSP_BAND[dsp.status]}>{DSP_LABEL[dsp.status]}</BandChip>
                    </div>
                  </div>
                </div>
                {datesBackwards && (
                  <p className="text-xs text-red-700 mt-1" data-testid="pipeline-backwards">The approved date is before the first proposal date.</p>
                )}
                <p className="text-xs text-[#7A6B9E] mt-2">
                  {form.proposal_id
                    ? 'Taken from the linked proposal and kept up to date automatically: from when it was first created to its final approval.'
                    : 'Calendar days from the first proposal to approval. Link a proposal above to track this automatically instead.'}
                </p>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Notes</Label>
                <Textarea value={form.notes} disabled={ro} onChange={(e) => setTop({ notes: e.target.value })} rows={2}
                  placeholder="Assumptions, discounts, risks…" className="bg-[#FFFFFF] text-[#1E1533]" />
              </div>
            </div>
          </Section>

          <Section title="Contract assumptions" testId="tracker-assumptions">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Contract term (years)</Label>
                <Select value={String(a.term_years)} disabled={ro} onValueChange={(v) => setAssump({ term_years: parseInt(v, 10) })}>
                  <SelectTrigger className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-term"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_TERM_YEARS }, (_, i) => i + 1).map((y) => <SelectItem key={y} value={String(y)}>{y} year{y > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Revenue escalation / yr (%)</Label>
                <NumInput value={a.revenue_escalation_pct} onChange={(v) => setAssump({ revenue_escalation_pct: v })} disabled={ro} testId="tracker-rev-esc" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label>Cost escalation / yr (%)</Label>
                <NumInput value={a.cost_escalation_pct} onChange={(v) => setAssump({ cost_escalation_pct: v })} disabled={ro} testId="tracker-cost-esc" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label>Term in months</Label>
                <div className="h-10 flex items-center px-3 bg-[#F7F4FC] text-[#1E1533] font-semibold">{termMonths}</div>
              </div>
            </div>
          </Section>

          <Section
            title="One-time charges"
            hint="Revenue = Qty × Rate. Cost = Qty × Cost/unit (delivery staff for one-time work go under Resources)."
            testId="tracker-one-time"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E4DCF0]">
                    <Th>Line item</Th><Th right>Qty</Th><Th right>Rate ₹</Th><Th right>Revenue ₹</Th><Th right>Cost/unit ₹</Th><Th right>Cost ₹</Th><Th>&nbsp;</Th>
                  </tr>
                </thead>
                <tbody>
                  {form.one_time_items.map((r, i) => (
                    <tr key={r._k} className="border-b border-[#F1EBFA]" data-testid={`one-time-row-${i}`}>
                      <td className="px-1 py-1 min-w-[190px]"><TextInput value={r.label} disabled={ro} onChange={(v) => updateRow('one_time_items', r._k, { label: v })} placeholder="Line item" /></td>
                      <td className="px-1 py-1 w-24"><NumInput value={r.qty} disabled={ro} onChange={(v) => updateRow('one_time_items', r._k, { qty: v })} testId={`ot-qty-${i}`} /></td>
                      <td className="px-1 py-1 w-32"><NumInput value={r.rate} disabled={ro} onChange={(v) => updateRow('one_time_items', r._k, { rate: v })} testId={`ot-rate-${i}`} /></td>
                      <Calc>{inr(result.one_time_items[i]?.revenue)}</Calc>
                      <td className="px-1 py-1 w-32"><NumInput value={r.cost_per_unit} disabled={ro} onChange={(v) => updateRow('one_time_items', r._k, { cost_per_unit: v })} testId={`ot-cpu-${i}`} /></td>
                      <Calc>{inr(result.one_time_items[i]?.cost)}</Calc>
                      <RemoveBtn disabled={ro} onClick={() => removeRow('one_time_items', r._k)} label="Remove line" />
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F7F4FC]">
                    <td className="px-2 py-2 font-bold text-sm text-[#1E1533]" colSpan={3}>One-time subtotal (direct)</td>
                    <Calc bold>{inr(result.one_time.revenue)}</Calc><td />
                    <Calc bold>{inr(result.one_time.direct_cost)}</Calc><td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <AddRowBtn disabled={ro} onClick={() => addRow('one_time_items', blankOneTime())} testId="add-one-time">Add one-time line</AddRowBtn>
          </Section>

          <Section
            title="Recurring (SaaS) charges — per month"
            hint="Monthly revenue = the higher of Users × Rate or the Minimum bill. Hosting cost = Users × the per-user hosting cost. Leave Duration blank to run for the full term."
            testId="tracker-recurring"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#E4DCF0]">
                    <Th>Line item</Th><Th right>Users / Qty</Th><Th right>Rate ₹/mo</Th><Th right>Min bill ₹/mo</Th><Th right>Duration (mo)</Th>
                    <Th right>Hosting ₹/user/mo</Th><Th right>Revenue ₹/mo</Th><Th right>Hosting ₹/mo</Th><Th>&nbsp;</Th>
                  </tr>
                </thead>
                <tbody>
                  {form.recurring_items.map((r, i) => (
                    <tr key={r._k} className="border-b border-[#F1EBFA]" data-testid={`recurring-row-${i}`}>
                      <td className="px-1 py-1 min-w-[160px]"><TextInput value={r.label} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { label: v })} placeholder="Line item" /></td>
                      <td className="px-1 py-1 w-24"><NumInput value={r.qty} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { qty: v })} testId={`rec-qty-${i}`} /></td>
                      <td className="px-1 py-1 w-24"><NumInput value={r.rate_per_month} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { rate_per_month: v })} testId={`rec-rate-${i}`} /></td>
                      <td className="px-1 py-1 w-28"><NumInput value={r.min_bill_per_month} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { min_bill_per_month: v })} testId={`rec-min-${i}`} /></td>
                      <td className="px-1 py-1 w-24"><NumInput value={r.duration_months} placeholder={String(termMonths)} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { duration_months: v })} /></td>
                      <td className="px-1 py-1 w-28"><NumInput value={r.infra_pupm} disabled={ro} onChange={(v) => updateRow('recurring_items', r._k, { infra_pupm: v })} testId={`rec-pupm-${i}`} /></td>
                      <Calc>{inr(result.recurring_items[i]?.monthly_revenue)}</Calc>
                      <Calc>{inr(result.recurring_items[i]?.infra_monthly)}</Calc>
                      <RemoveBtn disabled={ro} onClick={() => removeRow('recurring_items', r._k)} label="Remove line" />
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F7F4FC]">
                    <td className="px-2 py-2 font-bold text-sm text-[#1E1533]" colSpan={6}>Recurring revenue subtotal / month</td>
                    <Calc bold>{inr(result.recurring_monthly.revenue)}</Calc>
                    <Calc bold>{inr(result.recurring_monthly.infra_cost - result.infra.base_per_month)}</Calc><td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <AddRowBtn disabled={ro} onClick={() => addRow('recurring_items', blankRecurring())} testId="add-recurring">Add recurring line</AddRowBtn>
          </Section>

          <Section
            title="Delivery cost — resources deployed"
            hint="Monthly cost = Annual CTC ÷ 12 × Allocation. One-time resources cost that × Months; recurring resources cost it every month of the term (with cost escalation)."
            testId="tracker-resources"
          >
            {form.resources.length === 0 && (
              <p className="text-sm text-[#7A6B9E] mb-2">No delivery resources yet — add the people who deliver and support this deal.</p>
            )}
            {form.resources.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#E4DCF0]">
                      <Th>Role</Th><Th right>Annual CTC ₹</Th><Th right>Alloc %</Th><Th>Type</Th><Th right>Months</Th>
                      <Th right>One-time ₹</Th><Th right>Recurring ₹/mo</Th><Th>&nbsp;</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.resources.map((r, i) => {
                      const isCustom = r.role_source === 'custom';
                      const selectValue = isCustom ? '__custom__' : (r.role && config.roles[r.role] ? r.role : '');
                      return (
                        <tr key={r._k} className="border-b border-[#F1EBFA]" data-testid={`resource-row-${i}`}>
                          <td className="px-1 py-1 min-w-[200px]">
                            <Select value={selectValue} disabled={ro} onValueChange={(v) => chooseRole(r._k, v)}>
                              <SelectTrigger className="h-9 bg-[#FFFFFF] text-[#1E1533]" data-testid={`res-role-${i}`}><SelectValue placeholder="Select role" /></SelectTrigger>
                              <SelectContent>
                                {Object.keys(config.roles).map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                                <SelectItem value="__custom__">Custom role…</SelectItem>
                              </SelectContent>
                            </Select>
                            {isCustom && (
                              <div className="mt-1"><TextInput value={r.role} disabled={ro} onChange={(v) => updateRow('resources', r._k, { role: v })} placeholder="Role name" testId={`res-name-${i}`} /></div>
                            )}
                          </td>
                          <td className="px-1 py-1 w-36">
                            {isCustom ? (
                              <NumInput value={r.annual_ctc} disabled={ro} onChange={(v) => updateRow('resources', r._k, { annual_ctc: v })} testId={`res-ctc-${i}`} />
                            ) : (
                              <div className="h-9 flex items-center justify-end px-2 text-sm text-[#5B4B7A]" title="From the company rate card">{r.annual_ctc ? inr(r.annual_ctc) : '—'}</div>
                            )}
                          </td>
                          <td className="px-1 py-1 w-24"><NumInput value={r.alloc_pct} disabled={ro} onChange={(v) => updateRow('resources', r._k, { alloc_pct: v })} testId={`res-alloc-${i}`} /></td>
                          <td className="px-1 py-1 w-36">
                            <Select value={r.type} disabled={ro} onValueChange={(v) => updateRow('resources', r._k, { type: v })}>
                              <SelectTrigger className="h-9 bg-[#FFFFFF] text-[#1E1533]" data-testid={`res-type-${i}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="one_time">One-time</SelectItem>
                                <SelectItem value="recurring">Recurring</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1 py-1 w-24">
                            <NumInput value={r.months} placeholder={r.type === 'recurring' ? String(termMonths) : '0'} disabled={ro} onChange={(v) => updateRow('resources', r._k, { months: v })} testId={`res-months-${i}`} />
                          </td>
                          <Calc>{inr(result.resources[i]?.one_time_cost)}</Calc>
                          <Calc>{inr(result.resources[i]?.recurring_monthly)}</Calc>
                          <RemoveBtn disabled={ro} onClick={() => removeRow('resources', r._k)} label="Remove resource" />
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F7F4FC]">
                      <td className="px-2 py-2 font-bold text-sm text-[#1E1533]" colSpan={5}>Resource subtotal</td>
                      <Calc bold>{inr(result.one_time.resource_cost)}</Calc>
                      <Calc bold>{inr(result.recurring_monthly.resource_cost)}</Calc><td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <AddRowBtn disabled={ro} onClick={() => addRow('resources', blankResource())} testId="add-resource">Add resource</AddRowBtn>
          </Section>

          <Section
            title="Infrastructure (hosting / cloud)"
            hint="Monthly hosting = fixed base + each recurring line's Users × its per-user hosting cost (entered in the recurring table above). Runs for the whole term."
            testId="tracker-infra"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <Label>Base cost ₹/month (database, environments, monitoring)</Label>
                <NumInput value={form.infra.base_per_month} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, infra: { ...f.infra, base_per_month: v } }))} testId="tracker-infra-base" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label>Hosting ₹/month</Label>
                <div className="h-10 flex items-center px-3 bg-[#F7F4FC] text-[#1E1533] font-semibold" data-testid="infra-monthly">{inr(result.infra.monthly_total)}</div>
              </div>
              <div className="space-y-1">
                <Label>Duration (months)</Label>
                <div className="h-10 flex items-center px-3 bg-[#F7F4FC] text-[#1E1533] font-semibold">{termMonths}</div>
              </div>
            </div>
          </Section>
      </div>

      <div className="mt-6">
        <SummaryDetails result={result} warnings={warnings} />
      </div>

      <div className="mt-6">
        <ScheduleSection result={result} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* list + page                                                         */
/* ------------------------------------------------------------------ */
const ProfitabilityTracker = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [trackers, setTrackers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = list view
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const baseline = useRef('');

  const fetchList = async () => {
    try {
      const { data } = await axios.get(`${API}/profitability-trackers`, { withCredentials: true });
      setTrackers(data);
    } catch (e) {
      toast.error('Failed to load trackers');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [cfg] = await Promise.all([
          axios.get(`${API}/profitability-trackers/config`, { withCredentials: true }),
          fetchList(),
        ]);
        setConfig(cfg.data);
        axios.get(`${API}/proposals`, { withCredentials: true }).then((r) => setProposals(r.data)).catch(() => {});
      } catch (e) {
        toast.error('Failed to load tracker settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isAdmin = user?.role === 'Admin';
  const canEditForm = (f) => !f.id || f.created_by?.id === user?.id || isAdmin;
  const dirty = form ? snapshotOf(form) !== baseline.current : false;

  const open = (f) => { baseline.current = snapshotOf(f); setForm(f); };
  const openNew = () => open(newForm(config));
  const openExisting = async (id) => {
    try {
      const { data } = await axios.get(`${API}/profitability-trackers/${id}`, { withCredentials: true });
      open(formFromDoc(data));
    } catch (e) {
      toast.error('Could not open tracker');
    }
  };
  const backToList = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setForm(null);
    fetchList();
  };

  const save = async () => {
    if (!form.client_name.trim()) { toast.error('Client name is required'); return; }
    setSaving(true);
    try {
      const body = payloadFromForm(form);
      const { data } = form.id
        ? await axios.put(`${API}/profitability-trackers/${form.id}`, body, { withCredentials: true })
        : await axios.post(`${API}/profitability-trackers`, { ...body, parent_id: form.parent_id || null }, { withCredentials: true });
      const saved = formFromDoc(data);
      baseline.current = snapshotOf(saved);
      setForm(saved);
      toast.success('Tracker saved');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save tracker');
    } finally {
      setSaving(false);
    }
  };

  const saveAsNewVersion = async () => {
    if (!form.client_name.trim()) { toast.error('Client name is required'); return; }
    setSaving(true);
    try {
      const label = nextFreeVersion(form.client_name, form.version, trackers);
      const { data } = await axios.post(
        `${API}/profitability-trackers`,
        { ...payloadFromForm(form), version: label, parent_id: form.id },
        { withCredentials: true },
      );
      const saved = formFromDoc(data);
      baseline.current = snapshotOf(saved);
      setForm(saved);
      toast.success(`Saved as ${label}. The earlier version is unchanged.`);
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save new version');
    } finally {
      setSaving(false);
    }
  };

  const copyAsNextVersion = async (t) => {
    try {
      const { data } = await axios.post(`${API}/profitability-trackers/${t.id}/new-version`, {}, { withCredentials: true });
      toast.success(`Created ${data.version}`);
      await fetchList();
      open(formFromDoc(data));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not create a new version');
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete the tracker for ${t.client_name} (${t.version})? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/profitability-trackers/${t.id}`, { withCredentials: true });
      toast.success('Tracker deleted');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not delete tracker');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? trackers.filter((t) => `${t.client_name} ${t.version}`.toLowerCase().includes(q)) : trackers;
  }, [trackers, search]);

  if (loading || !config) return <LoadingSpinner fullScreen label="Loading trackers..." />;

  if (form) {
    return (
      <TrackerEditor
        form={form} setForm={setForm} config={config} proposals={proposals}
        canEdit={canEditForm(form)} saving={saving} dirty={dirty}
        nextVersion={nextFreeVersion(form.client_name, form.version, trackers)}
        onBack={backToList} onSave={save} onSaveAsVersion={saveAsNewVersion}
      />
    );
  }

  return (
    <div className="p-6" data-testid="tracker-list-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1533] flex items-center gap-2">
            <ChartLineUp size={28} className="text-purple-700" /> Deal Profitability Tracker
          </h2>
          <p className="text-[#7A6B9E] text-sm">
            Multi-year margin model per deal: one-time and recurring revenue, delivery and hosting cost, escalation, and total contract value.
          </p>
        </div>
        <Button onClick={openNew} className="text-white font-semibold shadow-md"
          style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }} data-testid="new-tracker-button">
          <Plus size={18} className="mr-2" /> New tracker
        </Button>
      </div>

      {trackers.length > 0 && (
        <div className="relative max-w-sm mb-4">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6B9E]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or version"
            className="pl-9 h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="tracker-search" />
        </div>
      )}

      {trackers.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm p-10 text-center" data-testid="tracker-empty">
          <ChartLineUp size={44} className="mx-auto text-purple-700 mb-3" />
          <h3 className="text-lg font-bold text-[#1E1533] mb-1">No deal trackers yet</h3>
          <p className="text-sm text-[#7A6B9E] mb-4">Create one to see a deal's margin over its full contract term, and keep versions as the commercials change.</p>
          <Button onClick={openNew} variant="outline" className="bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0]">
            <Plus size={16} className="mr-2" /> Create your first tracker
          </Button>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[1040px]" data-testid="tracker-table">
            <thead>
              <tr className="border-b border-[#E4DCF0] bg-[#F7F4FC]">
                <Th>Client</Th><Th>Version</Th><Th>Deal date</Th><Th right>Term</Th><Th right>TCV</Th><Th right>Gross margin</Th>
                <Th>GM %</Th><Th>Hosting</Th><Th>Days in pipeline</Th><Th>Owner</Th><Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const mine = t.created_by?.id === user?.id || isAdmin;
                return (
                  <tr key={t.id} className="border-b border-[#F1EBFA] hover:bg-[#F7F4FC] cursor-pointer" onClick={() => openExisting(t.id)} data-testid={`tracker-row-${t.id}`}>
                    <td className="px-2 py-3 text-sm font-semibold text-[#1E1533]">{t.client_name}</td>
                    <td className="px-2 py-3 text-sm text-[#1E1533] whitespace-nowrap">{t.version}</td>
                    <td className="px-2 py-3 text-sm text-[#5B4B7A] whitespace-nowrap">{formatDate(t.deal_date)}</td>
                    <Calc>{t.term_years} yr</Calc>
                    <Calc bold>{inr(t.tcv_revenue)}</Calc>
                    <Calc>{inr(t.tcv_gm)}</Calc>
                    <td className="px-2 py-3"><BandChip band={t.gm_band}>{pct(t.tcv_gm_pct)}</BandChip></td>
                    <td className="px-2 py-3">
                      <BandChip band={t.infra_flag === 'HIGH' ? 'red' : t.infra_flag === 'OK' ? 'green' : 'none'}>
                        {t.infra_flag === 'n/a' ? 'n/a' : `${pct(t.infra_pct)} ${t.infra_flag}`}
                      </BandChip>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap" data-testid={`tracker-dsp-${t.id}`}>
                      <span className="text-sm font-semibold text-[#1E1533] mr-2">{dspDays(t.dsp)}</span>
                      {t.dsp && t.dsp.status !== 'not_tracked' && <BandChip band={DSP_BAND[t.dsp.status]}>{DSP_LABEL[t.dsp.status]}</BandChip>}
                    </td>
                    <td className="px-2 py-3 text-xs text-[#5B4B7A] whitespace-nowrap">{t.created_by?.name}</td>
                    <td className="px-2 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button type="button" title="Open" onClick={() => openExisting(t.id)} className="p-1.5 rounded text-purple-700 hover:bg-purple-50"><PencilSimple size={17} /></button>
                      <button type="button" title="New version" onClick={() => copyAsNextVersion(t)} className="p-1.5 rounded text-purple-700 hover:bg-purple-50" data-testid={`tracker-copy-${t.id}`}><GitBranch size={17} /></button>
                      {mine && <button type="button" title="Delete" onClick={() => remove(t)} className="p-1.5 rounded text-red-700 hover:bg-red-50"><Trash size={17} /></button>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-[#7A6B9E]">No trackers match “{search}”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProfitabilityTracker;
