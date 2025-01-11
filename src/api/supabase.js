// supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lpgadqrtfstdmnycppkx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2FkcXJ0ZnN0ZG1ueWNwcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4ODI1ODcsImV4cCI6MjA1MTQ1ODU4N30.wwbgQN_zGHvUxRRc01m2j0bIHCSi7qoDc4T2d-MLfV4'
);

export const saveDocument = async (content) => {
  const { data, error } = await supabase
    .from('documents')
    .upsert(
      { 
        id: 1, 
        content: content 
      },
      { onConflict: 'id' }
    );
    
  if (error) throw error;
  return data;
};

export const loadDocument = async () => {
  const { data, error } = await supabase
    .from('documents')
    .select('content')
    .eq('id', 1)
    .single();
    
  if (error) throw error;
  return data.content;
};