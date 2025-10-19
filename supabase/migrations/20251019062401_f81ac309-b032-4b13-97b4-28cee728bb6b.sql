-- Fix RLS policies for room_participants to allow users to join rooms

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can request to join rooms" ON room_participants;

-- Create new INSERT policy that allows authenticated users to join
CREATE POLICY "Users can request to join rooms"
ON room_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure the UPDATE policy works correctly for hosts
DROP POLICY IF EXISTS "Host can update participant status" ON room_participants;

CREATE POLICY "Host can update participant status"
ON room_participants
FOR UPDATE
TO authenticated
USING (public.is_room_host(auth.uid(), room_id));