import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
    const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_KEY;
    if (url && key) {
        return createClient(url, key);
    }
    return null;
};

export const deleteDataFromSupabase = async (tableName: string, id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    
    return { success: true };
};

export const syncDataToSupabase = async (tableName: string, data: any[]) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    if (data.length === 0) return { success: true, count: 0 };

    const { error } = await supabase.from(tableName).upsert(data);
    if (error) throw error;
    
    return { success: true, count: data.length };
};
