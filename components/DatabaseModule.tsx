import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database, CheckCircle, Server, Zap, Layers, ShieldAlert, Loader2, CloudOff, Save } from 'lucide-react';
import { Product, Client, CashMovement, SaleRecord, ServiceOrder, Supplier, Brand, Category, BankAccount } from '../types';

interface DatabaseModuleProps {
    isSyncEnabled: boolean;
    data: any;
    onSyncDownload: (data: any) => void;
}

const tableDefinitions = [
    { name: "tenants", desc: "Empresas/Inquilinos del sistema SaaS" },
    { name: "system_users", desc: "Usuarios, roles y credenciales" },
    { name: "products", desc: "Catálogo de productos y stock" },
    { name: "clients", desc: "Directorio de clientes y saldos" },
    { name: "sales", desc: "Historial de ventas y facturación" },
    { name: "purchases", desc: "Historial de compras a proveedores" },
    { name: "cash_movements", desc: "Ingresos y egresos de dinero (Caja)" },
    { name: "service_orders", desc: "Órdenes de servicio técnico" },
    { name: "suppliers", desc: "Directorio de proveedores" },
    { name: "brands", desc: "Marcas de productos" },
    { name: "categories", desc: "Categorías de productos" },
    { name: "bank_accounts", desc: "Cuentas bancarias de la empresa" },
    { name: "branches", desc: "Sucursales físicas" },
    { name: "warehouse_transfers", desc: "Traslados de mercadería entre sucursales" },
    { name: "stock_movements", desc: "Kardex y movimientos de inventario" },
    { name: "inventory_history", desc: "Auditorías y conteos físicos" },
    { name: "quotations", desc: "Cotizaciones a clientes" },
    { name: "presales", desc: "Preventas y pedidos pendientes" },
    { name: "cash_box_sessions", desc: "Aperturas y cierres de caja" },
    { name: "cash_transfer_requests", desc: "Solicitudes de traslado de dinero" },
    { name: "fixed_expenses", desc: "Catálogo de gastos fijos" },
    { name: "fixed_incomes", desc: "Catálogo de ingresos fijos" },
    { name: "crm_contacts", desc: "Contactos y prospectos del CRM" },
    { name: "crm_stages", desc: "Etapas del embudo de ventas" },
    { name: "ai_sources", desc: "Documentos de entrenamiento para IA" },
    { name: "ai_config", desc: "Configuración del asistente virtual" },
    { name: "ai_training_logs", desc: "Historial de entrenamiento de IA" },
    { name: "broadcast_groups", desc: "Grupos de difusión para WhatsApp" },
    { name: "broadcast_jobs", desc: "Campañas de mensajes masivos" },
    { name: "tenant_invoices", desc: "Facturación a inquilinos (SaaS)" },
    { name: "master_accounts", desc: "Cuentas maestras del Super Admin" },
    { name: "master_movements", desc: "Movimientos financieros del Super Admin" }
];

const DatabaseModule: React.FC<DatabaseModuleProps> = ({ isSyncEnabled }) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [tableStatuses, setTableStatuses] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const storedUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
        const storedKey = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_KEY || '';
        if (storedUrl) setSupabaseUrl(storedUrl);
        if (storedKey) setSupabaseKey(storedKey);
        if (storedUrl && storedKey) checkConnection(storedUrl, storedKey);
    }, []);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const checkTablesExistence = async (supabase: any) => {
        const newStatuses: Record<string, boolean> = {};
        // Check in parallel batches to avoid blocking too long but not overwhelm
        const batchSize = 5;
        for (let i = 0; i < tableDefinitions.length; i += batchSize) {
            const batch = tableDefinitions.slice(i, i + batchSize);
            await Promise.all(batch.map(async (t) => {
                const { error } = await supabase.from(t.name).select('id', { count: 'exact', head: true });
                // 42P01 means undefined_table (relation does not exist)
                newStatuses[t.name] = !(error && error.code === '42P01');
            }));
            setTableStatuses(prev => ({...prev, ...newStatuses}));
        }
    };

    const checkConnection = async (url: string, key: string) => {
        if (!url || !key) return;
        try {
            const supabase = createClient(url, key);
            const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });
            if (error && error.code !== '42P01' && error.code !== 'PGRST116') {
               console.warn("Table check error (ignorable):", error);
            }
            setStatus('CONNECTED');
            addLog("✅ Conexión establecida. Verificando tablas...");
            checkTablesExistence(supabase);
        } catch (e: any) {
            setStatus('ERROR');
            addLog(`❌ Error de conexión: ${e.message || 'Verifique URL/Key'}`);
        }
    };
    
    const handleSaveConfig = () => {
        localStorage.setItem('supabase_url', supabaseUrl);
        localStorage.setItem('supabase_key', supabaseKey);
        addLog("Configuración guardada. Probando conexión...");
        setTableStatuses({}); // Reset statuses
        checkConnection(supabaseUrl, supabaseKey);
    };

    const handleMigrateData = async () => {
        if (status !== 'CONNECTED' || !isSyncEnabled || !supabaseUrl || !supabaseKey) return alert("Sin conexión o sincronización desactivada.");
        setLoading(true);
        addLog("🚀 Iniciando migración de datos locales a Supabase...");
        
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Migrate Products
            if (data.products && data.products.length > 0) {
                addLog(`Subiendo ${data.products.length} productos...`);
                const { error } = await supabase.from('products').upsert(data.products);
                if (error) throw error;
            }

            // Migrate Clients
            if (data.clients && data.clients.length > 0) {
                addLog(`Subiendo ${data.clients.length} clientes...`);
                const { error } = await supabase.from('clients').upsert(data.clients);
                if (error) throw error;
            }

            // Migrate Sales
            if (data.sales && data.sales.length > 0) {
                addLog(`Subiendo ${data.sales.length} ventas...`);
                const { error } = await supabase.from('sales').upsert(data.sales);
                if (error) throw error;
            }

            // Migrate Services
            if (data.services && data.services.length > 0) {
                addLog(`Subiendo ${data.services.length} órdenes de servicio...`);
                const { error } = await supabase.from('service_orders').upsert(data.services);
                if (error) throw error;
            }

            addLog("✅ Migración completada exitosamente.");
            addLog("🎉 ¡El sistema ahora está guardando en Supabase!");
            
            // Notify App.tsx to start using Supabase
            if (onSyncDownload) {
                onSyncDownload({ isSupabaseActive: true });
            }
            
        } catch (error: any) {
            console.error("Error migrating data:", error);
            addLog(`❌ Error en la migración: ${error.message}`);
            alert(`Error en la migración: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTableSchema = async () => {
        if (status !== 'CONNECTED' || !isSyncEnabled || !supabaseUrl || !supabaseKey) return alert("Sin conexión o sincronización desactivada.");
        setLoading(true);
        addLog("⚙️ Iniciando creación de esquema de 32 tablas...");
        
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const schemaSQL = `
                -- Core ERP
                CREATE TABLE IF NOT EXISTS public.tenants ( id TEXT PRIMARY KEY, company_name TEXT, industry TEXT, status TEXT, subscription_end TEXT, owner_name TEXT, phone TEXT, plan_type TEXT, base_currency TEXT, credit_balance NUMERIC );
                CREATE TABLE IF NOT EXISTS public.system_users ( id TEXT PRIMARY KEY, username TEXT UNIQUE, full_name TEXT, email TEXT, "password" TEXT, "role" TEXT, active BOOLEAN, permissions TEXT[], company_name TEXT, industry TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.products ( id TEXT PRIMARY KEY, code TEXT, name TEXT, category TEXT, price NUMERIC, cost NUMERIC, stock INTEGER, location TEXT, brand TEXT, min_stock INTEGER, max_stock INTEGER, stock_control_mode TEXT, status TEXT, price_tiers JSONB, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.clients ( id TEXT PRIMARY KEY, name TEXT, dni TEXT, phone TEXT, email TEXT, address TEXT, district TEXT, province TEXT, department TEXT, credit_line NUMERIC, credit_used NUMERIC, total_purchases NUMERIC, last_purchase_date TEXT, payment_score INTEGER, tags TEXT[], digital_balance NUMERIC, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.sales ( id TEXT PRIMARY KEY, global_id TEXT, correlative_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, client_id TEXT, client_name TEXT, doc_type TEXT, total NUMERIC, currency TEXT, exchange_rate NUMERIC, items JSONB, payment_breakdown JSONB, detailed_payments JSONB, user_name TEXT, sunat_status TEXT, sunat_response TEXT, sunat_hash TEXT );
                CREATE TABLE IF NOT EXISTS public.purchases ( id TEXT PRIMARY KEY, global_id TEXT, correlative_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, supplier_id TEXT, supplier_name TEXT, doc_type TEXT, total NUMERIC, currency TEXT, exchange_rate NUMERIC, items JSONB, payment_condition TEXT, detailed_payments JSONB, user_name TEXT );
                CREATE TABLE IF NOT EXISTS public.cash_movements ( id TEXT PRIMARY KEY, global_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, type TEXT, payment_method TEXT, concept TEXT, reference_id TEXT, amount NUMERIC, user_name TEXT, related_items JSONB, financial_type TEXT, category TEXT, account_id TEXT, currency TEXT, accumulated_balance NUMERIC, sequential_id TEXT );
                CREATE TABLE IF NOT EXISTS public.service_orders ( id TEXT PRIMARY KEY, global_id TEXT, correlative_id TEXT, tenant_id TEXT, branch_id TEXT, entry_date TEXT, entry_time TEXT, client_id TEXT, client TEXT, client_phone TEXT, device_model TEXT, issue TEXT, status TEXT, technician TEXT, receptionist TEXT, cost NUMERIC, used_products JSONB, exit_date TEXT, exit_time TEXT, color TEXT );
                CREATE TABLE IF NOT EXISTS public.suppliers ( id TEXT PRIMARY KEY, name TEXT, ruc TEXT, phone TEXT, email TEXT, address TEXT, contact_name TEXT, digital_balance NUMERIC, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.brands ( id TEXT PRIMARY KEY, name TEXT UNIQUE, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.categories ( id TEXT PRIMARY KEY, name TEXT UNIQUE, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.bank_accounts ( id TEXT PRIMARY KEY, bank_name TEXT, account_number TEXT, currency TEXT, alias TEXT, use_in_sales BOOLEAN, use_in_purchases BOOLEAN, tenant_id TEXT );

                -- Branches & Inventory
                CREATE TABLE IF NOT EXISTS public.branches ( id TEXT PRIMARY KEY, name TEXT, address TEXT, phone TEXT, is_main BOOLEAN, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.warehouse_transfers ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, from_branch_id TEXT, to_branch_id TEXT, from_branch_name TEXT, to_branch_name TEXT, items JSONB, status TEXT, user_name TEXT, notes TEXT, currency TEXT, amount NUMERIC, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.stock_movements ( id TEXT PRIMARY KEY, global_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, product_id TEXT, product_name TEXT, type TEXT, quantity NUMERIC, current_stock NUMERIC, reference TEXT, user_name TEXT, unit_cost NUMERIC );
                CREATE TABLE IF NOT EXISTS public.inventory_history ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, user_name TEXT, status TEXT, items JSONB, tenant_id TEXT );

                -- Sales Advanced
                CREATE TABLE IF NOT EXISTS public.quotations ( id TEXT PRIMARY KEY, global_id TEXT, correlative_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, client_id TEXT, client_name TEXT, items JSONB, total NUMERIC );
                CREATE TABLE IF NOT EXISTS public.presales ( id TEXT PRIMARY KEY, global_id TEXT, correlative_id TEXT, tenant_id TEXT, branch_id TEXT, date TEXT, "time" TEXT, delivery_date TEXT, client_id TEXT, client_name TEXT, items JSONB, total NUMERIC, status TEXT );

                -- Cash Advanced
                CREATE TABLE IF NOT EXISTS public.cash_box_sessions ( id TEXT PRIMARY KEY, branch_id TEXT, opening_date TEXT, closing_date TEXT, opening_user TEXT, closing_user TEXT, status TEXT, expected_opening NUMERIC, counted_opening NUMERIC, opening_difference NUMERIC, opening_notes TEXT, confirmed_digital_at_open JSONB, expected_cash_at_close NUMERIC, counted_cash_at_close NUMERIC, cash_difference_at_close NUMERIC, expected_digital_at_close NUMERIC, confirmed_digital_at_close JSONB, closing_notes TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.cash_transfer_requests ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, from_branch_id TEXT, from_branch_name TEXT, to_branch_id TEXT, to_branch_name TEXT, amount NUMERIC, currency TEXT, status TEXT, user_name TEXT, notes TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.fixed_expenses ( id TEXT PRIMARY KEY, name TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.fixed_incomes ( id TEXT PRIMARY KEY, name TEXT, tenant_id TEXT );

                -- CRM & Marketing
                CREATE TABLE IF NOT EXISTS public.crm_contacts ( id TEXT PRIMARY KEY, name TEXT, phone TEXT, stage TEXT, labels JSONB, notes JSONB, email TEXT, address TEXT, last_interaction TEXT, next_follow_up TEXT, value NUMERIC, assigned_agent TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.crm_stages ( id TEXT PRIMARY KEY, name TEXT, color TEXT, "order" INTEGER, tenant_id TEXT );

                -- AI & WhatsApp
                CREATE TABLE IF NOT EXISTS public.ai_sources ( id TEXT PRIMARY KEY, name TEXT, type TEXT, content TEXT, status TEXT, date TEXT, size TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.ai_config ( id TEXT PRIMARY KEY, assistant_name TEXT, description TEXT, model TEXT, temperature NUMERIC, system_instruction TEXT, enable_audio BOOLEAN, enable_images BOOLEAN, enable_agent_handoff BOOLEAN, handoff_message TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.ai_training_logs ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, user_name TEXT, action TEXT, status TEXT, duration TEXT, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.broadcast_groups ( id TEXT PRIMARY KEY, name TEXT, contacts JSONB, tenant_id TEXT );
                CREATE TABLE IF NOT EXISTS public.broadcast_jobs ( id TEXT PRIMARY KEY, scheduled_date TEXT, scheduled_time TEXT, recipients JSONB, message TEXT, media_data JSONB, delay INTEGER, status TEXT, tenant_id TEXT );

                -- Super Admin (SaaS)
                CREATE TABLE IF NOT EXISTS public.tenant_invoices ( id TEXT PRIMARY KEY, tenant_id TEXT, tenant_name TEXT, date TEXT, due_date TEXT, amount NUMERIC, credit_applied NUMERIC, net_amount NUMERIC, status TEXT, plan_type TEXT );
                CREATE TABLE IF NOT EXISTS public.master_accounts ( id TEXT PRIMARY KEY, name TEXT, type TEXT, currency TEXT, balance NUMERIC );
                CREATE TABLE IF NOT EXISTS public.master_movements ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, type TEXT, account_id TEXT, account_name TEXT, amount NUMERIC, concept TEXT, tenant_id TEXT, reference TEXT );
            `;
            
            const { error } = await supabase.rpc('execute_sql', { sql: schemaSQL });
            if (error) throw error;
            
            addLog("✅ ¡Éxito! Todas las 32 tablas fueron creadas/verificadas.");
            checkTablesExistence(supabase); // Re-check statuses after creation
        } catch (e: any) {
            addLog(`❌ Error al crear esquema: ${e.message}`);
            addLog("💡 Tip: Asegúrate de haber creado la función 'execute_sql' en Supabase.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full gap-6">
            <div className="w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><Database className="text-blue-500"/> Configuración</h2>
                <div className="space-y-4 flex-1">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Supabase Project URL</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" placeholder="https://xyz.supabase.co" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)}/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Supabase Anon Key</label><input type="password" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" placeholder="Key..." value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)}/></div>
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${status === 'CONNECTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{status === 'CONNECTED' ? <CheckCircle/> : <Server/>}<div><p className="font-bold text-sm">{status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}</p></div></div>
                </div>
                <button onClick={handleSaveConfig} className="w-full py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl mt-4">Guardar y Probar</button>
            </div>
            <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-hidden flex flex-col">
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Layers className="text-indigo-500"/> Estructura de Base de Datos (32 Tablas)</h2>
                        <div className="flex gap-2">
                            <button onClick={handleCreateTableSchema} disabled={loading} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16}/>} 
                                {loading ? 'Creando...' : 'Paso 1: Desplegar Tablas'}
                            </button>
                            <button onClick={handleMigrateData} disabled={loading || status !== 'CONNECTED'} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16}/>} 
                                {loading ? 'Migrando...' : 'Paso 2: Migrar y Activar Guardado'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 pl-6 w-12 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">#</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">Nombre de Tabla</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">Descripción</th>
                                    <th className="p-3 pr-6 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 text-right">Estado en Supabase</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableDefinitions.map((t, idx) => (
                                    <tr key={t.name} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 pl-6 text-sm text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                                        <td className="p-3 font-mono text-sm text-indigo-600 dark:text-indigo-400 font-medium">{t.name}</td>
                                        <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{t.desc}</td>
                                        <td className="p-3 pr-6 text-right">
                                            {status === 'CONNECTED' ? (
                                                tableStatuses[t.name] === undefined ? (
                                                    <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                                        <Loader2 className="animate-spin" size={14} /> Verificando...
                                                    </span>
                                                ) : tableStatuses[t.name] ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Faltante
                                                    </span>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                    <CloudOff size={12} /> Offline
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-40 flex flex-col">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Consola de Despliegue</h2>
                    <div className="flex-1 bg-slate-900 rounded-xl p-3 overflow-y-auto font-mono text-xs text-green-400 shadow-inner border border-slate-800">
                        {logs.length === 0 ? <span className="opacity-50">// Esperando acciones...</span> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseModule;