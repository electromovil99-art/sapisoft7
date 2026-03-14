import { getSupabaseClient } from './supabaseService';

export const recorrelateHistory = async (): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no configurado");
    
    // 1. Fetch all records
    const tables = ['sales', 'purchases', 'cash_movements', 'service_orders', 'quotations', 'presales'];
    let allRecords: any[] = [];
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        allRecords = [...allRecords, ...data.map(r => ({ ...r, _table: table }))];
    }
    
    // 2. Sort by date and time
    allRecords.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-') + 'T' + a.time);
        const dateB = new Date(b.date.split('/').reverse().join('-') + 'T' + b.time);
        return dateA.getTime() - dateB.getTime();
    });
    
    // 3. Assign new correlative globalId
    let counter = 1;
    for (const record of allRecords) {
        const newGlobalId = counter.toString();
        
        // 4. Update in Supabase
        const { error } = await supabase
            .from(record._table)
            .update({ globalId: newGlobalId })
            .eq('id', record.id);
            
        if (error) throw error;
        
        counter++;
    }
    
    // 5. Update global counter in Supabase
    const { error: counterError } = await supabase.rpc('set_global_counter', {
        p_counter_name: 'global_transaction',
        p_value: counter - 1
    });
    
    if (counterError) throw counterError;
};
