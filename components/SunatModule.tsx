import React, { useState, useMemo, useRef } from 'react';
import { 
    ShieldCheck, Send, CheckCircle2, XCircle, AlertCircle, Clock, 
    FileText, Search, Filter, Loader2, Download, Eye, ExternalLink, 
    Zap, Activity, Info, X, Settings, Lock, Key, Globe, FileCode, Upload, EyeOff,
    User, Edit3, Save, AlertTriangle, RefreshCw
} from 'lucide-react';
import { SaleRecord } from '../types';

interface SunatModuleProps {
    sales: SaleRecord[];
    onUpdateSaleSunatStatus: (ticketId: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR', response: string) => void;
    onUpdateSaleData?: (ticketId: string, updates: Partial<SaleRecord>) => void;
}

export const SunatModule: React.FC<SunatModuleProps> = ({ sales, onUpdateSaleSunatStatus, onUpdateSaleData }) => {
    const [activeTab, setActiveTab] = useState<'DOCS' | 'CONFIG'>('DOCS');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [showCdrModal, setShowCdrModal] = useState<SaleRecord | null>(null);
    
    // Estados para Corrección de Errores
    const [showCorrectionModal, setShowCorrectionModal] = useState<SaleRecord | null>(null);
    const [correctionData, setCorrectionData] = useState({ clientName: '', clientDni: '' });

    // --- CONFIG STATES ---
    const [config, setConfig] = useState({
        ruc: '20601234567',
        userSol: 'MODDATOS',
        passSol: 'clave123',
        environment: 'BETA', // BETA or PRODUCTION
        certPass: 'cert123'
    });
    const [showPass, setShowPass] = useState(false);
    const [certificateName, setCertificateName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const electronicSales = useMemo(() => {
        return sales.filter(s => 
            s.docType === 'BOLETA ELECTRÓNICA' || 
            s.docType === 'FACTURA ELECTRÓNICA' || 
            s.docType === 'NOTA DE CRÉDITO'
        );
    }, [sales]);

    const filteredSales = useMemo(() => {
        return electronicSales.filter(s => {
            const matchesSearch = s.id.includes(searchTerm) || s.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' ? true : s.sunatStatus === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const dateA = a.date.split('/').reverse().join('') + a.time;
            const dateB = b.date.split('/').reverse().join('') + b.time;
            return dateB.localeCompare(dateA);
        });
    }, [electronicSales, searchTerm, statusFilter]);

    const handleSendToSunat = async (sale: SaleRecord) => {
        if (!certificateName) {
            alert("⚠️ Error: Debe cargar un Certificado Digital en la pestaña de Configuración antes de enviar documentos.");
            setActiveTab('CONFIG');
            return;
        }

        setIsProcessing(sale.id);
        const delay = Math.floor(Math.random() * 2000) + 2000;
        
        setTimeout(() => {
            const rand = Math.random();
            let status: 'ACCEPTED' | 'REJECTED' | 'ERROR';
            let response: string;

            if (rand > 0.15) {
                status = 'ACCEPTED';
                response = 'El comprobante ha sido aceptado.';
            } else if (rand > 0.05) {
                status = 'REJECTED';
                response = 'Error 2030: El RUC del receptor no es válido o está inactivo.';
            } else {
                status = 'ERROR';
                response = 'Error de conexión: No se pudo establecer comunicación con el servidor OSE/SUNAT.';
            }

            onUpdateSaleSunatStatus(sale.id, status, response);
            setIsProcessing(null);
        }, delay);
    };

    const handleDownloadXml = (sale: SaleRecord) => {
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <cbc:ID>R-${sale.id}</cbc:ID>
    <cbc:ResponseDate>${sale.date.split('/').reverse().join('-')}</cbc:ResponseDate>
    <cbc:ResponseTime>${sale.time}:00</cbc:ResponseTime>
    <cac:ReceiverParty>
        <cac:PartyIdentification>
            <cbc:ID schemeID="6">${config.ruc}</cbc:ID>
        </cac:PartyIdentification>
    </cac:ReceiverParty>
    <cac:DocumentResponse>
        <cac:Response>
            <cbc:ReferenceID>${sale.id}</cbc:ReferenceID>
            <cbc:ResponseCode>0</cbc:ResponseCode>
            <cbc:Description>${sale.sunatResponse}</cbc:Description>
        </cac:Response>
    </cac:DocumentResponse>
    <ds:Signature>
        <ds:SignedInfo>
            <ds:Reference>
                <ds:DigestValue>${sale.sunatHash || 'SAPISOFT_HASH_SIMULATION'}</ds:DigestValue>
            </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>MOCK_SIGNATURE_VALUE_REPRESENTING_SUNAT_VALIDATION</ds:SignatureValue>
    </ds:Signature>
</ApplicationResponse>`;

        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CDR-${sale.id}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCertificateName(file.name);
        }
    };

    const handleOpenCorrection = (sale: SaleRecord) => {
        setShowCorrectionModal(sale);
        setCorrectionData({ 
            clientName: sale.clientName, 
            // Buscamos si existe un DNI/RUC en el nombre (común en SapiSoft) o asumimos campo vacío para corregir
            clientDni: '' 
        });
    };

    const handleSaveCorrection = () => {
        if (!showCorrectionModal || !onUpdateSaleData) return;

        onUpdateSaleData(showCorrectionModal.id, {
            clientName: correctionData.clientName.toUpperCase(),
            sunatStatus: 'PENDING',
            sunatResponse: ''
        });

        alert("✅ Datos corregidos. El comprobante ahora puede volver a enviarse.");
        setShowCorrectionModal(null);
    };

    const stats = useMemo(() => {
        const total = electronicSales.length;
        const accepted = electronicSales.filter(s => s.sunatStatus === 'ACCEPTED').length;
        const pending = electronicSales.filter(s => !s.sunatStatus || s.sunatStatus === 'PENDING').length;
        const errors = total - accepted - pending;
        return { total, accepted, pending, errors };
    }, [electronicSales]);

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500">
            {/* Nav Tabs */}
            <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700/50 rounded-xl w-fit shrink-0">
                <button 
                    onClick={() => setActiveTab('DOCS')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'DOCS' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <FileText size={14}/> Documentos
                </button>
                <button 
                    onClick={() => setActiveTab('CONFIG')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'CONFIG' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <Settings size={14}/> Configuración SOL
                </button>
            </div>

            {activeTab === 'DOCS' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={12}/> Total Documentos</p>
                            <div className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{stats.total}</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle2 size={12}/> Aceptados</p>
                            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 leading-none tracking-tighter">{stats.accepted}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-[2rem] border border-amber-100 dark:border-amber-800 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={12}/> Pendientes</p>
                            <div className="text-3xl font-black text-amber-700 dark:text-emerald-400 leading-none tracking-tighter">{stats.pending}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-[2rem] border border-rose-100 dark:border-rose-800 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><XCircle size={12}/> Errores/Rechazos</p>
                            <div className="text-3xl font-black text-rose-700 dark:text-rose-400 leading-none tracking-tighter">{stats.errors}</div>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4 px-6 md:px-8">
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por cliente o número de serie..."
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none focus:border-primary-500 transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-slate-400"/>
                                    <select 
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as any)}
                                        className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase outline-none cursor-pointer"
                                    >
                                        <option value="ALL">TODOS</option>
                                        <option value="PENDING">PENDIENTES</option>
                                        <option value="ACCEPTED">ACEPTADOS</option>
                                        <option value="REJECTED">RECHAZADOS</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${config.environment === 'BETA' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Entorno: {config.environment === 'BETA' ? 'DEMO/BETA' : 'PRODUCCIÓN'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Fecha/Hora</th>
                                        <th className="px-6 py-4">Tipo Doc</th>
                                        <th className="px-6 py-4">Serie-Correlativo</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-right">Monto</th>
                                        <th className="px-6 py-4 text-center">Estado SUNAT</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center text-slate-300 dark:text-slate-600 font-black uppercase tracking-widest italic opacity-50">
                                                No se encontraron documentos electrónicos
                                            </td>
                                        </tr>
                                    ) : filteredSales.map(sale => (
                                        <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-700 dark:text-slate-300">{sale.date}</div>
                                                <div className="text-[9px] text-slate-400 font-bold">{sale.time}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase border ${
                                                    sale.docType.includes('FACTURA') ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                    sale.docType.includes('BOLETA') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                    {sale.docType.split(' ')[0]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-black text-slate-800 dark:text-white">#{sale.id}</td>
                                            <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[180px]">{sale.clientName}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">S/ {sale.total.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {sale.sunatStatus === 'ACCEPTED' ? (
                                                        <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase">
                                                            <CheckCircle2 size={12}/> Aceptado
                                                        </div>
                                                    ) : sale.sunatStatus === 'REJECTED' || sale.sunatStatus === 'ERROR' ? (
                                                        <div className="flex items-center gap-1 text-rose-600 font-black text-[10px] uppercase">
                                                            <XCircle size={12}/> {sale.sunatStatus}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-amber-600 font-black text-[10px] uppercase">
                                                            <Clock size={12}/> Pendiente
                                                        </div>
                                                    )}
                                                    {sale.sunatResponse && (
                                                        <p className="text-[8px] font-bold text-slate-400 max-w-[120px] truncate leading-none" title={sale.sunatResponse}>
                                                            {sale.sunatResponse}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(!sale.sunatStatus || sale.sunatStatus === 'PENDING') ? (
                                                        <button 
                                                            onClick={() => handleSendToSunat(sale)}
                                                            disabled={isProcessing === sale.id}
                                                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-90 shadow-md disabled:opacity-50"
                                                            title="Enviar a SUNAT"
                                                        >
                                                            {isProcessing === sale.id ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                                        </button>
                                                    ) : (sale.sunatStatus === 'REJECTED' || sale.sunatStatus === 'ERROR') ? (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleOpenCorrection(sale)}
                                                                className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all active:scale-90 shadow-md"
                                                                title="Corregir Error y Reintentar"
                                                            >
                                                                <Edit3 size={16}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSendToSunat(sale)}
                                                                disabled={isProcessing === sale.id}
                                                                className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-90 shadow-md disabled:opacity-50"
                                                                title="Reintentar Envío tal cual"
                                                            >
                                                                {isProcessing === sale.id ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setShowCdrModal(sale)}
                                                            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all active:scale-90 shadow-md"
                                                            title="Ver CDR"
                                                        >
                                                            <ShieldCheck size={16}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center px-8 shrink-0">
                            <div className="flex items-center gap-4 text-slate-400">
                                <Info size={16}/>
                                <p className="text-[10px] font-bold uppercase tracking-tighter">
                                    Recuerde que tiene hasta 3 días para enviar sus facturas y 7 días para boletas según normativa vigente.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* CONFIGURATION TAB */
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                                <Lock size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Credenciales SOL</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acceso a los servicios web de SUNAT</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC de la Empresa</label>
                                <input 
                                    type="text" 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                    value={config.ruc}
                                    onChange={e => setConfig({...config, ruc: e.target.value})}
                                    placeholder="20XXXXXXXXX"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario SOL (SECUNDARIO)</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        type="text" 
                                        className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                        value={config.userSol}
                                        onChange={e => setConfig({...config, userSol: e.target.value.toUpperCase()})}
                                        placeholder="USUARIO"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave SOL</label>
                                <div className="relative">
                                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        type={showPass ? "text" : "password"}
                                        className="w-full pl-12 pr-12 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                        value={config.passSol}
                                        onChange={e => setConfig({...config, passSol: e.target.value})}
                                        placeholder="********"
                                    />
                                    <button 
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                                    >
                                        {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5 pt-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entorno de Envío</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <button 
                                        onClick={() => setConfig({...config, environment: 'BETA'})}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.environment === 'BETA' ? 'bg-white dark:bg-slate-800 shadow-sm text-amber-600' : 'text-slate-400'}`}
                                    >
                                        Pruebas (BETA)
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, environment: 'PRODUCTION'})}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.environment === 'PRODUCTION' ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400'}`}
                                    >
                                        Producción
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                                <FileCode size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Certificado Digital</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firma electrónica de documentos</p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 min-h-[200px] border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all ${certificateName ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
                            >
                                {certificateName ? (
                                    <>
                                        <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                                            <ShieldCheck size={32}/>
                                        </div>
                                        <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{certificateName}</p>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-2">Certificado Cargado Correctamente</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                            <Upload size={32}/>
                                        </div>
                                        <p className="font-black text-slate-500 uppercase text-xs">Click o Arrastra tu Certificado</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Formatos aceptados: .pfx, .p12</p>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".pfx,.p12" onChange={handleFileUpload} />

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña del Certificado</label>
                                <input 
                                    type="password" 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                    value={config.certPass}
                                    onChange={e => setConfig({...config, certPass: e.target.value})}
                                    placeholder="Clave del archivo"
                                />
                            </div>

                            <button className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                                <ShieldCheck size={18}/> Guardar Configuración SUNAT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CORRECCIÓN DE ERRORES */}
            {showCorrectionModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/20 animate-in zoom-in-95 overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
                                    <AlertTriangle size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">Corregir Comprobante</h3>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Documento: {showCorrectionModal.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCorrectionModal(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            {/* Mostrar Error Anterior */}
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1"><XCircle size={12}/> Error SUNAT / OSE:</p>
                                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 italic">"{showCorrectionModal.sunatResponse}"</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre / Razón Social del Receptor</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500" size={18}/>
                                        <input 
                                            type="text" 
                                            className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-sm outline-none focus:border-amber-500 transition-all text-slate-800 dark:text-white"
                                            value={correctionData.clientName}
                                            onChange={e => setCorrectionData({...correctionData, clientName: e.target.value})}
                                            placeholder="Nombre del Cliente"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DNI / RUC del Receptor</label>
                                    <div className="relative group">
                                        <FileCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500" size={18}/>
                                        <input 
                                            type="text" 
                                            className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-amber-500 transition-all text-slate-800 dark:text-white"
                                            value={correctionData.clientDni}
                                            onChange={e => setCorrectionData({...correctionData, clientDni: e.target.value})}
                                            placeholder="Documento de Identidad"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4 items-start">
                                <Info size={20} className="text-blue-500 mt-1 shrink-0"/>
                                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                    Al guardar los cambios, el estado del comprobante volverá a "PENDIENTE", permitiéndole intentar el envío nuevamente con la información fiscal actualizada.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button onClick={() => setShowCorrectionModal(null)} className="flex-1 py-5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 rounded-[1.5rem] transition-all">Cancelar</button>
                                <button onClick={handleSaveCorrection} className="flex-[2] py-5 bg-amber-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                                    <Save size={18}/> Guardar y Re-procesar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CDR MODAL */}
            {showCdrModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-md border border-white/20 animate-in zoom-in-95 overflow-hidden flex flex-col">
                        <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
                            <div className="w-20 h-20 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                                <ShieldCheck size={40}/>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Comprobante Aceptado</h3>
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-2">Constancia de Recepción (CDR)</p>
                        </div>
                        
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Serie-Número:</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{showCdrModal.id}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Estado Oficial:</span>
                                    <span className="text-sm font-black text-emerald-600 uppercase">ACEPTADO</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Fecha Recepción:</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{showCdrModal.date}</span>
                                </div>
                                <div className="py-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Firma Digital (Hash):</span>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <code className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 break-all">
                                            {showCdrModal.sunatHash || 'PENDING_HASH_GENERATION_SAPI_ERP'}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowCdrModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cerrar</button>
                                <button 
                                    onClick={() => handleDownloadXml(showCdrModal)}
                                    className="flex-[2] py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                                >
                                    <Download size={16}/> Descargar CDR (XML)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
