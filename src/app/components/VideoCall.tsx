import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MeetingRoom } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

// Free public STUN servers — no TURN needed for same-network calls
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

interface VideoCallProps {
  userId: string;
  role: 'teacher' | 'student';
}

type CallPhase = 'connecting' | 'calling' | 'active' | 'ended' | 'declined' | 'error';

export function VideoCall({ userId, role }: VideoCallProps) {
  const { roomToken } = useParams<{ roomToken: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [connectionState, setConnectionState] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const sentIceCandidatesRef = useRef<Set<string>>(new Set());
  const callStartTimeRef = useRef<number | null>(null);

  const isTeacher = role === 'teacher';

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const stopElapsed = useCallback(() => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const startElapsed = useCallback(() => {
    callStartTimeRef.current = Date.now();
    elapsedRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cleanup = useCallback(() => {
    stopPolling();
    stopElapsed();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [stopPolling, stopElapsed]);

  const endCall = useCallback(
    async (reason: CallPhase = 'ended') => {
      cleanup();
      setPhase(reason);

      if (roomToken) {
        try {
          await apiClient.updateMeetingStatus(roomToken, 'ended');
        } catch (_e) {
          // Best-effort
        }
      }
    },
    [cleanup, roomToken],
  );

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (!event.candidate || !roomToken) return;

      const candidateJson = event.candidate.toJSON() as Record<string, unknown>;
      const key = JSON.stringify(candidateJson);
      if (sentIceCandidatesRef.current.has(key)) return;
      sentIceCandidatesRef.current.add(key);

      try {
        await apiClient.sendMeetingSignal(roomToken, { addIceCandidate: candidateJson });
      } catch (_e) {
        // Candidate send failed — non-fatal
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);

      if (state === 'connected') {
        setPhase('active');
        if (!callStartTimeRef.current) startElapsed();
      } else if (state === 'failed' || state === 'disconnected') {
        if (mountedRef.current) {
          toast.error('Connection lost.');
          endCall('error');
        }
      }
    };

    return pc;
  }, [roomToken, startElapsed, endCall]);

  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }, []);

  // Teacher: create offer after getting local stream
  const startAsTeacher = useCallback(async () => {
    if (!roomToken) return;

    try {
      const stream = await getLocalStream();
      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await apiClient.sendMeetingSignal(roomToken, {
        offer: offer as unknown as Record<string, unknown>,
      });

      setPhase('calling');
    } catch (err) {
      toast.error('Could not access camera/microphone.');
      setPhase('error');
    }
  }, [roomToken, getLocalStream, createPeerConnection]);

  // Student: wait for offer, send answer
  const startAsStudent = useCallback(async (roomData: MeetingRoom) => {
    if (!roomToken || !roomData.offer) return;

    try {
      const stream = await getLocalStream();
      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer as RTCSessionDescriptionInit));

      // Add any teacher ICE candidates already received
      for (const candidate of roomData.teacherIceCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
        } catch (_e) {
          // Non-fatal
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await apiClient.sendMeetingSignal(roomToken, {
        answer: answer as unknown as Record<string, unknown>,
      });

      setPhase('active');
      if (!callStartTimeRef.current) startElapsed();
    } catch (err) {
      toast.error('Could not access camera/microphone.');
      setPhase('error');
    }
  }, [roomToken, getLocalStream, createPeerConnection, startElapsed]);

  // Polling: both sides check for new signals
  const pollSignals = useCallback(async () => {
    if (!roomToken || !mountedRef.current) return;

    try {
      const latestRoom = await apiClient.getMeeting(roomToken);
      if (!mountedRef.current) return;

      setRoom(latestRoom);

      if (latestRoom.status === 'ended' || latestRoom.status === 'declined') {
        stopPolling();
        cleanup();
        setPhase(latestRoom.status === 'declined' ? 'declined' : 'ended');
        return;
      }

      const pc = pcRef.current;
      if (!pc) return;

      // Teacher: watch for answer + student ICE candidates
      if (isTeacher) {
        if (latestRoom.answer && pc.remoteDescription === null) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(latestRoom.answer as RTCSessionDescriptionInit));
          } catch (_e) {
            // Already set
          }
        }

        for (const candidate of latestRoom.studentIceCandidates) {
          const key = JSON.stringify(candidate);
          if (!sentIceCandidatesRef.current.has(`remote-${key}`)) {
            sentIceCandidatesRef.current.add(`remote-${key}`);
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
            } catch (_e) {
              // Non-fatal
            }
          }
        }
      } else {
        // Student: watch for teacher ICE candidates
        for (const candidate of latestRoom.teacherIceCandidates) {
          const key = JSON.stringify(candidate);
          if (!sentIceCandidatesRef.current.has(`remote-${key}`)) {
            sentIceCandidatesRef.current.add(`remote-${key}`);
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
              } catch (_e) {
                // Non-fatal
              }
            }
          }
        }
      }
    } catch (_e) {
      // Polling failed — retry next cycle
    }
  }, [roomToken, isTeacher, stopPolling, cleanup]);

  // Init
  useEffect(() => {
    mountedRef.current = true;

    if (!roomToken) {
      setPhase('error');
      return;
    }

    (async () => {
      try {
        const roomData = await apiClient.getMeeting(roomToken);
        if (!mountedRef.current) return;

        setRoom(roomData);

        if (roomData.status === 'ended' || roomData.status === 'declined') {
          setPhase(roomData.status);
          return;
        }

        if (isTeacher) {
          await startAsTeacher();
        } else {
          // Student: wait for offer before joining
          if (roomData.offer) {
            await startAsStudent(roomData);
          } else {
            setPhase('calling');
          }
        }

        // Start polling for signals
        pollingRef.current = setInterval(pollSignals, 2500);
      } catch (_err) {
        if (mountedRef.current) {
          toast.error('Failed to connect to the meeting room.');
          setPhase('error');
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken]);

  // Student: once offer arrives via polling, start WebRTC
  useEffect(() => {
    if (!isTeacher && phase === 'calling' && room?.offer && !pcRef.current) {
      startAsStudent(room);
    }
  }, [isTeacher, phase, room, startAsStudent]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOn((prev) => !prev);
  };

  const handleEndCall = () => {
    endCall('ended');
  };

  const goBack = () => navigate(-1);

  const otherName = isTeacher
    ? room?.studentName || 'Student'
    : room?.teacherName || 'Teacher';

  const scheduleTitle = room?.scheduleTitle;

  if (phase === 'ended' || phase === 'declined' || phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md mx-4">
          <div className="text-6xl mb-4">
            {phase === 'declined' ? '📵' : phase === 'error' ? '⚠️' : '📞'}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {phase === 'declined'
              ? 'Call Declined'
              : phase === 'error'
                ? 'Connection Error'
                : 'Call Ended'}
          </h2>
          <p className="text-gray-500 mb-2">
            {phase === 'active' || phase === 'ended'
              ? `Duration: ${formatDuration(elapsedSeconds)}`
              : phase === 'declined'
                ? 'The other party declined the call.'
                : 'Something went wrong with the connection.'}
          </p>
          {scheduleTitle && (
            <p className="text-sm text-gray-400 mb-6">{scheduleTitle}</p>
          )}
          <button
            onClick={goBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Back to Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <div>
          <h1 className="text-white font-bold text-lg">{otherName}</h1>
          {scheduleTitle && (
            <p className="text-gray-400 text-sm">{scheduleTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phase === 'active' && (
            <span className="text-green-400 font-mono text-sm">
              {formatDuration(elapsedSeconds)}
            </span>
          )}
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              phase === 'active'
                ? 'bg-green-700 text-green-200'
                : phase === 'calling'
                  ? 'bg-yellow-700 text-yellow-200'
                  : 'bg-gray-700 text-gray-300'
            }`}
          >
            {phase === 'active'
              ? 'Connected'
              : phase === 'calling'
                ? isTeacher
                  ? 'Waiting for student…'
                  : 'Connecting…'
                : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            phase === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Waiting overlay */}
        {phase !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-5xl animate-pulse">
              {isTeacher ? '👨‍🏫' : '👩‍🎓'}
            </div>
            <p className="text-white font-semibold text-lg">
              {isTeacher
                ? `Calling ${otherName}…`
                : `${otherName} is calling…`}
            </p>
            <p className="text-gray-400 text-sm">Waiting for connection</p>
            <div className="flex gap-2 mt-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-2xl">📷</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-6 bg-gray-800">
        <button
          onClick={toggleMic}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
            isMicOn
              ? 'bg-gray-600 hover:bg-gray-500 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isMicOn ? '🎙️' : '🔇'}
        </button>

        <button
          onClick={handleEndCall}
          title="End call"
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl flex items-center justify-center transition-all shadow-lg"
        >
          📵
        </button>

        <button
          onClick={toggleCamera}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
            isCameraOn
              ? 'bg-gray-600 hover:bg-gray-500 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isCameraOn ? '📹' : '🚫'}
        </button>
      </div>
    </div>
  );
}
