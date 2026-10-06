import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ProfitabilityAnalyzer from './ProfitabilityAnalyzer';
import ProfitabilityTracker from './ProfitabilityTracker';

const TABS = [
  { id: 'analyzer', label: 'Analyzer', hint: 'Cost against each revenue line' },
  { id: 'tracker', label: 'Deal Tracker', hint: 'Multi-year deal margin & TCV' },
];

// Profitability section: the original single-period Analyzer plus the new
// multi-year Deal Tracker. The selected tab lives in the URL (?tab=tracker)
// so it can be linked to and survives a refresh.
const ProfitabilityHub = () => {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') === 'tracker' ? 'tracker' : 'analyzer';

  return (
    <div data-testid="profitability-hub">
      <div className="px-6 pt-6">
        <div role="tablist" aria-label="Profitability tools" className="inline-flex border border-[#E4DCF0] bg-[#FFFFFF] p-1 gap-1">
          {TABS.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id} role="tab" aria-selected={selected} type="button"
                onClick={() => setParams(t.id === 'analyzer' ? {} : { tab: t.id })}
                data-testid={`profitability-tab-${t.id}`}
                title={t.hint}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${selected ? 'text-white shadow-sm' : 'text-[#5B4B7A] hover:bg-[#F1EBFA]'}`}
                style={selected ? { background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {active === 'tracker' ? <ProfitabilityTracker /> : <ProfitabilityAnalyzer />}
    </div>
  );
};

export default ProfitabilityHub;
