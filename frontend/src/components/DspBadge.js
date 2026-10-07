import React from 'react';

// Days in Sales Pipeline: first proposal -> approved. The number always comes
// from the server (`dsp` on every proposal), so every screen agrees with the
// dashboard, the tracker and the emails.
//
//   variant "full"    -> "21 days · Approved"      (headers, lists with room)
//   variant "compact" -> "21d"                     (tight cards)
//   variant "inline"  -> "21d to approve" /        (feeds, alerts, notifications:
//                        "10d in pipeline" /         says what the number means)
//                        "7d to reject"
//   variant "status"  -> "Approved" (status only, next to a big number)
//   size "sm" | "md"  -> small by default for compact/inline, normal otherwise
const STYLES = {
  approved: 'bg-green-100 text-green-800 border-green-300',
  in_pipeline: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};
const STATUS_LABEL = { approved: 'Approved', in_pipeline: 'In pipeline', rejected: 'Rejected' };

export const dspDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const dspTooltip = (dsp) => {
  const end = dsp.end ? dspDate(dsp.end) : 'today (still open)';
  const verb = dsp.status === 'rejected' ? 'rejected' : dsp.status === 'approved' ? 'approved' : '';
  return `Days in sales pipeline: first proposal ${dspDate(dsp.start)} → ${verb ? `${verb} ` : ''}${end}`;
};

const DspBadge = ({ dsp, variant = 'full', size, className = '', testId }) => {
  if (!dsp || dsp.days === null || dsp.days === undefined || !STYLES[dsp.status]) return null;
  const plural = dsp.days === 1 ? '' : 's';
  const text = {
    full: `${dsp.days} day${plural} · ${STATUS_LABEL[dsp.status]}`,
    compact: `${dsp.days}d`,
    inline: dsp.status === 'approved' ? `${dsp.days}d to approve` : dsp.status === 'rejected' ? `${dsp.days}d to reject` : `${dsp.days}d in pipeline`,
    status: STATUS_LABEL[dsp.status],
  }[variant];
  // small for tight spots (cards, feeds); normal size wherever there is room - pass size="md" to force it
  const small = (size || (variant === 'compact' || variant === 'inline' ? 'sm' : 'md')) === 'sm';
  const sizeClass = small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      title={dspTooltip(dsp)}
      data-testid={testId}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${sizeClass} ${STYLES[dsp.status]} ${className}`}
    >
      {text}
    </span>
  );
};

export default DspBadge;
