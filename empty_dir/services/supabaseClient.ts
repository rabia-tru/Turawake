import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdxiddmnkhkxuduqpbhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeGlkZG1ua2hreHVkdXFwYmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Nzc2MTYsImV4cCI6MjA3NzI1MzYxNn0.qaiFhxYvBxkCfe89mtRtsuCn_aS5xgRLzxSeSYJSlhw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);