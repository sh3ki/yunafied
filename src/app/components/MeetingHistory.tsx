import { useEffect, useState } from "react";
import { Search, Video } from "lucide-react";
import { apiClient } from "@/app/services/apiClient";
import type { CallHistoryItem } from "@/app/types/models";
import { PrintButton, TableFilter, TablePagination, TableSearch, printTableReport, DEFAULT_TABLE_PAGE_SIZE } from "./ui/table-tools";

export function MeetingHistory() {
  const [rooms, setRooms] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    apiClient
      .listMeetingHistory()
      .then(setRooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (
      r.teacherName.toLowerCase().includes(q) ||
      (r.studentName || "").toLowerCase().includes(q) ||
      r.roomToken.toLowerCase().includes(q)
    );
    const date = r.startedAt?.slice(0, 10) || "";
    return matchesSearch && (!teacherFilter || r.teacherName === teacherFilter) && (!studentFilter || (r.studentName || "") === studentFilter) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  });
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const printMeetings = () => printTableReport({ title: 'Meeting History', subtitle: `Filters: ${teacherFilter || 'All teachers'} · ${studentFilter || 'All students'} · ${dateFrom || 'Any date'} to ${dateTo || 'Any date'} · ${search || 'No search'}`, columns: ['Room Token', 'Teacher', 'Student', 'Started At', 'Ended At', 'Duration'], rows: filtered.map((room) => [room.roomToken, room.teacherName, room.studentName || '—', room.startedAt ? new Date(room.startedAt).toLocaleString() : '—', room.endedAt ? new Date(room.endedAt).toLocaleString() : '—', room.durationSeconds != null ? `${Math.floor(room.durationSeconds / 60)}m ${room.durationSeconds % 60}s` : '—']) });
  useEffect(() => { setPage(1); }, [search, teacherFilter, studentFilter, dateFrom, dateTo]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting History</h1>
          <p className="text-sm text-gray-500 mt-1">{rooms.length} total rooms recorded</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50">
          <Video className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-2 items-center">
        <TableSearch value={search} onChange={setSearch} placeholder="Search teacher, student or room..." />
        <TableFilter label="Teachers" value={teacherFilter} options={rooms.map((room) => room.teacherName)} onChange={setTeacherFilter} />
        <TableFilter label="Students" value={studentFilter} options={rooms.map((room) => room.studentName || '')} onChange={setStudentFilter} />
        <input aria-label="Date from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input aria-label="Date to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <PrintButton onClick={printMeetings} />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Room Token", "Teacher", "Student", "Started At", "Ended At", "Duration"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No meeting rooms found.
                  </td>
                </tr>
              ) : (
                paginated.map((room) => {
                  const durationLabel = room.durationSeconds != null
                    ? `${Math.floor(room.durationSeconds / 60)}m ${room.durationSeconds % 60}s`
                    : "—";
                  return (
                    <tr key={room.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{room.roomToken.slice(0, 12)}…</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{room.teacherName}</td>
                      <td className="px-4 py-3 text-gray-600">{room.studentName || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(room.startedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {room.endedAt ? new Date(room.endedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{durationLabel}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </div>
    </div>
  );
}
