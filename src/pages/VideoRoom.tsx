import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { VideoCall } from "@/components/VideoCall";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && roomId) {
      loadRoom();
    }
  }, [user, roomId]);

  const loadRoom = async () => {
    if (!roomId || !user) return;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);

      // Check if user is already a participant
      const { data: participantData } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!participantData) {
        // Use upsert to avoid duplicate key errors
        const { error: joinError } = await supabase
          .from('room_participants')
          .upsert({
            room_id: roomId,
            user_id: user.id,
            status: roomData.require_approval ? 'pending' : 'approved',
          }, {
            onConflict: 'room_id,user_id'
          });

        if (joinError) throw joinError;

        if (roomData.require_approval) {
          toast.info("Ожидайте одобрения организатора");
        }
      } else if (participantData.status === 'rejected') {
        toast.error("Доступ отклонен");
        navigate("/");
        return;
      }
    } catch (error: any) {
      toast.error(error.message);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VideoCall roomId={roomId || ""} user={user} room={room} />
    </div>
  );
};

export default VideoRoom;
