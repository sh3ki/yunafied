import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { mobileApiClient } from '../api/client';
import { MeetingRoom } from '../types/models';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
];

export default function VideoCallNative({ roomToken, onClose, role }: { roomToken: string; onClose: () => void; role: 'teacher' | 'student' }) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const sentIceRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<any>(null);

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS } as any);

    pc.onicecandidate = ({ candidate }: any) => {
      if (!candidate || !roomToken) return;
      const json = candidate.toJSON();
      const key = JSON.stringify(json);
      if (sentIceRef.current.has(key)) return;
      sentIceRef.current.add(key);
      mobileApiClient.sendMeetingSignal(roomToken, { addIceCandidate: json }).catch(() => {});
    };

    (pc as any).onaddstream = (event: any) => {
      if (event.stream && event.stream.toURL) {
        try {
          setRemoteStreamUrl(event.stream.toURL());
        } catch (_e) {
          // ignore
        }
      }
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0] && event.streams[0].toURL) {
        setRemoteStreamUrl(event.streams[0].toURL());
      }
    };

    return pc;
  }, [roomToken]);

  const getLocal = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
    try {
      setLocalStreamUrl((stream as any).toURL());
    } catch (_e) {}
    return stream;
  }, []);

  const startAsTeacher = useCallback(async () => {
    const stream = await getLocal();
    const pc = createPc();
    pcRef.current = pc;
    // add tracks
    try {
      (pc as any).addStream(stream as any);
    } catch (_) {}

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer as any);
    await mobileApiClient.sendMeetingSignal(roomToken, { offer: offer as unknown as Record<string, unknown> });
  }, [createPc, getLocal, roomToken]);

  const startAsStudent = useCallback(async (room: MeetingRoom) => {
    if (!room.offer) return;
    const stream = await getLocal();
    const pc = createPc();
    pcRef.current = pc;
    try { (pc as any).addStream(stream as any); } catch (_) {}
    await pc.setRemoteDescription(new RTCSessionDescription(room.offer as any) as any);
    // add existing teacher ICE
    for (const c of room.teacherIceCandidates || []) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c as any)); } catch (_) {}
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer as any);
    await mobileApiClient.sendMeetingSignal(roomToken, { answer: answer as unknown as Record<string, unknown> });
  }, [createPc, getLocal, roomToken]);

  const poll = useCallback(async () => {
    if (!roomToken) return;
    try {
      const room = await mobileApiClient.getMeeting(roomToken);
      if (!pcRef.current) return;
      if (role === 'teacher') {
        if (room.answer && (pcRef.current!.remoteDescription == null)) {
          try { await pcRef.current!.setRemoteDescription(new RTCSessionDescription(room.answer as any) as any); } catch (_) {}
        }
        for (const c of room.studentIceCandidates || []) {
          const key = JSON.stringify(c);
          if (!sentIceRef.current.has(`remote-${key}`)) {
            sentIceRef.current.add(`remote-${key}`);
            try { await pcRef.current!.addIceCandidate(new RTCIceCandidate(c as any)); } catch (_) {}
          }
        }
      } else {
        for (const c of room.teacherIceCandidates || []) {
          const key = JSON.stringify(c);
          if (!sentIceRef.current.has(`remote-${key}`)) {
            sentIceRef.current.add(`remote-${key}`);
            try { await pcRef.current!.addIceCandidate(new RTCIceCandidate(c as any)); } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }, [roomToken, role]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const room = await mobileApiClient.getMeeting(roomToken);
        if (!mounted) return;
        if (role === 'teacher') {
          await startAsTeacher();
        } else {
          if (room.offer) {
            await startAsStudent(room);
          }
        }
        pollingRef.current = setInterval(poll, 2000);
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      try { pcRef.current?.close(); } catch (_) {}
    };
  }, [roomToken, role, startAsTeacher, startAsStudent, poll]);

  const endCall = async () => {
    try { await mobileApiClient.updateMeetingStatus(roomToken, 'ended'); } catch (_) {}
    onClose();
  };

  return (
    <ModalLike onClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.videoWrap}>
          {remoteStreamUrl ? <RTCView streamURL={remoteStreamUrl} style={styles.remote} objectFit="cover" /> : <Text style={styles.placeholder}>Waiting for remote…</Text>}
          {localStreamUrl ? <RTCView streamURL={localStreamUrl} style={styles.local} objectFit="cover" /> : null}
        </View>
        <View style={styles.controls}>
          <Pressable onPress={endCall} style={styles.endBtn}><Text style={{ color: '#fff' }}>End Call</Text></Pressable>
        </View>
      </SafeAreaView>
    </ModalLike>
  );
}

function ModalLike({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 9999 }}>{children}</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  videoWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  remote: { width: '100%', height: '100%' },
  local: { width: 120, height: 160, position: 'absolute', right: 12, bottom: 80, borderRadius: 8, overflow: 'hidden' },
  placeholder: { color: '#fff' },
  controls: { position: 'absolute', bottom: 24, width: '100%', alignItems: 'center' },
  endBtn: { backgroundColor: '#ef4444', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30 },
});
