import { useEffect, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrackPublication,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface UseLiveKitProps {
  roomId: string;
  user: User | null;
}

export const useLiveKit = ({ roomId, user }: UseLiveKitProps) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);

  const connectToRoom = useCallback(async () => {
    if (!user || !roomId || isConnecting || isConnected) return;

    setIsConnecting(true);

    try {
      // Get LiveKit token from edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'livekit-token',
        {
          body: { roomId },
        }
      );

      if (tokenError) throw tokenError;

      const { token, wsUrl } = tokenData;

      // Create and connect to LiveKit room
      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        },
      });

      // Set up event listeners
      lkRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to room');
        setIsConnected(true);
        setLocalParticipant(lkRoom.localParticipant);
        setParticipants(Array.from(lkRoom.remoteParticipants.values()));
      });

      lkRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        setIsConnected(false);
        setParticipants([]);
      });

      lkRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        setParticipants((prev) => [...prev, participant]);
      });

      lkRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setParticipants((prev) => prev.filter((p) => p.identity !== participant.identity));
      });

      lkRoom.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        // Force re-render to update video elements
        setParticipants((prev) => [...prev]);
      });

      lkRoom.on(RoomEvent.TrackUnsubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
        setParticipants((prev) => [...prev]);
      });

      lkRoom.on(RoomEvent.LocalTrackPublished, () => {
        console.log('Local track published');
        setLocalParticipant(lkRoom.localParticipant);
      });

      // Connect to room
      await lkRoom.connect(wsUrl, token);
      setRoom(lkRoom);

      console.log('Successfully connected to LiveKit room');
    } catch (error: any) {
      console.error('Error connecting to room:', error);
      toast.error('Ошибка подключения к комнате');
      setIsConnecting(false);
    }
  }, [user, roomId, isConnecting, isConnected]);

  const disconnectFromRoom = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setParticipants([]);
      setLocalParticipant(null);
    }
  }, [room]);

  useEffect(() => {
    return () => {
      disconnectFromRoom();
    };
  }, [disconnectFromRoom]);

  return {
    room,
    isConnecting,
    isConnected,
    participants,
    localParticipant,
    connectToRoom,
    disconnectFromRoom,
  };
};
