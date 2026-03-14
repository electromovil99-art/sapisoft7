import { createClient } from '@supabase/supabase-js';

const tablesWithGlobalId = ['sales', 'purchases', 'cash_movements', 'service_orders', 'quotations', 'presales', 'stock_movements'];

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
    
    return supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
            callback(payload);
        })
        .subscribe();
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

    // Si la tabla usa globalId, nos aseguramos de que los registros nuevos lo tengan
    if (tablesWithGlobalId.includes(tableName)) {
        const sessionStr = localStorage.getItem('app_session');
        let currentUsername = 'Sistema';
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                currentUsername = session.user?.username || session.user?.fullName || 'Usuario';
            } catch (e) {}
        }

        for (let i = 0; i < data.length; i++) {
            // Asignar auditoría de usuario
            if (!data[i].updatedBy) {
                data[i].updatedBy = currentUsername;
            }

            if (!data[i].globalId) {
                try {
                    const { data: nextId, error: rpcError } = await supabase.rpc('increment_global_counter', {
                        p_counter_name: 'global_transaction'
                    });
                    if (!rpcError) {
                        data[i].globalId = String(nextId);
                    }
                } catch (e) {
                    console.warn("No se pudo asignar globalId en este momento:", e);
                }
            }
        }
    }

    const { error, data: result } = await supabase.from(tableName).upsert(data);
    
    if (error) {
        console.error(`Error al sincronizar ${tableName}:`, error);
        throw error;
    }
    
    return { success: true, count: data.length };
};
