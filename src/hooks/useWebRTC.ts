import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UseWebRTCProps {
  roomId: string;
  user: User | null;
}

export const useWebRTC = ({ roomId, user }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  const configuration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  const createPeerConnection = useCallback((userId: string) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && user) {
        supabase.from('webrtc_signals').insert([{
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: userId,
          signal_type: 'ice-candidate',
          signal_data: event.candidate as any,
        }]);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, event.streams[0]);
        return newMap;
      });
    };

    return pc;
  }, [roomId, user]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const stopAllStreams = useCallback(() => {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStreams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  }, [localStream, remoteStreams]);

  useEffect(() => {
    if (!user || !roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `to_user_id=eq.${user.id}`,
      }, async (payload) => {
        const signal = payload.new;
        const fromUserId = signal.from_user_id;

        if (signal.signal_type === 'offer') {
          const pc = createPeerConnection(fromUserId);
          peerConnections.current.set(fromUserId, pc);

          if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await supabase.from('webrtc_signals').insert([{
            room_id: roomId,
            from_user_id: user.id,
            to_user_id: fromUserId,
            signal_type: 'answer',
            signal_data: answer as any,
          }]);
        } else if (signal.signal_type === 'answer') {
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          }
        } else if (signal.signal_type === 'ice-candidate') {
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomId, localStream, createPeerConnection]);

  return {
    localStream,
    remoteStreams,
    startLocalStream,
    stopAllStreams,
  };
};