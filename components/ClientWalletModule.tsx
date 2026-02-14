
import React, { useState, useMemo } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, ArrowRight, User, Plus, X, UserPlus, Banknote, QrCode, CreditCard, Landmark, Lock, History, FileText, Eye, Printer, Layout, Receipt } from 'lucide-react';
import { Client, GeoLocation, BankAccount, PaymentMethodType, SaleRecord, CartItem, CashMovement } from '../types';

interface ClientWalletProps {
    clients: Client[];
    locations: GeoLocation[];
    onUpdateClientBalance: (clientId: string, amountChange: number, reason: string, paymentMethod?: PaymentMethodType, accountId?: string) => void;
    onAddClient: (client: Client) => void;
    bankAccounts?: BankAccount[];
    isCashBoxOpen: boolean;
    salesHistory?: SaleRecord[];
    cashMovements?: CashMovement[];
}

// Helper to calculate total for a ticket
const formatSymbol = (code?: string) => {
    if (!code) return 'S/';
    const c = code.toUpperCase();
    if (c === 'PEN' || c === 'SOLES') return 'S/';
    if (c === 'USD' || c === 'DOLARES') return '$';
    return code;
};

// Barcode Generator for Ticket
const BarcodeGenerator = ({ value }: { value: string }) => {
    const bars = value.split('').map((char, i) => {
        const code = char.charCodeAt(0);
        const width = (code % 3) + 1;
        return { width, space: (code % 2) + 1 };
    });

    return (
        <div className="flex flex-col items-center mt-2">
            <div className="flex items-end h-8 gap-[1px]">
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-black"></div>
                {bars.map((b, i) => (
                    <React.Fragment key={i}>
                        <div className={`h-full bg-white`} style={{ width: `${b.space}px` }}></div>
                        <div className={`h-full bg-black`} style={{ width: `${b.width}px` }}></div>
                    </React.Fragment>
                ))}
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-black"></div>
            </div>
            <span className="text-[8px] font-mono tracking-widest mt-0.5">{value}</span>
        </div>
    );
};


const ClientWalletModule: React.FC<ClientWalletProps> = ({ 
    clients, locations, onUpdateClientBalance, onAddClient, 
    bankAccounts = [], isCashBoxOpen, salesHistory = [], cashMovements = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [transactionType, setTransactionType] = useState<'Deposit' | 'Withdraw'>('Deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    
    // UI States
    const [activeTab, setActiveTab] = useState<'ACTIONS' | 'HISTORY'>('ACTIONS');
    const [showModal, setShowModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [newClientData, setNewClientData] = useState({ name: '', dni: '', phone: '', address: '', email: '', department: 'CUSCO', province: 'CUSCO', district: '' });
    
    // Ticket Viewing
    const [showTicket, setShowTicket] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isVoucher, setIsVoucher] = useState(false); // New state to distinguish Sales Ticket vs Transaction Voucher
    const [printFormat, setPrintFormat] = useState<'80mm' | 'A4'>('80mm');

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.dni.includes(searchTerm));

    // GENERATE HISTORY FROM SALES & CASH MOVEMENTS
    const clientHistory = useMemo(() => {
        if (!selectedClient) return [];
        
        // 1. Sales where Wallet was used as PAYMENT (Outflow/Consumption)
        const salesUsingWallet = salesHistory.filter(s => 
            s.clientName === selectedClient.name && (s.paymentBreakdown.wallet > 0)
        ).map(s => ({
            id: s.id,
            date: s.date,
            time: s.time,
            type: 'CONSUMO' as const,
            concept: `Pago de Venta #${s.id}`,
            amount: s.paymentBreakdown.wallet,
            ticket: s,
            method: 'SALDO',
            isVoucher: false,
            sourceTicketId: s.id // Direct reference
        }));

        // 2. Direct Deposits/Withdrawals from Cash Movements
        // We filter movements categorized as 'BILLETERA' that mention the client
        const directTransactions = cashMovements.filter(m => 
            m.category === 'BILLETERA' && m.concept.includes(selectedClient.name)
        ).map(m => {
             // Try to extract Ticket ID if it was a change/vuelto
             const ticketMatch = m.concept.match(/VUELTO TICKET #([A-Z0-9-]+)/) || m.concept.match(/TICKET #([A-Z0-9-]+)/);
             const linkedTicketId = ticketMatch ? ticketMatch[1] : null;

             return {
                 id: m.id,
                 date: m.date,
                 time: m.time,
                 type: m.type === 'Ingreso' ? 'RECARGA' : 'RETIRO',
                 concept: m.concept.replace(`BILLETERA: ${selectedClient.name} - `, ''), // Clean concept
                 amount: m.amount,
                 ticket: m, // Default to movement itself
                 method: m.paymentMethod,
                 isVoucher: true,
                 sourceTicketId: linkedTicketId
             };
        });
        
        // Combine and sort by date descending
        return [...salesUsingWallet, ...directTransactions].sort((a, b) => {
             const dateA = a.date.split('/').reverse().join('') + a.time;
             const dateB = b.date.split('/').reverse().join('') + b.time;
             return dateB.localeCompare(dateA);
        });
    }, [salesHistory, cashMovements, selectedClient]);

    const handleOpenTransaction = (client: Client, type: 'Deposit' | 'Withdraw') => { 
        setSelectedClient(client); 
        setTransactionType(type); 
        setAmount(''); 
        setReason(''); 
        setPaymentMethod('Efectivo');
        setSelectedAccountId('');
        setShowModal(true); 
    };

    const handleExecuteTransaction = () => {
        if (!amount || !reason || !selectedClient) return alert("Complete los datos");
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return alert("Monto inválido");
        if (transactionType === 'Withdraw' && val > selectedClient.digitalBalance) return alert("Saldo insuficiente");
        
        // VALIDACIÓN DE CAJA CERRADA
        if (paymentMethod === 'Efectivo' && !isCashBoxOpen) {
            return alert("⛔ CAJA CERRADA: No puede realizar movimientos de efectivo (Entrada/Salida) sin abrir turno primero.");
        }
        
        if (transactionType === 'Deposit' && paymentMethod !== 'Efectivo' && !selectedAccountId) {
            return alert("Debe seleccionar la cuenta bancaria de destino.");
        }

        const change = transactionType === 'Deposit' ? val : -val;
        
        // Use client.name in reason is redundant here as App.tsx adds it, but good for clarity in local log
        onUpdateClientBalance(selectedClient.id, change, reason, paymentMethod, selectedAccountId);
        
        setShowModal(false);
    };

    const handleSaveNewClient = () => {
        if (!newClientData.name || !newClientData.dni) { alert("Nombre y DNI son obligatorios."); return; }
        const newClient: Client = { id: Math.random().toString(), name: newClientData.name.toUpperCase(), dni: newClientData.dni, phone: newClientData.phone, address: newClientData.address, email: newClientData.email, department: newClientData.department, province: newClientData.province, district: newClientData.district, creditLine: 0, creditUsed: 0, totalPurchases: 0, paymentScore: 3, tags: ['Nuevo'], digitalBalance: 0 };
        onAddClient(newClient); setSelectedClient(newClient); setShowClientModal(false);
    };

    const handleViewDetail = (item: any) => {
        if (item.sourceTicketId) {
            const sale = salesHistory.find(s => s.id === item.sourceTicketId);
            if (sale) {
                setSelectedTicket(sale);
                setIsVoucher(false); // It's a sales ticket
            } else {
                // Fallback if sales history is cleared but movement remains
                setSelectedTicket(item.ticket);
                setIsVoucher(item.isVoucher); 
            }
        } else {
            setSelectedTicket(item.ticket);
            setIsVoucher(item.isVoucher);
        }
        setShowTicket(true);
    };

    const getTicketPaymentInfo = (ticket: any) => {
        if (!ticket || isVoucher) return null;
        
        // 1. Pagos registrados en la venta
        const recordedPayments = ticket.detailedPayments || [];
        let totalRecorded = recordedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        
        // 2. Buscar si hubo vuelto a billetera en cashMovements asociado a este ticket
        // El ID del ticket es ticket.id
        // El concepto suele ser "BILLETERA: CLIENTE - VUELTO TICKET #ID"
        const ticketIdClean = ticket.id; 
        
        const walletDeposit = cashMovements.find(m => 
            m.category === 'BILLETERA' && 
            m.type === 'Ingreso' &&
            m.concept.includes(ticketIdClean)
        );

        const walletChange = walletDeposit ? walletDeposit.amount : 0;
        
        // Si hay vuelto a billetera, el monto total recibido fue el registrado + el vuelto.
        // Asumimos que el vuelto salió del último pago o de efectivo, pero para visualización sumamos todo.
        const totalReceived = totalRecorded + walletChange;

        // Si no hay wallet deposit, calculamos vuelto normal (si existe en la lógica, aunque SalesModule lo recorta)
        const standardChange = Math.max(0, totalRecorded - ticket.total); 

        return { 
            payments: recordedPayments, 
            totalPaid: totalReceived, 
            walletChange,
            standardChange
        };
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500">
            {/* LISTA DE CLIENTES */}
            <div className="w-1/3 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Wallet className="text-blue-500"/> Billetera Virtual</h3>
                    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div><button onClick={() => setShowClientModal(true)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors" title="Crear Nuevo Cliente"><UserPlus size={18}/></button></div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">{filteredClients.map(client => (<div key={client.id} onClick={() => { setSelectedClient(client); setActiveTab('ACTIONS'); }} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedClient?.id === client.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'}`}><div className="flex justify-between items-start"><div><div className="font-bold text-slate-700 dark:text-white text-sm">{client.name}</div><div className="text-xs text-slate-400">{client.dni}</div></div><div className="text-right"><div className={`font-bold ${client.digitalBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>S/ {client.digitalBalance.toFixed(2)}</div><div className="text-[10px] text-slate-400 uppercase font-bold">Saldo</div></div></div></div>))}</div>
            </div>
            
            {/* PANEL PRINCIPAL */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 flex flex-col overflow-hidden">
                {selectedClient ? (
                    <div className="flex flex-col h-full w-full">
                        {/* HEADER CLIENTE */}
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-700 pb-6 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                    <User size={32}/>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{selectedClient.name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-mono">ID: {selectedClient.dni}</p>
                                </div>
                            </div>
                            <div className="text-right p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Saldo Disponible</p>
                                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">S/ {selectedClient.digitalBalance.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="flex gap-2 mb-4 shrink-0">
                             <button onClick={() => setActiveTab('ACTIONS')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIONS' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}>Acciones</button>
                             <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}>Historial</button>
                        </div>

                        {/* CONTENT: ACTIONS */}
                        {activeTab === 'ACTIONS' && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
                                    <button onClick={() => handleOpenTransaction(selectedClient, 'Deposit')} className="py-8 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 group">
                                        <div className="p-3 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><TrendingUp size={32}/></div>
                                        Recargar Saldo
                                    </button>
                                    <button onClick={() => handleOpenTransaction(selectedClient, 'Withdraw')} className="py-8 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-[2rem] font-black text-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 group">
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:scale-110 transition-transform"><TrendingDown size={32}/></div>
                                        Retirar / Devolver
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CONTENT: HISTORY */}
                        {activeTab === 'HISTORY' && (
                            <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4">Fecha</th>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Concepto</th>
                                            <th className="p-4">Método</th>
                                            <th className="p-4 text-right">Monto Op.</th>
                                            <th className="p-4 text-center">Ver</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {clientHistory.length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No hay historial de movimientos reciente</td></tr>
                                        ) : clientHistory.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 font-mono text-slate-500">{item.date} <span className="text-[10px] opacity-60">{item.time}</span></td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.type === 'RETIRO' || item.type === 'CONSUMO' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold uppercase text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                                    {item.concept}
                                                    {item.sourceTicketId && <span className="text-[9px] text-indigo-500 ml-1">(Ref: {item.sourceTicketId})</span>}
                                                </td>
                                                <td className="p-4 text-[10px] uppercase font-bold text-slate-500">{item.method}</td>
                                                <td className={`p-4 text-right font-black ${item.type === 'RETIRO' || item.type === 'CONSUMO' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {item.type === 'RETIRO' || item.type === 'CONSUMO' ? '-' : '+'} S/ {item.amount.toFixed(2)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => handleViewDetail(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalle / Ticket">
                                                        <Eye size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                        <Wallet size={64} className="mx-auto mb-4 opacity-50"/>
                        <p className="font-bold uppercase tracking-widest text-sm">Seleccione un cliente para gestionar</p>
                    </div>
                )}
            </div>

            {/* MODAL TRANSACCIÓN */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-[450px] rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                {transactionType === 'Deposit' ? <TrendingUp size={24} className="text-emerald-500"/> : <TrendingDown size={24} className="text-red-500"/>}
                                {transactionType === 'Deposit' ? 'Recargar Saldo' : 'Retirar Fondos'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="text-slate-400"/></button>
                        </div>
                        <div className="space-y-5">
                            {/* ALERTA VISUAL DE CAJA */}
                            {paymentMethod === 'Efectivo' && !isCashBoxOpen && (
                                <div className="p-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <Lock size={16}/> Caja Cerrada. Seleccione otro método.
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto (S/)</label>
                                <input type="number" autoFocus className="w-full p-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-3xl font-black text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 outline-none focus:border-blue-500 text-center" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                                <input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none font-bold" value={reason} onChange={e => setReason(e.target.value)} placeholder={transactionType === 'Deposit' ? "Ej. Pago Adelantado" : "Ej. Devolución"}/>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Método de {transactionType === 'Deposit' ? 'Ingreso' : 'Egreso'}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Efectivo', 'Transferencia', 'Yape', 'Tarjeta'].map(m => (
                                        <button 
                                            key={m} 
                                            onClick={() => { setPaymentMethod(m as any); setSelectedAccountId(''); }}
                                            className={`py-2.5 text-[10px] font-black rounded-xl border-2 uppercase transition-all ${paymentMethod === m ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                                {paymentMethod !== 'Efectivo' && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cuenta {transactionType === 'Deposit' ? 'Destino' : 'Origen'}</label>
                                        <select 
                                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
                                            value={selectedAccountId}
                                            onChange={e => setSelectedAccountId(e.target.value)}
                                        >
                                            <option value="">-- SELECCIONAR CUENTA --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.alias || b.bankName} - {b.accountNumber}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleExecuteTransaction} disabled={paymentMethod === 'Efectivo' && !isCashBoxOpen} className={`w-full py-4 text-white font-black rounded-2xl mt-2 shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-widest ${transactionType === 'Deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar Transacción</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO CLIENTE */}
            {showClientModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-[700px] animate-in fade-in zoom-in-95 border border-slate-100 dark:border-slate-700 flex flex-col max-h-[95vh]">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><UserPlus size={20} className="text-primary-600"/> Nuevo Cliente</h3><button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button></div>
                    <div className="space-y-4 overflow-y-auto pr-2 flex-1"><div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Nombre Completo</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-primary-500 text-sm outline-none uppercase" placeholder="Ej. JUAN PEREZ" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} autoFocus /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">DNI</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-primary-500 text-sm outline-none" placeholder="00000000" value={newClientData.dni} onChange={e => setNewClientData({...newClientData, dni: e.target.value})} /></div></div></div>
                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700"><button onClick={() => setShowClientModal(false)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancelar</button><button onClick={handleSaveNewClient} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 dark:shadow-none transition-colors">Guardar Cliente</button></div>
                </div></div>
            )}

            {/* MODAL TICKET / VOUCHER VIEWER */}
            {showTicket && selectedTicket && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-2 md:p-4">
                    <div className={`bg-zinc-100 p-4 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 overflow-hidden flex flex-col gap-4 ${printFormat === 'A4' ? 'max-w-4xl w-full h-[90vh]' : 'max-w-[340px] w-full h-auto'}`}>
                        <div className="no-print bg-white p-2 rounded-xl border border-slate-200 flex gap-2 shadow-sm shrink-0">
                            <button onClick={() => setPrintFormat('80mm')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${printFormat === '80mm' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Layout size={14}/> 80mm</button>
                            <button onClick={() => setPrintFormat('A4')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${printFormat === 'A4' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={14}/> A4</button>
                        </div>
                        <div id="print-area" className="flex-1 overflow-auto p-4 bg-zinc-200 no-scrollbar rounded-xl flex justify-center items-start">
                            {printFormat === '80mm' ? (
                                <div className="bg-white w-[280px] p-6 shadow-sm font-mono text-[10px] text-black mx-auto shrink-0 tabular-nums">
                                    <div className="text-center mb-4 pb-2 border-b-2 border-dashed border-black">
                                        <h2 className="font-bold text-xs uppercase tracking-tighter">SapiSoft ERP</h2>
                                        <p className="text-[8px] text-black font-bold uppercase">{isVoucher ? 'COMPROBANTE DE TRANSACCIÓN' : 'HISTORIAL DE VENTA'}</p>
                                    </div>
                                    <div className="mb-3 space-y-0.5 text-black">
                                        <div className="flex justify-between"><span>{isVoucher ? 'Ref:' : 'Venta:'}</span> <span className="font-bold">#{selectedTicket.id.substring(0,8)}</span></div>
                                        <div className="flex justify-between"><span>Fecha:</span> <span className="font-bold">{selectedTicket.date} {selectedTicket.time}</span></div>
                                        <div className="flex justify-between"><span>Cliente:</span> <span className="font-bold truncate max-w-[150px]">{selectedClient?.name}</span></div>
                                    </div>
                                    
                                    {isVoucher ? (
                                        <div className="border-y border-dashed border-black py-4 mb-3 text-center">
                                            <p className="text-[9px] font-black uppercase mb-1">{selectedTicket.type} DE BILLETERA</p>
                                            <p className="text-xl font-black mb-2">S/ {selectedTicket.amount.toFixed(2)}</p>
                                            <p className="text-[8px] uppercase">Concepto: {selectedTicket.concept}</p>
                                            <p className="text-[8px] uppercase font-bold mt-1">Método: {selectedTicket.method}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="border-y border-dashed border-black py-2 mb-3">
                                                <div className="grid grid-cols-[1fr_22px_40px_45px] font-black text-[8px] mb-1 border-b border-black pb-1 uppercase text-black"><span>Articulo</span><span className="text-center">Cant</span><span className="text-right">Unit</span><span className="text-right">Total</span></div>
                                                {selectedTicket.items?.map((item: CartItem, idx: number) => (
                                                    <div key={idx} className="mb-1 last:mb-0 leading-tight text-black">
                                                        <div className="grid grid-cols-[1fr_22px_40px_45px]">
                                                            <span className="uppercase truncate pr-1 font-bold">{item.name}</span>
                                                            <span className="text-center font-black">{item.quantity}</span>
                                                            <span className="text-right font-medium">{item.price.toFixed(0)}</span>
                                                            <span className="text-right font-black">{(item.price * item.quantity).toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-1 mb-4 border-b-2 border-black pb-2 text-black font-black">
                                                <div className="flex justify-between text-xs"><span>TOTAL VENTA</span><span>{selectedTicket.total.toFixed(2)}</span></div>
                                            </div>
                                            {/* Payment Details Section */}
                                            {(() => {
                                                const paymentInfo = getTicketPaymentInfo(selectedTicket);
                                                if (!paymentInfo) return null;
                                                const { payments, walletChange, totalPaid, standardChange } = paymentInfo;
                                                
                                                return (
                                                    <div className="border-t border-black border-dashed pt-2 mb-2">
                                                        <p className="text-[9px] font-black uppercase mb-1">PAGOS:</p>
                                                        {payments.map((p: any, i: number) => (
                                                            <div key={i} className="flex justify-between text-[9px] text-black uppercase">
                                                                <span>{p.method}</span>
                                                                <span>{Number(p.amount).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                        
                                                        {walletChange > 0 ? (
                                                            <>
                                                                <div className="flex justify-between text-[9px] font-black mt-1 text-black uppercase">
                                                                    <span>A BILLETERA (VUELTO):</span>
                                                                    <span>{walletChange.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-[9px] font-black mt-2 text-black uppercase border-t border-black pt-1">
                                                                    <span>TOTAL RECIBIDO:</span>
                                                                    <span>{totalPaid.toFixed(2)}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            standardChange > 0 && (
                                                                <div className="flex justify-between text-[9px] font-black mt-1 text-black uppercase">
                                                                    <span>VUELTO EFECTIVO:</span>
                                                                    <span>{standardChange.toFixed(2)}</span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                    
                                    <div className="mt-4 pt-4 border-t-2 border-dashed border-black flex flex-col items-center justify-center">
                                        <BarcodeGenerator value={selectedTicket.id} />
                                    </div>
                                    <div className="mt-4 text-center italic text-[8px] text-black font-bold uppercase">Copia Cliente</div>
                                </div>
                            ) : (
                                <div className="a4-preview-container bg-white p-12 shadow-sm font-sans text-xs text-slate-800 mx-auto min-h-[1100px] flex flex-col shrink-0">
                                    <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-6">
                                        <div className="space-y-1"><h1 className="text-2xl font-black text-blue-600 uppercase tracking-tighter">SapiSoft ERP</h1><p className="font-bold text-slate-500 uppercase">{isVoucher ? 'RECIBO DE TRANSACCIÓN' : 'HISTORIAL DE VENTA'}</p></div>
                                        <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl text-center min-w-[200px]"><p className="bg-blue-600 text-white py-1 px-2 font-black text-[10px] rounded mb-1 uppercase">{isVoucher ? 'MOVIMIENTO' : 'TICKET'}</p><p className="font-mono text-lg font-black">{selectedTicket.id}</p></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[9px] font-black text-blue-600 uppercase mb-2 border-b pb-1">Datos del Cliente</p><p className="font-black text-sm uppercase">{selectedClient?.name}</p><p><strong>ID:</strong> {selectedClient?.dni}</p></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[9px] font-black text-blue-600 uppercase mb-2 border-b pb-1">Información</p><p><strong>Fecha:</strong> {selectedTicket.date} {selectedTicket.time}</p><strong>Tipo:</strong> {isVoucher ? selectedTicket.type : 'VENTA'}</div>
                                    </div>

                                    {isVoucher ? (
                                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Monto de la Operación</p>
                                            <div className="text-6xl font-black text-slate-900 tracking-tighter mb-4">S/ {selectedTicket.amount.toFixed(2)}</div>
                                            <div className="w-32 h-1 bg-blue-600 rounded-full mb-6"></div>
                                            <p className="text-xl font-bold text-slate-500 uppercase italic">"{selectedTicket.concept}"</p>
                                        </div>
                                    ) : (
                                        <>
                                            <table className="w-full border-collapse"><thead><tr className="bg-blue-600 text-white"><th className="p-2 text-left text-[8px] uppercase">SKU</th><th className="p-2 text-left text-[8px] uppercase">Descripción</th><th className="p-2 text-center text-[8px] uppercase">Cant.</th><th className="p-2 text-right text-[8px] uppercase">P. Unit</th><th className="p-2 text-right text-[8px] uppercase">Total</th></tr></thead><tbody>{selectedTicket.items?.map((item: CartItem, i: number) => (<tr key={i} className="border-b border-slate-100"><td className="p-2 font-mono">{item.code}</td><td className="p-2 uppercase">{item.name}</td><td className="p-2 text-center font-black">{item.quantity}</td><td className="p-2 text-right">{item.price.toFixed(2)}</td><td className="p-2 text-right font-black">{(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody></table>
                                            <div className="flex justify-end pt-8"><div className="w-72 p-4 bg-blue-600 text-white rounded-xl text-right"><span className="font-black uppercase block text-[10px] mb-1">Total Venta:</span><span className="text-2xl font-black font-mono">S/ {selectedTicket.total.toFixed(2)}</span></div></div>
                                            
                                            {/* A4 Payment Details */}
                                            {(() => {
                                                const paymentInfo = getTicketPaymentInfo(selectedTicket);
                                                if (!paymentInfo) return null;
                                                const { payments, walletChange, totalPaid, standardChange } = paymentInfo;
                                                
                                                return (
                                                    <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                        <h4 className="text-xs font-black uppercase text-slate-600 mb-2 border-b pb-2">Detalle de Pagos</h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                {payments.map((p: any, i: number) => (
                                                                    <div key={i} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                                                                        <span className="text-xs font-bold uppercase">{p.method}</span>
                                                                        <span className="text-xs font-bold">S/ {Number(p.amount).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex flex-col justify-center items-end text-right border-l pl-4 space-y-2">
                                                                {walletChange > 0 ? (
                                                                    <>
                                                                        <div className="flex w-full justify-between">
                                                                            <span className="text-xs font-bold text-slate-500 uppercase">Vuelto a Billetera:</span>
                                                                            <span className="text-sm font-black text-emerald-600">S/ {walletChange.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="flex w-full justify-between border-t border-slate-300 pt-1">
                                                                            <span className="text-xs font-black text-slate-700 uppercase">TOTAL RECIBIDO:</span>
                                                                            <span className="text-lg font-black text-slate-800">S/ {totalPaid.toFixed(2)}</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    standardChange > 0 && (
                                                                         <div className="flex w-full justify-between">
                                                                            <span className="text-xs font-bold text-slate-500 uppercase">Vuelto Efectivo:</span>
                                                                            <span className="text-sm font-black text-slate-700">S/ {standardChange.toFixed(2)}</span>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="no-print flex gap-2 shrink-0 bg-white p-4 rounded-xl border border-slate-200"><button onClick={() => setShowTicket(false)} className="flex-1 py-3 bg-white text-slate-500 font-black rounded-xl text-[10px] uppercase border">Cerrar</button><button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest"><Printer size={16}/> Imprimir</button></div>
                    </div>
                </div>
            )}

        </div>
    );
};
export default ClientWalletModule;
