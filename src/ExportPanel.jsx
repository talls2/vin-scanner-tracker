import { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────
// This component is imported into the Manager Panel.
// It receives the full jobs array and handles all export logic.
// ─────────────────────────────────────────────────────────────

const css = `
/* ── EXPORT PANEL ── */
.exp-shell { font-family: 'Plus Jakarta Sans', sans-serif; }

.exp-section-title {
  font-size: 11.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--ink3); margin-bottom: 12px;
}

/* range selector */
.exp-range-tabs {
  display: flex; gap: 4px; background: var(--white); border: 1px solid var(--border);
  border-radius: 10px; padding: 3px; margin-bottom: 16px; width: fit-content;
}
.exp-tab {
  padding: 7px 16px; border: none; background: transparent; border-radius: 8px;
  font-size: 13px; font-weight: 600; color: var(--ink3); cursor: pointer; transition: all 0.15s;
}
.exp-tab.active { background: var(--ink); color: #fff; }

.exp-custom-row {
  display: flex; gap: 10px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap;
}
.exp-date-field { display: flex; flex-direction: column; gap: 5px; }
.exp-date-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink3); }
.exp-date-input {
  padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 13.5px; color: var(--ink); background: var(--white); outline: none; transition: border-color 0.15s;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.exp-date-input:focus { border-color: var(--green); }

/* dealer filter */
.exp-dealer-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.exp-dealer-btn {
  padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: 12.5px; font-weight: 600; color: var(--ink3); background: var(--white);
  cursor: pointer; transition: all 0.15s;
}
.exp-dealer-btn:hover { border-color: var(--border2); color: var(--ink); }
.exp-dealer-btn.active { background: var(--ink); border-color: var(--ink); color: #fff; }

/* preview table */
.exp-preview {
  background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; margin-bottom: 16px;
}
.exp-preview-header {
  padding: 14px 18px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.exp-preview-title { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.exp-preview-count {
  font-size: 12px; font-weight: 600; color: var(--green);
  background: var(--green-dim); border: 1px solid var(--green-border);
  border-radius: 20px; padding: 2px 10px;
}
.exp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.exp-table th {
  text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--ink4); padding: 8px 12px; border-bottom: 1px solid var(--border);
  font-weight: 700; background: var(--bg);
}
.exp-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--ink2); }
.exp-table tr:last-child td { border-bottom: none; }
.exp-table tr:hover td { background: var(--bg); }
.exp-table .mono { font-family: monospace; font-size: 11px; }
.exp-total-row td {
  font-weight: 700; color: var(--ink); border-top: 2px solid var(--border2);
  padding-top: 12px;
}

/* export buttons */
.exp-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
.exp-btn {
  display: flex; align-items: center; gap: 8px; padding: 11px 20px;
  border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent;
}
.exp-btn-csv {
  background: var(--green); color: #fff; border-color: var(--green);
}
.exp-btn-csv:hover { background: var(--green-light); }
.exp-btn-print {
  background: var(--white); color: var(--ink); border-color: var(--border2);
}
.exp-btn-print:hover { background: var(--bg); border-color: var(--ink); }
.exp-btn-excel {
  background: #1d6f42; color: #fff; border-color: #1d6f42;
}
.exp-btn-excel:hover { background: #165c37; }
.exp-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* empty state */
.exp-empty {
  padding: 40px 20px; text-align: center; color: var(--ink3);
}
.exp-empty-icon { font-size: 32px; margin-bottom: 10px; }
.exp-empty p { font-size: 13px; }

/* ── PRINT STYLES ── */
@media print {
  body * { visibility: hidden; }
  .print-invoice, .print-invoice * { visibility: visible; }
  .print-invoice {
    position: fixed; inset: 0; background: #fff;
    padding: 24px; font-family: Arial, sans-serif; font-size: 11px;
  }
}

/* invoice modal */
.inv-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px; animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.inv-modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 780px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  animation: slideUp 0.25s ease;
}
@keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
.inv-toolbar {
  padding: 14px 20px; border-bottom: 1px solid #e0e0e0;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; background: #fff; z-index: 1;
}
.inv-toolbar-title { font-size: 14px; font-weight: 700; color: #111; }
.inv-toolbar-btns { display: flex; gap: 8px; }
.inv-print-btn {
  padding: 7px 16px; background: #1db954; border: none; border-radius: 7px;
  font-size: 13px; font-weight: 700; color: #fff; cursor: pointer;
}
.inv-close-btn {
  padding: 7px 14px; background: transparent; border: 1px solid #ddd;
  border-radius: 7px; font-size: 13px; font-weight: 600; color: #666; cursor: pointer;
}

/* the actual invoice that gets printed */
.print-invoice {
  padding: 28px 32px; font-family: Arial, sans-serif; font-size: 11px; color: #111;
}
.inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.inv-logo-block {}
.inv-logo-name { font-size: 18px; font-weight: 900; color: #111; letter-spacing: -0.5px; }
.inv-logo-sub { font-size: 10px; color: #666; margin-top: 2px; }
.inv-logo-addr { font-size: 10px; color: #444; margin-top: 6px; line-height: 1.5; }
.inv-meta-block { text-align: right; }
.inv-meta-title { font-size: 16px; font-weight: 900; letter-spacing: 0.05em; color: #111; margin-bottom: 6px; }
.inv-meta-line { font-size: 11px; color: #444; margin-bottom: 3px; }
.inv-meta-line strong { color: #111; }
.inv-divider { border: none; border-top: 2px solid #111; margin: 16px 0; }
.inv-bill-to { font-size: 11px; color: #444; margin-bottom: 16px; }
.inv-bill-to strong { font-size: 13px; color: #111; display: block; margin-bottom: 3px; }
.inv-tbl { width: 100%; border-collapse: collapse; }
.inv-tbl th {
  background: #111; color: #fff; font-size: 10px; font-weight: 700;
  text-align: left; padding: 6px 8px; text-transform: uppercase; letter-spacing: 0.06em;
}
.inv-tbl td { padding: 6px 8px; border-bottom: 1px solid #e8e8e8; font-size: 11px; vertical-align: top; }
.inv-tbl tr:nth-child(even) td { background: #f9f9f9; }
.inv-tbl .inv-amount { font-weight: 700; text-align: right; }
.inv-tbl th.inv-amount { text-align: right; }
.inv-totals { margin-top: 14px; border-top: 2px solid #111; padding-top: 10px; }
.inv-total-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.inv-total-label { font-size: 12px; color: #666; }
.inv-total-val { font-size: 13px; font-weight: 700; color: #111; }
.inv-grand-total .inv-total-label { font-size: 14px; font-weight: 900; color: #111; }
.inv-grand-total .inv-total-val { font-size: 16px; font-weight: 900; color: #111; }
.inv-footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #888; text-align: center; }
`;

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────
function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function endOfDay(d) {
  const x = new Date(d); x.setHours(23,59,59,999); return x;
}
function toInputDate(d) {
  return d.toISOString().slice(0,10);
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});
}

function getRangeFromPreset(preset) {
  const now = new Date();
  switch(preset) {
    case "today": return { start: startOfDay(now), end: endOfDay(now) };
    case "week": {
      const mon = new Date(now);
      mon.setDate(now.getDate() - now.getDay() + 1);
      return { start: startOfDay(mon), end: endOfDay(now) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(first), end: endOfDay(now) };
    }
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────────────────────
function exportCSV(jobs, filename) {
  const headers = ["YR","MAKE/MODEL","DESCRIPTION","STK NUM","VIN NUM","WORKER","DURATION (min)","AMOUNT"];
  const rows = jobs.map(j => [
    j.year,
    `${j.make} ${j.model}`,
    j.service.toUpperCase(),
    j.stockNumber || "",
    j.vin,
    j.worker,
    j.duration,
    `$${j.price.toFixed(2)}`,
  ]);
  const total = jobs.reduce((a,j)=>a+j.price,0);
  rows.push(["","","","","","","TOTAL",`$${total.toFixed(2)}`]);

  const csv = [headers, ...rows].map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// INVOICE MODAL — matches a typical detailing invoice format
// ─────────────────────────────────────────────────────────────
function InvoiceModal({ jobs, dateLabel, dealer, onClose }) {
  const total = jobs.reduce((a,j)=>a+j.price,0);
  const today = new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});

  const handlePrint = () => window.print();

  return (
    <div className="inv-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="inv-modal">
        <div className="inv-toolbar">
          <span className="inv-toolbar-title">Invoice Preview — {dealer === "all" ? "All Dealers" : dealer}</span>
          <div className="inv-toolbar-btns">
            <button className="inv-print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
            <button className="inv-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="print-invoice">
          {/* HEADER */}
          <div className="inv-header">
            <div className="inv-logo-block">
              <div className="inv-logo-name">Detailing</div>
              <div className="inv-logo-sub">Auto Detail</div>
              <div className="inv-logo-addr">100 Example St<br/>Springfield MA 01101</div>
            </div>
            <div className="inv-meta-block">
              <div className="inv-meta-title">DEMO MOBILE DETAILING</div>
              <div className="inv-meta-line">DATE: <strong>{dateLabel}</strong></div>
              <div className="inv-meta-line">INVOICE DATE: <strong>{today}</strong></div>
              <div className="inv-meta-line">TOTAL VEHICLES: <strong>{jobs.length}</strong></div>
            </div>
          </div>

          <hr className="inv-divider"/>

          <div className="inv-bill-to">
            <strong>BILL TO: {dealer === "all" ? "All Dealers" : dealer}</strong>
            Service period: {dateLabel}
          </div>

          {/* TABLE */}
          <table className="inv-tbl">
            <thead>
              <tr>
                <th style={{width:28}}>YR</th>
                <th style={{width:120}}>MAKE/MODEL</th>
                <th style={{width:160}}>DESCRIPTION</th>
                <th style={{width:70}}>STK NUM</th>
                <th style={{width:110}}>VIN NUM</th>
                <th style={{width:70}}>WORKER</th>
                <th style={{width:50}}>TIME</th>
                <th className="inv-amount" style={{width:60}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j,i)=>(
                <tr key={i}>
                  <td>{j.year}</td>
                  <td><strong>{j.make}</strong> {j.model}</td>
                  <td>{j.service.toUpperCase()}{j.notes ? <span style={{color:"#888",fontSize:9}}> *</span> : ""}</td>
                  <td style={{fontFamily:"monospace",fontSize:10}}>{j.stockNumber || "—"}</td>
                  <td style={{fontFamily:"monospace",fontSize:10}}>{j.vin}</td>
                  <td>{j.worker}</td>
                  <td style={{textAlign:"center"}}>{j.duration}m</td>
                  <td className="inv-amount">${j.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="inv-totals">
            <div className="inv-total-row">
              <span className="inv-total-label">Subtotal ({jobs.length} vehicles)</span>
              <span className="inv-total-val">${total.toFixed(2)}</span>
            </div>
            <div className="inv-total-row inv-grand-total" style={{marginTop:8,paddingTop:8,borderTop:"1px solid #ddd"}}>
              <span className="inv-total-label">TOTAL DUE</span>
              <span className="inv-total-val">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* notes footnote */}
          {jobs.some(j=>j.notes) && (
            <div style={{marginTop:16,fontSize:10,color:"#888"}}>
              * Items marked with asterisk have manager notes — see attached detail sheet.
            </div>
          )}

          <div className="inv-footer">
            Demo Mobile Detailing · 100 Example St, Springfield MA 01101 · Generated by VIN Scanner Tracker
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT PANEL
// ─────────────────────────────────────────────────────────────
export default function ExportPanel({ jobs }) {
  const [preset, setPreset] = useState("month");
  const [customStart, setCustomStart] = useState(toInputDate(new Date(Date.now() - 7*86400000)));
  const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));
  const [dealerFilter, setDealerFilter] = useState("all");
  const [showInvoice, setShowInvoice] = useState(false);

  // Unique dealers from jobs
  const dealers = ["all", ...Array.from(new Set(jobs.map(j=>j.dealer)))];

  // Date range
  const range = useMemo(() => {
    if (preset === "custom") {
      return {
        start: startOfDay(new Date(customStart + "T00:00:00")),
        end: endOfDay(new Date(customEnd + "T00:00:00")),
      };
    }
    return getRangeFromPreset(preset);
  }, [preset, customStart, customEnd]);

  // Filtered jobs
  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const t = new Date(j.startTime);
      const inRange = t >= range.start && t <= range.end;
      const inDealer = dealerFilter === "all" || j.dealer === dealerFilter;
      return inRange && inDealer;
    });
  }, [jobs, range, dealerFilter]);

  const total = filtered.reduce((a,j)=>a+j.price,0);

  const dateLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});
    if (preset === "today") return fmt(new Date());
    return `${fmt(range.start)} to ${fmt(range.end)}`;
  }, [preset, range]);

  const filename = `Detailing_${dealerFilter === "all" ? "AllDealers" : dealerFilter}_${preset === "custom" ? `${customStart}_${customEnd}` : preset}`;

  const PRESETS = [
    { id:"today", label:"Today" },
    { id:"week",  label:"This Week" },
    { id:"month", label:"This Month" },
    { id:"custom",label:"Custom" },
  ];

  return (
    <div className="exp-shell">
      <style>{css}</style>

      {/* DATE RANGE */}
      <div className="exp-section-title">Date Range</div>
      <div className="exp-range-tabs">
        {PRESETS.map(p=>(
          <button key={p.id} className={`exp-tab${preset===p.id?" active":""}`} onClick={()=>setPreset(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="exp-custom-row">
          <div className="exp-date-field">
            <label className="exp-date-label">From</label>
            <input className="exp-date-input" type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}/>
          </div>
          <div className="exp-date-field">
            <label className="exp-date-label">To</label>
            <input className="exp-date-input" type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/>
          </div>
        </div>
      )}

      {/* DEALER FILTER */}
      <div className="exp-section-title" style={{marginTop:18}}>Filter by Dealer</div>
      <div className="exp-dealer-row">
        {dealers.map(d=>(
          <button key={d} className={`exp-dealer-btn${dealerFilter===d?" active":""}`} onClick={()=>setDealerFilter(d)}>
            {d === "all" ? "All Dealers" : d}
          </button>
        ))}
      </div>

      {/* PREVIEW TABLE */}
      <div className="exp-preview">
        <div className="exp-preview-header">
          <div>
            <div className="exp-preview-title">
              {dealerFilter === "all" ? "All Dealers" : dealerFilter} · {dateLabel}
            </div>
            <div style={{fontSize:12,color:"var(--ink3)",marginTop:2}}>
              Total: <strong style={{color:"var(--ink)"}}>${total.toFixed(2)}</strong>
            </div>
          </div>
          <span className="exp-preview-count">{filtered.length} vehicle{filtered.length!==1?"s":""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="exp-empty">
            <div className="exp-empty-icon">📋</div>
            <p>No jobs found for this range and filter.</p>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table className="exp-table">
              <thead>
                <tr>
                  <th>YR</th>
                  <th>Make/Model</th>
                  <th>Service</th>
                  <th>Stock #</th>
                  <th>VIN</th>
                  <th>Worker</th>
                  <th>Time</th>
                  <th style={{textAlign:"right"}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j,i)=>(
                  <tr key={i}>
                    <td>{j.year}</td>
                    <td><strong>{j.make}</strong> {j.model}</td>
                    <td>{j.service}</td>
                    <td className="mono">{j.stockNumber || "—"}</td>
                    <td className="mono">{j.vin}</td>
                    <td>{j.worker}</td>
                    <td>{j.duration}m</td>
                    <td style={{textAlign:"right",fontWeight:700}}>${j.price.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="exp-total-row">
                  <td colSpan={7} style={{textAlign:"right",fontSize:13}}>TOTAL</td>
                  <td style={{textAlign:"right",fontSize:15}}>${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPORT BUTTONS */}
      <div className="exp-btn-row">
        <button
          className="exp-btn exp-btn-csv"
          onClick={()=>exportCSV(filtered, filename+".csv")}
          disabled={filtered.length===0}
        >
          ⬇ Download CSV
        </button>
        <button
          className="exp-btn exp-btn-print"
          onClick={()=>setShowInvoice(true)}
          disabled={filtered.length===0}
        >
          🧾 View Invoice
        </button>
        <button
          className="exp-btn exp-btn-excel"
          onClick={()=>exportCSV(filtered, filename+".csv")}
          disabled={filtered.length===0}
          title="Open CSV in Excel"
        >
          📊 Export for Excel
        </button>
      </div>

      <div style={{fontSize:11.5,color:"var(--ink4)",marginTop:10}}>
        CSV opens directly in Excel. "View Invoice" shows a print-ready version matching a typical detailing invoice format.
      </div>

      {/* INVOICE MODAL */}
      {showInvoice && (
        <InvoiceModal
          jobs={filtered}
          dateLabel={dateLabel}
          dealer={dealerFilter}
          onClose={()=>setShowInvoice(false)}
        />
      )}
    </div>
  );
}
