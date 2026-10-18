import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ─────────────────────────────────────────────────────────────
// TESSERACT CDN PATHS — Vite production builds mangle the
// auto-detected worker/wasm URLs, so we pin to jsdelivr.
// ─────────────────────────────────────────────────────────────
const TESSERACT_OPTS = {
  workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js",
  corePath:   "https://cdn.jsdelivr.net/npm/tesseract.js-core@7/tesseract-core-lstm.wasm.js",
  langPath:   "https://tessdata.projectnaptha.com/4.0.0_fast",
};

// ─────────────────────────────────────────────────────────────
// VIN VALIDATION — ISO 3779 check digit
// ─────────────────────────────────────────────────────────────
const VIN_TRANS = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8,
  J:1, K:2, L:3, M:4, N:5, P:7, R:9,
  S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9,
  0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9,
};
const VIN_WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(v) {
  if (!v || v.length !== 17 || !VIN_RE.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const t = VIN_TRANS[v[i]];
    if (t === undefined) return false;
    sum += t * VIN_WEIGHTS[i];
  }
  const rem = sum % 11;
  const expected = rem === 10 ? "X" : String(rem);
  return v[8] === expected;
}

// Find the best 17-char window in a string. `lenient` maps OCR-confused
// glyphs (I→1, O→0, Q→0) since real VINs never contain I/O/Q.
function findVinCandidate(raw, lenient) {
  let s = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (lenient) {
    s = s.replace(/I/g, "1").replace(/O/g, "0").replace(/Q/g, "0");
  } else {
    s = s.replace(/[IOQ]/g, "");
  }
  // First pass — find a check-digit-valid window
  for (let i = 0; i + 17 <= s.length; i++) {
    const c = s.slice(i, i + 17);
    if (VIN_RE.test(c) && isValidVin(c)) return { vin: c, valid: true };
  }
  // Second pass — return first 17-char VIN-charset window as a suggestion
  for (let i = 0; i + 17 <= s.length; i++) {
    const c = s.slice(i, i + 17);
    if (VIN_RE.test(c)) return { vin: c, valid: false };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// SMART VIN SCANNER — barcode + QR (zxing) + OCR (tesseract)
// onResult({ vin, source, autofilled, valid })
//   source: 'barcode' | 'qr' | 'ocr' | 'manual'
//   autofilled: true when check-digit-valid (closes immediately)
// onCancel()
// ─────────────────────────────────────────────────────────────
export default function VinScanner({ onResult, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const reportedRef = useRef(false);
  const ocrAliveRef = useRef(true);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);     // { vin, source }
  const [showManual, setShowManual] = useState(false);
  const [manualVin, setManualVin] = useState("");

  // Visible diagnostics so we can see what's happening on a phone.
  // ocrStatus: 'idle' | 'loading' | 'scanning' | 'unavailable'
  const [ocrStatus, setOcrStatus] = useState("idle");
  const [lastDetected, setLastDetected] = useState(null); // { source, text }

  const report = (vin, source, autofilled) => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    ocrAliveRef.current = false;
    try { BrowserMultiFormatReader.releaseAllStreams(); } catch {}
    onResult({ vin, source, autofilled, valid: isValidVin(vin) });
  };

  const handleCancel = () => {
    ocrAliveRef.current = false;
    try { BrowserMultiFormatReader.releaseAllStreams(); } catch {}
    onCancel?.();
  };

  // ── ZXing: handles 1D barcodes AND QR codes in one decoder ──
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    reader.decodeFromConstraints(
      {
        video: {
          facingMode: "environment",
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      videoRef.current,
      (result) => {
        if (!ready) setReady(true);
        if (!result || reportedRef.current) return;

        const text = result.getText().trim();
        const fmtRaw = result.getBarcodeFormat?.();
        const fmtStr = String(fmtRaw).toUpperCase();
        // BarcodeFormat.QR_CODE === 11 in @zxing/library
        const isQR = fmtStr === "11" || fmtStr.includes("QR");
        const source = isQR ? "qr" : "barcode";

        setLastDetected({ source, text: text.slice(0, 40) });
        // eslint-disable-next-line no-console
        console.log("[VinScanner]", source, "→", text);

        const found = findVinCandidate(text, false);
        if (!found) {
          // Got a code but couldn't parse a 17-char window — show it as
          // a suggestion anyway so the user can tap it.
          if (text && text.length >= 11) {
            setSuggestion({ vin: text.toUpperCase().slice(0, 17), source });
          }
          return;
        }
        if (found.valid) {
          report(found.vin, source, true);
        } else {
          setSuggestion({ vin: found.vin, source });
        }
      }
    ).catch(() => {
      setError(
        "Camera access was denied.\n" +
        "Allow camera in your browser settings, or type the VIN manually below."
      );
    });

    return () => {
      try { BrowserMultiFormatReader.releaseAllStreams(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tesseract OCR: ~1 pass/sec on a centered horizontal strip ──
  useEffect(() => {
    let worker = null;
    setOcrStatus("loading");

    (async () => {
      // Lazy-load: tesseract.js bundle is ~2 MB, traineddata ~12 MB.
      // First scan on a device pauses 5–15s while these download.
      let createWorker;
      try {
        ({ createWorker } = await import("tesseract.js"));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[VinScanner] tesseract.js import failed", e);
        setOcrStatus("unavailable");
        return;
      }

      try {
        worker = await createWorker("eng", 1, TESSERACT_OPTS);
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
          tessedit_pageseg_mode: "7", // PSM_SINGLE_LINE — VIN is one row
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[VinScanner] tesseract worker init failed", e);
        setOcrStatus("unavailable");
        try { await worker?.terminate(); } catch {}
        return;
      }

      setOcrStatus("scanning");

      while (ocrAliveRef.current && !reportedRef.current) {
        await new Promise(r => setTimeout(r, 900));
        if (!ocrAliveRef.current || reportedRef.current) break;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) continue;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) continue;

        // Center horizontal strip — VIN almost always appears horizontal
        const stripH = Math.floor(vh * 0.30);
        const stripY = Math.floor((vh - stripH) / 2);
        canvas.width = vw;
        canvas.height = stripH;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(video, 0, stripY, vw, stripH, 0, 0, vw, stripH);

        try {
          const { data } = await worker.recognize(canvas);
          const text = (data?.text || "").toUpperCase();
          const cleaned = text.replace(/[^A-Z0-9]/g, "");
          if (cleaned) {
            setLastDetected({ source: "ocr", text: cleaned.slice(0, 40) });
            // eslint-disable-next-line no-console
            console.log("[VinScanner] ocr →", cleaned);
          }

          const found = findVinCandidate(text, true /* lenient */);
          if (!found) continue;
          if (found.valid) {
            report(found.vin, "ocr", true);
            break;
          } else {
            setSuggestion({ vin: found.vin, source: "ocr" });
          }
        } catch {
          // single-frame OCR failures are common, keep going
        }
      }

      try { await worker?.terminate(); } catch {}
    })();

    return () => { ocrAliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Manual entry slide-in after 8s of no read ──
  useEffect(() => {
    const t = setTimeout(() => setShowManual(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // ── Render ──
  return (
    <div
      className="scanner-overlay"
      onClick={e => e.target === e.currentTarget && handleCancel()}
    >
      {error ? (
        <div className="scanner-error">
          <div className="scanner-error-icon">📷</div>
          <p style={{whiteSpace:"pre-line"}}>{error}</p>
          <ManualEntry
            value={manualVin}
            onChange={setManualVin}
            onSubmit={() => report(manualVin, "manual", false)}
          />
          <button className="scanner-close-btn" onClick={handleCancel}>Close</button>
        </div>
      ) : (
        <>
          <div className="scanner-video-wrap">
            <video
              ref={videoRef}
              className="scanner-video"
              playsInline
              muted
              autoPlay
            />
            {ready && <div className="scanner-frame"><div className="scanner-line"/></div>}
          </div>
          <canvas ref={canvasRef} style={{display:"none"}}/>

          <div className="scanner-label">
            {ready
              ? "Point camera at barcode, QR, or printed VIN"
              : "Starting camera…"}
          </div>
          <div className="scanner-hint">
            Auto-detects all three. The VIN is usually on the door frame, dash, or windshield.
          </div>

          <StatusBadge ocrStatus={ocrStatus} lastDetected={lastDetected} />

          {suggestion && (
            <SuggestionBanner
              suggestion={suggestion}
              onAccept={() => report(suggestion.vin, suggestion.source, false)}
              onDismiss={() => setSuggestion(null)}
            />
          )}

          {showManual && !suggestion && (
            <ManualEntry
              value={manualVin}
              onChange={setManualVin}
              onSubmit={() => report(manualVin, "manual", false)}
            />
          )}
        </>
      )}
      <button className="scanner-close-btn" onClick={handleCancel}>✕ Cancel</button>
    </div>
  );
}

// ─── Status badge: live diagnostics so we can see what's happening ───
function StatusBadge({ ocrStatus, lastDetected }) {
  const ocrLabel = {
    idle:        "",
    loading:     "⏳ Loading text recognition…",
    scanning:    "🔤 Reading printed text",
    unavailable: "⚠️ Text recognition unavailable",
  }[ocrStatus] || "";

  if (!ocrLabel && !lastDetected) return null;

  return (
    <div style={{
      marginTop: 12,
      padding: "8px 14px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 999,
      maxWidth: 480, width: "100%",
      color: "rgba(255,255,255,0.75)",
      fontSize: 12, textAlign: "center",
    }}>
      {ocrLabel && <div>{ocrLabel}</div>}
      {lastDetected && (
        <div style={{
          marginTop: ocrLabel ? 4 : 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          letterSpacing: 0.5,
          opacity: 0.8,
        }}>
          last [{lastDetected.source}]: {lastDetected.text}
        </div>
      )}
    </div>
  );
}

// ─── Suggestion banner: 17-char read that failed check-digit ───
function SuggestionBanner({ suggestion, onAccept, onDismiss }) {
  return (
    <div style={{
      marginTop:16, padding:"14px 16px",
      background:"rgba(255,255,255,0.08)",
      border:"1px solid rgba(255,255,255,0.15)",
      borderRadius:12, maxWidth:480, width:"100%",
      color:"#fff", textAlign:"center",
    }}>
      <div style={{fontSize:12, opacity:0.7, marginBottom:6}}>
        Possible VIN ({suggestion.source}) — check digit didn't match:
      </div>
      <div style={{
        fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize:16, letterSpacing:1, marginBottom:10
      }}>{suggestion.vin}</div>
      <button
        onClick={onAccept}
        style={{
          padding:"8px 18px", marginRight:8, marginBottom:0,
          background:"var(--green, #2f7d32)", border:"none", borderRadius:8,
          color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer",
        }}
      >Use this VIN</button>
      <button
        onClick={onDismiss}
        style={{
          padding:"8px 18px", marginBottom:0,
          background:"rgba(255,255,255,0.1)",
          border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:8, color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer",
        }}
      >Keep scanning</button>
    </div>
  );
}

// ─── Manual entry — appears after 8s, or on camera error ───
function ManualEntry({ value, onChange, onSubmit }) {
  return (
    <div style={{
      marginTop:16, padding:"14px 16px",
      background:"rgba(255,255,255,0.08)",
      border:"1px solid rgba(255,255,255,0.15)",
      borderRadius:12, maxWidth:480, width:"100%", color:"#fff",
    }}>
      <div style={{fontSize:12, opacity:0.7, marginBottom:8, textAlign:"center"}}>
        Can't get a read? Type the VIN:
      </div>
      <div style={{display:"flex", gap:8}}>
        <input
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase().slice(0, 17))}
          onKeyDown={e => e.key === "Enter" && value.length >= 5 && onSubmit()}
          placeholder="VIN…"
          style={{
            flex:1, padding:"10px 12px", borderRadius:8,
            border:"1px solid rgba(255,255,255,0.25)",
            background:"rgba(0,0,0,0.4)", color:"#fff",
            fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize:14, letterSpacing:1, outline:"none",
          }}
        />
        <button
          onClick={onSubmit}
          disabled={value.length < 5}
          style={{
            padding:"10px 18px",
            background: value.length >= 5 ? "var(--green, #2f7d32)" : "rgba(255,255,255,0.1)",
            border:"none", borderRadius:8, color:"#fff",
            fontSize:13, fontWeight:600,
            cursor: value.length >= 5 ? "pointer" : "not-allowed",
          }}
        >Use</button>
      </div>
    </div>
  );
}
