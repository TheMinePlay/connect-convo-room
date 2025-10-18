import { Home, Video, Settings, Plus, Users, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navItems = [
  { icon: Home, label: "Главная", path: "/" },
  { icon: Plus, label: "Создать комнату", path: "/create" },
  { icon: Users, label: "Мои комнаты", path: "/rooms" },
  { icon: Settings, label: "Настройки", path: "/settings" },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из системы");
    navigate("/");
  };

  return (
    <aside className="fixed left-5 top-5 h-[calc(100vh-40px)] w-64 glass-effect rounded-[20px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-50 flex flex-col">
      <div className="text-center border-b border-white/10 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
          <Video className="w-6 h-6" />
          VideoConnect
        </h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300",
                "glass-effect hover:glass-hover",
                isActive && "bg-primary/20 border-primary shadow-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-5 border-t border-white/10 space-y-2">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 glass-effect rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-semibold">
                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.display_name || 'Пользователь'}</div>
                <div className="text-xs text-muted-foreground">Онлайн</div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </Button>
          </>
        ) : (
          <Button
            className="w-full"
            onClick={() => navigate("/auth")}
          >
            Войти
          </Button>
        )}
      </div>
    </aside>
  );
};