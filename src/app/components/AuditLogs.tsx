import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { apiClient } from "@/app/services/apiClient";
import type { AuditLogItem } from "@/app/types/models";
import { PrintButton, TableFilter, TablePagination, TableSearch, printTableReport, DEFAULT_TABLE_PAGE_SIZE } from "./ui/table-tools";

const PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE;

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

  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (pg: number) => {
    setLoading(true);
    try {
      const result = await apiClient.listAuditLogs({
        action: filterAction || undefined,
        entityType: filterEntityType || undefined,
        search: filterSearch.trim() || undefined,
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
  }, [filterAction, filterEntityType, filterDateFrom, filterDateTo, filterSearch]);

  const printLogs = async () => {
    const allRows: AuditLogItem[] = [];
    let currentPage = 1;
    let totalPages = 1;
    do {
      const result = await apiClient.listAuditLogs({ action: filterAction || undefined, entityType: filterEntityType || undefined, search: filterSearch.trim() || undefined, dateFrom: filterDateFrom || undefined, dateTo: filterDateTo || undefined, page: currentPage, pageSize: 50 });
      allRows.push(...result.rows); totalPages = result.totalPages; currentPage += 1;
    } while (currentPage <= totalPages);
    await apiClient.recordAuditLogPrint({ action: filterAction, entityType: filterEntityType, search: filterSearch, dateFrom: filterDateFrom, dateTo: filterDateTo });
    printTableReport({ title: 'Audit Trail', subtitle: `Filters: ${filterAction || 'All actions'} · ${filterEntityType || 'All entity types'} · ${filterDateFrom || 'Any date'} to ${filterDateTo || 'Any date'} · ${filterSearch || 'No search'}`, columns: ['Actor', 'Role', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Date'], rows: allRows.map((log) => [log.actorName, log.actorRole, log.action, log.entityType, log.entityId || '—', log.ipAddress || '—', new Date(log.createdAt).toLocaleString()]) });
  };

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
          <TableFilter label="Actions" value={filterAction} options={rows.map((row) => row.action)} onChange={(value) => { setFilterAction(value); setPage(1); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
          <TableFilter label="Entity types" value={filterEntityType} options={rows.map((row) => row.entityType)} onChange={(value) => { setFilterEntityType(value); setPage(1); }} />
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
        <TableSearch value={filterSearch} onChange={setFilterSearch} placeholder="Search actor, action, entity..." />
        <PrintButton onClick={() => void printLogs()} />
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
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
        <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(nextPage) => void fetchLogs(nextPage)} />
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
