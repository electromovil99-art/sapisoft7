
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Megaphone, Paperclip, Trash2, Loader2, Search, Filter,
    CheckCircle, XCircle, Send, Play, Pause, AlertTriangle, MessageSquare,
    Users, Calendar, BarChart3, RefreshCw, History, Check, Wifi, WifiOff
} from 'lucide-react';
import { socket, BACKEND_URL } from '../socketService';
import { CrmContact } from '../types';

interface BroadcastModuleProps {
    crmDb: Record<string, CrmContact>;
    crmStages: any[];
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function BroadcastModule({ crmDb = {}, crmStages = [] }: BroadcastModuleProps) {
  // Estado inicial seguro
  const [status, setStatus] = useState('DISCONNECTED');
  
  // --- BROADCAST STATES ---
  const [bulkFilterStage, setBulkFilterStage] = useState("Todas");
  const [bulkFilterLabel, setBulkFilterLabel] = useState("Todas"); 
  const [selectedBulkClients, setSelectedBulkClients] = useState<string[]>([]); 
  const [bulkMessage, setBulkMessage] = useState("");
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null); 
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [campaignHistory, setCampaignHistory] = useState<{id: string, date: string, name: string, total: number, success: number}[]>([]);

  // Helpers
  const allUsedLabels = useMemo(() => { 
      const labels = new Set<string>(); 
      if (crmDb) {
          Object.values(crmDb).forEach(c => c.labels?.forEach(l => labels.add(l))); 
      }
      return Array.from(labels); 
  }, [crmDb]);
  
  const filteredBulkList = useMemo(() => { 
      if (!crmDb) return [];
      const list = Object.values(crmDb).map(c => ({ phone: c.phone, name: c.name, stage: c.stage, labels: c.labels || [] })); 
      return list.filter(c => { 
          if (bulkFilterStage !== "Todas" && c.stage !== bulkFilterStage) return false; 
          if (bulkFilterLabel !== "Todas" && !c.labels.includes(bulkFilterLabel)) return false; 
          return true; 
      }); 
  }, [crmDb, bulkFilterStage, bulkFilterLabel]);

  // Initialization & Socket Listeners
  useEffect(() => {
    // Check initial status safely
    try {
        if (socket && socket.connected) setStatus('READY');
    } catch (e) {
        console.error("Socket check error", e);
    }

    const onConnect = () => setStatus('READY');
    const onDisconnect = () => setStatus('DISCONNECTED');
    
    if (socket) {
        socket.on('connect', onConnect); 
        socket.on('disconnect', onDisconnect); 
    }
    
    return () => { 
        if (socket) {
            socket.off('connect', onConnect); 
            socket.off('disconnect', onDisconnect); 
        }
    };
  }, []);

  const api = async (path: string, opts?: any) => { try { const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers: { ...opts?.headers, "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" } }); return res.json(); } catch (e) { return null; } };

  const handleBroadcastFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setBroadcastFile(e.target.files[0]); } };

  const handleSelectAllBulk = () => { 
      const allPhones = filteredBulkList.map(c => c.phone); 
      const allFilteredSelected = allPhones.every(p => selectedBulkClients.includes(p));
      
      if (allFilteredSelected) {
          setSelectedBulkClients(prev => prev.filter(p => !allPhones.includes(p)));
      } else {
          setSelectedBulkClients(prev => [...new Set([...prev, ...allPhones])]); 
      }
  };

  const handleLaunchCampaign = async () => {
      if (status !== 'READY') return alert("No hay conexión con WhatsApp. Por favor conecte su dispositivo en el módulo de WhatsApp.");
      if (selectedBulkClients.length === 0) return alert("Seleccione destinatarios.");
      if (!bulkMessage && !broadcastFile) return alert("Escriba un mensaje o adjunte archivo.");

      setIsSendingBroadcast(true);
      setBroadcastProgress({ current: 0, total: selectedBulkClients.length, success: 0, fail: 0 });

      let mediaPayload = null;
      if (broadcastFile) {
          try {
              const b64 = await fileToBase64(broadcastFile);
              mediaPayload = {
                  mimetype: broadcastFile.type,
                  data: b64.split('base64,')[1],
                  filename: broadcastFile.name
              };
          } catch(e) {
              console.error("Error file", e);
          }
      }

      // SIMULATION OF SENDING
      for (let i = 0; i < selectedBulkClients.length; i++) {
          const phone = selectedBulkClients[i];
          const chatId = `${phone}@c.us`;
          
          try {
              await api('/messages', { 
                  method:'POST', 
                  body: JSON.stringify({ chatId, content: bulkMessage, caption: bulkMessage, media: mediaPayload }) 
              });
              setBroadcastProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
          } catch (e) {
              setBroadcastProgress(prev => ({ ...prev, current: prev.current + 1, fail: prev.fail + 1 }));
          }
          await new Promise(r => setTimeout(r, 1500)); 
      }

      setIsSendingBroadcast(false);
      setCampaignHistory(prev => [{
          id: Date.now().toString(),
          date: new Date().toLocaleString(),
          name: bulkMessage.substring(0, 20) + '...',
          total: selectedBulkClients.length,
          success: selectedBulkClients.length
      }, ...prev]);
      
      alert("Campaña finalizada");
      setSelectedBulkClients([]);
      setBulkMessage("");
      setBroadcastFile(null);
  };

  return (
    <div className="flex h-full w-full bg-[#f0f2f5] overflow-hidden text-slate-800 font-sans relative">
      
      {/* SIDEBAR: HISTORIAL */}
      <div className="w-[300px] bg-white border-r border-slate-300 flex flex-col z-20 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-600 flex items-center gap-2">
                  <History className="text-slate-400" size={16}/> Historial Campañas
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-4 space-y-3">
              {campaignHistory.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                      <BarChart3 size={40} className="mx-auto mb-2 text-slate-400"/>
                      <p className="text-xs font-bold text-slate-400 uppercase">Sin campañas recientes</p>
                  </div>
              ) : (
                  campaignHistory.map(h => (
                      <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">{h.date}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${h.success === h.total ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                  {h.success}/{h.total}
                              </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 line-clamp-2 mb-2">{h.name}</p>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(h.success / Math.max(h.total, 1)) * 100}%` }}></div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
          <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg text-slate-800 uppercase flex items-center gap-3">
                  <Megaphone className="text-indigo-600" size={24}/> Nueva Campaña de Difusión
              </h3>
              <div className="flex items-center gap-2">
                  {status === 'READY' ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2 transition-all">
                          <Wifi size={14} className="text-emerald-500"/> WhatsApp Conectado
                      </span>
                  ) : (
                       <span className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2 transition-all">
                          <WifiOff size={14} className="text-red-500"/> Desconectado
                      </span>
                  )}
              </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
              {/* Left: Audience Selection */}
              <div className="w-[45%] p-6 border-r border-slate-200 overflow-y-auto bg-white flex flex-col">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users size={16}/> 1. Seleccionar Audiencia (CRM)
                  </h4>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 space-y-3">
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Etapa</label>
                          <select className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer" value={bulkFilterStage} onChange={e => setBulkFilterStage(e.target.value)}>
                              <option value="Todas">Todas las Etapas</option>
                              {crmStages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Etiqueta</label>
                          <select className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer" value={bulkFilterLabel} onChange={e => setBulkFilterLabel(e.target.value)}>
                              <option value="Todas">Todas las Etiquetas</option>
                              {allUsedLabels.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                  </div>

                  <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-xs font-bold text-slate-500">{filteredBulkList.length} Contactos Encontrados</span>
                      <button onClick={handleSelectAllBulk} className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-2 py-1 rounded transition-colors uppercase tracking-wider">
                          {selectedBulkClients.length > 0 && selectedBulkClients.length === filteredBulkList.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50">
                      {filteredBulkList.length === 0 ? (
                           <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No hay contactos con estos filtros</div>
                      ) : (
                          filteredBulkList.map(c => (
                              <div key={c.phone} className="flex items-center p-3 border-b border-slate-200 last:border-0 hover:bg-white transition-colors cursor-pointer" onClick={() => {
                                    if (selectedBulkClients.includes(c.phone)) setSelectedBulkClients(prev => prev.filter(p => p !== c.phone));
                                    else setSelectedBulkClients(prev => [...prev, c.phone]);
                              }}>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors ${selectedBulkClients.includes(c.phone) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                      {selectedBulkClients.includes(c.phone) && <Check size={10} className="text-white"/>}
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[9px] text-slate-400 font-mono">{c.phone}</span>
                                          <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 rounded uppercase font-bold">{c.stage}</span>
                                          {c.labels.map(l => <span key={l} className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 rounded uppercase font-bold border border-indigo-100">{l}</span>)}
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Right: Composer */}
              <div className="flex-1 p-6 flex flex-col bg-slate-50 overflow-y-auto">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageSquare size={16}/> 2. Contenido del Mensaje
                  </h4>
                  
                  <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col relative min-h-[300px]">
                      {status !== 'READY' && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-3xl">
                              <WifiOff size={48} className="text-slate-300 mb-2"/>
                              <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Servicio Desconectado</p>
                              <p className="text-slate-400 text-[10px] mt-1 max-w-xs">Puedes preparar tu campaña, pero necesitarás conectar WhatsApp para enviarla.</p>
                          </div>
                      )}
                      
                      <textarea 
                          className="w-full flex-1 resize-none outline-none text-sm text-slate-700 placeholder-slate-300 font-medium bg-transparent"
                          placeholder="Escribe el mensaje para tu campaña aquí..."
                          value={bulkMessage}
                          onChange={e => setBulkMessage(e.target.value)}
                      ></textarea>

                      <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                           <div className="flex-1">
                               {broadcastFile ? (
                                   <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 w-fit">
                                       <Paperclip size={14} className="text-indigo-600"/>
                                       <span className="text-xs font-bold text-indigo-700 truncate max-w-[200px]">{broadcastFile.name}</span>
                                       <button onClick={() => setBroadcastFile(null)} className="text-indigo-400 hover:text-red-500 ml-2"><XCircle size={14}/></button>
                                   </div>
                               ) : (
                                   <label className="cursor-pointer inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-bold uppercase tracking-wide">
                                       <Paperclip size={16}/> Adjuntar Media
                                       <input type="file" className="hidden" onChange={handleBroadcastFileSelect} accept="image/*,video/*"/>
                                   </label>
                               )}
                           </div>
                           <div className="text-right text-[10px] font-bold text-slate-300 uppercase">
                               {bulkMessage.length} Caracteres
                           </div>
                      </div>
                  </div>

                  <div className="mt-6 shrink-0">
                       {isSendingBroadcast ? (
                           <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-lg text-center">
                               <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3"/>
                               <p className="text-sm font-black text-indigo-900 uppercase tracking-tight mb-1">Enviando Campaña...</p>
                               <p className="text-xs font-bold text-indigo-400">{broadcastProgress.current} de {broadcastProgress.total} enviados</p>
                               <div className="w-full bg-slate-100 h-3 rounded-full mt-4 overflow-hidden">
                                   <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(broadcastProgress.current / Math.max(broadcastProgress.total, 1)) * 100}%` }}></div>
                               </div>
                           </div>
                       ) : (
                           <button 
                                onClick={handleLaunchCampaign}
                                disabled={selectedBulkClients.length === 0 || (!bulkMessage && !broadcastFile) || status !== 'READY'}
                                className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 disabled:cursor-not-allowed"
                           >
                               <Send size={18}/> Lanzar Campaña ({selectedBulkClients.length})
                           </button>
                       )}
                       {status !== 'READY' && (
                           <p className="text-center text-[10px] text-red-400 font-bold mt-3 uppercase bg-red-50 p-2 rounded-xl border border-red-100">
                               ⚠️ WhatsApp Desconectado. Ve al módulo WhatsApp para escanear QR.
                           </p>
                       )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
