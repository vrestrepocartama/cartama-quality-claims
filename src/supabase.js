import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'https://irjsceohjnmrhwgivuyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyanNjZW9oam5tcmh3Z2l2dXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODI4MDEsImV4cCI6MjEwMzI1ODgwMX0.gsLw3LiZJP0sz0G2hivc3wWbwbCpWRQlnet2qsiVM0I'
)
