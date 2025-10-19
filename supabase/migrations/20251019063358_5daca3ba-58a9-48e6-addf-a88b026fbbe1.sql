-- Fix RLS policies to allow users to join rooms by link

-- Drop and recreate INSERT policy with explicit TO authenticated
DROP POLICY IF EXISTS "Users can request to join rooms" ON room_participants;

CREATE POLICY "Users can request to join rooms"
ON room_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update SELECT policy to allow users to see their own participant record
-- This is needed because users need to check if they're already in the room
DROP POLICY IF EXISTS "Participants can view participants in their rooms" ON room_participants;

CREATE POLICY "Participants can view participants in their rooms"
ON room_participants
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  is_approved_participant(auth.uid(), room_id) OR 
  is_room_host(auth.uid(), room_id)
);