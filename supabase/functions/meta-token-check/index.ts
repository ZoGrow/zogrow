import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = Deno.env.get("META_SYSTEM_USER_TOKEN") || Deno.env.get("META_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "no token" }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  // 1) Who is this token for, and is it valid?
  const meRes = await fetch(`https://graph.facebook.com/me?metadata=1&access_token=${encodeURIComponent(token)}`);
  const me = await meRes.json();

  // 2) Try token inspection (may require app token; include whatever Meta returns)
  const dbgRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`);
  const dbg = await dbgRes.json();

  return new Response(JSON.stringify({ me, debug: dbg.data ?? dbg.error ?? dbg }), { headers: { ...cors, "Content-Type": "application/json" } });
});
