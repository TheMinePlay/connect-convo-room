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
import { useToast } from "@/hooks/use-toast";
import { DeviceSettings } from "./DeviceSettings";

interface VideoCallProps {
  roomId: string;
}

export const VideoCall = ({ roomId }: VideoCallProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ user: string; text: string; time: string }>>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startLocalStream();
    return () => {
      stopAllStreams();
    };
  }, []);

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

      toast({
        title: "Подключено",
        description: "Камера и микрофон активированы",
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить доступ к камере или микрофону",
        variant: "destructive",
      });
    }
  };

  const stopAllStreams = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        setIsScreenSharing(true);
        toast({
          title: "Демонстрация экрана",
          description: "Вы начали демонстрацию экрана",
        });

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } else {
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать демонстрацию экрана",
        variant: "destructive",
      });
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
    toast({
      title: "Звонок завершён",
      description: "Вы покинули конференцию",
    });
  };

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      {/* Main video grid */}
      <div className="h-full p-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full">
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
