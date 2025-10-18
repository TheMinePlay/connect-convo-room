import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { RoomCard } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { Plus, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadRooms();
      const channel = supabase
        .channel('rooms-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, loadRooms)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, profiles(display_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) setRooms(data);
  };

  return (
    <div className="min-h-screen p-5">
      <Sidebar />
      
      <main className="ml-[280px] animate-fade-in">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">
            Видеоконференции нового поколения
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Создавайте комнаты, приглашайте участников и общайтесь с командой в реальном времени
          </p>
          {!user ? (
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white gap-2 px-8 py-6 text-lg rounded-xl shadow-accent hover:shadow-lg transition-all duration-300"
            >
              Войти / Регистрация
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/create")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white gap-2 px-8 py-6 text-lg rounded-xl shadow-accent hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Создать комнату
            </Button>
          )}
        </header>

        <section className="glass-effect rounded-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Возможности платформы</h2>
            <p className="text-muted-foreground">Всё необходимое для эффективного общения</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-effect rounded-xl p-6 text-center hover:glass-hover transition-all duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">HD Видео и Аудио</h3>
              <p className="text-sm text-muted-foreground">
                Кристально чистое качество связи с поддержкой до 50 участников
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 text-center hover:glass-hover transition-all duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Чат в реальном времени</h3>
              <p className="text-sm text-muted-foreground">
                Обменивайтесь сообщениями во время видеозвонка
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 text-center hover:glass-hover transition-all duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Демонстрация экрана</h3>
              <p className="text-sm text-muted-foreground">
                Делитесь экраном для презентаций и совместной работы
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Активные комнаты</h2>
            <Button
              variant="outline"
              onClick={() => navigate("/rooms")}
              className="glass-effect hover:glass-hover"
            >
              Все комнаты
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <RoomCard 
                key={room.id}
                id={room.id}
                name={room.name}
                participants={0}
                maxParticipants={room.max_participants}
                createdAt={room.created_at}
                isActive={room.is_active}
              />
            ))}
          </div>

          {rooms.length === 0 && (
            <div className="glass-effect rounded-2xl p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {user ? "Нет активных комнат" : "Войдите, чтобы увидеть активные комнаты"}
              </p>
              {user && (
                <Button onClick={() => navigate("/create")} className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первую комнату
                </Button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;