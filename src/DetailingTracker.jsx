import { useState, useEffect, useRef, useCallback } from "react";
import VinScanner from "./VinScanner.jsx";
import ExportPanel from "./ExportPanel.jsx";
import { supabase } from './supabase.js'
import { useRealtime } from './useRealtime.js'

// ─────────────────────────────────────────────────────────────
// PRICE TABLE — hidden from workers
// dealer → service → price
// ─────────────────────────────────────────────────────────────
const PRICE_TABLE = {
  "Toyota":       { Recon:280, "Delivery new":120, "Delivery used":95, Auction:150, Ozone:80, "Tint windows remove":65, "Wet sand":200 },
  "Honda":        { Recon:260, "Delivery new":110, "Delivery used":90, Auction:140, Ozone:75, "Tint windows remove":60, "Wet sand":190 },
  "Ford":         { Recon:270, "Delivery new":115, "Delivery used":92, Auction:145, Ozone:78, "Tint windows remove":62, "Wet sand":195 },
  "Chevrolet":    { Recon:270, "Delivery new":115, "Delivery used":92, Auction:145, Ozone:78, "Tint windows remove":62, "Wet sand":195 },
  "Default":      { Recon:250, "Delivery new":100, "Delivery used":85, Auction:130, Ozone:70, "Tint windows remove":55, "Wet sand":180 },
};

const SERVICES = ["Recon","Delivery new","Delivery used","Auction","Ozone","Tint windows remove","Wet sand"];

const EXTRAS = [
  { name: "Dog hair removal", price: 40 },
  { name: "Heavy stains",     price: 30 },
  { name: "Engine bay",       price: 50 },
  { name: "Clay bar",         price: 35 },
  { name: "Odor treatment",   price: 45 },
  { name: "Scratch touch-up", price: 25 },
  { name: "Pet odor",         price: 40 },
];

const DEALERS = ["Toyota","Honda","Ford","Chevrolet","Default"];

const LOGO_URL = "/logo.svg";

// Jobs loaded from Supabase `detailing_jobs` table (no hardcoded data)

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&display=swap');

:root {
  --green:#1db954; --green-light:#22d460; --green-dim:rgba(29,185,84,0.1); --green-border:rgba(29,185,84,0.25);
  --bg:#f7f8f6; --white:#fff; --ink:#111410; --ink2:#3d4039; --ink3:#7a8075; --ink4:#b0b5aa;
  --border:#e8ebe4; --border2:#d4d9ce;
  --shadow:0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.05);
  --shadow-lg:0 4px 24px rgba(0,0,0,0.14);
  --radius:16px; --radius-sm:10px;
  --font:'Plus Jakarta Sans',sans-serif; --font-serif:'Fraunces',serif;
  --amber:#f59e0b; --blue:#3b82f6; --red:#ef4444;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;}
button,input,textarea,select{font-family:var(--font);}

/* ── TOPBAR ── */
.smd-topbar{background:var(--ink);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;}
.smd-logo{display:flex;align-items:center;gap:8px;font-family:var(--font-serif);font-size:17px;font-weight:600;color:#fff;letter-spacing:-0.02em;}
.smd-logo-img{height:28px;width:auto;object-fit:contain;border-radius:4px;}
.smd-topbar-right{display:flex;align-items:center;gap:10px;}
.smd-user{font-size:12.5px;color:rgba(255,255,255,0.45);}
.smd-user strong{color:rgba(255,255,255,0.85);}
.smd-logout{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:7px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,0.5);cursor:pointer;transition:all 0.15s;}
.smd-logout:hover{color:#fff;background:rgba(255,255,255,0.12);}

/* ── SHELL ── */
.smd-shell{display:flex;flex-direction:column;min-height:100vh;background:var(--bg);}
.smd-content{flex:1;padding:20px;max-width:520px;margin:0 auto;width:100%;}

/* ── STEP INDICATOR ── */
.step-bar{display:flex;gap:6px;margin-bottom:24px;}
.step{flex:1;height:3px;border-radius:3px;background:var(--border2);transition:background 0.3s;}
.step.done{background:var(--green);}
.step.active{background:var(--green);opacity:0.5;}

/* ── SECTION HEADING ── */
.smd-heading{font-family:var(--font-serif);font-size:22px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;margin-bottom:4px;}
.smd-sub{font-size:13px;color:var(--ink3);margin-bottom:22px;}

/* ── VIN SCANNER ── */
.vin-card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px;}
.vin-scan-area{border:2px dashed var(--border2);border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:all 0.2s;background:var(--bg);margin-bottom:16px;}
.vin-scan-area:hover{border-color:var(--green);background:var(--green-dim);}
.vin-scan-area.scanning{border-color:var(--green);background:var(--green-dim);animation:scanPulse 1.5s infinite;}
@keyframes scanPulse{0%,100%{opacity:1}50%{opacity:0.6}}
.vin-scan-icon{font-size:36px;margin-bottom:10px;}
.vin-scan-label{font-size:14px;font-weight:600;color:var(--ink2);}
.vin-scan-sub{font-size:12px;color:var(--ink4);margin-top:4px;}
.vin-divider{display:flex;align-items:center;gap:12px;margin:14px 0;}
.vin-divider-line{flex:1;height:1px;background:var(--border);}
.vin-divider-text{font-size:11.5px;color:var(--ink4);font-weight:600;}
.vin-input-row{display:flex;gap:8px;}
.vin-text-input{flex:1;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;color:var(--ink);background:var(--bg);outline:none;transition:border-color 0.15s;text-transform:uppercase;letter-spacing:0.05em;}
.vin-text-input:focus{border-color:var(--green);}
.vin-text-input::placeholder{text-transform:none;letter-spacing:0;}
.vin-lookup-btn{padding:11px 18px;background:var(--green);border:none;border-radius:var(--radius-sm);font-size:13.5px;font-weight:700;color:#fff;cursor:pointer;white-space:nowrap;transition:all 0.15s;}
.vin-lookup-btn:hover{background:var(--green-light);}
.vin-lookup-btn:disabled{opacity:0.5;cursor:not-allowed;}

/* ── VIN RESULT ── */
.vin-result{background:var(--green-dim);border:1.5px solid var(--green-border);border-radius:var(--radius);padding:18px;margin-bottom:14px;animation:fadeUp 0.3s ease;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.vin-result-car{font-family:var(--font-serif);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;margin-bottom:2px;}
.vin-result-desc{font-size:13px;color:var(--ink3);margin-bottom:12px;}
.vin-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.vin-field{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
.vin-field-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink4);margin-bottom:3px;}
.vin-field-val{font-size:13.5px;font-weight:600;color:var(--ink);}
.vin-field-input{width:100%;font-size:13.5px;font-weight:600;color:var(--ink);border:none;background:transparent;outline:none;font-family:var(--font);}

/* ── SERVICE SELECT ── */
.service-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.service-opt{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--white);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s;}
.service-opt:hover{border-color:var(--border2);}
.service-opt.selected{border-color:var(--green);background:var(--green-dim);}
.service-name{font-size:14px;font-weight:600;color:var(--ink);}
.service-check{width:22px;height:22px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
.service-opt.selected .service-check{background:var(--green);border-color:var(--green);color:#fff;font-size:12px;}

/* ── EXTRAS ── */
.extras-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
.extra-chip{display:flex;align-items:center;gap:6px;padding:9px 14px;background:var(--white);border:1.5px solid var(--border);border-radius:20px;cursor:pointer;transition:all 0.15s;font-size:13px;font-weight:600;color:var(--ink2);}
.extra-chip:hover{border-color:var(--border2);}
.extra-chip.selected{border-color:var(--green);background:var(--green-dim);color:var(--ink);}
.extra-chip-check{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;}
.extra-chip.selected .extra-chip-check{background:var(--green);border-color:var(--green);color:#fff;}
.extra-price{font-size:11px;color:var(--ink4);font-weight:500;margin-left:2px;}
.extra-chip.selected .extra-price{color:var(--green);}
.section-title{font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;}

/* ── NOTES FIELD ── */
.notes-section{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:14px;}
.notes-label{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--ink3);margin-bottom:8px;}
.notes-flag-warn{font-size:12px;color:var(--amber);background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:6px 10px;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.smd-textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:9px;font-size:13.5px;color:var(--ink);resize:none;outline:none;background:var(--bg);transition:border-color 0.15s;line-height:1.5;}
.smd-textarea:focus{border-color:var(--green);}

/* ── CLIENT PHONE ── */
.phone-section{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:14px;}
.phone-input{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:9px;font-size:14px;color:var(--ink);outline:none;background:var(--bg);transition:border-color 0.15s;}
.phone-input:focus{border-color:var(--green);}
.sms-note{font-size:11.5px;color:var(--ink4);margin-top:6px;display:flex;align-items:center;gap:5px;}

/* ── TIMER ── */
.timer-card{background:var(--ink);border-radius:var(--radius);padding:28px 20px;text-align:center;margin-bottom:16px;position:relative;overflow:hidden;}
.timer-bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(29,185,84,0.15) 0%,transparent 60%);pointer-events:none;}
.timer-car{font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:4px;}
.timer-service{font-size:16px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:20px;}
.timer-display{font-family:var(--font-serif);font-size:56px;font-weight:600;color:#fff;letter-spacing:-0.02em;line-height:1;margin-bottom:8px;}
.timer-label{font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px;}
.timer-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px;animation:timerPulse 1s infinite;}
@keyframes timerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
.finish-btn{width:100%;padding:16px;background:var(--green);border:none;border-radius:12px;font-size:16px;font-weight:800;color:#fff;cursor:pointer;letter-spacing:0.01em;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.finish-btn:hover{background:var(--green-light);transform:translateY(-1px);}

/* ── COMPLETE SCREEN ── */
.complete-card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:28px 20px;text-align:center;margin-bottom:14px;animation:fadeUp 0.4s ease;}
.complete-icon{font-size:48px;margin-bottom:14px;}
.complete-title{font-family:var(--font-serif);font-size:24px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;margin-bottom:6px;}
.complete-sub{font-size:13.5px;color:var(--ink3);margin-bottom:20px;}
.complete-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;}
.complete-stat{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;}
.cs-val{font-family:var(--font-serif);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;}
.cs-label{font-size:11px;color:var(--ink4);margin-top:2px;}
.sms-status{display:flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid var(--green-border);border-radius:9px;padding:10px 14px;font-size:13px;font-weight:500;color:#166534;margin-bottom:16px;}
.sms-pending{background:#fffbeb;border-color:#fcd34d;color:#92400e;}
.new-scan-btn{width:100%;padding:13px;background:var(--ink);border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.15s;}
.new-scan-btn:hover{background:#1e2a1e;}

/* ── MANAGER PANEL ── */
.mgr-shell{display:flex;flex-direction:column;min-height:100vh;background:var(--bg);}
.mgr-content{flex:1;padding:24px;max-width:900px;margin:0 auto;width:100%;}
.mgr-tabs{display:flex;gap:4px;background:var(--white);border:1px solid var(--border);border-radius:10px;padding:3px;margin-bottom:20px;width:fit-content;}
.mgr-tab{padding:8px 20px;border:none;background:transparent;border-radius:8px;font-size:13px;font-weight:600;color:var(--ink3);cursor:pointer;transition:all 0.15s;}
.mgr-tab.active{background:var(--ink);color:#fff;}
.mgr-tab.flagged-tab{position:relative;}
.flag-count{position:absolute;top:-4px;right:-4px;background:var(--amber);color:#fff;font-size:9px;font-weight:700;border-radius:20px;padding:1px 5px;min-width:16px;text-align:center;}

/* job list */
.job-list{display:flex;flex-direction:column;gap:10px;}
.job-row{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;transition:all 0.2s;}
.job-row:hover{box-shadow:var(--shadow);}
.job-row.flagged{border-color:rgba(245,158,11,0.4);background:#fffdf7;}
.job-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}
.job-row-car{font-size:14.5px;font-weight:700;color:var(--ink);}
.job-row-meta{font-size:12px;color:var(--ink3);margin-top:2px;}
.job-row-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;}
.job-price{font-family:var(--font-serif);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;}
.job-price.adjusted{color:var(--green);}
.job-service-badge{font-size:11px;font-weight:600;background:var(--green-dim);border:1px solid var(--green-border);color:#166534;border-radius:20px;padding:2px 9px;}
.job-extra-badge{font-size:11px;font-weight:600;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;border-radius:20px;padding:2px 9px;}
.job-svc-lines{display:flex;flex-direction:column;align-items:flex-end;gap:4px;}
.job-svc-line{display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;}
.job-svc-line-label{font-size:10px;font-weight:700;color:var(--ink4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;}
.job-row-body{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.job-stat{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ink3);}
.job-stat strong{color:var(--ink2);font-weight:600;}
.flag-tag{display:flex;align-items:center;gap:5px;background:#fffbeb;border:1px solid #fcd34d;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:600;color:#92400e;}
.job-notes-box{margin-top:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;font-size:13px;color:#92400e;}
.job-notes-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;opacity:0.7;}
.mgr-actions{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap;}
.mgr-btn{padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all 0.15s;border:1.5px solid var(--border);background:transparent;color:var(--ink3);}
.mgr-btn:hover{border-color:var(--border2);color:var(--ink);}
.mgr-btn.approve{background:var(--green);border-color:var(--green);color:#fff;}
.mgr-btn.approve:hover{background:var(--green-light);}
.mgr-btn.sms{background:var(--blue);border-color:var(--blue);color:#fff;}
.mgr-btn.sms:hover{background:#2563eb;}

/* price editor */
.price-editor{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;}
.pe-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.pe-dealer{font-size:16px;font-weight:700;color:var(--ink);}
.pe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pe-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;}
.pe-service{font-size:13px;font-weight:600;color:var(--ink2);}
.pe-input-wrap{display:flex;align-items:center;gap:4px;}
.pe-dollar{font-size:13px;font-weight:600;color:var(--ink3);}
.pe-input{width:64px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:13.5px;font-weight:700;color:var(--ink);text-align:right;outline:none;background:var(--white);transition:border-color 0.15s;}
.pe-input:focus{border-color:var(--green);}
.save-prices-btn{padding:8px 20px;background:var(--green);border:none;border-radius:8px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.15s;}
.save-prices-btn:hover{background:var(--green-light);}

/* price adjust modal */
.pa-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px;animation:fadeIn 0.2s ease;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.pa-modal{background:var(--white);border-radius:20px;width:100%;max-width:400px;box-shadow:var(--shadow-lg);animation:slideUp 0.25s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pa-header{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.pa-title{font-family:var(--font-serif);font-size:18px;font-weight:600;color:var(--ink);}
.pa-close{width:30px;height:30px;border-radius:50%;background:var(--bg);border:1px solid var(--border);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink3);}
.pa-body{padding:18px 22px;}
.pa-car{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px;}
.pa-service{font-size:13px;color:var(--ink3);margin-bottom:16px;}
.pa-notes{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;font-size:13px;color:#92400e;margin-bottom:16px;}
.pa-price-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.pa-price-label{font-size:13px;font-weight:600;color:var(--ink3);width:100px;}
.pa-price-input{flex:1;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:16px;font-weight:700;color:var(--ink);outline:none;transition:border-color 0.15s;}
.pa-price-input:focus{border-color:var(--green);}
.pa-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;}
.btn-cancel{padding:8px 18px;background:transparent;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-weight:600;color:var(--ink3);cursor:pointer;}
.btn-confirm{padding:8px 22px;background:var(--green);border:none;border-radius:8px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;}
.btn-confirm:hover{background:var(--green-light);}

/* stats cards */
.mgr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.mgr-stat{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px;}
.mgr-stat.accent{border-color:var(--green-border);background:var(--green-dim);}
.mgr-stat-label{font-size:11px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px;}
.mgr-stat-val{font-family:var(--font-serif);font-size:26px;font-weight:600;color:var(--ink);letter-spacing:-0.03em;}
.mgr-stat.accent .mgr-stat-val{color:var(--green);}
.mgr-stat-sub{font-size:11.5px;color:var(--ink4);margin-top:3px;}
.mgr-stat.warn .mgr-stat-val{color:var(--amber);}
.mgr-stat.warn{border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.05);}

/* toast */
.smd-toast{position:fixed;bottom:24px;right:24px;background:var(--ink);color:#fff;border-radius:10px;padding:12px 18px;font-size:13.5px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.25);animation:toastIn 0.3s ease;z-index:999;display:flex;align-items:center;gap:8px;}
@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* helpers */
.f-label{font-size:11.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;display:block;}
.section-gap{margin-bottom:14px;}
.green-btn{width:100%;padding:13px;background:var(--green);border:none;border-radius:var(--radius-sm);font-size:14.5px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.15s;}
.green-btn:hover{background:var(--green-light);}
.green-btn:disabled{opacity:0.4;cursor:not-allowed;}

/* ── CAMERA SCANNER ── */
.scanner-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.scanner-video{width:100%;max-width:480px;border-radius:16px;display:block;}
.scanner-frame{position:absolute;width:260px;height:100px;border:2px solid var(--green);border-radius:8px;box-shadow:0 0 0 2000px rgba(0,0,0,0.4);pointer-events:none;}
.scanner-line{position:absolute;left:0;right:0;height:2px;background:var(--green);top:50%;animation:scanLine 1.8s ease-in-out infinite;}
@keyframes scanLine{0%,100%{top:10%}50%{top:90%}}
.scanner-label{color:rgba(255,255,255,0.7);font-size:14px;font-weight:500;margin-top:20px;text-align:center;}
.scanner-hint{color:rgba(255,255,255,0.4);font-size:12px;margin-top:8px;text-align:center;}
.scanner-close-btn{margin-top:24px;padding:12px 32px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;transition:all 0.15s;}
.scanner-close-btn:hover{background:rgba(255,255,255,0.18);}
.scanner-error{text-align:center;padding:20px;}
.scanner-error-icon{font-size:40px;margin-bottom:12px;}
.scanner-error p{color:rgba(255,255,255,0.7);font-size:13.5px;margin-bottom:20px;line-height:1.5;}
.scanner-video-wrap{position:relative;width:100%;max-width:480px;display:flex;align-items:center;justify-content:center;}

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .smd-content{padding:14px 12px;}
  .mgr-content{padding:14px 12px;}
  .complete-stats{grid-template-columns:1fr 1fr;}
  .vin-result-grid{grid-template-columns:1fr;}
  .mgr-tabs{width:100%;}
  .smd-toast{left:12px;right:12px;bottom:14px;}
  .step-bar{gap:4px;}
  .smd-login-shell{padding:24px 16px;align-items:flex-start;padding-top:48px;}
  .smd-login-box{width:100%;padding:32px 22px;}
}

/* ── TRACKER LOGIN ── */
.smd-login-shell{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,#0a0f0a 0%,#111810 50%,#0a120a 100%);
  position:relative;overflow:hidden;
}
.smd-login-glow{
  position:absolute;width:500px;height:500px;border-radius:50%;
  background:radial-gradient(circle,rgba(29,185,84,0.15) 0%,transparent 70%);
  pointer-events:none;
}
.smd-login-glow-1{top:-120px;right:-100px;}
.smd-login-glow-2{bottom:-100px;left:-80px;width:350px;height:350px;background:radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%);}
.smd-login-box{
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
  border-radius:24px;padding:44px 40px;width:400px;position:relative;
  backdrop-filter:blur(20px);
}
.smd-login-brand{text-align:center;margin-bottom:32px;}
.smd-login-icon{
  width:80px;height:80px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 14px;overflow:hidden;
}
.smd-login-icon img{width:100%;height:100%;object-fit:contain;}
.smd-login-title{font-family:var(--font-serif);font-size:24px;font-weight:600;color:#fff;letter-spacing:-0.02em;}
.smd-login-subtitle{font-size:13px;color:rgba(255,255,255,0.35);margin-top:4px;}
.smd-login-field{margin-bottom:14px;}
.smd-login-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;display:block;}
.smd-login-select{
  width:100%;padding:11px 14px;background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.12);border-radius:10px;
  font-size:14px;color:#fff;font-family:var(--font);outline:none;
  transition:border-color 0.15s;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;
}
.smd-login-select:focus{border-color:var(--green);}
.smd-login-select option{background:#1a1a1a;color:#fff;}
.smd-login-pin{display:flex;gap:10px;justify-content:center;margin:20px 0 16px;}
.smd-login-dot{
  width:14px;height:14px;border-radius:50%;
  border:2px solid rgba(255,255,255,0.2);transition:all 0.15s;
}
.smd-login-dot.filled{background:var(--green);border-color:var(--green);box-shadow:0 0 8px rgba(29,185,84,0.4);}
.smd-login-numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:260px;margin:0 auto;}
.smd-login-key{
  padding:16px;background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.1);border-radius:12px;
  font-size:20px;font-weight:700;color:#fff;cursor:pointer;
  transition:all 0.12s;font-family:var(--font);
}
.smd-login-key:hover{background:rgba(255,255,255,0.1);}
.smd-login-key:active{background:rgba(29,185,84,0.2);border-color:rgba(29,185,84,0.4);transform:scale(0.96);}
.smd-login-key.zero{grid-column:2;}
.smd-login-error{
  background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
  border-radius:8px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-top:12px;text-align:center;
}
`;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function formatDurationMins(mins) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return <div className="smd-toast">{msg}</div>;
}

// ─────────────────────────────────────────────────────────────
// VIN DECODER — NHTSA free API
// ─────────────────────────────────────────────────────────────
async function decodeVIN(vin) {
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await res.json();
    const r = data.Results?.[0];
    if (!r || r.ErrorCode !== "0") return null;
    return {
      year: r.ModelYear,
      make: r.Make,
      model: r.Model,
      description: [r.Trim, r.BodyClass].filter(Boolean).join(" · ") || r.Model,
      vin: vin.toUpperCase(),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// WORKER — VIN SCANNER FLOW
// ─────────────────────────────────────────────────────────────
function WorkerApp({ user, onLogout }) {
  const [step, setStep] = useState(1); // 1=scan 2=service 3=timer 4=done
  const [vinInput, setVinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [stockNumber, setStockNumber] = useState("");
  const [dealer, setDealer] = useState("Default");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [notes, setNotes] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [completedJob, setCompletedJob] = useState(null);
  const [toast, setToast] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [livePrices, setLivePrices] = useState(PRICE_TABLE);
  const timerRef = useRef(null);

  // Load manager-set prices from Supabase
  useEffect(() => {
    supabase.from('detailing_prices').select('*').then(({ data }) => {
      if (data?.length) {
        const merged = Object.fromEntries(Object.entries(PRICE_TABLE).map(([d,s])=>[d,{...s}]));
        data.forEach(r => { if (merged[r.dealer]) merged[r.dealer][r.service] = r.price; });
        setLivePrices(merged);
      }
    });
  }, []);

  useEffect(() => {
    if (step === 3) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const handleLookup = async () => {
    if (vinInput.length < 5) return;
    setLoading(true);
    const result = await decodeVIN(vinInput);
    setLoading(false);
    if (!result) { setToast("❌ VIN not found. Check the number and try again."); return; }
    setVehicle(result);
    setDealer(DEALERS.find(d => d.toLowerCase() === result.make?.toLowerCase()) || "Default");
  };

  const handleScanned = async (vin) => {
    setShowScanner(false);
    setVinInput(vin);
    setLoading(true);
    const result = await decodeVIN(vin);
    setLoading(false);
    if (!result) { setToast("❌ VIN not recognized. Try typing it manually."); return; }
    setVehicle(result);
    setDealer(DEALERS.find(d => d.toLowerCase() === result.make?.toLowerCase()) || "Default");
  };

  const toggleService = (s) => setSelectedServices(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const toggleExtra = (name) => setSelectedExtras(prev =>
    prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
  );

  const handleStartService = () => {
    if (selectedServices.length === 0) return;
    setStartTime(new Date());
    setTimerSeconds(0);
    setStep(3);
  };

  const handleFinish = async () => {
    clearInterval(timerRef.current);
    const endTime = new Date();
    const priceTable = livePrices[dealer] || livePrices["Default"];
    const servicesPrice = selectedServices.reduce((sum, s) => sum + (priceTable[s] || 0), 0);
    const extrasPrice = selectedExtras.reduce((sum, name) => {
      const e = EXTRAS.find(x => x.name === name);
      return sum + (e ? e.price : 0);
    }, 0);
    const price = servicesPrice + extrasPrice;
    const serviceLabel = [...selectedServices, ...selectedExtras].join(", ");
    const job = {
      id: `SVC-${Date.now().toString().slice(-5)}`,
      vin: vehicle.vin, year: vehicle.year, make: vehicle.make,
      model: vehicle.model, description: vehicle.description,
      stockNumber, dealer, service: serviceLabel, price,
      worker: user.name, startTime: startTime.toISOString(),
      endTime: endTime.toISOString(), duration: Math.round(timerSeconds / 60),
      notes, flagged: notes.trim().length > 0, priceAdjusted: false, clientPhone,
    };
    await supabase.from('detailing_jobs').insert({
      id: job.id, vin: job.vin, year: job.year, make: job.make,
      model: job.model, description: job.description,
      stock_number: job.stockNumber, dealer: job.dealer,
      service: job.service, price: job.price, worker: job.worker,
      start_time: job.startTime, end_time: job.endTime,
      duration_mins: job.duration, notes: job.notes,
      flagged: job.flagged, price_adjusted: false, client_phone: job.clientPhone,
    });
    setCompletedJob(job);
    setStep(4);
  };

  const handleNewScan = () => {
    setStep(1); setVinInput(""); setVehicle(null); setStockNumber("");
    setDealer("Default"); setSelectedServices([]); setSelectedExtras([]); setNotes("");
    setClientPhone(""); setTimerSeconds(0); setCompletedJob(null);
  };

  const TOTAL_STEPS = 3;

  return (
    <>
      <style>{css}</style>
      <div className="smd-shell">
        <div className="smd-topbar">
          <div className="smd-logo"><img className="smd-logo-img" src={LOGO_URL} alt="Logo"/>Mobile Detailing Tracker</div>
          <div className="smd-topbar-right">
            <span className="smd-user">Hey <strong>{user.name}</strong></span>
            <button className="smd-logout" onClick={onLogout}>Sign out</button>
          </div>
        </div>

        <div className="smd-content">
          {step < 4 && (
            <div className="step-bar" style={{marginTop:16}}>
              {[1,2,3].map(s => (
                <div key={s} className={`step ${s < step ? "done" : s === step ? "active" : ""}`}/>
              ))}
            </div>
          )}

          {/* ── STEP 1: VIN SCAN ── */}
          {step === 1 && (
            <div>
              <div className="smd-heading">Scan a Vehicle</div>
              <div className="smd-sub">Scan the VIN barcode or type it in manually</div>

              <div className="vin-card">
                <div className="vin-scan-area" onClick={() => setShowScanner(true)}>
                  <div className="vin-scan-icon">📷</div>
                  <div className="vin-scan-label">Tap to Scan VIN</div>
                  <div className="vin-scan-sub">Barcode, QR, or printed text</div>
                </div>

                <div className="vin-divider">
                  <div className="vin-divider-line"/>
                  <span className="vin-divider-text">or type it</span>
                  <div className="vin-divider-line"/>
                </div>

                <div className="vin-input-row">
                  <input
                    className="vin-text-input"
                    placeholder="Enter VIN number…"
                    value={vinInput}
                    onChange={e => setVinInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleLookup()}
                    maxLength={17}
                  />
                  <button className="vin-lookup-btn" onClick={handleLookup} disabled={loading || vinInput.length < 5}>
                    {loading ? "…" : "Look up"}
                  </button>
                </div>
              </div>

              {vehicle && (
                <>
                  <div className="vin-result">
                    <div className="vin-result-car">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                    <div className="vin-result-desc">{vehicle.description}</div>
                    <div className="vin-result-grid">
                      <div className="vin-field">
                        <div className="vin-field-label">VIN</div>
                        <div className="vin-field-val" style={{fontSize:11,fontFamily:"monospace"}}>{vehicle.vin}</div>
                      </div>
                      <div className="vin-field">
                        <div className="vin-field-label">Stock Number</div>
                        <input className="vin-field-input" placeholder="e.g. STK-4421" value={stockNumber} onChange={e=>setStockNumber(e.target.value)}/>
                      </div>
                      <div className="vin-field" style={{gridColumn:"1/-1"}}>
                        <div className="vin-field-label">Dealer / Owner</div>
                        <select style={{width:"100%",border:"none",background:"transparent",fontSize:13.5,fontWeight:600,color:"var(--ink)",outline:"none",cursor:"pointer",fontFamily:"var(--font)"}}
                          value={dealer} onChange={e=>setDealer(e.target.value)}>
                          {DEALERS.map(d=><option key={d}>{d}</option>)}
                          <option value="Customer car">Customer car (no dealer)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="phone-section section-gap">
                    <label className="f-label">Client Phone (for SMS when done)</label>
                    <input className="phone-input" placeholder="(555) 000-0000 — optional" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} type="tel"/>
                    <div className="sms-note">💬 Customer will get a text when the service is complete</div>
                  </div>

                  <button className="green-btn" onClick={() => setStep(2)}>
                    Continue to Service Selection →
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: SERVICE SELECTION ── */}
          {step === 2 && vehicle && (
            <div>
              <div className="smd-heading">Select Service</div>
              <div className="smd-sub">{vehicle.year} {vehicle.make} {vehicle.model} {stockNumber && `· ${stockNumber}`}</div>

              <div className="section-title section-gap">Services</div>
              <div className="service-grid">
                {SERVICES.map(s => (
                  <div key={s} className={`service-opt${selectedServices.includes(s)?" selected":""}`} onClick={()=>toggleService(s)}>
                    <span className="service-name">{s}</span>
                    <div className="service-check">{selectedServices.includes(s) && "✓"}</div>
                  </div>
                ))}
              </div>

              <div className="section-title section-gap">Extras</div>
              <div className="extras-grid">
                {EXTRAS.map(e => (
                  <div key={e.name} className={`extra-chip${selectedExtras.includes(e.name)?" selected":""}`} onClick={()=>toggleExtra(e.name)}>
                    <div className="extra-chip-check">{selectedExtras.includes(e.name) && "✓"}</div>
                    {e.name}
                    <span className="extra-price">+${e.price}</span>
                  </div>
                ))}
              </div>

              <div className="notes-section section-gap">
                <div className="notes-label">Description / Notes (optional)</div>
                {notes.trim().length > 0 && (
                  <div className="notes-flag-warn">⚠ Adding notes will flag this job for manager review</div>
                )}
                <textarea
                  className="smd-textarea"
                  rows={3}
                  placeholder="Any extra work done, special conditions, or things the manager should know…"
                  value={notes}
                  onChange={e=>setNotes(e.target.value)}
                />
              </div>

              <div style={{display:"flex",gap:10}}>
                <button style={{padding:"13px 18px",background:"transparent",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:14,fontWeight:600,color:"var(--ink3)",cursor:"pointer"}} onClick={()=>setStep(1)}>← Back</button>
                <button className="green-btn" style={{flex:1}} onClick={handleStartService} disabled={selectedServices.length === 0}>
                  Start Service Timer →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: TIMER ── */}
          {step === 3 && vehicle && (
            <div>
              <div className="smd-heading">Service Running</div>
              <div className="smd-sub">Tap finish when the service is done</div>

              <div className="timer-card">
                <div className="timer-bg"/>
                <div className="timer-car">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                <div className="timer-service">{[...selectedServices, ...selectedExtras].join(" · ")}</div>
                <div className="timer-display">{formatDuration(timerSeconds)}</div>
                <div className="timer-label"><span className="timer-dot"/>In progress</div>
                <button className="finish-btn" onClick={handleFinish}>
                  ✓ Finish Service
                </button>
              </div>

              <div style={{background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Job Summary</div>
                {[
                  ["Vehicle", `${vehicle.year} ${vehicle.make} ${vehicle.model}`],
                  ["Stock #", stockNumber || "—"],
                  ["Dealer", dealer],
                  ["Services", selectedServices.join(", ") || "—"],
                  ...(selectedExtras.length ? [["Extras", selectedExtras.join(", ")]] : []),
                  ["Worker", user.name],
                  ...(notes ? [["Notes", notes]] : []),
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--ink3)",fontWeight:600}}>{k}</span>
                    <span style={{color:"var(--ink)",fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: COMPLETE ── */}
          {step === 4 && completedJob && (
            <div>
              <div className="complete-card">
                <div className="complete-icon">✅</div>
                <div className="complete-title">Service Complete!</div>
                <div className="complete-sub">{completedJob.year} {completedJob.make} {completedJob.model}</div>

                <div className="complete-stats">
                  <div className="complete-stat">
                    <div className="cs-val">{formatDurationMins(completedJob.duration)}</div>
                    <div className="cs-label">Duration</div>
                  </div>
                  <div className="complete-stat">
                    <div className="cs-val" style={{fontSize:11,lineHeight:1.4}}>{completedJob.service}</div>
                    <div className="cs-label">Services</div>
                  </div>
                  <div className="complete-stat">
                    <div className="cs-val">{completedJob.stockNumber || "N/A"}</div>
                    <div className="cs-label">Stock #</div>
                  </div>
                </div>

                {completedJob.flagged && (
                  <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:9,padding:"10px 14px",fontSize:13,color:"#92400e",marginBottom:14,textAlign:"left"}}>
                    ⚠ This job has been <strong>flagged for manager review</strong> because you added notes.
                  </div>
                )}

                {completedJob.clientPhone ? (
                  <div className="sms-status">
                    💬 SMS queued for {completedJob.clientPhone}
                    <span style={{fontSize:11,opacity:0.7,marginLeft:"auto"}}>Twilio — pending setup</span>
                  </div>
                ) : (
                  <div className="sms-status sms-pending">
                    📵 No phone number — SMS not sent
                  </div>
                )}
              </div>

              <button className="new-scan-btn" onClick={handleNewScan}>
                + Scan Next Vehicle
              </button>
            </div>
          )}
        </div>
      </div>
      {showScanner && (
        <VinScanner
          onResult={({ vin }) => handleScanned(vin)}
          onCancel={() => setShowScanner(false)}
        />
      )}
      {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
    </>
  );
}

// Splits a saved service string back into base services and extras
function parseJobServices(serviceStr) {
  const items = serviceStr ? serviceStr.split(", ") : [];
  return {
    svcs:   items.filter(i => SERVICES.includes(i)),
    extras: items.filter(i => !SERVICES.includes(i)),
  };
}

// ─────────────────────────────────────────────────────────────
// MANAGER PANEL
// ─────────────────────────────────────────────────────────────
function ManagerPanel({ user, onLogout }) {
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [prices, setPrices] = useState(
    Object.fromEntries(Object.entries(PRICE_TABLE).map(([dealer, svcs]) => [dealer, {...svcs}]))
  );
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustPrice, setAdjustPrice] = useState("");
  const [toast, setToast] = useState(null);

  const [dateRange, setDateRange] = useState("month"); // today | week | month | all
  const loadDetailingJobs = useCallback(() => {
    let q = supabase.from('detailing_jobs').select('*').order('created_at', { ascending: false });
    if (dateRange !== "all") {
      const now = new Date();
      let start;
      if (dateRange === "today") { start = new Date(now); start.setHours(0,0,0,0); }
      else if (dateRange === "week") { start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0); }
      else { start = new Date(now.getFullYear(), now.getMonth(), 1); }
      q = q.gte('created_at', start.toISOString());
    }
    q.then(({ data }) => {
        if (data?.length) setJobs(data.map(r => ({
          id: r.id, vin: r.vin, year: r.year, make: r.make, model: r.model,
          description: r.description, stockNumber: r.stock_number, dealer: r.dealer,
          service: r.service, price: r.price, worker: r.worker,
          startTime: r.start_time, endTime: r.end_time, duration: r.duration_mins,
          notes: r.notes, flagged: r.flagged, priceAdjusted: r.price_adjusted,
          clientPhone: r.client_phone,
        })));
      });
  }, [dateRange]);

  useEffect(() => { loadDetailingJobs() }, [loadDetailingJobs]);
  useRealtime('detailing_jobs', loadDetailingJobs);

  const flaggedJobs = jobs.filter(j => j.flagged && !j.priceAdjusted);
  const totalRevenue = jobs.reduce((a,j)=>a+(j.price||0), 0);

  const handleApprove = async (id) => {
    await supabase.from('detailing_jobs').update({ flagged: false }).eq('id', id);
    setJobs(prev => prev.map(j => j.id===id ? {...j, flagged:false} : j));
    setToast("✅ Job approved — flag cleared");
  };

  const handleOpenAdjust = (job) => { setAdjustModal(job); setAdjustPrice(String(job.price)); };

  const handleSaveAdjust = async () => {
    const newPrice = parseFloat(adjustPrice);
    if (isNaN(newPrice) || newPrice < 0) return;
    await supabase.from('detailing_jobs').update({ price: newPrice, price_adjusted: true, flagged: false }).eq('id', adjustModal.id);
    setJobs(prev => prev.map(j => j.id===adjustModal.id ? {...j, price:newPrice, priceAdjusted:true, flagged:false} : j));
    setAdjustModal(null);
    setToast(`✅ Price updated to $${newPrice.toFixed(2)}`);
  };

  // Load saved prices from Supabase on mount
  useEffect(() => {
    supabase.from('detailing_prices').select('*').then(({ data }) => {
      if (data?.length) {
        const loaded = { ...prices };
        data.forEach(r => {
          if (loaded[r.dealer]) loaded[r.dealer][r.service] = r.price;
        });
        setPrices(loaded);
      }
    });
  }, []);

  const handleSendSMS = (job) => {
    setToast(`💬 SMS queued for ${job.clientPhone || "no number"} — Twilio setup needed`);
  };

  const handleSavePrices = async (dealer) => {
    const rows = Object.entries(prices[dealer]).map(([service, price]) => ({
      dealer, service, price,
    }));
    const { error } = await supabase.from('detailing_prices')
      .upsert(rows, { onConflict: 'dealer,service' });
    if (error) { setToast(`❌ Failed to save: ${error.message}`); return; }
    setToast(`✅ Prices saved for ${dealer}`);
  };

  return (
    <>
      <style>{css}</style>
      <div className="mgr-shell">
        <div className="smd-topbar">
          <div className="smd-logo"><img className="smd-logo-img" src={LOGO_URL} alt="Logo"/>Manager Panel</div>
          <div className="smd-topbar-right">
            <span className="smd-user"><strong>{user.name}</strong> · Manager</span>
            <button className="smd-logout" onClick={onLogout}>Sign out</button>
          </div>
        </div>

        <div className="mgr-content">
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"var(--font-serif)",fontSize:24,fontWeight:600,color:"var(--ink)",letterSpacing:"-0.02em"}}>
              Good {new Date().getHours()<12?"morning":"afternoon"}, {user.name.split(" ")[0]}
            </div>
            <div style={{fontSize:13,color:"var(--ink3)",marginTop:3}}>
              {flaggedJobs.length > 0 ? `${flaggedJobs.length} job${flaggedJobs.length>1?"s":""} need your review` : "Everything looks good today"}
            </div>
          </div>

          <div className="mgr-stats">
            <div className="mgr-stat accent">
              <div className="mgr-stat-label">Revenue Today</div>
              <div className="mgr-stat-val">${totalRevenue.toLocaleString()}</div>
            </div>
            <div className="mgr-stat">
              <div className="mgr-stat-label">Jobs Today</div>
              <div className="mgr-stat-val">{jobs.length}</div>
              <div className="mgr-stat-sub">all workers</div>
            </div>
            <div className={`mgr-stat${flaggedJobs.length>0?" warn":""}`}>
              <div className="mgr-stat-label">Flagged</div>
              <div className="mgr-stat-val">{flaggedJobs.length}</div>
              <div className="mgr-stat-sub">need review</div>
            </div>
            <div className="mgr-stat">
              <div className="mgr-stat-label">Avg Duration</div>
              <div className="mgr-stat-val">{jobs.length ? Math.round(jobs.reduce((a,j)=>a+j.duration,0)/jobs.length) : 0}m</div>
            </div>
          </div>

          <div style={{display:"flex",gap:4,marginBottom:14}}>
            {[{id:"today",l:"Today"},{id:"week",l:"This Week"},{id:"month",l:"This Month"},{id:"all",l:"All Time"}].map(r=>(
              <button key={r.id} onClick={()=>setDateRange(r.id)} style={{
                padding:"6px 14px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",
                fontFamily:"var(--font)",transition:"all .15s",
                background:dateRange===r.id?"var(--ink)":"var(--white)",
                color:dateRange===r.id?"#fff":"var(--ink3)",
                borderColor:dateRange===r.id?"var(--ink)":"var(--border)",
              }}>{r.l}</button>
            ))}
          </div>

          <div className="mgr-tabs">
            <button className={`mgr-tab${tab==="jobs"?" active":""}`} onClick={()=>setTab("jobs")}>All Jobs</button>
            <button className={`mgr-tab flagged-tab${tab==="flagged"?" active":""}`} onClick={()=>setTab("flagged")}>
              Flagged {flaggedJobs.length>0&&<span className="flag-count">{flaggedJobs.length}</span>}
            </button>
            <button className={`mgr-tab${tab==="prices"?" active":""}`} onClick={()=>setTab("prices")}>Price Tables</button>
            <button className={`mgr-tab${tab==="export"?" active":""}`} onClick={()=>setTab("export")}>⬇ Export</button>
          </div>

          {/* ALL JOBS */}
          {tab==="jobs" && (
            <div className="job-list">
              {jobs.map(job=>(
                <div key={job.id} className={`job-row${job.flagged&&!job.priceAdjusted?" flagged":""}`}>
                  <div className="job-row-top">
                    <div>
                      <div className="job-row-car">{job.year} {job.make} {job.model}</div>
                      <div className="job-row-meta">{job.vin} · {job.dealer} · by {job.worker}</div>
                    </div>
                    <div className="job-row-right">
                      <div className={`job-price${job.priceAdjusted?" adjusted":""}`}>${job.price.toFixed(2)}{job.priceAdjusted&&" ✓"}</div>
                      {(() => { const {svcs, extras} = parseJobServices(job.service); return (
                        <div className="job-svc-lines">
                          {svcs.length > 0 && <div className="job-svc-line">{svcs.map(s=><span key={s} className="job-service-badge">{s}</span>)}</div>}
                          {extras.length > 0 && <div className="job-svc-line">{extras.map(e=><span key={e} className="job-extra-badge">{e}</span>)}</div>}
                        </div>
                      ); })()}
                    </div>
                  </div>
                  <div className="job-row-body">
                    {job.stockNumber&&<div className="job-stat">🏷 <strong>{job.stockNumber}</strong></div>}
                    <div className="job-stat">⏱ <strong>{formatDurationMins(job.duration)}</strong></div>
                    <div className="job-stat">🕐 <strong>{new Date(job.startTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</strong></div>
                    {job.clientPhone&&<div className="job-stat">📱 <strong>{job.clientPhone}</strong></div>}
                    {job.flagged&&!job.priceAdjusted&&<span className="flag-tag">⚠ Needs review</span>}
                    {job.priceAdjusted&&<span style={{fontSize:11,fontWeight:600,color:"var(--green)",background:"var(--green-dim)",border:"1px solid var(--green-border)",borderRadius:20,padding:"2px 9px"}}>✓ Price adjusted</span>}
                  </div>
                  {job.notes&&(
                    <div className="job-notes-box">
                      <div className="job-notes-label">Worker notes</div>
                      {job.notes}
                    </div>
                  )}
                  <div className="mgr-actions">
                    <button className="mgr-btn" onClick={()=>handleOpenAdjust(job)}>💰 Adjust Price</button>
                    {job.flagged&&!job.priceAdjusted&&<button className="mgr-btn approve" onClick={()=>handleApprove(job.id)}>✓ Approve As-Is</button>}
                    <button className="mgr-btn sms" onClick={()=>handleSendSMS(job)}>💬 Send SMS</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FLAGGED JOBS */}
          {tab==="flagged" && (
            <div>
              {flaggedJobs.length === 0 ? (
                <div style={{textAlign:"center",padding:"50px 20px",color:"var(--ink3)"}}>
                  <div style={{fontSize:36,marginBottom:12}}>✅</div>
                  <div style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:600,color:"var(--ink)",marginBottom:6}}>All clear</div>
                  <div style={{fontSize:13}}>No jobs waiting for review right now.</div>
                </div>
              ) : (
                <div className="job-list">
                  {flaggedJobs.map(job=>(
                    <div key={job.id} className="job-row flagged">
                      <div className="job-row-top">
                        <div>
                          <div className="job-row-car">{job.year} {job.make} {job.model}</div>
                          <div className="job-row-meta">{job.dealer} · by {job.worker}</div>
                          {(() => { const {svcs, extras} = parseJobServices(job.service); return (
                            <div style={{marginTop:4}}>
                              {svcs.length > 0 && <div className="job-svc-line" style={{marginBottom:3}}>{svcs.map(s=><span key={s} className="job-service-badge">{s}</span>)}</div>}
                              {extras.length > 0 && <div className="job-svc-line">{extras.map(e=><span key={e} className="job-extra-badge">{e}</span>)}</div>}
                            </div>
                          ); })()}
                        </div>
                        <div className="job-row-right">
                          <div className="job-price">${job.price.toFixed(2)}</div>
                          <span className="flag-tag">⚠ Review needed</span>
                        </div>
                      </div>
                      {job.notes&&(
                        <div className="job-notes-box">
                          <div className="job-notes-label">What the worker wrote</div>
                          {job.notes}
                        </div>
                      )}
                      <div className="mgr-actions">
                        <button className="mgr-btn" onClick={()=>handleOpenAdjust(job)}>💰 Adjust Price</button>
                        <button className="mgr-btn approve" onClick={()=>handleApprove(job.id)}>✓ Approve As-Is</button>
                        <button className="mgr-btn sms" onClick={()=>handleSendSMS(job)}>💬 Send SMS</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRICE TABLES */}
          {tab==="prices" && (
            <div>
              <div style={{fontSize:13,color:"var(--ink3)",marginBottom:16}}>
                Set prices per dealer. Workers never see these values.
              </div>
              {Object.entries(prices).map(([dealer, svcs])=>(
                <div key={dealer} className="price-editor">
                  <div className="pe-header">
                    <div className="pe-dealer">{dealer}</div>
                    <button className="save-prices-btn" onClick={()=>handleSavePrices(dealer)}>Save</button>
                  </div>
                  <div className="pe-grid">
                    {SERVICES.map(svc=>(
                      <div key={svc} className="pe-row">
                        <span className="pe-service">{svc}</span>
                        <div className="pe-input-wrap">
                          <span className="pe-dollar">$</span>
                          <input
                            className="pe-input"
                            type="number"
                            value={svcs[svc]||""}
                            onChange={e=>setPrices(prev=>({
                              ...prev,
                              [dealer]:{...prev[dealer],[svc]:Number(e.target.value)}
                            }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* EXPORT */}
          {tab==="export" && <ExportPanel jobs={jobs}/>}
        </div>
      </div>

      {/* PRICE ADJUST MODAL */}
      {adjustModal && (
        <div className="pa-overlay" onClick={e=>e.target===e.currentTarget&&setAdjustModal(null)}>
          <div className="pa-modal">
            <div className="pa-header">
              <span className="pa-title">Adjust Price</span>
              <button className="pa-close" onClick={()=>setAdjustModal(null)}>✕</button>
            </div>
            <div className="pa-body">
              <div className="pa-car">{adjustModal.year} {adjustModal.make} {adjustModal.model}</div>
              <div className="pa-service">{adjustModal.service} · {adjustModal.dealer} · by {adjustModal.worker}</div>
              {adjustModal.notes&&<div className="pa-notes"><strong>Worker notes:</strong> {adjustModal.notes}</div>}
              <div className="pa-price-row">
                <span className="pa-price-label">Current price</span>
                <span style={{fontSize:16,fontWeight:700,color:"var(--ink3)"}}>${adjustModal.price.toFixed(2)}</span>
              </div>
              <div className="pa-price-row">
                <span className="pa-price-label">New price</span>
                <input className="pa-price-input" type="number" value={adjustPrice} onChange={e=>setAdjustPrice(e.target.value)} autoFocus/>
              </div>
            </div>
            <div className="pa-footer">
              <button className="btn-cancel" onClick={()=>setAdjustModal(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleSaveAdjust}>Save Price</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TRACKER LOGIN — standalone, not shared with other apps
// ─────────────────────────────────────────────────────────────
function TrackerLogin({ workers, onLogin }) {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handlePinKey = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(""); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      const worker = workers.find(w => w.id === selectedWorker);
      if (worker && worker.pin === next) {
        onLogin(worker);
      } else {
        setError("Wrong PIN. Try again.");
        setTimeout(() => { setPin(""); setError(""); }, 1000);
      }
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="smd-login-shell">
        <div className="smd-login-glow smd-login-glow-1"/>
        <div className="smd-login-glow smd-login-glow-2"/>
        <div className="smd-login-box">
          <div className="smd-login-brand">
            <div className="smd-login-icon"><img src={LOGO_URL} alt="Logo"/></div>
            <div className="smd-login-title">Detailing Tracker</div>
            <div className="smd-login-subtitle">Mobile Detailing</div>
          </div>

          <div className="smd-login-field">
            <label className="smd-login-label">Who are you?</label>
            <select className="smd-login-select" value={selectedWorker}
              onChange={e => { setSelectedWorker(e.target.value); setPin(""); setError(""); }}>
              <option value="">Select your name…</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}{w.role === "manager" ? " (Manager)" : ""}</option>
              ))}
            </select>
          </div>

          {selectedWorker && (
            <>
              <div className="smd-login-field">
                <label className="smd-login-label">Enter your PIN</label>
                <div className="smd-login-pin">
                  {[0,1,2,3].map(i => <div key={i} className={`smd-login-dot${pin.length > i ? " filled" : ""}`}/>)}
                </div>
              </div>
              <div className="smd-login-numpad">
                {["1","2","3","4","5","6","7","8","9"].map(k => (
                  <button key={k} className="smd-login-key" onClick={() => handlePinKey(k)}>{k}</button>
                ))}
                <button className="smd-login-key" onClick={() => handlePinKey("del")}>⌫</button>
                <button className="smd-login-key zero" onClick={() => handlePinKey("0")}>0</button>
              </div>
            </>
          )}
          {error && <div className="smd-login-error">{error}</div>}

          {workers.length === 0 && (
            <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13,marginTop:20}}>
              No workers found. Ask the manager to add you.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TRACKER APP — self-contained wrapper (login + worker/manager)
// ─────────────────────────────────────────────────────────────
function TrackerApp() {
  const [user, setUser] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('workers').select('*').eq('business', 'detailing')
      .then(({ data }) => {
        if (data?.length) setWorkers(data.map(w => ({ ...w, businessLabel: w.business_label })));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="smd-login-shell">
          <div className="smd-login-glow smd-login-glow-1"/>
          <div className="smd-login-box" style={{textAlign:"center",padding:60}}>
            <div className="smd-login-icon"><img src={LOGO_URL} alt="Logo"/></div>
            <div style={{color:"rgba(255,255,255,0.4)",marginTop:16,fontFamily:"var(--font)"}}>Loading…</div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return <TrackerLogin workers={workers} onLogin={setUser}/>;
  }

  if (user.role === "manager") {
    return <ManagerPanel user={user} onLogout={() => setUser(null)}/>;
  }

  return <WorkerApp user={user} onLogout={() => setUser(null)}/>;
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
export { WorkerApp, ManagerPanel, TrackerApp };
export default TrackerApp;
