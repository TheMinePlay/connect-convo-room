import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface PendingParticipant {
  id: string;
  user_id: string;
  profiles: {
    display_name: string;
  };
}

interface ParticipantApprovalProps {
  roomId: string;
  isHost: boolean;
}

export const ParticipantApproval = ({ roomId, isHost }: ParticipantApprovalProps) => {
  const [pendingParticipants, setPendingParticipants] = useState<PendingParticipant[]>([]);

  useEffect(() => {
    if (!isHost) return;

    loadPending();

    const channel = supabase
      .channel(`room:${roomId}:participants`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, loadPending)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isHost]);

  const loadPending = async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('id, user_id')
      .eq('room_id', roomId)
      .eq('status', 'pending');

    if (data) {
      const participantsWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', p.user_id)
            .single();

          return {
            ...p,
            profiles: { display_name: profile?.display_name || 'Unknown' }
          };
        })
      );
      setPendingParticipants(participantsWithProfiles);
    }
  };

  const handleApprove = async (participantId: string) => {
    const { error } = await supabase
      .from('room_participants')
      .update({ status: 'approved' })
      .eq('id', participantId);

    if (error) {
      toast.error("Ошибка одобрения участника");
    } else {
      toast.success("Участник одобрен");
    }
  };

  const handleReject = async (participantId: string) => {
    const { error } = await supabase
      .from('room_participants')
      .update({ status: 'rejected' })
      .eq('id', participantId);

    if (error) {
      toast.error("Ошибка отклонения участника");
    } else {
      toast.success("Участник отклонен");
    }
  };

  if (!isHost || pendingParticipants.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-50 glass-effect p-4 rounded-lg max-w-sm">
      <h3 className="font-semibold mb-3">Ожидают одобрения</h3>
      <div className="space-y-2">
        {pendingParticipants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between gap-2 p-2 glass-effect rounded">
            <span className="text-sm">{participant.profiles.display_name}</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleApprove(participant.id)}
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleReject(participant.id)}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};