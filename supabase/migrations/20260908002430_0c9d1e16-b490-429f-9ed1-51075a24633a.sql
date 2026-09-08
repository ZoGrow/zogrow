select cron.schedule(
  'sync-b2b-ads-hourly',
  '10 * * * *',
  $$
  select net.http_post(
    url:='https://qtikzflbhhzcrycokkal.supabase.co/functions/v1/sync-b2b-ads',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aWt6ZmxiaGh6Y3J5Y29ra2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODQ1NTYsImV4cCI6MjA5MjU2MDU1Nn0.k8scAhsao_Np7m5qs03neMFudzKP79Y4rxwIZMitusc"}'::jsonb,
    body:='{"backfill_days": 4}'::jsonb
  );
  $$
);