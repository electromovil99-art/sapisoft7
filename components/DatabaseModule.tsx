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

const DatabaseModule: React.FC<DatabaseModuleProps> = ({ isSyncEnabled, data, onSyncDownload }) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [tableStatuses, setTableStatuses] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Priorizar variables de entorno (Vercel) sobre localStorage
        const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
        const key = import.meta.env.VITE_SUPABASE_KEY || localStorage.getItem('supabase_key') || '';
        
        if (url) setSupabaseUrl(url);
        if (key) setSupabaseKey(key);
        
        if (url && key) {
            checkConnection(url, key);
        }
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
            if (data?.products && data.products.length > 0) {
                addLog(`Subiendo ${data.products.length} productos...`);
                const { error } = await supabase.from('products').upsert(data.products);
                if (error) throw error;
            }

            // Migrate Clients
            if (data?.clients && data.clients.length > 0) {
                addLog(`Subiendo ${data.clients.length} clientes...`);
                const { error } = await supabase.from('clients').upsert(data.clients);
                if (error) throw error;
            }

            // Migrate Sales
            if (data?.sales && data.sales.length > 0) {
                addLog(`Subiendo ${data.sales.length} ventas...`);
                const { error } = await supabase.from('sales').upsert(data.sales);
                if (error) throw error;
            }

            // Migrate Services
            if (data?.services && data.services.length > 0) {
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
                -- Drop existing tables to recreate with camelCase columns
                DROP TABLE IF EXISTS public.tenants CASCADE;
                DROP TABLE IF EXISTS public.system_users CASCADE;
                DROP TABLE IF EXISTS public.products CASCADE;
                DROP TABLE IF EXISTS public.clients CASCADE;
                DROP TABLE IF EXISTS public.sales CASCADE;
                DROP TABLE IF EXISTS public.purchases CASCADE;
                DROP TABLE IF EXISTS public.cash_movements CASCADE;
                DROP TABLE IF EXISTS public.service_orders CASCADE;
                DROP TABLE IF EXISTS public.suppliers CASCADE;
                DROP TABLE IF EXISTS public.brands CASCADE;
                DROP TABLE IF EXISTS public.categories CASCADE;
                DROP TABLE IF EXISTS public.bank_accounts CASCADE;
                DROP TABLE IF EXISTS public.branches CASCADE;
                DROP TABLE IF EXISTS public.warehouse_transfers CASCADE;
                DROP TABLE IF EXISTS public.stock_movements CASCADE;
                DROP TABLE IF EXISTS public.inventory_history CASCADE;
                DROP TABLE IF EXISTS public.quotations CASCADE;
                DROP TABLE IF EXISTS public.presales CASCADE;
                DROP TABLE IF EXISTS public.cash_box_sessions CASCADE;
                DROP TABLE IF EXISTS public.cash_transfer_requests CASCADE;
                DROP TABLE IF EXISTS public.fixed_expenses CASCADE;
                DROP TABLE IF EXISTS public.fixed_incomes CASCADE;
                DROP TABLE IF EXISTS public.crm_contacts CASCADE;
                DROP TABLE IF EXISTS public.crm_stages CASCADE;
                DROP TABLE IF EXISTS public.ai_sources CASCADE;
                DROP TABLE IF EXISTS public.ai_config CASCADE;
                DROP TABLE IF EXISTS public.ai_training_logs CASCADE;
                DROP TABLE IF EXISTS public.broadcast_groups CASCADE;
                DROP TABLE IF EXISTS public.broadcast_jobs CASCADE;
                DROP TABLE IF EXISTS public.tenant_invoices CASCADE;
                DROP TABLE IF EXISTS public.master_accounts CASCADE;
                DROP TABLE IF EXISTS public.master_movements CASCADE;

                -- Core ERP
                CREATE TABLE IF NOT EXISTS public.tenants ( id TEXT PRIMARY KEY, "companyName" TEXT, industry TEXT, status TEXT, "subscriptionEnd" TEXT, "ownerName" TEXT, phone TEXT, "planType" TEXT, "baseCurrency" TEXT, "creditBalance" NUMERIC );
                CREATE TABLE IF NOT EXISTS public.system_users ( id TEXT PRIMARY KEY, username TEXT UNIQUE, "fullName" TEXT, email TEXT, "password" TEXT, "role" TEXT, active BOOLEAN, permissions TEXT[], "companyName" TEXT, industry TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.products ( id TEXT PRIMARY KEY, code TEXT, name TEXT, category TEXT, price NUMERIC, cost NUMERIC, stock INTEGER, location TEXT, brand TEXT, "minStock" INTEGER, "maxStock" INTEGER, "stockControlMode" TEXT, status TEXT, "priceTiers" JSONB, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.clients ( id TEXT PRIMARY KEY, name TEXT, dni TEXT, phone TEXT, email TEXT, address TEXT, district TEXT, province TEXT, department TEXT, "creditLine" NUMERIC, "creditUsed" NUMERIC, "totalPurchases" NUMERIC, "lastPurchaseDate" TEXT, "paymentScore" INTEGER, tags TEXT[], "digitalBalance" NUMERIC, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.sales ( id TEXT PRIMARY KEY, "globalId" TEXT, "correlativeId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, "clientId" TEXT, "clientName" TEXT, "docType" TEXT, total NUMERIC, currency TEXT, "exchangeRate" NUMERIC, items JSONB, "paymentBreakdown" JSONB, "detailedPayments" JSONB, "user" TEXT, "sunatStatus" TEXT, "sunatResponse" TEXT, "sunatHash" TEXT );
                CREATE TABLE IF NOT EXISTS public.purchases ( id TEXT PRIMARY KEY, "globalId" TEXT, "correlativeId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, "supplierId" TEXT, "supplierName" TEXT, "docType" TEXT, total NUMERIC, currency TEXT, "exchangeRate" NUMERIC, items JSONB, "paymentCondition" TEXT, "detailedPayments" JSONB, "user" TEXT );
                CREATE TABLE IF NOT EXISTS public.cash_movements ( id TEXT PRIMARY KEY, "globalId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, type TEXT, "paymentMethod" TEXT, concept TEXT, "referenceId" TEXT, amount NUMERIC, "user" TEXT, "relatedItems" JSONB, "financialType" TEXT, category TEXT, "accountId" TEXT, currency TEXT, "accumulatedBalance" NUMERIC, "sequentialId" TEXT );
                CREATE TABLE IF NOT EXISTS public.service_orders ( id TEXT PRIMARY KEY, "globalId" TEXT, "correlativeId" TEXT, "tenantId" TEXT, "branchId" TEXT, "entryDate" TEXT, "entryTime" TEXT, "clientId" TEXT, client TEXT, "clientPhone" TEXT, "deviceModel" TEXT, issue TEXT, status TEXT, technician TEXT, receptionist TEXT, cost NUMERIC, "usedProducts" JSONB, "exitDate" TEXT, "exitTime" TEXT, color TEXT );
                CREATE TABLE IF NOT EXISTS public.suppliers ( id TEXT PRIMARY KEY, name TEXT, ruc TEXT, phone TEXT, email TEXT, address TEXT, "contactName" TEXT, "digitalBalance" NUMERIC, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.brands ( id TEXT PRIMARY KEY, name TEXT UNIQUE, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.categories ( id TEXT PRIMARY KEY, name TEXT UNIQUE, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.bank_accounts ( id TEXT PRIMARY KEY, "bankName" TEXT, "accountNumber" TEXT, currency TEXT, alias TEXT, "useInSales" BOOLEAN, "useInPurchases" BOOLEAN, "tenantId" TEXT );

                -- Branches & Inventory
                CREATE TABLE IF NOT EXISTS public.branches ( id TEXT PRIMARY KEY, name TEXT, address TEXT, phone TEXT, "isMain" BOOLEAN, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.warehouse_transfers ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, "fromBranchId" TEXT, "toBranchId" TEXT, "fromBranchName" TEXT, "toBranchName" TEXT, items JSONB, status TEXT, "user" TEXT, notes TEXT, currency TEXT, amount NUMERIC, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.stock_movements ( id TEXT PRIMARY KEY, "globalId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, "productId" TEXT, "productName" TEXT, type TEXT, quantity NUMERIC, "currentStock" NUMERIC, reference TEXT, "user" TEXT, "unitCost" NUMERIC );
                CREATE TABLE IF NOT EXISTS public.inventory_history ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, "user" TEXT, status TEXT, items JSONB, "tenantId" TEXT );

                -- Sales Advanced
                CREATE TABLE IF NOT EXISTS public.quotations ( id TEXT PRIMARY KEY, "globalId" TEXT, "correlativeId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, "clientId" TEXT, "clientName" TEXT, items JSONB, total NUMERIC );
                CREATE TABLE IF NOT EXISTS public.presales ( id TEXT PRIMARY KEY, "globalId" TEXT, "correlativeId" TEXT, "tenantId" TEXT, "branchId" TEXT, date TEXT, "time" TEXT, "deliveryDate" TEXT, "clientId" TEXT, "clientName" TEXT, items JSONB, total NUMERIC, status TEXT );

                -- Cash Advanced
                CREATE TABLE IF NOT EXISTS public.cash_box_sessions ( id TEXT PRIMARY KEY, "branchId" TEXT, "openingDate" TEXT, "closingDate" TEXT, "openingUser" TEXT, "closingUser" TEXT, status TEXT, "expectedOpening" NUMERIC, "countedOpening" NUMERIC, "openingDifference" NUMERIC, "openingNotes" TEXT, "confirmedDigitalAtOpen" JSONB, "expectedCashAtClose" NUMERIC, "countedCashAtClose" NUMERIC, "cashDifferenceAtClose" NUMERIC, "expectedDigitalAtClose" NUMERIC, "confirmedDigitalAtClose" JSONB, "closingNotes" TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.cash_transfer_requests ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, "fromBranchId" TEXT, "fromBranchName" TEXT, "toBranchId" TEXT, "toBranchName" TEXT, amount NUMERIC, currency TEXT, status TEXT, "user" TEXT, notes TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.fixed_expenses ( id TEXT PRIMARY KEY, name TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.fixed_incomes ( id TEXT PRIMARY KEY, name TEXT, "tenantId" TEXT );

                -- CRM & Marketing
                CREATE TABLE IF NOT EXISTS public.crm_contacts ( id TEXT PRIMARY KEY, name TEXT, phone TEXT, stage TEXT, labels JSONB, notes JSONB, email TEXT, address TEXT, "lastInteraction" TEXT, "nextFollowUp" TEXT, value NUMERIC, "assignedAgent" TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.crm_stages ( id TEXT PRIMARY KEY, name TEXT, color TEXT, "order" INTEGER, "tenantId" TEXT );

                -- AI & WhatsApp
                CREATE TABLE IF NOT EXISTS public.ai_sources ( id TEXT PRIMARY KEY, name TEXT, type TEXT, content TEXT, status TEXT, date TEXT, size TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.ai_config ( id TEXT PRIMARY KEY, "assistantName" TEXT, description TEXT, model TEXT, temperature NUMERIC, "systemInstruction" TEXT, "enableAudio" BOOLEAN, "enableImages" BOOLEAN, "enableAgentHandoff" BOOLEAN, "handoffMessage" TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.ai_training_logs ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, "user" TEXT, action TEXT, status TEXT, duration TEXT, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.broadcast_groups ( id TEXT PRIMARY KEY, name TEXT, contacts JSONB, "tenantId" TEXT );
                CREATE TABLE IF NOT EXISTS public.broadcast_jobs ( id TEXT PRIMARY KEY, "scheduledDate" TEXT, "scheduledTime" TEXT, recipients JSONB, message TEXT, "mediaData" JSONB, delay INTEGER, status TEXT, "tenantId" TEXT );

                -- Super Admin (SaaS)
                CREATE TABLE IF NOT EXISTS public.tenant_invoices ( id TEXT PRIMARY KEY, "tenantId" TEXT, "tenantName" TEXT, date TEXT, "dueDate" TEXT, amount NUMERIC, "creditApplied" NUMERIC, "netAmount" NUMERIC, status TEXT, "planType" TEXT );
                CREATE TABLE IF NOT EXISTS public.master_accounts ( id TEXT PRIMARY KEY, name TEXT, type TEXT, currency TEXT, balance NUMERIC );
                CREATE TABLE IF NOT EXISTS public.master_movements ( id TEXT PRIMARY KEY, date TEXT, "time" TEXT, type TEXT, "accountId" TEXT, "accountName" TEXT, amount NUMERIC, concept TEXT, "tenantId" TEXT, reference TEXT );
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