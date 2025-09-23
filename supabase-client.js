const { createClient } = supabase

const SUPABASE_URL = 'https://chevxjgosoaoqtzmuoyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZXZ4amdvc29hb3F0em11b3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MDI0NzQsImV4cCI6MjA0MTQ3ODQ3NH0.2rPHjoWBO8f9o6SeKGKkFA_mSIeKTv6wJhKUGqOQZJo';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

