"""Deal Profitability Tracker - calculation engine.

Pure functions only (no FastAPI / database), so the logic can be tested in
isolation. This reproduces the logic of Botree's "Deal Margin Calculator"
Excel template (BMC_*.xlsx, sheets "Calculator" + "Schedule"), with a few
deliberate fixes noted below.

Money is in rupees; percentages are expressed as percent numbers (8 = 8%).

Logic, with the Excel cells it comes from:

  One-time charges      revenue = qty * rate                          (Calculator D12:D18)
                        direct cost = qty * cost_per_unit             (Calculator F12:F18)
  Recurring charges     revenue / month = MAX(qty * rate, min_bill)   (Calculator F23:F26)
  Resources             monthly cost = annual_ctc / 12
                        one-time type : cost = monthly * alloc * months   (Calculator F32:F43)
                        recurring type: cost / month = monthly * alloc    (Calculator G32:G43)
  Infrastructure        cost / month = base + SUM(pupm * users)          (Calculator B52)
  Schedule (year y)     revenue factor = (1 + revenue_esc)^(y-1)         (Schedule row 3)
                        cost factor    = (1 + cost_esc)^(y-1)            (Schedule row 4)
                        months active  = IF(y <= term, MAX(0, MIN(12, duration - (y-1)*12)), 0)
                        year value = monthly value * factor * months active
  Margin summary        one-time, recurring/month, recurring/year-1, recurring/full-term, TCV
  Benchmarks            infra % of recurring revenue vs a 12% target; GM bands 60% / 40%

Deliberate differences from the Excel (all of which give identical numbers on
data that the Excel handled correctly):
  * A one-time line's revenue is always qty * rate. (Excel's integration row
    used =C13 and silently ignored its quantity.)
  * Infrastructure users are each recurring line's own quantity, so they can
    never drift out of sync. (In Excel they were typed numbers whose label
    said "= total licensed users".) Every recurring line can carry its own
    per-user-per-month infra cost, not just two of them.
  * A term above MAX_TERM_YEARS is rejected rather than silently truncated.
"""

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

MAX_TERM_YEARS = 10
MAX_ROWS = 60

INFRA_TARGET_PCT = 12.0   # hosting should stay below this % of recurring revenue
GM_GREEN_PCT = 60.0       # GM% above this is green
GM_AMBER_PCT = 40.0       # GM% below this is red; in between is amber

RESOURCE_TYPES = ("one_time", "recurring")


def _num(value: Any, default: float = 0.0) -> float:
    """Coerce to float; blanks / None / junk become the default."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def months_active(year: int, term_years: int, duration_months: float) -> float:
    """Months of a line that fall inside contract year `year` (1-based)."""
    if year > term_years:
        return 0.0
    return max(0.0, min(12.0, duration_months - (year - 1) * 12))


def gm_band(revenue: float, gm_pct: float) -> str:
    """'green' / 'amber' / 'red', or 'none' when there is no revenue to judge."""
    if revenue <= 0:
        return "none"
    if gm_pct > GM_GREEN_PCT:
        return "green"
    if gm_pct < GM_AMBER_PCT:
        return "red"
    return "amber"


def _margin(revenue: float, cost: float) -> Dict[str, Any]:
    gm = revenue - cost
    gm_pct = (gm / revenue * 100.0) if revenue else 0.0   # Excel: IFERROR(...,0)
    return {"revenue": revenue, "cost": cost, "gm": gm, "gm_pct": gm_pct, "band": gm_band(revenue, gm_pct)}


def compute_tracker(data: Dict[str, Any]) -> Dict[str, Any]:
    """Compute everything for one deal. `data` is the tracker input dict
    (see validate_tracker_input for the shape); it is not modified."""
    a = data.get("assumptions") or {}
    term_years = int(_num(a.get("term_years"), 1)) or 1
    term_months = term_years * 12
    rev_esc = _num(a.get("revenue_escalation_pct")) / 100.0
    cost_esc = _num(a.get("cost_escalation_pct")) / 100.0

    years = list(range(1, MAX_TERM_YEARS + 1))
    rev_factor = [(1 + rev_esc) ** (y - 1) for y in years]
    cost_factor = [(1 + cost_esc) ** (y - 1) for y in years]

    # ---- one-time charges ----
    one_time_items = []
    ot_revenue = 0.0
    ot_direct_cost = 0.0
    for item in data.get("one_time_items") or []:
        qty = _num(item.get("qty"))
        rate = _num(item.get("rate"))
        cpu = _num(item.get("cost_per_unit"))
        rev = qty * rate
        cost = qty * cpu
        ot_revenue += rev
        ot_direct_cost += cost
        one_time_items.append({**item, "revenue": rev, "cost": cost})

    # ---- recurring charges ----
    recurring_items = []
    rec_monthly_revenue = 0.0
    infra_base = _num((data.get("infra") or {}).get("base_per_month"))
    infra_monthly = infra_base
    for item in data.get("recurring_items") or []:
        qty = _num(item.get("qty"))
        rate = _num(item.get("rate_per_month"))
        min_bill = _num(item.get("min_bill_per_month"))
        pupm = _num(item.get("infra_pupm"))
        duration = _num(item.get("duration_months"), 0.0) or float(term_months)
        monthly_rev = max(qty * rate, min_bill)
        line_infra = pupm * qty
        rec_monthly_revenue += monthly_rev
        infra_monthly += line_infra
        recurring_items.append({
            **item,
            "duration_months": duration,
            "monthly_revenue": monthly_rev,
            "infra_monthly": line_infra,
        })

    # ---- delivery resources ----
    resources = []
    res_one_time_cost = 0.0
    res_recurring_monthly = 0.0
    for item in data.get("resources") or []:
        monthly = _num(item.get("annual_ctc")) / 12.0
        alloc = _num(item.get("alloc_pct")) / 100.0
        rtype = item.get("type") if item.get("type") in RESOURCE_TYPES else "one_time"
        if rtype == "one_time":
            months = _num(item.get("months"))
            one_time_cost = monthly * alloc * months
            recurring_monthly = 0.0
            duration = months
        else:
            duration = _num(item.get("months"), 0.0) or float(term_months)
            one_time_cost = 0.0
            recurring_monthly = monthly * alloc
        res_one_time_cost += one_time_cost
        res_recurring_monthly += recurring_monthly
        resources.append({
            **item,
            "type": rtype,
            "monthly_cost": monthly,
            "duration_months": duration,
            "one_time_cost": one_time_cost,
            "recurring_monthly": recurring_monthly,
        })

    # ---- term schedule ----
    revenue_lines = []
    for item in recurring_items:
        by_year = [
            item["monthly_revenue"] * rev_factor[i] * months_active(y, term_years, item["duration_months"])
            for i, y in enumerate(years)
        ]
        revenue_lines.append({"label": item.get("label") or "(unnamed)", "by_year": by_year, "total": sum(by_year)})

    cost_lines = []
    for item in resources:
        if item["type"] != "recurring":
            continue
        by_year = [
            item["recurring_monthly"] * cost_factor[i] * months_active(y, term_years, item["duration_months"])
            for i, y in enumerate(years)
        ]
        cost_lines.append({
            "label": item.get("role") or "(unnamed role)", "kind": "resource",
            "by_year": by_year, "total": sum(by_year),
        })
    infra_by_year = [
        infra_monthly * cost_factor[i] * months_active(y, term_years, float(term_months))
        for i, y in enumerate(years)
    ]
    cost_lines.append({"label": "Infrastructure (hosting)", "kind": "infra",
                       "by_year": infra_by_year, "total": sum(infra_by_year)})

    total_rev_by_year = [sum(l["by_year"][i] for l in revenue_lines) for i in range(len(years))]
    total_cost_by_year = [sum(l["by_year"][i] for l in cost_lines) for i in range(len(years))]
    gm_by_year = [r - c for r, c in zip(total_rev_by_year, total_cost_by_year)]
    gm_pct_by_year = [(g / r * 100.0) if r else 0.0 for g, r in zip(gm_by_year, total_rev_by_year)]
    rec_full_rev = sum(total_rev_by_year)
    rec_full_cost = sum(total_cost_by_year)

    # ---- margin summary ----
    one_time_cost_total = ot_direct_cost + res_one_time_cost
    summary = {
        "one_time": _margin(ot_revenue, one_time_cost_total),
        "recurring_month": _margin(rec_monthly_revenue, res_recurring_monthly + infra_monthly),
        "recurring_year1": _margin(total_rev_by_year[0], total_cost_by_year[0]),
        "recurring_full_term": _margin(rec_full_rev, rec_full_cost),
        "tcv": _margin(ot_revenue + rec_full_rev, one_time_cost_total + rec_full_cost),
    }

    # ---- benchmarks & insights ----
    infra_total = sum(infra_by_year)
    infra_pct = (infra_total / rec_full_rev * 100.0) if rec_full_rev else 0.0
    if rec_full_rev <= 0:
        infra_flag = "n/a"
    else:
        infra_flag = "HIGH" if infra_pct > INFRA_TARGET_PCT else "OK"

    tcv = summary["tcv"]
    needed_green = tcv["cost"] / (1 - GM_GREEN_PCT / 100.0)
    needed_amber = tcv["cost"] / (1 - GM_AMBER_PCT / 100.0)
    insights = {
        "revenue_needed_for_green": needed_green,
        "gap_to_green": max(0.0, needed_green - tcv["revenue"]),
        "revenue_needed_for_amber": needed_amber,
        "gap_to_amber": max(0.0, needed_amber - tcv["revenue"]),
    }

    return {
        "assumptions": {
            "term_years": term_years, "term_months": term_months,
            "revenue_escalation_pct": rev_esc * 100.0, "cost_escalation_pct": cost_esc * 100.0,
        },
        "one_time_items": one_time_items,
        "recurring_items": recurring_items,
        "resources": resources,
        "infra": {"base_per_month": infra_base, "monthly_total": infra_monthly},
        "one_time": {
            "revenue": ot_revenue, "direct_cost": ot_direct_cost,
            "resource_cost": res_one_time_cost, "cost": one_time_cost_total,
        },
        "recurring_monthly": {
            "revenue": rec_monthly_revenue, "resource_cost": res_recurring_monthly,
            "infra_cost": infra_monthly, "cost": res_recurring_monthly + infra_monthly,
        },
        "summary": summary,
        "schedule": {
            "years": years, "revenue_factor": rev_factor, "cost_factor": cost_factor,
            "revenue_lines": revenue_lines, "cost_lines": cost_lines,
            "total_revenue": total_rev_by_year, "total_cost": total_cost_by_year,
            "gm": gm_by_year, "gm_pct": gm_pct_by_year,
        },
        "benchmarks": {
            "infra_pct": infra_pct, "infra_flag": infra_flag, "infra_target_pct": INFRA_TARGET_PCT,
            "gm_green_pct": GM_GREEN_PCT, "gm_amber_pct": GM_AMBER_PCT,
        },
        "insights": insights,
    }


# --------------------------------------------------------------------------
# Input validation
# --------------------------------------------------------------------------

def _clean_text(value: Any, max_len: int = 120) -> str:
    return str(value or "").strip()[:max_len]


def _nonneg(value: Any, field: str) -> float:
    n = _num(value)
    if n < 0:
        raise ValueError(f"{field} cannot be negative")
    return n


def validate_tracker_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """Return a cleaned copy of the tracker inputs, or raise ValueError with a
    message suitable for showing to the user. Only input fields are kept."""
    a = data.get("assumptions") or {}
    term = _num(a.get("term_years"), 0)
    if term != int(term) or not (1 <= term <= MAX_TERM_YEARS):
        raise ValueError(f"Contract term must be a whole number of years between 1 and {MAX_TERM_YEARS}")
    rev_esc = _num(a.get("revenue_escalation_pct"))
    cost_esc = _num(a.get("cost_escalation_pct"))
    for name, v in (("Revenue escalation", rev_esc), ("Cost escalation", cost_esc)):
        if not (-50 <= v <= 200):
            raise ValueError(f"{name} must be between -50% and 200%")

    for key in ("one_time_items", "recurring_items", "resources"):
        if len(data.get(key) or []) > MAX_ROWS:
            raise ValueError(f"Too many rows in {key.replace('_', ' ')} (maximum {MAX_ROWS})")

    one_time = [{
        "label": _clean_text(i.get("label")),
        "qty": _nonneg(i.get("qty"), "One-time quantity"),
        "rate": _nonneg(i.get("rate"), "One-time rate"),
        "cost_per_unit": _nonneg(i.get("cost_per_unit"), "One-time cost per unit"),
    } for i in data.get("one_time_items") or []]

    recurring = []
    for i in data.get("recurring_items") or []:
        duration = _num(i.get("duration_months"), 0.0)
        if duration < 0:
            raise ValueError("Recurring duration cannot be negative")
        recurring.append({
            "label": _clean_text(i.get("label")),
            "qty": _nonneg(i.get("qty"), "Recurring quantity"),
            "rate_per_month": _nonneg(i.get("rate_per_month"), "Recurring rate"),
            "min_bill_per_month": _nonneg(i.get("min_bill_per_month"), "Minimum bill"),
            "infra_pupm": _nonneg(i.get("infra_pupm"), "Infrastructure cost per user"),
            "duration_months": duration or None,
        })

    resources = []
    for i in data.get("resources") or []:
        alloc = _nonneg(i.get("alloc_pct"), "Allocation")
        if alloc > 100:
            raise ValueError("Allocation cannot exceed 100%")
        rtype = i.get("type") or "one_time"
        if rtype not in RESOURCE_TYPES:
            raise ValueError("Resource type must be 'one_time' or 'recurring'")
        months = _num(i.get("months"), 0.0)
        if months < 0:
            raise ValueError("Resource months cannot be negative")
        resources.append({
            "role": _clean_text(i.get("role")),
            "role_source": "rate_card" if i.get("role_source") == "rate_card" else "custom",
            "annual_ctc": _nonneg(i.get("annual_ctc"), "Annual CTC"),
            "alloc_pct": alloc,
            "type": rtype,
            "months": months or None,
        })

    return {
        "assumptions": {
            "term_years": int(term),
            "revenue_escalation_pct": rev_esc,
            "cost_escalation_pct": cost_esc,
        },
        "one_time_items": one_time,
        "recurring_items": recurring,
        "resources": resources,
        "infra": {"base_per_month": _nonneg((data.get("infra") or {}).get("base_per_month"), "Base infrastructure cost")},
    }


def summary_fields(computed: Dict[str, Any]) -> Dict[str, Any]:
    """Flat headline numbers stored on the tracker document so the list view
    never has to recompute anything."""
    tcv = computed["summary"]["tcv"]
    return {
        "tcv_revenue": tcv["revenue"],
        "tcv_cost": tcv["cost"],
        "tcv_gm": tcv["gm"],
        "tcv_gm_pct": tcv["gm_pct"],
        "gm_band": tcv["band"],
        "infra_pct": computed["benchmarks"]["infra_pct"],
        "infra_flag": computed["benchmarks"]["infra_flag"],
        "term_years": computed["assumptions"]["term_years"],
    }


# --------------------------------------------------------------------------
# Versioning and proposal linking
# --------------------------------------------------------------------------

def next_version_label(label: Optional[str]) -> str:
    """'v5.0' -> 'v6.0'. Labels that don't follow that pattern get ' (copy)'."""
    text = (label or "").strip()
    m = re.fullmatch(r"[vV]?(\d+)(?:\.(\d+))?", text)
    if m:
        return f"v{int(m.group(1)) + 1}.0"
    return f"{text} (copy)" if text else "v1.0"


ONE_TIME_FIELD_LABELS = [
    ("one_time_setup_fee", "One-time setup fee"),
    ("integration_fee", "Integration fee"),
    ("dms_training_fee", "DMS training"),
    ("sfa_training_fee", "SFA training"),
    ("flexidms_deployment_fee", "Flexi DMS deployment"),
    ("customization_fee", "Customization"),
    ("workshop_fee", "Workshop / data migration / audit"),
]

RECURRING_FIELD_LABELS = [
    ("sfa_user_charge", "SFA users"),
    ("dms_distributor_charge", "DMS distributors"),
    ("flexidms_distributor_charge", "Flexi DMS users"),
    ("shared_l1_support_charge", "Shared L1 support"),
]


def tracker_inputs_from_proposal(proposal: Dict[str, Any]) -> Dict[str, Any]:
    """Revenue-side tracker inputs taken from a proposal's commercials. Costs
    are not known from a proposal, so every cost field is left at zero for the
    user to fill in. A proposal records each one-time fee as a single lump sum,
    so those come across as quantity 1 at that amount."""
    one_time: List[Dict[str, Any]] = []
    for field, label in ONE_TIME_FIELD_LABELS:
        amount = proposal.get(field)
        if amount:
            one_time.append({"label": label, "qty": 1, "rate": amount, "cost_per_unit": 0})
    for fee in proposal.get("additional_fees") or []:
        if fee.get("value"):
            one_time.append({"label": fee.get("name") or "Additional fee", "qty": 1,
                             "rate": fee["value"], "cost_per_unit": 0})

    recurring: List[Dict[str, Any]] = []

    def add_recurring(charge: Optional[Dict[str, Any]], label: str) -> None:
        if not charge:
            return
        qty, rate, min_bill = charge.get("quantity"), charge.get("rate_per_user_month"), charge.get("monthly_minimum_billing")
        if qty is None and rate is None and min_bill is None:
            return
        recurring.append({"label": label, "qty": qty or 0, "rate_per_month": rate or 0,
                          "min_bill_per_month": min_bill or 0, "infra_pupm": 0, "duration_months": None})

    for field, label in RECURRING_FIELD_LABELS:
        add_recurring(proposal.get(field), label)
    for charge in proposal.get("extra_ongoing_charges") or []:
        add_recurring(charge, charge.get("name") or "Additional recurring charge")

    years = proposal.get("contract_years")
    return {
        "client_name": proposal.get("customer_name") or proposal.get("title") or "",
        "term_years": years if isinstance(years, int) and 1 <= years <= MAX_TERM_YEARS else None,
        "revenue_escalation_pct": proposal.get("price_escalation_percent"),
        "one_time_items": one_time,
        "recurring_items": recurring,
    }


# --------------------------------------------------------------------------
# Days in Sales Pipeline (DSP)
# --------------------------------------------------------------------------
# DSP = calendar days from the FIRST proposal to approval. For a deal linked to
# a proposal it is read from that proposal's own record, so it is always current:
# an open deal keeps counting up and switches to "approved" the day the last
# approver signs off. Deals without a linked proposal can carry two manual dates.
#
# Dates are counted in IST. Timestamps are stored in UTC, and a proposal approved
# at 10:30 pm IST is already "tomorrow" in UTC - counting in UTC would be off by a
# day for late-evening activity. India has no daylight saving, so a fixed offset
# is exact.

IST = timezone(timedelta(hours=5, minutes=30))


def to_ist_date(value: Any) -> Optional[date]:
    """A stored UTC timestamp (or a plain YYYY-MM-DD) as a calendar date in IST."""
    if not value:
        return None
    text = str(value).strip()
    try:
        if len(text) == 10:
            return date.fromisoformat(text)
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).date()


def today_ist() -> date:
    return datetime.now(IST).date()


def _not_tracked() -> Dict[str, Any]:
    return {"status": "not_tracked", "days": None, "start": None, "end": None, "source": None}


def compute_dsp(start: Any, end: Any, outcome: str = "open", today: Optional[date] = None,
                source: Optional[str] = None) -> Dict[str, Any]:
    """Days in sales pipeline. `outcome` is 'approved' or 'rejected' (the clock stops
    at `end`) or 'open' (still running, counted up to today). The same day counts
    as 0 days. Status is one of approved / rejected / in_pipeline / not_tracked."""
    start_d = to_ist_date(start)
    if start_d is None:
        return _not_tracked()
    end_d = to_ist_date(end) if outcome in ("approved", "rejected") else None
    if end_d is not None:
        status, days = outcome, (end_d - start_d).days
    else:
        status, days = "in_pipeline", ((today or today_ist()) - start_d).days
    return {
        "status": status, "days": max(0, days), "start": start_d.isoformat(),
        "end": end_d.isoformat() if end_d else None, "source": source,
    }


def pipeline_from_proposal(proposal: Dict[str, Any], today: Optional[date] = None) -> Dict[str, Any]:
    """DSP for a proposal: first proposal = when it was created (revisions don't
    restart it); approved = the last approval (or Admin override) that put it in
    the approved state."""
    history = proposal.get("history") or []
    start = proposal.get("created_at") or next((h.get("timestamp") for h in history if h.get("timestamp")), None)
    status = proposal.get("status")
    if status == "approved":
        stamps = [h["timestamp"] for h in history if h.get("action") in ("approved", "admin_override") and h.get("timestamp")]
        return compute_dsp(start, stamps[-1] if stamps else proposal.get("updated_at"), "approved", today, "proposal")
    if status == "rejected":
        stamps = [h["timestamp"] for h in history if h.get("action") == "rejected_closed" and h.get("timestamp")]
        return compute_dsp(start, stamps[-1] if stamps else proposal.get("updated_at"), "rejected", today, "proposal")
    return compute_dsp(start, None, "open", today, "proposal")


def pipeline_from_manual(start: Any, end: Any, today: Optional[date] = None) -> Dict[str, Any]:
    """DSP from two dates typed on the tracker (for deals that never went through
    the app): both dates = approved; only a start date = still open."""
    if not start:
        return _not_tracked()
    return compute_dsp(start, end, "approved" if end else "open", today, "manual")


def validate_pipeline_dates(start: Any, end: Any):
    """Clean the two manual dates -> (start_iso or None, end_iso or None); ValueError
    with a user-facing message if they are malformed or in the wrong order."""
    def parse(value: Any, label: str) -> Optional[date]:
        text = str(value or "").strip()[:10]
        if not text:
            return None
        try:
            return date.fromisoformat(text)
        except ValueError:
            raise ValueError(f"{label} must be in YYYY-MM-DD format")
    s = parse(start, "First proposal date")
    e = parse(end, "Approved date")
    if e and not s:
        raise ValueError("Enter the first proposal date as well as the approved date")
    if s and e and e < s:
        raise ValueError("Approved date cannot be before the first proposal date")
    return (s.isoformat() if s else None, e.isoformat() if e else None)
