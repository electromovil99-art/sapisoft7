import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
    const url = localStorage.getItem('supabaseUrl');
    const key = localStorage.getItem('supabaseKey');
    if (url && key) {
        return createClient(url, key);
    }
    return null;
};

export const syncDataToSupabase = async (tableName: string, data: any[]) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    if (data.length === 0) return { success: true, count: 0 };

    const { error } = await supabase.from(tableName).upsert(data);
    if (error) throw error;
    
    return { success: true, count: data.length };
};
