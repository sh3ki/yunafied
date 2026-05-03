import React, { useEffect, useRef, useState } from 'react';
import { MeetingRoom } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';
import { toast } from 'sonner';

interface IncomingCallProps {
  call: MeetingRoom;
  onAccept: (roomToken: string) => void;
  onDecline: (roomToken: string) => void;
}

export function IncomingCall({ call, onAccept, onDecline }: IncomingCallProps) {
  const [declining, setDeclining] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ring tone
  useEffect(() => {
    // Create a simple beep ring using Web Audio API
    try {
      const ctx = new AudioContext();
      let stopped = false;

      const ring = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      };

      ring();
      const interval = setInterval(ring, 1500);

      return () => {
        stopped = true;
        clearInterval(interval);
        ctx.close().catch(() => undefined);
      };
    } catch (_e) {
      // AudioContext not available
    }
  }, []);

  const handleAccept = () => {
    onAccept(call.roomToken);
  };

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      await apiClient.updateMeetingStatus(call.roomToken, 'declined');
      onDecline(call.roomToken);
    } catch (_e) {
      toast.error('Failed to decline call.');
      setDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm mx-4 animate-in zoom-in-95 duration-300">
        {/* Avatar pulse animation */}
        <div className="relative flex items-center justify-center mb-6">
          <span className="absolute inline-flex h-24 w-24 rounded-full bg-blue-400 opacity-30 animate-ping" />
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-blue-400 opacity-20 animate-ping [animation-delay:300ms]" />
          <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl shadow-lg">
            👨‍🏫
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">Incoming Video Call</h2>
        <p className="text-lg text-gray-700 font-semibold mb-1">{call.teacherName}</p>

        {call.scheduleTitle && (
          <p className="text-sm text-gray-500 mb-6">{call.scheduleTitle}</p>
        )}
        {!call.scheduleTitle && <div className="mb-6" />}

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleDecline}
            disabled={declining}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl flex items-center justify-center transition-all shadow-lg disabled:opacity-50"
            title="Decline"
          >
            📵
          </button>
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl flex items-center justify-center transition-all shadow-lg"
            title="Accept"
          >
            📹
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Tap <span className="text-green-600 font-semibold">Accept</span> to join the video call
        </p>
      </div>
    </div>
  );
}
