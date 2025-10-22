import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.7.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { roomId } = await req.json();

    if (!roomId) {
      throw new Error('Room ID is required');
    }

    // Verify user is approved participant
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('status')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant || participant.status !== 'approved') {
      throw new Error('User is not an approved participant');
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

    // Create LiveKit token
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const apiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    console.log(`Token generated for user ${user.id} in room ${roomId}`);

    return new Response(
      JSON.stringify({
        token,
        url: livekitUrl.replace('wss://', 'https://'),
        wsUrl: livekitUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
