import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface UseWebRTCProps {
  roomId: string;
  user: User | null;
  localStream: MediaStream | null;
}

interface RemoteParticipant {
  userId: string;
  stream: MediaStream;
  displayName: string;
}

export const useWebRTC = ({ roomId, user, localStream }: UseWebRTCProps) => {
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [participants, setParticipants] = useState<any[]>([]);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const createPeerConnection = useCallback((userId: string) => {
    if (peerConnections.current.has(userId)) {
      return peerConnections.current.get(userId)!;
    }

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
      console.log('Received remote track from', userId);
      const participant = participants.find(p => p.user_id === userId);
      setRemoteParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, {
          userId,
          stream: event.streams[0],
          displayName: participant?.profiles?.display_name || 'Участник',
        });
        return newMap;
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setRemoteParticipants(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, [roomId, user, participants]);

  const createOffer = useCallback(async (userId: string) => {
    if (!localStream || !user) return;

    const pc = createPeerConnection(userId);
    
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await supabase.from('webrtc_signals').insert([{
      room_id: roomId,
      from_user_id: user.id,
      to_user_id: userId,
      signal_type: 'offer',
      signal_data: offer as any,
    }]);
  }, [localStream, user, roomId, createPeerConnection]);

  // Load approved participants
  useEffect(() => {
    if (!user || !roomId) return;

    const loadParticipants = async () => {
      const { data, error } = await supabase
        .from('room_participants')
        .select('user_id, profiles(display_name)')
        .eq('room_id', roomId)
        .eq('status', 'approved')
        .neq('user_id', user.id);

      if (error) {
        console.error('Error loading participants:', error);
        return;
      }

      setParticipants(data || []);

      // Create offers to all existing participants
      data?.forEach(participant => {
        createOffer(participant.user_id);
      });
    };

    loadParticipants();

    // Listen for new participants joining
    const channel = supabase
      .channel(`room:${roomId}:participants`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newParticipant = payload.new;
        if (newParticipant.user_id !== user.id && newParticipant.status === 'approved') {
          const { data } = await supabase
            .from('room_participants')
            .select('user_id, profiles(display_name)')
            .eq('user_id', newParticipant.user_id)
            .single();
          
          if (data) {
            setParticipants(prev => [...prev, data]);
            createOffer(newParticipant.user_id);
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const updatedParticipant = payload.new;
        if (updatedParticipant.user_id !== user.id && updatedParticipant.status === 'approved') {
          const { data } = await supabase
            .from('room_participants')
            .select('user_id, profiles(display_name)')
            .eq('user_id', updatedParticipant.user_id)
            .single();
          
          if (data && !participants.find(p => p.user_id === data.user_id)) {
            setParticipants(prev => [...prev, data]);
            createOffer(updatedParticipant.user_id);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomId, createOffer]);

  // Handle WebRTC signals
  useEffect(() => {
    if (!user || !roomId || !localStream) return;

    const channel = supabase
      .channel(`room:${roomId}:signals`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `to_user_id=eq.${user.id}`,
      }, async (payload) => {
        const signal = payload.new;
        const fromUserId = signal.from_user_id;

        try {
          if (signal.signal_type === 'offer') {
            const pc = createPeerConnection(fromUserId);
            
            localStream.getTracks().forEach(track => {
              pc.addTrack(track, localStream);
            });

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
            if (pc && signal.signal_data) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
            }
          }
        } catch (error) {
          console.error('Error handling signal:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomId, localStream, createPeerConnection]);

  const cleanup = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteParticipants(new Map());
  }, []);

  return {
    remoteParticipants,
    cleanup,
  };
};