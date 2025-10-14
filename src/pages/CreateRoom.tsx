import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Lock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateRoom = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState("50");

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название комнаты",
        variant: "destructive",
      });
      return;
    }

    // Generate room ID
    const roomId = Math.random().toString(36).substring(7);
    
    toast({
      title: "Комната создана!",
      description: `Комната "${roomName}" успешно создана`,
    });

    // Navigate to room
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen p-5">
      <Sidebar />
      
      <main className="ml-[280px] animate-fade-in max-w-3xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3 gradient-text">Создать комнату</h1>
          <p className="text-muted-foreground text-lg">
            Настройте параметры видеоконференции
          </p>
        </header>

        <div className="glass-effect rounded-2xl p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="roomName" className="text-base flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-primary" />
                Название комнаты
              </Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Введите название комнаты"
                className="glass-effect h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="maxParticipants" className="text-base flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                Максимум участников
              </Label>
              <Input
                id="maxParticipants"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="50"
                className="glass-effect h-12 text-base"
                min="2"
                max="100"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Укажите максимальное количество участников (2-100)
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <Label htmlFor="approval" className="text-base font-semibold cursor-pointer">
                    Требовать одобрение организатора
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Новые участники смогут присоединиться только после вашего разрешения
                  </p>
                </div>
              </div>
              <Switch
                id="approval"
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
              />
            </div>

            <div className="glass-effect rounded-xl p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Возможности комнаты
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  HD видео и аудио связь
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Чат в реальном времени
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Демонстрация экрана
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Настройка камеры и микрофона
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleCreateRoom}
              size="lg"
              className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 text-base rounded-xl"
            >
              Создать и войти
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="glass-effect hover:glass-hover h-12"
            >
              Отмена
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateRoom;
