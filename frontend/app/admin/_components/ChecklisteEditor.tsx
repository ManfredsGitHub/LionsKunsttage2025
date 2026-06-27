"use client";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckItem = { id: string; label: string; note?: string };
export type CheckSection = { id: string; title: string; items: CheckItem[]; verantwortlich?: string; termin?: string };

type Detail = { verantwortlich: string; termin: string; bemerkung: string };

const EMPTY_DETAIL: Detail = { verantwortlich: "", termin: "", bemerkung: "" };

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

type Urgency = "overdue" | "soon" | "upcoming" | null;

function urgency(termin: string): Urgency {
  if (!termin) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(termin + "T00:00").getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  if (days <= 14) return "upcoming";
  return null;
}

function daysLeft(termin: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(termin + "T00:00").getTime() - today.getTime()) / 86_400_000);
}

function urgencyTerminCls(u: Urgency) {
  if (u === "overdue")  return "text-red-500";
  if (u === "soon")     return "text-orange-500";
  if (u === "upcoming") return "text-amber-600";
  return "";
}

function urgencyBgCls(u: Urgency) {
  if (u === "overdue")  return "bg-red-50 rounded px-0.5";
  if (u === "soon")     return "bg-orange-50 rounded px-0.5";
  if (u === "upcoming") return "bg-amber-50 rounded px-0.5";
  return "";
}

function urgencyLabel(termin: string) {
  const d = daysLeft(termin);
  if (d < 0)  return `${Math.abs(d)} T. überfällig`;
  if (d === 0) return "Heute!";
  return `in ${d} T.`;
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "bg-transparent border-b border-gray-150 focus:border-lions-blue focus:outline-none text-xs text-gray-700 placeholder-gray-300 pb-0.5 min-w-0";

function ItemRow({
  item, isChecked, detail, onToggle, onDetailChange, onDelete,
}: {
  item: CheckItem;
  isChecked: boolean;
  detail: Detail;
  onToggle: () => void;
  onDetailChange: (d: Detail) => void;
  onDelete: () => void;
}) {
  return (
    <li className="group/item py-2.5 border-b border-gray-50 last:border-0">

      {/* Zeile 1: Checkbox · Thema · Verantwortlich · Termin · Löschen */}
      <div className="flex items-start gap-2">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
            isChecked ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-lions-blue"
          }`}
          aria-label={isChecked ? "Abhaken rückgängig" : "Abhaken"}
        >
          {isChecked && (
            <span className="text-white text-[9px] leading-none flex items-center justify-center w-full h-full">✓</span>
          )}
        </button>

        <span className={`text-sm flex-1 min-w-0 ${isChecked ? "line-through text-gray-400" : "text-gray-800"}`}>
          {item.label}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-gray-300 text-xs select-none">👤</span>
          <input
            type="text"
            value={detail.verantwortlich}
            onChange={e => onDetailChange({ ...detail, verantwortlich: e.target.value })}
            className={`${INPUT_CLS} w-28`}
            placeholder="Verantwortlich"
          />
        </div>

        {(() => {
          const u = urgency(detail.termin);
          const d = detail.termin ? daysLeft(detail.termin) : null;
          return (
            <div className={`flex items-center gap-1 flex-shrink-0 ${urgencyBgCls(u)}`}>
              <span className={`text-xs select-none ${u ? urgencyTerminCls(u) : "text-gray-300"}`}>📅</span>
              <input
                type="date"
                value={detail.termin}
                onChange={e => onDetailChange({ ...detail, termin: e.target.value })}
                className={`${INPUT_CLS} w-32 ${urgencyTerminCls(u)}`}
              />
              {u && (
                <span className={`text-xs font-medium flex-shrink-0 ${urgencyTerminCls(u)}`}>
                  {d !== null && d < 0 ? `${Math.abs(d)}T!` : d === 0 ? "Heute!" : `${d}T`}
                </span>
              )}
            </div>
          );
        })()}

        <button
          onClick={onDelete}
          title="Punkt entfernen"
          className="text-gray-200 hover:text-red-400 transition-colors text-base leading-none flex-shrink-0 opacity-0 group-hover/item:opacity-100 mt-0.5"
        >
          ×
        </button>
      </div>

      {/* Zeile 2: Bemerkung (note dient als Platzhalter-Hinweis) */}
      <div className="ml-6 mt-1 flex items-center gap-1">
        <span className="text-gray-300 text-xs select-none">📝</span>
        <input
          type="text"
          value={detail.bemerkung}
          onChange={e => onDetailChange({ ...detail, bemerkung: e.target.value })}
          className={`${INPUT_CLS} flex-1`}
          placeholder={item.note ?? "Bemerkung"}
        />
      </div>

    </li>
  );
}

// ─── Add Item Inline Form ─────────────────────────────────────────────────────

function AddItemForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function submit() {
    const l = label.trim();
    if (!l) return;
    onAdd(l);
    setLabel("");
    setOpen(false);
  }

  if (!open) return (
    <button
      onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 0); }}
      className="mt-3 text-xs text-gray-400 hover:text-lions-blue transition-colors flex items-center gap-1"
    >
      <span className="text-base leading-none font-light">+</span> Punkt hinzufügen
    </button>
  );

  return (
    <div className="mt-3 flex gap-2">
      <input
        ref={ref}
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setOpen(false); setLabel(""); }
        }}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-lions-blue"
        placeholder="Bezeichnung des neuen Punktes"
      />
      <button
        onClick={submit}
        className="text-xs bg-lions-blue text-white px-3 py-1 rounded hover:bg-blue-900 transition-colors"
      >
        Hinzufügen
      </button>
      <button
        onClick={() => { setOpen(false); setLabel(""); }}
        className="text-xs text-gray-400 hover:text-gray-600 px-1"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Add Section Form ─────────────────────────────────────────────────────────

function AddSectionForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function submit() {
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle("");
    setOpen(false);
  }

  if (!open) return (
    <button
      onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 0); }}
      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-400 hover:text-lions-blue hover:border-lions-blue/30 transition-colors"
    >
      <span className="text-lg leading-none font-light">+</span> Neue Gruppe hinzufügen
    </button>
  );

  return (
    <div className="flex gap-2 border-2 border-dashed border-lions-blue/30 rounded-lg p-3">
      <input
        ref={ref}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setOpen(false); setTitle(""); }
        }}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-lions-blue"
        placeholder="Titel der neuen Gruppe"
      />
      <button
        onClick={submit}
        className="text-xs bg-lions-blue text-white px-3 py-1 rounded hover:bg-blue-900 transition-colors"
      >
        Hinzufügen
      </button>
      <button
        onClick={() => { setOpen(false); setTitle(""); }}
        className="text-xs text-gray-400 hover:text-gray-600 px-1"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ChecklisteEditorProps {
  storageKey: string;
  initialSections: CheckSection[];
  title: string;
  subtitle?: string;
  editableTitle?: boolean;
  highlightFirstSection?: boolean;
  extraFooter?: React.ReactNode;
}

export function ChecklisteEditor({
  storageKey,
  initialSections,
  title: initialTitle,
  subtitle,
  editableTitle,
  highlightFirstSection,
  extraFooter,
}: ChecklisteEditorProps) {
  const [sections, setSections] = useState<CheckSection[]>(initialSections);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (stored.sections?.length) setSections(stored.sections);
    if (stored.checked) setChecked(stored.checked);
    if (stored.details) setDetails(stored.details);
    if (stored.title) setTitle(stored.title);
  }, [storageKey]);

  function persist(
    secs: CheckSection[],
    chk: Record<string, boolean>,
    dets: Record<string, Detail>,
    ttl: string,
  ) {
    localStorage.setItem(storageKey, JSON.stringify({ sections: secs, checked: chk, details: dets, title: ttl }));
  }

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    persist(sections, next, details, title);
  }

  function updateDetail(id: string, d: Detail) {
    const next = { ...details, [id]: d };
    setDetails(next);
    persist(sections, checked, next, title);
  }

  function addItem(sectionId: string, label: string) {
    const next = sections.map(s =>
      s.id === sectionId ? { ...s, items: [...s.items, { id: uid(), label }] } : s
    );
    setSections(next);
    persist(next, checked, details, title);
  }

  function deleteItem(sectionId: string, itemId: string) {
    const next = sections.map(s =>
      s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
    );
    setSections(next);
    persist(next, checked, details, title);
  }

  function addSection(sectionTitle: string) {
    const next = [...sections, { id: uid(), title: sectionTitle, items: [] }];
    setSections(next);
    persist(next, checked, details, title);
  }

  function updateSection(sectionId: string, fields: { verantwortlich?: string; termin?: string }) {
    const next = sections.map(s => s.id === sectionId ? { ...s, ...fields } : s);
    setSections(next);
    persist(next, checked, details, title);
  }

  function deleteSection(sectionId: string) {
    if (!confirm("Gruppe und alle enthaltenen Punkte entfernen?")) return;
    const next = sections.filter(s => s.id !== sectionId);
    setSections(next);
    persist(next, checked, details, title);
  }

  function saveTitle(t: string) {
    setTitle(t);
    persist(sections, checked, details, t);
  }

  function handlePrint() {
    const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const allItemsFlat = sections.flatMap(s => s.items);
    const totalDone = allItemsFlat.filter(i => checked[i.id]).length;

    // Bald fällig — gleiche Logik wie im Panel
    const fällig = [
      ...sections.flatMap(section =>
        section.items
          .filter(item => !checked[item.id] && details[item.id]?.termin && urgency(details[item.id].termin) !== null)
          .map(item => ({
            label: item.label,
            gruppe: section.title,
            termin: new Date(details[item.id].termin + "T00:00").toLocaleDateString("de-DE"),
            u: urgency(details[item.id].termin)!,
            days: daysLeft(details[item.id].termin),
            isGruppe: false,
          }))
      ),
      ...sections
        .filter(s => s.termin && urgency(s.termin) !== null)
        .map(s => ({
          label: s.title,
          gruppe: "Gruppe",
          termin: new Date(s.termin! + "T00:00").toLocaleDateString("de-DE"),
          u: urgency(s.termin!)!,
          days: daysLeft(s.termin!),
          isGruppe: true,
        })),
    ].sort((a, b) => a.days - b.days);

    const urgencyColor = (u: Urgency) =>
      u === "overdue" ? "#c0392b" : u === "soon" ? "#d35400" : "#b7770d";

    const fälligHtml = fällig.length === 0 ? "" : `
      <div class="faellig">
        <div class="faellig-head">⚠️ Bald fällig — nächste 14 Tage</div>
        <table class="faellig-table">
          <thead><tr>
            <th>Aufgabe</th>
            <th>Gruppe</th>
            <th>Termin</th>
            <th>Fälligkeit</th>
          </tr></thead>
          <tbody>
            ${fällig.map(f => `<tr>
              <td style="color:${urgencyColor(f.u)};font-weight:600">${f.isGruppe ? "📁 " : ""}${f.label}</td>
              <td>${f.isGruppe ? "—" : f.gruppe}</td>
              <td style="color:${urgencyColor(f.u)}">${f.termin}</td>
              <td style="color:${urgencyColor(f.u)};font-weight:600">${
                f.days < 0 ? `${Math.abs(f.days)} T. überfällig` :
                f.days === 0 ? "Heute!" : `in ${f.days} ${f.days === 1 ? "Tag" : "Tagen"}`
              }</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;

    const sectionsHtml = sections.map((section, si) => {
      const sectionDone = section.items.filter(i => checked[i.id]).length;
      const sectionTermin = section.termin
        ? new Date(section.termin + "T00:00").toLocaleDateString("de-DE")
        : "";
      const secU = section.termin ? urgency(section.termin) : null;

      const rows = section.items.map(item => {
        const d = details[item.id] ?? { verantwortlich: "", termin: "", bemerkung: "" };
        const itemTermin = d.termin ? new Date(d.termin + "T00:00").toLocaleDateString("de-DE") : "";
        const itemU = d.termin ? urgency(d.termin) : null;
        const bemerkung = d.bemerkung || item.note || "";
        const done = !!checked[item.id];
        return `<tr class="${done ? "done" : ""}">
          <td class="col-check">${done ? "✓" : ""}</td>
          <td class="col-label">${item.label}</td>
          <td class="col-verantw">${d.verantwortlich}</td>
          <td class="col-termin" ${itemU && !done ? `style="color:${urgencyColor(itemU)};font-weight:600"` : ""}>${itemTermin}${itemU && !done ? ` <span style="font-size:7.5pt">(${daysLeft(d.termin) < 0 ? Math.abs(daysLeft(d.termin)) + "T!" : daysLeft(d.termin) + "T"})</span>` : ""}</td>
          <td class="col-bem">${bemerkung}</td>
        </tr>`;
      }).join("");

      return `<div class="section">
        <div class="sec-head">
          <span class="sec-nr">${si + 1}.</span>
          <span class="sec-title">${section.title}</span>
          <span class="sec-meta">${section.verantwortlich ? "👤 " + section.verantwortlich : ""}${section.verantwortlich && sectionTermin ? "&nbsp;&nbsp;" : ""}${sectionTermin ? `<span style="${secU ? `color:${urgencyColor(secU)};font-weight:600` : ""}">📅 ${sectionTermin}</span>` : ""}</span>
          <span class="sec-prog">${sectionDone}/${section.items.length}</span>
        </div>
        <table>
          <thead><tr>
            <th class="col-check">✓</th>
            <th class="col-label">Aufgabe</th>
            <th class="col-verantw">Verantwortlich</th>
            <th class="col-termin">Termin</th>
            <th class="col-bem">Bemerkung</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,Arial,sans-serif;font-size:10pt;color:#111;padding:16mm 14mm}
  h1{font-size:16pt;color:#003087;margin-bottom:3pt}
  .meta{font-size:8.5pt;color:#666;margin-bottom:14pt}
  .faellig{background:#fffbeb;border:1pt solid #f59e0b;border-left:3pt solid #d97706;padding:8pt 10pt;margin-bottom:14pt;page-break-inside:avoid}
  .faellig-head{font-size:9pt;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6pt}
  .faellig-table{width:100%;border-collapse:collapse}
  .faellig-table th{font-size:8pt;font-weight:600;text-align:left;padding:3pt 6pt;border-bottom:1pt solid #fcd34d;color:#78350f}
  .faellig-table td{font-size:9pt;padding:3.5pt 6pt;border-bottom:.5pt solid #fef3c7;vertical-align:top}
  .section{margin-bottom:14pt;page-break-inside:avoid}
  .sec-head{display:flex;align-items:baseline;gap:6pt;background:#eef2fb;padding:5pt 8pt;border-left:3pt solid #003087;margin-bottom:3pt}
  .sec-nr{font-weight:700;color:#003087;flex-shrink:0}
  .sec-title{font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex:1}
  .sec-meta{font-size:8pt;color:#444}
  .sec-prog{font-size:8pt;color:#666;margin-left:auto;flex-shrink:0}
  table{width:100%;border-collapse:collapse}
  th{background:#f6f6f6;font-size:8pt;font-weight:600;text-align:left;padding:3.5pt 6pt;border-bottom:1pt solid #ccc}
  td{padding:4pt 6pt;border-bottom:.5pt solid #e8e8e8;font-size:9pt;vertical-align:top}
  .col-check{width:14pt;text-align:center}
  .col-label{width:34%}
  .col-verantw{width:17%}
  .col-termin{width:14%}
  .col-bem{width:31%;color:#555;font-size:8.5pt}
  td.col-check{font-size:11pt;color:#27ae60;text-align:center}
  tr.done td{color:#999}
  tr.done td.col-check{color:#27ae60}
  tr:nth-child(even) td{background:#fafafa}
  @media print{body{padding:10mm}}
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Stand: ${today}&nbsp;&nbsp;·&nbsp;&nbsp;Fortschritt: ${totalDone} / ${allItemsFlat.length} erledigt</p>
${fälligHtml}
${sectionsHtml}
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  const allItems = sections.flatMap(s => s.items);
  const doneCount = allItems.filter(i => checked[i.id]).length;
  const totalCount = allItems.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const openFirst = highlightFirstSection ? sections[0]?.items.filter(i => !checked[i.id]) ?? [] : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Titel */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { setEditingTitle(false); saveTitle(title); }}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditingTitle(false);
                saveTitle(title);
              }
            }}
            className="text-2xl font-bold text-lions-blue border-b-2 border-lions-blue focus:outline-none w-full bg-transparent"
          />
        ) : (
          <h1
            className={`text-2xl font-bold text-lions-blue inline-flex items-center gap-2 ${
              editableTitle ? "cursor-pointer group/title" : ""
            }`}
            onClick={() => editableTitle && setEditingTitle(true)}
          >
            {title}
            {editableTitle && (
              <span className="text-sm font-normal text-gray-300 group-hover/title:text-gray-500 transition-colors">✏️</span>
            )}
          </h1>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {subtitle ?? "Fortschritt wird lokal gespeichert"}
        </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-gray-500 hover:text-lions-blue border border-gray-200 hover:border-lions-blue/40 rounded-md px-3 py-1.5 transition-colors mt-1"
          title="Drucken / PDF exportieren"
        >
          🖨️ Drucken
        </button>
      </div>

      {/* Fortschritt */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Fortschritt</span>
          <span className="text-sm font-bold text-gray-900">{doneCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress === 100 ? "#27ae60" : progress > 50 ? "#f59e0b" : "#003087",
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{progress}% abgeschlossen</p>
      </div>

      {/* Offene Entscheidungen (nur Going Live) */}
      {openFirst.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-3">
            Noch offen — braucht eine Entscheidung
          </h2>
          <ul className="space-y-2">
            {openFirst.map(item => (
              <li key={item.id} className="flex items-start gap-3">
                <button
                  onClick={() => toggle(item.id)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-red-400 flex-shrink-0 hover:bg-red-100 transition-colors"
                />
                <div>
                  <span className="text-sm font-medium text-red-800">{item.label}</span>
                  {item.note && <p className="text-xs text-red-600 mt-0.5">{item.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sektionen */}
      {/* Bald fällig Panel */}
      {(() => {
        const fällig = [
          ...sections.flatMap(section =>
            section.items
              .filter(item => !checked[item.id] && details[item.id]?.termin && urgency(details[item.id].termin) !== null)
              .map(item => ({
                label: item.label,
                gruppe: section.title,
                termin: details[item.id].termin,
                u: urgency(details[item.id].termin)!,
                days: daysLeft(details[item.id].termin),
                isGruppe: false,
              }))
          ),
          ...sections
            .filter(s => s.termin && urgency(s.termin) !== null)
            .map(s => ({
              label: s.title,
              gruppe: "Gruppe",
              termin: s.termin!,
              u: urgency(s.termin!)!,
              days: daysLeft(s.termin!),
              isGruppe: true,
            })),
        ].sort((a, b) => a.days - b.days);

        if (fällig.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">
              ⚠️ Bald fällig — nächste 14 Tage
            </h2>
            <ul className="space-y-2">
              {fällig.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`text-sm font-medium ${
                      f.u === "overdue" ? "text-red-700" :
                      f.u === "soon" ? "text-orange-700" : "text-amber-700"
                    }`}>
                      {f.isGruppe ? "📁 " : ""}{f.label}
                    </span>
                    {!f.isGruppe && (
                      <span className="text-xs text-gray-400 ml-2 truncate">· {f.gruppe}</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${urgencyTerminCls(f.u)}`}>
                    {f.days < 0
                      ? `${Math.abs(f.days)} T. überfällig`
                      : f.days === 0 ? "Heute!"
                      : `in ${f.days} ${f.days === 1 ? "Tag" : "Tagen"}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {sections.map((section, si) => {
        const sectionDone = section.items.filter(i => checked[i.id]).length;
        const allDone = section.items.length > 0 && sectionDone === section.items.length;
        const secUrgency = section.termin ? urgency(section.termin) : null;

        return (
          <div
            key={section.id}
            className={`bg-white rounded-lg shadow-sm border p-5 ${
              allDone ? "border-green-200 bg-green-50" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wide flex-1 min-w-0 ${
                allDone ? "text-green-700" : "text-gray-700"
              }`}>
                <span className="text-gray-400 mr-2">{si + 1}.</span>
                {section.title}
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-gray-300 text-xs select-none">👤</span>
                  <input
                    type="text"
                    value={section.verantwortlich ?? ""}
                    onChange={e => updateSection(section.id, { verantwortlich: e.target.value })}
                    className={`${INPUT_CLS} w-24`}
                    placeholder="Verantwortlich"
                  />
                </div>
                <div className={`flex items-center gap-1 ${urgencyBgCls(secUrgency)}`}>
                  <span className={`text-xs select-none ${secUrgency ? urgencyTerminCls(secUrgency) : "text-gray-300"}`}>📅</span>
                  <input
                    type="date"
                    value={section.termin ?? ""}
                    onChange={e => updateSection(section.id, { termin: e.target.value })}
                    className={`${INPUT_CLS} w-32 ${urgencyTerminCls(secUrgency)}`}
                  />
                  {secUrgency && (
                    <span className={`text-xs font-semibold flex-shrink-0 ${urgencyTerminCls(secUrgency)}`}>
                      {urgencyLabel(section.termin!)}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  allDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {sectionDone}/{section.items.length}
                </span>
                <button
                  onClick={() => deleteSection(section.id)}
                  title="Gruppe entfernen"
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {section.items.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {section.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isChecked={!!checked[item.id]}
                    detail={details[item.id] ?? EMPTY_DETAIL}
                    onToggle={() => toggle(item.id)}
                    onDetailChange={d => updateDetail(item.id, d)}
                    onDelete={() => deleteItem(section.id, item.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-300 italic">Noch keine Punkte — unten hinzufügen</p>
            )}

            <AddItemForm onAdd={label => addItem(section.id, label)} />
          </div>
        );
      })}

      <AddSectionForm onAdd={addSection} />

      {extraFooter}

      {progress === 100 && totalCount > 0 && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-green-800 font-semibold">Alle Punkte abgehakt!</p>
        </div>
      )}
    </div>
  );
}
