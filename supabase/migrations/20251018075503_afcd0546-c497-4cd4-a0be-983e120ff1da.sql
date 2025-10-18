-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_participants INTEGER DEFAULT 10,
  require_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Rooms are viewable by everyone"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their own rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete their own rooms"
  ON public.rooms FOR DELETE
  USING (auth.uid() = host_user_id);

-- Create room participants table
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on room_participants
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Room participants policies
CREATE POLICY "Participants can view participants in their rooms"
  ON public.room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_participants.room_id
      AND rp.user_id = auth.uid()
      AND rp.status = 'approved'
    ) OR
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_participants.room_id
      AND r.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can request to join rooms"
  ON public.room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update participant status"
  ON public.room_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_participants.room_id
      AND r.host_user_id = auth.uid()
    )
  );

-- Create WebRTC signals table for peer-to-peer signaling
CREATE TABLE public.webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on webrtc_signals
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- WebRTC signals policies
CREATE POLICY "Users can view signals in their rooms"
  ON public.webrtc_signals FOR SELECT
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id OR
    to_user_id IS NULL
  );

CREATE POLICY "Users can send signals in their rooms"
  ON public.webrtc_signals FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = webrtc_signals.room_id
      AND rp.user_id = auth.uid()
      AND rp.status = 'approved'
    )
  );

-- Enable realtime for WebRTC signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();