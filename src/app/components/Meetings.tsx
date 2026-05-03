import React, { useState } from 'react';
import { Video, Clock, User, Calendar, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleItem } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

interface MeetingsProps {
  schedules: ScheduleItem[];
  userId: string;
  onStartMeeting: (roomToken: string) => void;
}

export function Meetings({ schedules, userId, onStartMeeting }: MeetingsProps) {
  const [startingId, setStartingId] = useState<string | null>(null);

  // Only accepted schedules where this teacher is the teacher
  const acceptedSchedules = schedules.filter(
    (s) => s.status === 'accepted' && s.teacherId === userId,
  );

  const startMeeting = async (item: ScheduleItem) => {
    if (startingId) return;
    setStartingId(item.id);
    try {
      const meeting = await apiClient.createMeeting({
        scheduleId: item.id,
        studentId: item.studentId,
        studentName: item.studentName,
        scheduleTitle: item.title,
      });
      onStartMeeting(meeting.roomToken);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start meeting.');
      setStartingId(null);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const d = new Date(`${date}T${time}`);
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return `${date} ${time}`;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <Video className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Meetings</h1>
          <p className="text-sm text-gray-500">Start a video call with your students from your accepted schedules</p>
        </div>
      </div>

      {/* How it works callout */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Click <strong>Start Video Call</strong> on any accepted schedule below</li>
          <li>A meeting room is created and the student gets a ringing notification</li>
          <li>Once the student accepts, you're connected via live video</li>
        </ol>
      </div>

      {/* Schedule list */}
      {acceptedSchedules.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">No accepted schedules</p>
          <p className="text-sm mt-1">Once a student's schedule request is accepted, it will appear here so you can start a video call.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {acceptedSchedules.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-emerald-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateTime(item.date, item.startTime)}
                  </span>
                  {item.studentName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {item.studentName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {item.startTime} – {item.endTime}
                  </span>
                </div>
              </div>

              <button
                onClick={() => startMeeting(item)}
                disabled={startingId === item.id}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap shrink-0"
              >
                <Video className="h-4 w-4" />
                {startingId === item.id ? 'Starting…' : 'Start Video Call'}
                {startingId !== item.id && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
