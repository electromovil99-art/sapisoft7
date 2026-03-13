import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_KEY;
    if (!url || !key) throw new Error("Supabase no configurado");
    return createClient(url, key);
};

/**
 * Obtiene el siguiente ID para módulos específicos (Ventas, Compras, etc.)
 * basado en Empresa y Sucursal.
 */
export const getNextModuleId = async (
  companyId: string,
  branchId: string,
  moduleType: string
): Promise<number> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('increment_module_counter', {
    p_company_id: companyId,
    p_branch_id: branchId,
    p_module_type: moduleType
  });

  if (error) throw error;
  return Number(data);
};

/**
 * Obtiene el siguiente ID global para transacciones (SaaS ID).
 */
export const getNextGlobalTransactionId = async (): Promise<string> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('increment_global_counter', {
    p_counter_name: 'global_transaction'
  });

  if (error) throw error;
  return String(data);
};

/**
 * Obtiene el siguiente ID global para Soporte Técnico.
 */
export const getNextGlobalSupportId = async (): Promise<string> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('increment_global_counter', {
    p_counter_name: 'soporte_tecnico'
  });

  if (error) throw error;
  return String(data).padStart(6, '0');
};
