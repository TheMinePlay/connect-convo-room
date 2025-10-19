-- Add UPDATE policy for users to update their own participant records (needed for upsert)
CREATE POLICY "Users can update their own participant record"
ON room_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger to automatically add host as approved participant when room is created
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_participants (room_id, user_id, status)
  VALUES (NEW.id, NEW.host_user_id, 'approved')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_room_created
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.add_host_as_participant();