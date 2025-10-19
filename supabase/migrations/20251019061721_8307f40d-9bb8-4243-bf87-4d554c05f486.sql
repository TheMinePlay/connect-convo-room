-- Drop existing problematic policy
DROP POLICY IF EXISTS "Participants can view participants in their rooms" ON room_participants;

-- Create security definer function to check if user is approved participant
CREATE OR REPLACE FUNCTION public.is_approved_participant(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_participants
    WHERE user_id = _user_id
      AND room_id = _room_id
      AND status = 'approved'
  );
$$;

-- Create security definer function to check if user is room host
CREATE OR REPLACE FUNCTION public.is_room_host(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rooms
    WHERE id = _room_id
      AND host_user_id = _user_id
  );
$$;

-- Create new policy using security definer functions
CREATE POLICY "Participants can view participants in their rooms"
ON room_participants
FOR SELECT
USING (
  public.is_approved_participant(auth.uid(), room_id) 
  OR public.is_room_host(auth.uid(), room_id)
);