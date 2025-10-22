import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Settings,
  X,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Track, RemoteParticipant as LKRemoteParticipant } from "livekit-client";
import { useLiveKit } from "@/hooks/useLiveKit";
import { DeviceSettings } from "./DeviceSettings";
import { ParticipantApproval } from "./ParticipantApproval";

interface VideoCallProps {
  roomId: string;
  user: User | null;
  room: any;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export const VideoCall = ({ roomId, user, room }: VideoCallProps) => {
  const navigate = useNavigate();
  const [participantStatus, setParticipantStatus] = useState<string>('pending');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isHost = user?.id === room?.host_user_id;

  const {
    room: liveKitRoom,
    isConnecting,
    isConnected,
    participants,
    localParticipant,
    connectToRoom,
    disconnectFromRoom,
  } = useLiveKit({ roomId, user });

  // Check participant status
  useEffect(() => {
    if (!user || !roomId) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('room_participants')
        .select('status')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setParticipantStatus(data.status);
      }
    };

    checkStatus();

    const channel = supabase
      .channel(`participant-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          setParticipantStatus(payload.new.status);
          if (payload.new.status === 'rejected') {
            toast.error('Доступ отклонен');
            navigate('/');
          } else if (payload.new.status === 'approved') {
            toast.success('Вы допущены к конференции');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomId, navigate]);

  // Connect to LiveKit room when approved
  useEffect(() => {
    if (participantStatus === 'approved' && !isConnected && !isConnecting) {
      connectToRoom();
    }
  }, [participantStatus, isConnected, isConnecting, connectToRoom]);

  // Attach local video track
  useEffect(() => {
    if (!localParticipant || !localVideoRef.current) return;

    const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track) {
      videoTrack.track.attach(localVideoRef.current);
    }

    return () => {
      if (videoTrack?.track) {
        videoTrack.track.detach();
      }
    };
  }, [localParticipant]);

  // Update mute/video state based on local participant
  useEffect(() => {
    if (localParticipant) {
      setIsMuted(!localParticipant.isMicrophoneEnabled);
      setIsVideoOff(!localParticipant.isCameraEnabled);
    }
  }, [localParticipant]);

  // Toggle microphone
  const toggleMute = async () => {
    if (!localParticipant) return;
    
    const enabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(!enabled);
  };

  // Toggle camera
  const toggleVideo = async () => {
    if (!localParticipant) return;
    
    const enabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!enabled);
    setIsVideoOff(!enabled);
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (!localParticipant) return;

    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        toast.success('Начата демонстрация экрана');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Ошибка при попытке поделиться экраном');
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !user) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: user.email || 'Вы',
      text: messageInput,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const leaveCall = () => {
    disconnectFromRoom();
    navigate('/');
    toast.success('Вы покинули конференцию');
  };

  if (participantStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-2">Ожидание одобрения</h2>
          <p className="text-muted-foreground">
            Организатор комнаты должен одобрить ваш запрос на присоединение
          </p>
        </Card>
      </div>
    );
  }

  if (participantStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <p className="text-lg text-destructive">Доступ отклонен</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      <ParticipantApproval roomId={roomId} isHost={isHost} />
      
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">{room?.name || 'Видео комната'}</h1>
        {isConnecting && (
          <p className="text-sm text-muted-foreground">Подключение...</p>
        )}
        {isConnected && (
          <p className="text-sm text-green-500">Подключено ({participants.length + 1} участников)</p>
        )}
      </div>

      {/* Main video area */}
      <div className="h-[calc(100vh-180px)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local video */}
          <Card className="relative aspect-video bg-muted overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
              Вы {isMuted && "(без звука)"}
            </div>
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold">Вы</span>
                </div>
              </div>
            )}
          </Card>

          {/* Remote participants */}
          {participants.map((participant) => (
            <RemoteParticipantView key={participant.identity} participant={participant} />
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 5 - participants.length) }).map((_, i) => (
            <Card key={`empty-${i}`} className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Ожидание участника...</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t flex justify-center gap-2 bg-background">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleMute}
          disabled={!isConnected}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleVideo}
          disabled={!isConnected}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          onClick={toggleScreenShare}
          disabled={!isConnected}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={leaveCall}
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg flex flex-col z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Чат</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="text-sm font-medium">{msg.sender}</div>
                <div className="text-sm bg-muted p-2 rounded">{msg.text}</div>
                <div className="text-xs text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Нет сообщений
              </p>
            )}
          </div>
          <div className="p-4 border-t flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Введите сообщение..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button size="icon" onClick={sendMessage}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Настройки</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <DeviceSettings onClose={() => setShowSettings(false)} />
          </Card>
        </div>
      )}
    </div>
  );
};

// Remote participant component
const RemoteParticipantView = ({ participant }: { participant: LKRemoteParticipant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!participant || !videoRef.current) return;

    const videoTrack = participant.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track) {
      videoTrack.track.attach(videoRef.current);
      setHasVideo(true);
    }

    return () => {
      if (videoTrack?.track) {
        videoTrack.track.detach();
      }
    };
  }, [participant]);

  return (
    <Card className="relative aspect-video bg-muted overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
        {participant.name || participant.identity}
      </div>
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <VideoOff className="w-12 h-12" />
          </div>
        </div>
      )}
    </Card>
  );
};
