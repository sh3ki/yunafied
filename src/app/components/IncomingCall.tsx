import React, { useEffect, useState } from 'react';
import { PhoneOff, Video, User } from 'lucide-react';
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

  // Ring tone via Web Audio API
  useEffect(() => {
    let stopped = false;
    let ctx: AudioContext | null = null;

    try {
      ctx = new AudioContext();

      const ring = () => {
        if (stopped || !ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      };

      ring();
      const interval = setInterval(ring, 1500);

      return () => {
        stopped = true;
        clearInterval(interval);
        ctx?.close().catch(() => undefined);
      };
    } catch {
      // AudioContext unavailable
    }
  }, []);

  const handleAccept = () => onAccept(call.roomToken);

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      await apiClient.updateMeetingStatus(call.roomToken, 'declined');
      onDecline(call.roomToken);
    } catch {
      toast.error('Failed to decline call.');
      setDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center px-8 py-10 text-center">
          {/* Pulsing avatar */}
          <div className="relative flex items-center justify-center mb-6">
            <span className="absolute w-24 h-24 rounded-full bg-indigo-500/30 animate-ping" />
            <span className="absolute w-20 h-20 rounded-full bg-indigo-500/20 animate-ping [animation-delay:350ms]" />
            <div className="relative z-10 w-18 h-18 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-700/40">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">Incoming Video Call</p>
          <h2 className="text-xl font-bold text-white mb-1">{call.teacherName}</h2>
          {call.scheduleTitle && (
            <p className="text-sm text-slate-400 mb-6">{call.scheduleTitle}</p>
          )}
          {!call.scheduleTitle && <div className="mb-6" />}

          {/* Action buttons */}
          <div className="flex items-center gap-6">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDecline}
                disabled={declining}
                className="w-14 h-14 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 flex items-center justify-center transition-all disabled:opacity-40"
                title="Decline"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <span className="text-xs text-slate-400">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-700/40"
                title="Accept"
              >
                <Video className="h-6 w-6" />
              </button>
              <span className="text-xs text-slate-400">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

