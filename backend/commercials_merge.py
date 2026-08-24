"""
Fills sales-entered commercial numbers into the standard Botree base
proposal document (Table B.1 "One-time Charges" and Table B.2 "Ongoing
Charges"). Nothing else in the document is touched - terms, headers,
other tables, and any row not explicitly mapped below are left exactly
as uploaded.

Only .docx is supported. If the uploaded file isn't a .docx, callers
should skip the merge and use the file as-is.
"""
import io
from typing import Optional
from docx import Document


def _format_inr(value: Optional[float]) -> Optional[str]:
    """Format a number using Indian digit grouping, e.g. 1234567 -> '12,34,567'."""
    if value is None:
        return None
    is_negative = value < 0
    value = abs(value)
    # Split into integer/decimal parts; keep decimals only if non-zero
    if float(value).is_integer():
        int_part = str(int(value))
        decimal_part = ""
    else:
        s = f"{value:.2f}"
        int_part, decimal_part = s.split(".")
        decimal_part = "." + decimal_part

    if len(int_part) > 3:
        last3 = int_part[-3:]
        rest = int_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        int_part = ",".join(groups) + "," + last3

    return ("-" if is_negative else "") + int_part + decimal_part


def _set_cell_text(cell, new_text: str):
    """Overwrite a table cell's text, keeping the formatting of its first run."""
    paragraph = cell.paragraphs[0]
    if paragraph.runs:
        paragraph.runs[0].text = new_text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(new_text)
    # Drop any extra paragraphs in the cell so stray blank lines don't linger
    for extra_p in cell.paragraphs[1:]:
        extra_p._element.getparent().remove(extra_p._element)


def _find_table(doc: Document, required_headers: list[str]):
    """Return the first table whose header row contains all required header
    substrings (case-insensitive), or None if not found."""
    for table in doc.tables:
        if not table.rows:
            continue
        header_cells = [c.text.strip().lower() for c in table.rows[0].cells]
        header_text = " | ".join(header_cells)
        if all(h.lower() in header_text for h in required_headers):
            return table
    return None


# Row label (lowercased, substring match against col-0 text) -> which
# ProposalCreate field(s) supply the value(s) for that row.
ONE_TIME_ROW_MAP = {
    "one-time setup fee": "one_time_setup_fee",
    "integration fee": "integration_fee",
}

ONGOING_ROW_MAP = {
    "flexi dms": "flexidms_distributor_charge",       # "Flexi DMS – Distributor Users"
    "distributors for dms": "dms_distributor_charge",  # "No. of Distributors for DMS"
    "sfa users": "sfa_user_charge",                     # "No. of SFA Users"
    "shared l1 support fee": "shared_l1_support_charge",
}


def fill_commercials(docx_bytes: bytes, commercial_data: dict) -> bytes:
    """
    commercial_data keys (all optional):
      one_time_setup_fee: float
      integration_fee: float
      flexidms_distributor_charge / dms_distributor_charge /
      sfa_user_charge / shared_l1_support_charge: dict with
        quantity, rate_per_user_month, monthly_minimum_billing

    Returns the merged document as bytes. If a field is not provided,
    that cell is left untouched (still shows the original placeholder).
    """
    doc = Document(io.BytesIO(docx_bytes))

    # ---- Table B.1: One-time Charges ----
    one_time_table = _find_table(doc, ["type of fees", "fees", "invoicing"])
    if one_time_table is not None:
        header = [c.text.strip().lower() for c in one_time_table.rows[0].cells]
        try:
            fees_col = next(i for i, h in enumerate(header) if "inr" in h)
        except StopIteration:
            fees_col = None

        if fees_col is not None:
            for row in one_time_table.rows[1:]:
                label = row.cells[0].text.strip().lower()
                for key, field in ONE_TIME_ROW_MAP.items():
                    if label.startswith(key):
                        value = commercial_data.get(field)
                        if value is not None:
                            _set_cell_text(row.cells[fees_col], f"{_format_inr(value)}")
                        break

    # ---- Table B.2: Ongoing Charges ----
    ongoing_table = _find_table(doc, ["quantity", "rate", "monthly minimum billing"])
    if ongoing_table is not None:
        header = [c.text.strip().lower() for c in ongoing_table.rows[0].cells]
        col_idx = {}
        for i, h in enumerate(header):
            if h == "quantity":
                col_idx["quantity"] = i
            elif h.startswith("rate"):
                col_idx["rate"] = i
            elif "minimum billing" in h:
                col_idx["min_billing"] = i

        for row in ongoing_table.rows[1:]:
            label = row.cells[0].text.strip().lower()
            for key, field in ONGOING_ROW_MAP.items():
                if key in label:
                    charge = commercial_data.get(field)
                    if charge:
                        if charge.get("quantity") is not None and "quantity" in col_idx:
                            _set_cell_text(row.cells[col_idx["quantity"]], _format_inr(charge["quantity"]))
                        if charge.get("rate_per_user_month") is not None and "rate" in col_idx:
                            _set_cell_text(row.cells[col_idx["rate"]], _format_inr(charge["rate_per_user_month"]))
                        if charge.get("monthly_minimum_billing") is not None and "min_billing" in col_idx:
                            _set_cell_text(row.cells[col_idx["min_billing"]], _format_inr(charge["monthly_minimum_billing"]))
                    break

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()
