import { Video, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RoomCardProps {
  id: string;
  name: string;
  participants: number;
  maxParticipants?: number;
  createdAt: string;
  isActive: boolean;
}

export const RoomCard = ({
  id,
  name,
  participants,
  maxParticipants,
  createdAt,
  isActive,
}: RoomCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="glass-effect rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-accent animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="w-4 h-4" />
              {new Date(createdAt).toLocaleString("ru-RU")}
            </div>
          </div>
        </div>
        {isActive && (
          <span className="px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full animate-glow">
            Активна
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {participants} {maxParticipants && `/ ${maxParticipants}`} участников
          </span>
        </div>

        <Button
          onClick={() => navigate(`/room/${id}`)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Присоединиться
        </Button>
      </div>
    </div>
  );
};
