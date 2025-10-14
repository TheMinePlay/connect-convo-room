import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface DeviceSettingsProps {
  onClose: () => void;
}

export const DeviceSettings = ({ onClose }: DeviceSettingsProps) => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedAudio, setSelectedAudio] = useState<string>("");

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videos = devices.filter(device => device.kind === "videoinput");
      const audios = devices.filter(device => device.kind === "audioinput");
      
      setVideoDevices(videos);
      setAudioDevices(audios);
      
      if (videos.length > 0) setSelectedVideo(videos[0].deviceId);
      if (audios.length > 0) setSelectedAudio(audios[0].deviceId);
    } catch (error) {
      console.error("Error loading devices:", error);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 glass-effect border-l border-white/10 p-6 flex flex-col animate-slide-in z-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Настройки</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base mb-3 block">Камера</Label>
          <Select value={selectedVideo} onValueChange={setSelectedVideo}>
            <SelectTrigger className="glass-effect">
              <SelectValue placeholder="Выберите камеру" />
            </SelectTrigger>
            <SelectContent>
              {videoDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Камера ${device.deviceId.substring(0, 5)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-base mb-3 block">Микрофон</Label>
          <Select value={selectedAudio} onValueChange={setSelectedAudio}>
            <SelectTrigger className="glass-effect">
              <SelectValue placeholder="Выберите микрофон" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Микрофон ${device.deviceId.substring(0, 5)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="glass-effect rounded-xl p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            Изменения настроек устройств вступят в силу после повторного подключения.
          </p>
        </div>
      </div>

      <Button
        onClick={onClose}
        className="mt-auto bg-primary hover:bg-primary/90 w-full"
      >
        Готово
      </Button>
    </div>
  );
};
