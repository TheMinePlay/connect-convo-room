import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  MessageSquare,
  Settings as SettingsIcon,
  PhoneOff,
  Users,
  Send,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DeviceSettings } from "./DeviceSettings";
import { ParticipantApproval } from "./ParticipantApproval";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface VideoCallProps {
  roomId: string;
  user: User | null;
  room: any;
}

export const VideoCall = ({ roomId, user, room }: VideoCallProps) => {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ user: string; text: string; time: string }>>([]);
  const [participantStatus, setParticipantStatus] = useState<string>('approved');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const isHost = user?.id === room?.host_user_id;

  useEffect(() => {
    if (user) {
      checkParticipantStatus();
    }
  }, [user]);

  useEffect(() => {
    if (participantStatus === 'approved') {
      startLocalStream();
    }
    return () => {
      stopAllStreams();
    };
  }, [participantStatus]);

  const checkParticipantStatus = async () => {
    if (!user) return;

    const channel = supabase
      .channel(`room:${roomId}:participant:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_participants',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setParticipantStatus(payload.new.status);
        if (payload.new.status === 'rejected') {
          toast.error("Доступ отклонен");
          navigate("/");
        } else if (payload.new.status === 'approved') {
          toast.success("Вы допущены к конференции");
        }
      })
      .subscribe();

    const { data } = await supabase
      .from('room_participants')
      .select('status')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setParticipantStatus(data.status);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setStream(mediaStream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      toast.success("Камера и микрофон активированы");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Не удалось получить доступ к камере или микрофону");
    }
  };

  const stopAllStreams = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        setScreenStream(newScreenStream);
        setIsScreenSharing(true);
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = newScreenStream;
        }
        
        toast.success("Вы начали демонстрацию экрана");

        newScreenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
        };
      } else {
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        setScreenStream(null);
        setIsScreenSharing(false);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
      toast.error("Не удалось начать демонстрацию экрана");
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        {
          user: "Вы",
          text: message,
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setMessage("");
    }
  };

  const leaveCall = () => {
    stopAllStreams();
    navigate("/");
    toast.success("Вы покинули конференцию");
  };

  if (participantStatus === 'pending') {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="glass-effect p-8 rounded-2xl text-center">
          <h2 className="text-2xl font-bold mb-2">Ожидание одобрения</h2>
          <p className="text-muted-foreground">
            Организатор комнаты должен одобрить ваш запрос на присоединение
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      <ParticipantApproval roomId={roomId} isHost={isHost} />
      
      {/* Main video grid */}
      <div className="h-full p-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full">
          {/* Screen share (full width when active) */}
          {isScreenSharing && screenStream && (
            <div className="relative glass-effect rounded-2xl overflow-hidden col-span-2 md:col-span-3">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 rounded-lg text-sm font-medium">
                Демонстрация экрана
              </div>
            </div>
          )}
          
          {/* Local video */}
          <div className="relative glass-effect rounded-2xl overflow-hidden group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold">Вы</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 rounded-lg text-sm font-medium">
              Вы {isMuted && "(без звука)"}
            </div>
          </div>

          {/* Placeholder for other participants */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="relative glass-effect rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 rounded-lg text-sm font-medium">
                Ожидание участника...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 glass-effect border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Комната: {roomId}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={toggleMute}
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              className="w-14 h-14 rounded-full"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleVideo}
              size="lg"
              variant={isVideoOff ? "destructive" : "secondary"}
              className="w-14 h-14 rounded-full"
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleScreenShare}
              size="lg"
              variant={isScreenSharing ? "default" : "secondary"}
              className="w-14 h-14 rounded-full"
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button
              onClick={() => setShowChat(!showChat)}
              size="lg"
              variant="secondary"
              className="w-14 h-14 rounded-full"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => setShowSettings(!showSettings)}
              size="lg"
              variant="secondary"
              className="w-14 h-14 rounded-full"
            >
              <SettingsIcon className="w-5 h-5" />
            </Button>

            <Button
              onClick={leaveCall}
              size="lg"
              variant="destructive"
              className="w-14 h-14 rounded-full ml-4"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>

          <div className="w-24" />
        </div>
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="fixed right-0 top-0 h-full w-96 glass-effect border-l border-white/10 p-6 flex flex-col animate-slide-in z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Чат</h3>
            <Button
              onClick={() => setShowChat(false)}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className="glass-effect rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{msg.user}</span>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Нет сообщений
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Введите сообщение..."
              className="glass-effect"
            />
            <Button onClick={sendMessage} className="bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Settings sidebar */}
      {showSettings && (
        <DeviceSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};
