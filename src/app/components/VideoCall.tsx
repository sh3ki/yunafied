import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Mic, MicOff, Video, VideoOff, PhoneOff, CameraOff, AlertTriangle, Phone, Settings, X } from 'lucide-react';
import { MeetingRoom } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

// STUN (discovery) + free TURN relay servers for cross-network calls
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Free open-relay TURN — works across symmetric NAT (mobile ↔ web, different ISPs)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

interface VideoCallProps {
  userId: string;
  role: 'teacher' | 'student';
}

type CallPhase = 'connecting' | 'calling' | 'active' | 'ended' | 'declined' | 'error';

export function VideoCall({ userId, role }: VideoCallProps) {
  const { roomToken } = useParams<{ roomToken: string }>();

  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [connectionState, setConnectionState] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Device lists & selected IDs
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  // Track which device IDs the current stream uses
  const activeVideoIdRef = useRef<string>('');
  const activeAudioIdRef = useRef<string>('');

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
        // Boost outgoing video bitrate for sharper quality (2.5 Mbps max)
        pc.getSenders().forEach(async (sender) => {
          if (sender.track?.kind !== 'video') return;
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 2_500_000;
            params.encodings[0].maxFramerate = 30;
            await sender.setParameters(params);
          } catch (_e) {
            // Non-fatal — browser may not support setParameters
          }
        });
      } else if (state === 'failed' || state === 'disconnected') {
        if (mountedRef.current) {
          toast.error('Connection lost.');
          endCall('error');
        }
      }
    };

    return pc;
  }, [roomToken, startElapsed, endCall]);

  const getLocalStream = useCallback(async (videoDeviceId?: string, audioDeviceId?: string): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      },
      audio: {
        deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
      },
    });
    localStreamRef.current = stream;

    const vTrack = stream.getVideoTracks()[0];
    const aTrack = stream.getAudioTracks()[0];
    if (vTrack) activeVideoIdRef.current = vTrack.getSettings().deviceId ?? '';
    if (aTrack) activeAudioIdRef.current = aTrack.getSettings().deviceId ?? '';

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }, []);

  // Teacher: create offer after getting local stream
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vid = devices.filter((d) => d.kind === 'videoinput');
      const aud = devices.filter((d) => d.kind === 'audioinput');
      setVideoDevices(vid);
      setAudioDevices(aud);
      // Pre-select currently active devices
      if (!selectedVideoId && vid.length > 0) setSelectedVideoId(activeVideoIdRef.current || vid[0].deviceId);
      if (!selectedAudioId && aud.length > 0) setSelectedAudioId(activeAudioIdRef.current || aud[0].deviceId);
    } catch {
      // ignore
    }
  }, [selectedVideoId, selectedAudioId]);

  const startAsTeacher = useCallback(async () => {
    if (!roomToken) return;

    try {
      const stream = await getLocalStream(selectedVideoId || undefined, selectedAudioId || undefined);
      await loadDevices();
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
  }, [roomToken, getLocalStream, createPeerConnection, loadDevices, selectedVideoId, selectedAudioId]);

  // Student: wait for offer, send answer
  const startAsStudent = useCallback(async (roomData: MeetingRoom) => {
    if (!roomToken || !roomData.offer) return;

    try {
      const stream = await getLocalStream(selectedVideoId || undefined, selectedAudioId || undefined);
      await loadDevices();
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
  }, [roomToken, getLocalStream, createPeerConnection, startElapsed, loadDevices, selectedVideoId, selectedAudioId]);

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

  // Switch to a different camera device
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!pcRef.current || !localStreamRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          deviceId: activeAudioIdRef.current ? { exact: activeAudioIdRef.current } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      activeVideoIdRef.current = newVideoTrack.getSettings().deviceId ?? deviceId;

      // Replace track in peer connection
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newVideoTrack);

      // Stop old video tracks
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());

      // Splice new video track into local stream
      localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current!.removeTrack(t));
      localStreamRef.current.addTrack(newVideoTrack);

      // Keep audio from old stream running
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

      setSelectedVideoId(deviceId);
    } catch {
      toast.error('Failed to switch camera.');
    }
  }, []);

  // Switch to a different microphone device
  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (!pcRef.current || !localStreamRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      activeAudioIdRef.current = newAudioTrack.getSettings().deviceId ?? deviceId;

      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'audio');
      if (sender) await sender.replaceTrack(newAudioTrack);

      localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
      localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current!.removeTrack(t));
      localStreamRef.current.addTrack(newAudioTrack);

      setSelectedAudioId(deviceId);
    } catch {
      toast.error('Failed to switch microphone.');
    }
  }, []);

  const handleEndCall = () => {
    endCall('ended');
  };

  const goBack = () => window.close();

  const otherName = isTeacher
    ? room?.studentName || 'Student'
    : room?.teacherName || 'Teacher';

  const scheduleTitle = room?.scheduleTitle;
  const scheduleDescription = room?.scheduleDescription;

  if (phase === 'ended' || phase === 'declined' || phase === 'error') {
    const icon = phase === 'declined'
      ? <PhoneOff className="h-10 w-10 text-red-400" />
      : phase === 'error'
      ? <AlertTriangle className="h-10 w-10 text-yellow-400" />
      : <Phone className="h-10 w-10 text-slate-400" />;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.15),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.15),transparent_32%)]" />
        <div className="relative w-full max-w-sm mx-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {phase === 'declined' ? 'Call Declined' : phase === 'error' ? 'Connection Error' : 'Call Ended'}
          </h2>
          <p className="text-slate-300 mb-2">
            {phase === 'ended'
              ? `Duration: ${formatDuration(elapsedSeconds)}`
              : phase === 'declined'
                ? 'The other party declined the call.'
                : 'Something went wrong with the connection.'}
          </p>
          {scheduleTitle && (
            <div className="mb-6 text-center">
              <p className="text-white font-medium text-sm">{scheduleTitle}</p>
              {scheduleDescription && (
                <p className="text-slate-400 text-xs mt-1">{scheduleDescription}</p>
              )}
            </div>
          )}
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 backdrop-blur border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-base">{otherName}</h1>
          {scheduleTitle && (
            <p className="text-slate-300 text-xs font-medium mt-0.5">{scheduleTitle}</p>
          )}
          {scheduleDescription && (
            <p className="text-slate-500 text-xs mt-0.5 max-w-xs truncate">{scheduleDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phase === 'active' && (
            <span className="text-emerald-400 font-mono text-sm tabular-nums">
              {formatDuration(elapsedSeconds)}
            </span>
          )}
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              phase === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
                : phase === 'calling'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-700 text-slate-300'
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
      <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden min-h-0">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain transition-opacity duration-500 ${
            phase === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Waiting overlay */}
        {phase !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-800/40">
                <Video className="h-9 w-9 text-white" />
              </div>
            </div>
            <p className="text-white font-semibold text-lg">
              {isTeacher ? `Calling ${otherName}…` : `Connecting to ${otherName}…`}
            </p>
            <p className="text-slate-400 text-sm">Waiting for connection</p>
            <div className="flex gap-2 mt-1">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-slate-800">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <CameraOff className="h-7 w-7 text-slate-400" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 px-6 py-4 bg-slate-900/90 backdrop-blur border-t border-white/10 shrink-0">
        {/* Mic */}
        <button
          onClick={toggleMic}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMicOn
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-600/90 hover:bg-red-600 text-white'
          }`}
        >
          {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* End call */}
        <button
          onClick={handleEndCall}
          title="End call"
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-900/40"
        >
          <PhoneOff className="h-6 w-6" />
        </button>

        {/* Camera */}
        <button
          onClick={toggleCamera}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isCameraOn
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-600/90 hover:bg-red-600 text-white'
          }`}
        >
          {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => { setShowSettings((p) => !p); loadDevices(); }}
          title="Device settings"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            showSettings ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-[5.5rem] right-4 w-72 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Device Settings</p>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Camera selector */}
          <div className="mb-3">
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Camera</label>
            <select
              value={selectedVideoId}
              onChange={(e) => { setSelectedVideoId(e.target.value); switchCamera(e.target.value); }}
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {videoDevices.length === 0 && <option>No cameras found</option>}
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
              ))}
            </select>
          </div>

          {/* Microphone selector */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Microphone</label>
            <select
              value={selectedAudioId}
              onChange={(e) => { setSelectedAudioId(e.target.value); switchMicrophone(e.target.value); }}
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {audioDevices.length === 0 && <option>No microphones found</option>}
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
