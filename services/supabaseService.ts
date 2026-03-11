import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
    const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_KEY;
    if (url && key) {
        return createClient(url, key);
    }
    return null;
};

export const fetchDataFromSupabase = async (tableName: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    
    return data;
};

export const subscribeToSupabaseChanges = (tableName: string, callback: (payload: any) => void) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    console.log(`Intentando suscribirse a cambios en: ${tableName}`);
    
    return supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
            console.log(`Cambio recibido en ${tableName}:`, payload);
            callback(payload);
        })
        .subscribe((status) => {
            console.log(`Estado de suscripción para ${tableName}:`, status);
        });
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
