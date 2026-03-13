
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Search, Filter, Wrench, X, Save, Clock, CheckCircle, AlertCircle, Calendar, User, UserCog, Printer, Package, Plus, Minus, Trash2, ArrowRight, UserPlus, CreditCard, Phone, Banknote, QrCode, Landmark, Calculator, Receipt, Ban, CheckSquare, ChevronDown, Edit3, MessageCircle, Send, CornerUpLeft, MoreVertical, Wallet, Lock, ShieldAlert, ListChecks, Tablet, Hash, CloudDownload, Loader2, Zap, Unlock } from 'lucide-react';
import { ServiceOrder, Product, ServiceProductItem, PaymentBreakdown, Category, Client, BankAccount, PaymentMethodType, GeoLocation } from '../types';

interface ServicesProps {
  services: ServiceOrder[];
  products: Product[]; 
  categories: Category[]; 
  bankAccounts: BankAccount[]; 
  onAddService: (service: ServiceOrder) => void;
  onUpdateService?: (service: ServiceOrder) => void;
  onFinalizeService: (serviceId: string, total: number, finalStatus: 'Entregado' | 'Devolucion', paymentBreakdown: PaymentBreakdown) => void;
  onMarkRepaired: (serviceId: string) => void;
  clients?: Client[]; 
  onAddClient?: (client: Client) => void;
  onOpenWhatsApp?: (name: string, phone: string, message?: string) => void;
  locations: GeoLocation[];
  currentBranchId: string;
  onGetNextSupportId?: () => Promise<string>;
}

interface PaymentDetail {
    id: string;
    method: PaymentMethodType;
    amount: number;
    reference?: string;
    accountId?: string;
    bankName?: string;
}

export const ServicesModule: React.FC<ServicesProps> = ({ services, products, categories, bankAccounts, onAddService, onUpdateService, onFinalizeService, onMarkRepaired, clients, onAddClient, onOpenWhatsApp, locations, currentBranchId, onGetNextSupportId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendiente' | 'Reparado' | 'Entregado' | 'Devolucion'>('Todos');
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Seguridad y Edición de Precios
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [priceEditingProduct, setPriceEditingProduct] = useState<ServiceProductItem | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState('');

  // NOTIFICACIÓN AUTOMÁTICA
  const [autoNotify, setAutoNotify] = useState(false);

  // Mano de Obra
  const [laborInput, setLaborInput] = useState('0');

  // Search API state
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  const [newClientData, setNewClientData] = useState({ 
      name: '', dni: '', phone: '', address: '',
      department: 'CUSCO', province: 'CUSCO', district: '' 
  });

  const departments = locations.filter(l => l.type === 'DEP');
  const provinces = locations.filter(l => l.type === 'PROV' && l.parentId === (departments.find(d => d.name === newClientData.department)?.id));
  const districts = locations.filter(l => l.type === 'DIST' && l.parentId === (provinces.find(p => p.name === newClientData.province)?.id));

  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceOrder | null>(null);
  
  const [paymentList, setPaymentList] = useState<PaymentDetail[]>([]);
  const [currentPayment, setCurrentPayment] = useState<{
      method: PaymentMethodType;
      amount: string;
      reference: string;
      accountId: string;
  }>({ method: 'Efectivo', amount: '', reference: '', accountId: '' });
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  const getCurrentDate = () => new Date().toLocaleDateString('es-PE');
  const getCurrentTime = () => new Date().toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'});

  const [newOrder, setNewOrder] = useState<Partial<ServiceOrder>>({
      client: '', clientPhone: '', deviceModel: '', issue: '', cost: 0, technician: '', receptionist: 'ADMIN', entryDate: '', entryTime: '', usedProducts: []
  });

  const searchClientByDoc = async () => {
    if (!newClientData.dni) return;
    setIsSearchingClient(true);
    
    // SIMULACION DE API
    setTimeout(() => {
        const isRuc = newClientData.dni.length === 11;
        const isDni = newClientData.dni.length === 8;
        
        if (isDni) {
            setNewClientData(prev => ({
                ...prev,
                name: 'JUAN PEREZ (RENIEC)',
                address: 'AV. SIEMPRE VIVA 123',
                department: 'LIMA',
                province: 'LIMA',
                district: 'MIRAFLORES'
            }));
        } else if (isRuc) {
            setNewClientData(prev => ({
                ...prev,
                name: 'EMPRESA EJEMPLO S.A.C.',
                address: 'CALLE DE NEGOCIOS 456',
                department: 'AREQUIPA',
                province: 'AREQUIPA',
                district: 'YANAHUARA'
            }));
        } else {
            alert("Formato de documento no válido (8 u 11 dígitos)");
        }
        setIsSearchingClient(false);
    }, 1000);
  };

  const handleAddLaborAsProduct = () => {
      const amount = parseFloat(laborInput);
      if (isNaN(amount) || amount <= 0) return alert("Ingrese un monto válido de mano de obra");
      
      const laborItem: ServiceProductItem = {
          productId: 'MANO-DE-OBRA',
          productName: 'MANO DE OBRA',
          quantity: 1,
          price: amount
      };

      setNewOrder(prev => ({
          ...prev,
          usedProducts: [...(prev.usedProducts || []), laborItem],
          cost: 0 // Clear the separate labor cost to avoid double counting
      }));
      setLaborInput('0');
  };

  const calculateOrderTotal = (order: ServiceOrder | Partial<ServiceOrder>) => {
      const productsTotal = (order.usedProducts || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (order.cost || 0) + productsTotal;
  };

  const getPaymentTotal = () => paymentList.reduce((acc, p) => acc + p.amount, 0);
  const remainingTotal = Math.max(0, (selectedService ? calculateOrderTotal(selectedService) : 0) - getPaymentTotal());

  const handleEditService = (s: ServiceOrder) => {
      setNewOrder({
          id: s.id,
          client: s.client,
          clientPhone: s.clientPhone,
          deviceModel: s.deviceModel,
          issue: s.issue,
          status: s.status,
          technician: s.technician,
          receptionist: s.receptionist,
          cost: s.cost,
          usedProducts: [...s.usedProducts],
          entryDate: s.entryDate,
          entryTime: s.entryTime,
          color: s.color
      });
      setLaborInput(s.cost.toString()); 
      setIsEditMode(true);
      setShowModal(true);
      setOpenMenuId(null);
  };

  const handleWhatsAppNotify = (service: ServiceOrder) => {
      const total = calculateOrderTotal(service).toFixed(2);
      const message = `Hola *${service.client.split(' ')[0]}*, le informamos que su equipo *${service.deviceModel}* ya está listo para recoger.\n\n🛠️ *Estado:* Reparado\n💰 *Total:* S/ ${total}\n\nGracias por su preferencia.`;
      
      let phoneNumber = service.clientPhone?.replace(/[^0-9]/g, '') || "";
      // Ensure country code if missing (PERU 51)
      if (phoneNumber.length === 9) phoneNumber = `51${phoneNumber}`;
      
      if(phoneNumber.length > 5) {
          // Use onOpenWhatsApp prop if available (integration point) or fallback to window.open
          if(onOpenWhatsApp) {
              onOpenWhatsApp(service.client, phoneNumber, message);
          } else {
              window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
          }
      } else {
          alert("El cliente no tiene un número de celular válido para WhatsApp.");
      }
  };

  // --- LOGICA AUTOMATIZACIÓN ---
  const toggleAutoNotify = () => {
      if (!autoNotify) {
          const pass = prompt("Ingrese clave de administrador para activar notificaciones automáticas:");
          if (pass === '1234') {
              setAutoNotify(true);
              alert("Notificación automática ACTIVADA. Se abrirá WhatsApp al marcar 'Listo'.");
          } else if (pass !== null) {
              alert("Clave incorrecta.");
          }
      } else {
          setAutoNotify(false);
      }
  };

  const handleMarkAndNotify = (s: ServiceOrder) => {
      onMarkRepaired(s.id);
      setOpenMenuId(null);
      if (autoNotify) {
          // Delay to allow state update before opening window
          setTimeout(() => handleWhatsAppNotify(s), 300);
      }
  };

  const handleAuthorize = () => {
      if (authPassword === '1234') {
          setIsAuthorized(true);
          setShowAuthModal(false);
          setAuthPassword('');
          applyAuthorizedPrice();
      } else {
          alert("Contraseña incorrecta");
      }
  };

  const applyAuthorizedPrice = () => {
      if (priceEditingProduct) {
          const newPrice = parseFloat(tempPriceInput);
          setNewOrder(prev => ({
              ...prev,
              usedProducts: (prev.usedProducts || []).map(p => 
                  p.productId === priceEditingProduct.productId ? { ...p, price: newPrice } : p
              )
          }));
          setPriceEditingProduct(null);
          setIsAuthorized(false);
          setTempPriceInput('');
      }
  };

  const updateProductQuantity = (productId: string, delta: number) => {
      setNewOrder(prev => ({
          ...prev,
          usedProducts: (prev.usedProducts || []).map(p => {
              if (p.productId === productId) {
                  const newQty = Math.max(1, p.quantity + delta);
                  return { ...p, quantity: newQty };
              }
              return p;
          })
      }));
  };

  const applyLaborChange = (val: string) => {
      setLaborInput(val);
      const num = val === '' ? 0 : parseFloat(val);
      setNewOrder(prev => ({...prev, cost: isNaN(num) ? 0 : num}));
  };

  const openPriceEdit = (item: ServiceProductItem) => {
      setPriceEditingProduct(item);
      setTempPriceInput(item.price.toString());
      setIsAuthorized(false);
  };

  const handleApplyNewProductPrice = () => {
      const newPrice = parseFloat(tempPriceInput);
      if (isNaN(newPrice)) return;

      const originalProduct = products.find(p => p.id === priceEditingProduct?.productId);
      const basePrice = originalProduct?.price || 0;

      if (newPrice < basePrice && !isAuthorized) {
          setShowAuthModal(true);
          return;
      }

      if (priceEditingProduct) {
          setNewOrder(prev => ({
              ...prev,
              usedProducts: (prev.usedProducts || []).map(p => 
                  p.productId === priceEditingProduct.productId ? { ...p, price: newPrice } : p
              )
          }));
      }
      setPriceEditingProduct(null);
      setIsAuthorized(false);
      setTempPriceInput('');
  };

  const handleAddPayment = () => {
      const amountVal = parseFloat(currentPayment.amount);
      if (isNaN(amountVal) || amountVal <= 0) return alert("Ingrese un monto válido");
      if (currentPayment.method !== 'Efectivo' && !currentPayment.accountId) return alert("Debe seleccionar la cuenta de destino");
      
      const bankInfo = bankAccounts.find(b => b.id === currentPayment.accountId);
      const newPay: PaymentDetail = { 
          id: Math.random().toString(), method: currentPayment.method, amount: amountVal, reference: currentPayment.reference, accountId: currentPayment.accountId, bankName: bankInfo ? (bankInfo.alias || bankInfo.bankName) : undefined 
      };
      const newList = [...paymentList, newPay];
      setPaymentList(newList);
      setCurrentPayment({ ...currentPayment, amount: '', reference: '', accountId: '' });
  };

  const handleFinalizeDeliver = () => {
      if (!selectedService) return;
      if (getPaymentTotal() < calculateOrderTotal(selectedService) - 0.05) return alert("Falta completar el pago.");
      
      const clientObj = clients?.find(c => c.name === selectedService.client);

      const breakdown: PaymentBreakdown = {
          cash: paymentList.filter(p => p.method === 'Efectivo').reduce((a, b) => a + b.amount, 0),
          yape: paymentList.filter(p => p.method === 'Yape' || p.method === 'Plin' || p.method === 'Yape/Plin').reduce((a, b) => a + b.amount, 0),
          card: paymentList.filter(p => p.method === 'Tarjeta').reduce((a, b) => a + b.amount, 0),
          bank: paymentList.filter(p => p.method === 'Deposito').reduce((a, b) => a + b.amount, 0),
          wallet: paymentList.filter(p => p.method === 'Saldo Favor').reduce((a, b) => a + b.amount, 0),
      };
      onFinalizeService(selectedService.id, calculateOrderTotal(selectedService), 'Entregado', breakdown);
      
      setTicketData({
          orderId: selectedService.id, date: getCurrentDate(), time: getCurrentTime(), 
          client: selectedService.client, 
          clientDni: clientObj?.dni || "00000000",
          typeLabel: 'ORDEN DE SERVICIO',
          items: [
              ...(selectedService.cost > 0 ? [{ desc: `MANO DE OBRA`, price: selectedService.cost }] : []), 
              ...(selectedService.usedProducts || []).map(p => ({ desc: p.productName, price: p.price * p.quantity }))
          ],
          total: calculateOrderTotal(selectedService), detailedPayments: paymentList, change: 0
      });
      setShowDeliverModal(false);
      setShowTicket(true);
  };

  const handleReprintTicket = (s: ServiceOrder) => {
      const clientObj = clients?.find(c => c.name === s.client);
      setTicketData({
          orderId: s.id, 
          date: s.exitDate || s.entryDate, 
          time: s.exitTime || s.entryTime, 
          client: s.client, 
          clientDni: clientObj?.dni || "00000000",
          typeLabel: 'ORDEN DE SERVICIO',
          items: [
              ...(s.cost > 0 ? [{ desc: `MANO DE OBRA`, price: s.cost }] : []), 
              ...(s.usedProducts || []).map(p => ({ desc: p.productName, price: p.price * p.quantity }))
          ],
          total: calculateOrderTotal(s), 
          detailedPayments: [], 
          change: 0
      });
      setShowTicket(true);
      setOpenMenuId(null);
  };

  const normalize = (text: string) => (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredServices = services.filter(s => {
    const clientObj = clients?.find(c => c.name === s.client);
    const searchWords = normalize(searchTerm).split(" ").filter(w => w !== "");
    const targetString = normalize(`${s.client} ${s.deviceModel} ${s.id} ${clientObj?.dni || ""}`);
    
    const matchesSearch = searchWords.every(word => targetString.includes(word));
    const matchesStatus = statusFilter === 'Todos' ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProductsList = products.filter(p => {
    const searchWords = normalize(productSearch).split(" ").filter(w => w !== "");
    const targetString = normalize(`${p.name} ${p.code}`);
    
    const matchesSearch = productSearch === '' || searchWords.every(word => targetString.includes(word));
    const matchesCategory = selectedCategory === '' || p.category === selectedCategory;
    return (productSearch.length > 0 || selectedCategory !== '') && matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full space-y-3 animate-in fade-in duration-500">
       <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(['Todos', 'Pendiente', 'Reparado', 'Entregado', 'Devolucion'] as const).map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap border shadow-sm ${statusFilter === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{status.toUpperCase()}</button>
          ))}
       </div>

       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white dark:bg-slate-800 px-4 sm:px-5 py-3 rounded-2xl shadow-sm border border-slate-200 gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
              <h2 className="text-[11px] font-black text-slate-700 dark:text-white flex items-center gap-2 uppercase tracking-widest shrink-0"><Wrench className="text-primary-600" size={16}/> Servicio Técnico</h2>
              <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                  <input type="text" placeholder="Buscar por Cliente, DNI, Equipo o Ticket..." className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl text-[10px] w-full outline-none focus:border-primary-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={toggleAutoNotify}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border ${autoNotify ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                title="Activar envío automático de WhatsApp al marcar como reparado"
              >
                  {autoNotify ? <Zap size={14} className="fill-green-600"/> : <Zap size={14}/>}
                  <span className="hidden xs:inline">{autoNotify ? 'Auto-Notificar ON' : 'Auto-Notificar OFF'}</span>
                  <span className="xs:hidden">{autoNotify ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={() => { setLaborInput('0'); setNewOrder({ client: '', deviceModel: '', receptionist: 'ADMIN', cost: 0, usedProducts: [], entryDate: getCurrentDate(), entryTime: getCurrentTime() }); setIsEditMode(false); setShowModal(true); }} className="flex-1 sm:flex-none bg-primary-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-primary-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Plus size={14}/> <span className="hidden xs:inline">NUEVA RECEPCIÓN</span><span className="xs:hidden">NUEVO</span></button>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1">
                {/* Desktop Table View */}
                <table className="w-full text-[10px] text-left hidden md:table">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-700 text-slate-400 font-black uppercase tracking-widest border-b">
                        <tr><th className="px-5 py-3">Orden</th><th className="px-5 py-3">Ingreso</th><th className="px-5 py-3">Cliente / Equipo</th><th className="px-5 py-3">Detalle</th><th className="px-5 py-3">Personal</th><th className="px-5 py-3 text-center">Estado</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-center">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredServices.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-2 font-mono font-black text-primary-600">#{s.id}</td>
                                <td className="px-5 py-2 text-slate-400"><div>{s.entryDate}</div><div className="text-[8px] font-bold">{s.entryTime}</div></td>
                                <td className="px-5 py-2">
                                    <div className="font-black text-slate-700 dark:text-white uppercase">{s.client}</div>
                                    <div className="text-[9px] text-slate-400 flex items-center gap-1 font-bold"><Smartphone size={10}/> {s.deviceModel}</div>
                                </td>
                                <td className="px-5 py-2 text-slate-500 italic max-w-[180px] truncate">"{s.issue}"</td>
                                <td className="px-5 py-2"><div className="flex flex-col gap-0.5 text-[8px] font-black uppercase"><span className="text-violet-600 flex items-center gap-1"><UserCog size={10}/> {s.technician}</span><span className="text-blue-500 flex items-center gap-1"><User size={10}/> {s.receptionist}</span></div></td>
                                <td className="px-5 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${s.status === 'Entregado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s.status === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-100' : s.status === 'Reparado' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{s.status}</span></td>
                                <td className="px-5 py-2 text-right font-black text-slate-800">S/ {calculateOrderTotal(s).toFixed(2)}</td>
                                <td 
                                    className="px-5 py-2 text-center relative" 
                                    onMouseLeave={() => setOpenMenuId(null)}
                                >
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }} 
                                        className="p-1.5 text-slate-300 hover:text-slate-800 transition-colors"
                                    >
                                        <MoreVertical size={14}/>
                                    </button>
                                    
                                    {openMenuId === s.id && (
                                        <div className="absolute right-10 top-0 w-44 bg-white shadow-2xl rounded-xl z-[50] border border-slate-100 py-1 text-left animate-in zoom-in-95">
                                            {s.status !== 'Entregado' && (
                                                <>
                                                    <button onClick={() => handleEditService(s)} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 flex items-center gap-2 hover:bg-blue-50">
                                                        <Edit3 size={12} className="text-blue-500"/> Editar Servicio
                                                    </button>
                                                    <button onClick={() => { handleWhatsAppNotify(s); setOpenMenuId(null); }} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 flex items-center gap-2 hover:bg-emerald-50">
                                                        <MessageCircle size={12} className="text-emerald-500"/> Notificar Equipo
                                                    </button>
                                                </>
                                            )}
                                            {s.status === 'Pendiente' && (
                                                <button 
                                                    onClick={() => handleMarkAndNotify(s)} 
                                                    className="w-full px-3 py-2 text-[9px] font-black text-slate-600 flex items-center gap-2 hover:bg-blue-50"
                                                >
                                                    <CheckSquare size={12} className="text-blue-500"/> 
                                                    {autoNotify ? 'Listo + Notificar' : 'Marcar Listo'}
                                                </button>
                                            )}
                                            {(s.status === 'Reparado' || s.status === 'Pendiente') && <button onClick={() => { setSelectedService(s); setPaymentList([]); setCurrentPayment({method:'Efectivo', amount: calculateOrderTotal(s).toFixed(2), reference:'', accountId:''}); setShowDeliverModal(true); setOpenMenuId(null); }} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 flex items-center gap-2 hover:bg-emerald-50"><CheckCircle size={12} className="text-emerald-500"/> Entregar / Cobrar</button>}
                                            {s.status === 'Entregado' && (
                                                <button onClick={() => handleReprintTicket(s)} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                                                    <Printer size={12} className="text-slate-400"/> Reimprimir Ticket
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredServices.map(s => (
                        <div key={s.id} className="p-4 space-y-3 bg-white dark:bg-slate-800">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="font-mono font-black text-primary-600 text-[10px]">#{s.id}</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">{s.entryDate} {s.entryTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${s.status === 'Entregado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s.status === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-100' : s.status === 'Reparado' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{s.status}</span>
                                    <div className="relative">
                                        <button 
                                            onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} 
                                            className="p-1.5 text-slate-300 hover:text-slate-800"
                                        >
                                            <MoreVertical size={16}/>
                                        </button>
                                        {openMenuId === s.id && (
                                            <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-700 shadow-2xl rounded-xl z-[50] border border-slate-100 dark:border-slate-600 py-1 text-left animate-in zoom-in-95">
                                                {s.status !== 'Entregado' && (
                                                    <>
                                                        <button onClick={() => handleEditService(s)} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 dark:text-slate-200 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                            <Edit3 size={12} className="text-blue-500"/> Editar Servicio
                                                        </button>
                                                        <button onClick={() => { handleWhatsAppNotify(s); setOpenMenuId(null); }} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 dark:text-slate-200 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                                            <MessageCircle size={12} className="text-emerald-500"/> Notificar Equipo
                                                        </button>
                                                    </>
                                                )}
                                                {s.status === 'Pendiente' && (
                                                    <button onClick={() => handleMarkAndNotify(s)} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 dark:text-slate-200 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                        <CheckSquare size={12} className="text-blue-500"/> {autoNotify ? 'Listo + Notificar' : 'Marcar Listo'}
                                                    </button>
                                                )}
                                                {(s.status === 'Reparado' || s.status === 'Pendiente') && <button onClick={() => { setSelectedService(s); setPaymentList([]); setCurrentPayment({method:'Efectivo', amount: calculateOrderTotal(s).toFixed(2), reference:'', accountId:''}); setConfirmFinalize(false); setShowDeliverModal(true); setOpenMenuId(null); }} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 dark:text-slate-200 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><CheckCircle size={12} className="text-emerald-500"/> Entregar / Cobrar</button>}
                                                {s.status === 'Entregado' && (
                                                    <button onClick={() => handleReprintTicket(s)} className="w-full px-3 py-2 text-[9px] font-black text-slate-600 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                                                        <Printer size={12} className="text-slate-400"/> Reimprimir Ticket
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="font-black text-slate-700 dark:text-white uppercase text-[11px]">{s.client}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold"><Smartphone size={12}/> {s.deviceModel}</div>
                                <div className="text-[9px] text-slate-400 italic">"{s.issue}"</div>
                            </div>
                            <div className="flex justify-between items-end pt-2 border-t border-slate-50 dark:border-slate-700">
                                <div className="flex flex-col gap-0.5 text-[8px] font-black uppercase">
                                    <span className="text-violet-600 flex items-center gap-1"><UserCog size={10}/> {s.technician}</span>
                                    <span className="text-blue-500 flex items-center gap-1"><User size={10}/> {s.receptionist}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-800 dark:text-white tracking-tighter">S/ {calculateOrderTotal(s).toFixed(2)}</div>
                                    <div className="text-[7px] text-slate-400 font-bold uppercase">Total a Pagar</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

       {showDeliverModal && selectedService && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="bg-white dark:bg-slate-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-[720px] h-[90vh] sm:h-auto overflow-hidden flex flex-col border border-white/20 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
              <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter"><Calculator size={18} className="text-emerald-600"/> Confirmar Liquidación <span className="hidden xs:inline mx-1 text-slate-300">|</span> <span className="text-slate-400 font-bold text-[10px] uppercase">ORDEN #{selectedService.id}</span></h3>
                  <button onClick={() => setShowDeliverModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
              </div>
              <div className="flex flex-col lg:flex-row flex-1 overflow-auto">
                  <div className="w-full lg:w-[45%] p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListChecks size={14}/> RESUMEN COBRO</h4>
                      <div className="min-h-[120px] lg:flex-1 overflow-y-auto border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mb-4 bg-white dark:bg-slate-800/50 p-3 space-y-2">
                          {paymentList.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center opacity-30"><Tablet size={40}/><p className="text-[9px] font-bold uppercase mt-2">Sin pagos</p></div>
                          ) : paymentList.map(p => (
                              <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600"><div className="min-w-0"><p className="text-[9px] font-black uppercase text-slate-700 dark:text-white">{p.method}</p>{p.reference && <p className="text-[8px] text-slate-400 font-mono">OP: {p.reference}</p>}</div><div className="flex items-center gap-3"><span className="font-black text-xs">S/ {p.amount.toFixed(2)}</span><button onClick={() => setPaymentList(paymentList.filter(x => x.id !== p.id))} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button></div></div>
                          ))}
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal:</span><span className="text-slate-800 dark:text-white">S/ {calculateOrderTotal(selectedService).toFixed(2)}</span></div>
                          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700"><span className="font-black text-red-600 text-[10px] uppercase">Saldo Pendiente:</span><span className="text-2xl font-black text-red-600">S/ {remainingTotal.toFixed(2)}</span></div>
                      </div>
                  </div>
                  <div className="flex-1 p-6 flex flex-col gap-5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> AGREGAR MEDIO</h4>
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">{['Efectivo', 'Yape/Plin', 'Tarjeta', 'Deposito'].map(m => (<button key={m} onClick={() => setCurrentPayment({...currentPayment, method: m as any, reference: '', accountId: ''})} className={`py-2 px-3 rounded-xl border-2 font-bold text-[10px] uppercase transition-all ${currentPayment.method === m ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-100 dark:border-slate-600 hover:border-slate-200'}`}>{m}</button>))}</div>
                          
                          {currentPayment.method !== 'Efectivo' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CUENTA DESTINO</label>
                                      <select 
                                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:border-primary-500"
                                          value={currentPayment.accountId}
                                          onChange={e => setCurrentPayment({...currentPayment, accountId: e.target.value})}
                                      >
                                          <option value="">SELECCIONAR CUENTA...</option>
                                          {bankAccounts.filter(b => b.useInSales).map(b => (
                                              <option key={b.id} value={b.id}>{b.alias || b.bankName} - {b.accountNumber}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NRO. OPERACIÓN</label>
                                      <input type="text" className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:border-primary-500" value={currentPayment.reference} onChange={e => setCurrentPayment({...currentPayment, reference: e.target.value})}/>
                                  </div>
                              </div>
                          )}

                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MONTO</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-slate-300 italic">S/</span>
                                  <input 
                                      type="number" 
                                      onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              if (remainingTotal <= 0.05) {
                                                  if (confirmFinalize) {
                                                      handleFinalizeDeliver();
                                                      setConfirmFinalize(false);
                                                  } else {
                                                      setConfirmFinalize(true);
                                                  }
                                              } else {
                                                  handleAddPayment();
                                                  setConfirmFinalize(false);
                                              }
                                          } else {
                                              setConfirmFinalize(false);
                                          }
                                      }}
                                      className={`w-full pl-10 sm:pl-12 p-3 sm:p-4 bg-white dark:bg-slate-900 border-2 rounded-2xl text-2xl sm:text-4xl font-black outline-none shadow-inner transition-all ${confirmFinalize ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white focus:border-primary-500'}`}
                                      value={currentPayment.amount} 
                                      onChange={e => {
                                          setCurrentPayment({...currentPayment, amount: e.target.value});
                                          setConfirmFinalize(false);
                                      }}
                                  />
                                  {confirmFinalize && (
                                      <div className="absolute -top-6 left-0 right-0 text-center animate-bounce">
                                          <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
                                              ¿Confirmar Pago? Presione Enter de nuevo
                                          </span>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <button onClick={handleAddPayment} className="w-full py-3.5 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest"><Plus size={18}/> Agregar Pago</button>
                      </div>
                  </div>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0 sticky bottom-0 z-10">
                  <button onClick={() => setShowDeliverModal(false)} className="px-6 py-3 text-slate-500 font-black hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl uppercase text-[10px] hidden sm:block">Cerrar</button>
                  <button 
                    onClick={() => { 
                        if (confirmFinalize) {
                            handleFinalizeDeliver();
                            setConfirmFinalize(false);
                        } else {
                            setConfirmFinalize(true);
                        }
                    }} 
                    disabled={remainingTotal > 0.05} 
                    className={`flex-1 sm:flex-none px-10 py-4 sm:py-3 font-black rounded-xl shadow-xl transition-all uppercase text-[11px] sm:text-[10px] flex items-center justify-center gap-2 disabled:opacity-30 ${confirmFinalize ? 'bg-emerald-500 animate-pulse scale-105' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <CheckCircle size={18}/> {confirmFinalize ? '¡PRESIONE OTRA VEZ!' : 'Finalizar Entrega'}
                  </button>
              </div>
           </div>
        </div>
       )}

       {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-800 rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-[850px] h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-white/20">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter"><Smartphone className="text-primary-600" size={20}/> Nueva Recepción</h3>
                    <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
                    <div className="w-full lg:w-[55%] p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-50 dark:border-slate-700">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cliente</label>
                            <div className="flex gap-2 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                <input type="text" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl uppercase text-xs font-bold outline-none focus:border-primary-500" placeholder="NOMBRE O DNI..." value={newOrder.client} onChange={e => { const val = e.target.value.toUpperCase(); setNewOrder(prev => ({...prev, client: val})); const found = clients?.find(c => c.name === val || c.dni === val); if (found) setNewOrder(prev => ({...prev, client: found.name, clientPhone: found.phone})); }} list="serv-clients"/>
                                <datalist id="serv-clients">{clients?.map(c => <option key={c.id} value={c.name}>{c.dni}</option>)}</datalist>
                                <button onClick={() => setShowClientModal(true)} className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"><UserPlus size={18}/></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipo</label><input type="text" className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl uppercase text-xs font-bold outline-none" value={newOrder.deviceModel} onChange={e => setNewOrder(prev => ({...prev, deviceModel: e.target.value.toUpperCase()}))} /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp</label><input type="text" className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none" value={newOrder.clientPhone} onChange={e => setNewOrder(prev => ({...prev, clientPhone: e.target.value}))} /></div>
                        </div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Descripción</label><textarea className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl h-20 resize-none uppercase text-xs font-medium outline-none" value={newOrder.issue} onChange={e => setNewOrder(prev => ({...prev, issue: e.target.value}))} placeholder="FALLA..."></textarea></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Técnico</label>
                                <select className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-violet-600 outline-none" value={newOrder.technician} onChange={e => setNewOrder(prev => ({...prev, technician: e.target.value}))}>
                                    <option value="">-- ASIGNAR --</option><option value="Isaac Quille">Isaac Quille</option><option value="Kalyoscar Acosta">Kalyoscar Acosta</option><option value="Albertina Ortega">Albertina Ortega</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Mano de Obra (S/)</label>
                                <div className="flex gap-2">
                                    <input 
                                      type="number" 
                                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm text-primary-600 outline-none" 
                                      value={laborInput} 
                                      onChange={e => applyLaborChange(e.target.value)} 
                                      placeholder="0.00"
                                    />
                                    <button 
                                        onClick={handleAddLaborAsProduct}
                                        title="Agregar a la lista como producto"
                                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center"
                                    >
                                        <Plus size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/30 p-6 flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Repuestos / Suministros</label>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                            <input type="text" className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" placeholder="Buscar en inventario..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                            {productSearch.length > 0 && (
                                <div className="absolute top-10 left-0 right-0 bg-white dark:bg-slate-800 shadow-2xl rounded-xl z-[100] max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-700 p-1">
                                    {filteredProductsList.map(p => (<div key={p.id} onClick={() => { const current = newOrder.usedProducts || []; const exists = current.find(x => x.productId === p.id); if(exists) setNewOrder(prev => ({...prev, usedProducts: current.map(x => x.productId === p.id ? {...x, quantity: x.quantity + 1} : x)})); else setNewOrder(prev => ({...prev, usedProducts: [...current, {productId: p.id, productName: p.name, quantity: 1, price: p.price}]})); setProductSearch(''); }} className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer rounded-lg flex justify-between items-center group"><span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">{p.name}</span><span className="text-[10px] font-black text-slate-900 dark:text-white">S/ {p.price.toFixed(2)}</span></div>))}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-[150px] lg:max-h-[220px] space-y-1.5 mb-4">
                            {(newOrder.usedProducts || []).map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group">
                                    <div className="flex-1">
                                        <div className="font-bold text-[9px] text-slate-800 dark:text-white uppercase truncate">{p.productName}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                                                <button 
                                                    onClick={() => updateProductQuantity(p.productId, -1)}
                                                    className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-500 transition-all"
                                                >
                                                    <Minus size={10}/>
                                                </button>
                                                <span className="text-[10px] font-black px-2 text-slate-700 dark:text-white tabular-nums">{p.quantity}</span>
                                                <button 
                                                    onClick={() => updateProductQuantity(p.productId, 1)}
                                                    className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-500 transition-all"
                                                >
                                                    <Plus size={10}/>
                                                </button>
                                            </div>
                                            <span className="text-[9px] text-slate-400 font-bold">x</span>
                                            <button 
                                                onClick={() => openPriceEdit(p)}
                                                className="text-[10px] font-black text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-1.5 py-0.5 rounded border border-primary-100 dark:border-primary-900 transition-all flex items-center gap-1"
                                            >
                                                S/ {p.price.toFixed(2)} <Edit3 size={10}/>
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => setNewOrder(prev => ({...prev, usedProducts: prev.usedProducts?.filter(x => x.productId !== p.productId)}))} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto bg-black dark:bg-slate-950 text-white p-4 rounded-2xl shadow-xl border border-white/5">
                            <div className="flex justify-between text-[9px] text-slate-400 mb-1 font-bold uppercase"><span>Subtotal:</span><span>S/ {(calculateOrderTotal(newOrder)).toFixed(2)}</span></div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <div className="flex justify-between font-black text-xl tracking-tighter"><span>TOTAL:</span><span className="text-primary-400">S/ {calculateOrderTotal(newOrder).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0 sticky bottom-0 z-10">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all uppercase text-[10px] hidden sm:block">Cerrar</button>
                    <button onClick={async () => { 
                        if(!newOrder.client || !newOrder.deviceModel) return alert("Faltan datos");
                        const id = isEditMode ? newOrder.id! : (onGetNextSupportId ? await onGetNextSupportId() : Math.floor(Math.random()*100000).toString());
                        const serviceData: ServiceOrder = { 
                            id: id, 
                            entryDate: newOrder.entryDate!, 
                            entryTime: newOrder.entryTime!, 
                            client: newOrder.client.toUpperCase(), 
                            clientPhone: newOrder.clientPhone || '', 
                            deviceModel: newOrder.deviceModel.toUpperCase(), 
                            issue: newOrder.issue || '', 
                            status: newOrder.status || 'Pendiente', 
                            technician: newOrder.technician || 'POR ASIGNAR', 
                            receptionist: newOrder.receptionist || 'ADMIN', 
                            cost: newOrder.cost || 0, 
                            usedProducts: newOrder.usedProducts || [], 
                            color: newOrder.color || '#ef4444' 
                        };
                        if (isEditMode && onUpdateService) {
                            onUpdateService(serviceData);
                        } else {
                            onAddService(serviceData);
                        }
                        setShowModal(false); 
                    }} className="flex-1 sm:flex-none px-8 py-4 sm:py-2 bg-primary-600 text-white font-black rounded-xl shadow-lg hover:bg-primary-700 transition-all uppercase tracking-widest text-[11px] sm:text-[10px]">
                        {isEditMode ? 'Actualizar Orden' : 'Guardar Orden'}
                    </button>
                </div>
            </div>
        </div>
       )}

       {showTicket && ticketData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-zinc-100 p-2 shadow-2xl rounded-lg animate-in fade-in zoom-in-95 max-w-full overflow-auto">
                <div className="bg-white w-[280px] p-6 shadow-sm font-mono text-[10px] text-slate-800 relative">
                    <div className="text-center mb-4 pb-2 border-b-2 border-dashed border-slate-200">
                        <h2 className="font-bold text-xs uppercase tracking-tighter">SapiSoft ERP</h2>
                        <p className="text-[8px] text-slate-400">CONTROL DE SERVICIOS</p>
                    </div>
                    <div className="mb-3 space-y-1">
                        <div className="flex justify-between"><span>Orden:</span> <span className="font-bold">#{ticketData.orderId}</span></div>
                        <div className="flex justify-between"><span>Fecha:</span> <span>{ticketData.date}</span></div>
                        <div className="flex justify-between"><span>Cliente:</span> <span className="font-bold truncate">{ticketData.client}</span></div>
                    </div>
                    <div className="border-y border-dashed border-slate-200 py-2 mb-3">
                        <div className="font-bold text-[9px] mb-2 text-center">DETALLE DEL SERVICIO</div>
                        {ticketData.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex mb-1 last:mb-0">
                                <span className="flex-1 uppercase truncate pr-1">{item.desc}</span>
                                <span className="w-12 text-right font-bold">{item.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs font-black border-b-2 border-slate-800 pb-1 mb-3">
                        <span>TOTAL</span>
                        <span>S/ {ticketData.total.toFixed(2)}</span>
                    </div>
                    
                    <div className="bg-slate-50 p-2 rounded-lg space-y-1 mb-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Medios de Pago:</p>
                        {ticketData.detailedPayments?.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-[9px] font-bold">
                                <span>{p.method.toUpperCase()}</span>
                                <span>S/ {p.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4">
                        <div className="w-full flex flex-col items-center">
                            <div className="w-40 border-b-2 border-slate-800 mb-1"></div>
                            <p className="font-black uppercase text-[8px] tracking-[0.2em] text-slate-400">Firma Autorizada</p>
                        </div>
                        
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-800 tracking-tight leading-none">{ticketData.client}</p>
                            <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-100 mt-1">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">DNI / RUC</span>
                                <span className="text-[9px] font-black text-slate-700">{ticketData.clientDni}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-[8px] text-slate-400 mt-6 uppercase"><p>¡Gracias por confiar en nosotros!</p></div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => setShowTicket(false)} className="flex-1 py-2.5 bg-white text-slate-500 font-black rounded-xl text-[9px] uppercase border">Cerrar</button>
                    <button onClick={() => window.print()} className="flex-1 py-2.5 bg-primary-600 text-white font-black rounded-xl text-[9px] flex items-center justify-center gap-1 shadow-lg"><Printer size={12}/> IMPRIMIR</button>
                </div>
            </div>
        </div>
       )}

       {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="bg-white dark:bg-slate-800 rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-3xl border border-white/20 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col">
               <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                   <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tighter"><UserPlus className="text-primary-600" size={20}/> Nuevo Cliente</h3>
                   <button onClick={() => setShowClientModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
               </div>
               <div className="p-6 sm:p-8 space-y-6 overflow-auto">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nombre Completo</label>
                        <input type="text" className="w-full p-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold uppercase outline-none focus:border-primary-500 shadow-sm text-sm" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} placeholder="EJ. JUAN PÉREZ" autoFocus />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">DNI / RUC</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold outline-none focus:border-primary-500 text-sm pr-12" 
                                    value={newClientData.dni} 
                                    onChange={e => setNewClientData({...newClientData, dni: e.target.value})} 
                                    placeholder="00000000" 
                                />
                                <button 
                                    onClick={searchClientByDoc}
                                    disabled={isSearchingClient}
                                    className="absolute right-2 top-2 bottom-2 px-3 bg-white dark:bg-slate-600 rounded-lg text-primary-600 dark:text-white hover:bg-primary-50 dark:hover:bg-slate-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                                    title="Buscar en RENIEC/SUNAT"
                                >
                                    {isSearchingClient ? <Loader2 size={16} className="animate-spin"/> : <CloudDownload size={16}/>}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Teléfono</label>
                            <input type="text" className="w-full p-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold outline-none focus:border-primary-500 text-sm" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} placeholder="999 999 999" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                        <button onClick={() => setShowClientModal(false)} className="px-10 py-4 sm:py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all uppercase tracking-widest text-xs">Cancelar</button>
                        <button onClick={() => { if (!newClientData.name || !newClientData.dni) return alert("Nombre y DNI obligatorios."); const cl: Client = { id: Date.now().toString(), name: newClientData.name.toUpperCase(), dni: newClientData.dni, phone: newClientData.phone, creditLine: 0, creditUsed: 0, totalPurchases: 0, paymentScore: 3, digitalBalance: 0 }; if (onAddClient) onAddClient(cl); setNewOrder(prev => ({...prev, client: cl.name, clientPhone: cl.phone})); setShowClientModal(false); }} className="px-12 py-4 sm:py-3 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 shadow-xl transition-all text-xs uppercase tracking-widest">Guardar y Vincular</button>
                    </div>
                </div>
            </div>
        </div>
       )}

       {priceEditingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-[350px] p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 border border-white/20">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2">
                        <Edit3 size={18} className="text-primary-600"/> Editar Precio
                    </h3>
                    <button onClick={() => { setPriceEditingProduct(null); setIsAuthorized(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={18}/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Producto</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase truncate">{priceEditingProduct.productName}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nuevo Precio (S/)</label>
                        <input 
                            type="number" 
                            autoFocus
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-3xl font-black text-slate-800 dark:text-white outline-none focus:border-primary-500 shadow-inner"
                            value={tempPriceInput}
                            onChange={e => setTempPriceInput(e.target.value)}
                        />
                    </div>
                    <button onClick={handleApplyNewProductPrice} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl hover:bg-primary-700 transition-all uppercase text-[10px] tracking-widest">Aplicar Precio</button>
                </div>
            </div>
        </div>
       )}

       {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-[350px] p-8 border border-white/20 animate-in zoom-in-95">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <Lock size={32}/>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Autorización</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Se requiere clave de administrador para bajar precio base</p>
                    </div>
                    <input 
                        type="password" 
                        autoFocus
                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-center text-4xl tracking-[0.3em] font-black outline-none focus:border-primary-500"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAuthorize()}
                        placeholder="****"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => { setShowAuthModal(false); setAuthPassword(''); }} className="flex-1 py-3 text-slate-500 font-bold uppercase text-[10px] hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleAuthorize} className="flex-1 py-3 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Validar</button>
                    </div>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default ServicesModule;
