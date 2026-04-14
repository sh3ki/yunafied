import React, { useState } from 'react';
import { Plus, Trash2, Clock, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface ScheduleItem {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  teacherId: string;
}

interface ScheduleProps {
  schedules: ScheduleItem[];
  role: string;
  userId: string;
  onAdd: (item: Omit<ScheduleItem, 'id' | 'teacherId' | 'teacherName' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export function Schedule({ schedules, role, userId, onAdd, onDelete }: ScheduleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ScheduleItem>>({ day: 'Monday', startTime: '09:00' });
  const [saving, setSaving] = useState(false);

  const canEdit = role === 'admin' || role === 'teacher';

  const handleAdd = async () => {
    if (!newItem.title || !newItem.startTime || !newItem.endTime) {
      toast.error("Please fill all fields");
      return;
    }

    // Conflict Detection Logic
    const hasConflict = schedules.some(s => {
      if (s.day !== newItem.day) return false;
      const startA = parseInt(s.startTime.split(':')[0]);
      const endA = parseInt(s.endTime.split(':')[0]);
      const startB = parseInt((newItem.startTime || '').split(':')[0]);
      const endB = parseInt((newItem.endTime || '').split(':')[0]);
      
      return (startA < endB && endA > startB);
    });

    if (hasConflict) {
      // Show High-Fidelity Error Alert
      toast.custom((t) => (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-lg max-w-sm flex items-start gap-3">
          <div className="text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-red-800">Conflict Detected!</h4>
            <p className="text-sm text-red-700 mt-1">
              There is already a class scheduled at this time on {newItem.day}.
            </p>
          </div>
          <button onClick={() => toast.dismiss(t)} className="text-red-400 hover:text-red-600 ml-auto">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ), { duration: 5000 });
      return;
    }

    try {
      setSaving(true);
      await onAdd({
      title: newItem.title,
      day: newItem.day || 'Monday',
      startTime: newItem.startTime,
      endTime: newItem.endTime,
      } as Omit<ScheduleItem, 'id' | 'teacherId' | 'teacherName' | 'createdAt'>);
      setIsModalOpen(false);
      setNewItem({ day: 'Monday', startTime: '09:00' });
      toast.success("Class scheduled successfully");
    } catch (error: any) {
      toast.error(error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const getSchedulesForCell = (day: string, timePrefix: string) => {
    return schedules.filter(s => 
      s.day === day && s.startTime.startsWith(timePrefix.split(':')[0])
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Timetable</h2>
          <p className="text-sm text-gray-500">Visual schedule management</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Class
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="font-semibold text-gray-400 text-sm uppercase tracking-wider text-center pt-2">Time</div>
            {DAYS.map(day => (
              <div key={day} className="font-semibold text-gray-700 text-center bg-gray-50 py-2 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {TIMES.map(time => (
              <div key={time} className="grid grid-cols-6 gap-4">
                <div className="text-right text-sm text-gray-400 font-mono pt-4 -mt-2 pr-4">{time}</div>
                {DAYS.map(day => {
                  const items = getSchedulesForCell(day, time);
                  return (
                    <div key={`${day}-${time}`} className="relative min-h-[80px] border border-dashed border-gray-200 rounded-lg p-1 bg-gray-50/50 hover:bg-gray-50 transition">
                      {items.map(item => (
                        <div key={item.id} className="bg-white border-l-4 border-indigo-500 shadow-sm rounded p-2 mb-1 text-xs group relative animate-in fade-in zoom-in duration-300">
                          <div className="font-bold text-gray-800 truncate">{item.title}</div>
                          <div className="flex items-center gap-1 text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            {item.startTime} - {item.endTime}
                          </div>
                          {canEdit && (
                            <button 
                              onClick={async () => {
                                try {
                                  await onDelete(item.id);
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to delete schedule');
                                }
                              }}
                              className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">Add Schedule Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Title</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2"
                  value={newItem.title || ''}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  placeholder="e.g. English Literature"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select 
                    className="w-full border rounded-lg px-3 py-2"
                    value={newItem.day}
                    onChange={e => setNewItem({...newItem, day: e.target.value})}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                   {/* Simplify Time Selection for Prototype */}
                   <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                   <select 
                    className="w-full border rounded-lg px-3 py-2"
                    value={newItem.startTime}
                    onChange={e => setNewItem({...newItem, startTime: e.target.value})}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="time"
                  className="w-full border rounded-lg px-3 py-2"
                  value={newItem.endTime || ''}
                  onChange={e => setNewItem({...newItem, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                disabled={saving}
                onClick={handleAdd}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
