import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

export const DEFAULT_TABLE_PAGE_SIZE = 10;

export function TablePagination({ page, pageSize = DEFAULT_TABLE_PAGE_SIZE, total, onPageChange, onPageSizeChange }: {
  page: number; pageSize?: number; total: number; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
    <span>Showing {from}–{to} of {total}</span>
    <div className="flex items-center gap-2">
      {onPageSizeChange && <label className="flex items-center gap-2">Rows <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>}
      <button aria-label="Previous page" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} className="rounded-lg border border-gray-200 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      <span>Page {safePage} of {pages}</span>
      <button aria-label="Next page" disabled={safePage >= pages} onClick={() => onPageChange(safePage + 1)} className="rounded-lg border border-gray-200 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
    </div>
  </div>;
}

export function TableSearch({ value, onChange, placeholder = "Search records..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>;
}

export function TableFilter({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void }) {
  const uniqueOptions = useMemo(() => { const seen = new Set<string>(); return options.filter(Boolean).map((option) => typeof option === 'string' ? { value: option, label: option } : option).filter((option) => !seen.has(option.value) && seen.add(option.value)).sort((a, b) => a.label.localeCompare(b.label)); }, [options]);
  return <label className="flex items-center gap-2 text-sm text-gray-600"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">All {label.toLowerCase()}</option>{uniqueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function PrintButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" />Print</button>;
}

export function printTableReport({ title, subtitle, columns, rows }: { title: string; subtitle?: string; columns: string[]; rows: Array<Array<unknown>> }) {
  const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
  const generatedAt = new Date().toLocaleString();
  const table = `<table><thead><tr>${columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const report = `<html><head><title>${escape(title)}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#172033}h1{font-size:22px;margin:0 0 5px}p{font-size:11px;color:#536074;margin:3px 0 16px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#eef2f7;text-align:left;font-weight:700}th,td{border:1px solid #d8dee8;padding:7px;vertical-align:top}tr{break-inside:avoid}</style></head><body><h1>${escape(title)}</h1><p>${escape(subtitle || "")}<br>Generated: ${escape(generatedAt)}<br>Records: ${rows.length}</p>${table}</body></html>`;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!popup) return;
  popup.document.write(report); popup.document.close(); popup.focus();
  setTimeout(() => { popup.print(); popup.close(); }, 250);
}
