import { useEffect, useState } from "react";
import { Search, Video } from "lucide-react";
import { apiClient } from "@/app/services/apiClient";
import type { CallHistoryItem } from "@/app/types/models";

export function MeetingHistory() {
  const [rooms, setRooms] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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
    if (!q) return true;
    return (
      r.teacherName.toLowerCase().includes(q) ||
      (r.studentName || "").toLowerCase().includes(q) ||
      r.roomToken.toLowerCase().includes(q)
    );
  });

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by teacher, student or room token…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
                filtered.map((room) => {
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
      </div>
    </div>
  );
}
