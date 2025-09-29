// supabase-client.js
const { createClient } = window.supabase;

const SUPABASE_URL = 'https://chevxjgosoaoqtzmuoyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZXZ4amdvc29hb3F0em11b3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDUzMjcsImV4cCI6MjA3MjQ4MTMyN30.V85zoO_FlbJ9JMjbg_HOYOyfT-BEiC52DA594upyp9M';

window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
