import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "no token" }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Self-inspect via debug_token (token as its own access_token)
  const url = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json();

  return new Response(JSON.stringify({
    debug: data.data ?? data,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
