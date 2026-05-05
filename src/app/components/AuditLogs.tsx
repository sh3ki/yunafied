import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { apiClient } from "@/app/services/apiClient";
import type { AuditLogItem } from "@/app/types/models";

const PAGE_SIZE = 20;

export function AuditLogs() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (pg: number) => {
    setLoading(true);
    try {
      const result = await apiClient.listAuditLogs({
        action: filterAction || undefined,
        entityType: filterEntityType || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page: pg,
        pageSize: PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterEntityType, filterDateFrom, filterDateTo]);

  const handleSearch = () => {
    setAppliedSearch(filterSearch.trim().toLowerCase());
  };

  const displayedRows = appliedSearch
    ? rows.filter(
        (r) =>
          r.actorName.toLowerCase().includes(appliedSearch) ||
          r.action.toLowerCase().includes(appliedSearch) ||
          r.entityType.toLowerCase().includes(appliedSearch),
      )
    : rows;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} total log entries
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <input
            type="text"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            placeholder="e.g. CREATE_USER"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
          <input
            type="text"
            value={filterEntityType}
            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
            placeholder="e.g. user"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search actor, action, entity..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Actor", "Role", "Action", "Entity Type", "Entity ID", "IP Address", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                displayedRows.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{log.actorName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.actorRole === "admin"
                            ? "bg-red-100 text-red-700"
                            : log.actorRole === "teacher"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-[120px]">
                      {log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(log)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                        title="View payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} — {total} entries
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Log Detail</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  ["Actor", selected.actorName],
                  ["Role", selected.actorRole],
                  ["Action", selected.action],
                  ["Entity Type", selected.entityType],
                  ["Entity ID", selected.entityId || "—"],
                  ["IP Address", selected.ipAddress || "—"],
                  ["Date", new Date(selected.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <>
                    <dt key={`dt-${label}`} className="font-medium text-gray-500">{label}</dt>
                    <dd key={`dd-${label}`} className="text-gray-900 break-all">{value}</dd>
                  </>
                ))}
              </dl>
              {selected.payload && (
                <div>
                  <p className="font-medium text-gray-500 mb-1">Payload</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
