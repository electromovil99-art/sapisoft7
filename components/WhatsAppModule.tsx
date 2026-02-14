
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Megaphone, Paperclip, Trash2, Loader2, Search, Filter,
    CheckCircle, XCircle, Send, Play, Pause, AlertTriangle, MessageSquare,
    Users, Calendar, BarChart3, RefreshCw, History, Check, Wifi, WifiOff, Bot, Sparkles, Brain,
    FileText, Video, Image as ImageIcon, Download, CheckCheck, UserCheck, X, MessageCircle, 
    Settings, UserPlus, ShoppingBag, CalendarClock, StickyNote, Plus, LogOut, Edit, Save as SaveIcon,
    Power, PowerOff, Zap, Cpu, Film, Share, LayoutTemplate, PenLine, Palette, Tag, ArrowLeft, Lock, Unlock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { socket, BACKEND_URL } from '../socketService';
import { CrmContact, Client, Product, ViewState } from '../types';
import { GoogleGenAI } from "@google/genai";

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const ALARM_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface WhatsAppModuleProps {
    clients: Client[];
    onAddClient: (client: Client) => void;
    products: Product[];
    chats: any[];
    setChats: React.Dispatch<React.SetStateAction<any[]>>;
    currentUser?: string; 
    onNavigate: (view: ViewState) => void;
    crmDb: Record<string, CrmContact>;
    setCrmDb: React.Dispatch<React.SetStateAction<Record<string, CrmContact>>>;
    crmStages: any[];
    setCrmStages?: React.Dispatch<React.SetStateAction<any[]>>; 
    onRegisterClientFromCrm: (name: string, phone: string) => void;
    targetChatPhone?: string | null;
    onClearTargetChat?: () => void;
}

interface Template {
    id: string;
    title: string;
    content: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const fetchMedia = async (chatId: string, msgId: string) => {
    try {
        const res = await fetch(`${BACKEND_URL}/messages/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
            body: JSON.stringify({ chatId, msgId })
        });
        const data = await res.json();
        if (data.media) return data.media; 
        return null;
    } catch (e) { return null; }
};

const MessageBubble = ({ m, chatId, onForward, onEdit }: { m: any, chatId: string, onForward: (msg: any) => void, onEdit: (msg: any) => void }) => {
    const [fullMediaSrc, setFullMediaSrc] = useState<string | null>(null);
    const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const bubbleRef = useRef<HTMLDivElement>(null);

    const isVideo = m.type === 'video';
    const isImage = m.type === 'image';
    const isAudio = m.type === 'audio' || m.type === 'ptt';
    const isDoc = m.type === 'document';
    const isMedia = isVideo || isImage || isAudio || isDoc;

    useEffect(() => {
        if (!isMedia || !m.body) return;

        // Determine if m.body is Data URL or Raw Base64
        const isDataUrl = m.body.startsWith('data:');
        const rawBase64 = isDataUrl ? m.body.split(',')[1] : m.body;
        
        // Check if message is optimistic (temp ID) or confirmed history
        // Optimistic messages have the full file in body. History messages usually only have thumbnail in body.
        const isOptimistic = m.id._serialized?.startsWith('temp-');

        if (m.fromMe && isOptimistic) {
            // Optimistic / Sent by us NOW: Body is the full file
            const mime = m.mimetype || (isVideo ? 'video/mp4' : isImage ? 'image/jpeg' : 'application/octet-stream');
            setFullMediaSrc(isDataUrl ? m.body : `data:${mime};base64,${rawBase64}`);
        } else {
            // Incoming OR History Sent by us: Body is typically the thumbnail (for video/image)
            if (isVideo) {
                // Incoming/History video body is a JPEG thumbnail
                setThumbnailSrc(isDataUrl ? m.body : `data:image/jpeg;base64,${rawBase64}`);
            } else if (isImage) {
                // Incoming/History image body is a low-res thumb
                setFullMediaSrc(isDataUrl ? m.body : `data:${m.mimetype || 'image/jpeg'};base64,${rawBase64}`);
            }
            // Documents/Audio usually need download, body might be empty or preview
        }
    }, [m.body, m.type, m.fromMe, m.mimetype, isVideo, isImage, m.id._serialized]);

    const handleDownload = async () => {
        if (loading || (fullMediaSrc && !isImage && !isVideo)) return; // Avoid re-download unless upgrading quality
        
        // If we already have full media for video, don't download again
        if (isVideo && fullMediaSrc) return;

        setLoading(true);
        setError(false);
        const media = await fetchMedia(chatId, m.id._serialized);
        if (media && media.data) {
            const src = `data:${media.mimetype};base64,${media.data}`;
            setFullMediaSrc(src);
        } else {
            setError(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Auto-download only for images to upgrade quality if possible
        if (!isImage || (fullMediaSrc && !m.body) || loading) return; 
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    handleDownload();
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (bubbleRef.current) observer.observe(bubbleRef.current);
        return () => {
            if (bubbleRef.current) observer.unobserve(bubbleRef.current);
        };
    }, [isImage, fullMediaSrc, m.id]);

    return (
        <div ref={bubbleRef} className={`max-w-[85%] p-3 rounded-xl text-sm shadow-sm border group relative ${m.fromMe?'bg-emerald-100 border-emerald-200 rounded-tr-none':'bg-white border-slate-200 rounded-tl-none'}`}>
            
            {/* Actions: Forward and Edit - Visible on Hover */}
            <div className={`absolute -top-3 ${m.fromMe ? '-left-8' : '-right-8'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                {m.fromMe && !isMedia && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(m); }}
                        className="p-1.5 bg-white shadow-md border border-slate-200 rounded-full text-slate-500 hover:text-emerald-600 hover:scale-110 transition-all"
                        title="Editar mensaje"
                    >
                        <PenLine size={12} />
                    </button>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); onForward(m); }}
                    className="p-1.5 bg-white shadow-md border border-slate-200 rounded-full text-slate-500 hover:text-blue-600 hover:scale-110 transition-all"
                    title="Reenviar mensaje"
                >
                    <Share size={12} />
                </button>
            </div>

            {isMedia && (
                <div className="mb-2 rounded-lg overflow-hidden border border-black/10 bg-slate-100 dark:bg-slate-800 min-h-[150px] flex items-center justify-center relative group">
                    {fullMediaSrc ? (
                        isVideo ? (
                            <video src={fullMediaSrc} controls className="w-full h-auto max-h-[300px]" />
                        ) : isImage ? (
                            <img src={fullMediaSrc} alt="Media" className="w-full h-auto object-cover max-h-[300px]" />
                        ) : isAudio ? (
                            <audio src={fullMediaSrc} controls className="w-full min-w-[240px]" />
                        ) : (
                            <a href={fullMediaSrc} download={m.filename || 'document'} className="p-4 flex items-center gap-2 text-slate-700 dark:text-white bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
                                <FileText size={24}/> <span className="underline font-bold">Descargar {m.filename ? `(${m.filename})` : 'Documento'}</span>
                            </a>
                        )
                    ) : (
                        <div className="flex flex-col items-center gap-3 p-6 w-full text-center relative w-full h-full min-h-[150px] justify-center bg-slate-200 dark:bg-slate-700">
                            {/* Render Thumbnail for Video if available */}
                            {isVideo && thumbnailSrc && (
                                <img src={thumbnailSrc} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video Thumbnail"/>
                            )}
                            
                            <div className="relative z-10 flex flex-col items-center">
                                {loading ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 size={32} className="text-emerald-500 animate-spin mb-2"/>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/80 px-2 py-1 rounded">Cargando...</span>
                                    </div>
                                ) : (
                                    <>
                                        {isVideo ? (
                                            <div className="flex flex-col items-center">
                                                <button onClick={handleDownload} className="w-14 h-14 bg-black/50 hover:bg-emerald-600 rounded-full flex items-center justify-center mb-3 text-white transition-all transform hover:scale-110 shadow-lg backdrop-blur-sm">
                                                    {error ? <RefreshCw size={24}/> : <Download size={28}/>}
                                                </button>
                                                <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded uppercase backdrop-blur-md">
                                                    {error ? 'Error - Reintentar' : 'Descargar Video'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <button onClick={handleDownload} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-full shadow-lg transition-all flex items-center gap-2 active:scale-95">
                                                    <Download size={14}/> {error ? 'Reintentar' : 'Descargar Archivo'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {(m.caption || (m.body && !isMedia) || (m.body && isMedia && !m.body.startsWith('data:') && m.body.length < 1000)) && (
                 <p className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium text-sm">
                    {m.caption || m.body}
                 </p>
            )}
            <div className="flex justify-end items-center gap-1 mt-1">
                {m._data?.isEdited && <span className="text-[9px] text-slate-400 italic mr-1">Editado</span>}
                <span className="text-[9px] text-slate-400 font-black uppercase">{new Date(m.timestamp*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                {m.fromMe && <CheckCheck size={14} className={m.ack >= 2 ? "text-blue-500" : "text-slate-400"}/>}
            </div>
        </div>
    );
};

export default function WhatsAppModule({ 
    clients = [], 
    products = [], 
    chats, 
    setChats, 
    currentUser = 'Agente', 
    onNavigate,
    crmDb,
    setCrmDb,
    crmStages = [],
    setCrmStages,
    onRegisterClientFromCrm,
    targetChatPhone,
    onClearTargetChat
}: WhatsAppModuleProps) {
  
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCode, setQrCode] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  
  // --- AGENT REASSIGNMENT STATE ---
  const [showAgentAuthModal, setShowAgentAuthModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  // --- FORWARDING STATE ---
  const [forwardingMsg, setForwardingMsg] = useState<any | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardSearchTerm, setForwardSearchTerm] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);

  // --- EDITING STATE ---
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

  // --- TEMPLATES STATE ---
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateViewMode, setTemplateViewMode] = useState<'LIST' | 'EDIT'>('LIST'); 
  const [templates, setTemplates] = useState<Template[]>(() => {
      const saved = localStorage.getItem('sapi_whatsapp_templates');
      return saved ? JSON.parse(saved) : [
          { id: '1', title: 'Bienvenida', content: '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?' },
          { id: '2', title: 'Precios', content: 'Nuestros precios varían según el modelo. ¿Te gustaría ver el catálogo?' },
          { id: '3', title: 'Despedida', content: 'Gracias por tu compra. ¡Que tengas un excelente día!' }
      ];
  });
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplateData, setNewTemplateData] = useState({ title: '', content: '' });

  // --- AI BOT STATE ---
  const [isAiBotActive, setIsAiBotActive] = useState(false);
  const isAiBotActiveRef = useRef(false);
  
  // --- PER-CHAT BOT CONTROL ---
  const [botMutedChats, setBotMutedChats] = useState<Set<string>>(new Set());
  const botMutedChatsRef = useRef<Set<string>>(new Set());
  
  // Ref for products
  const productsRef = useRef(products);

  // --- MODEL INFO DISPLAY ---
  const [activeModelName, setActiveModelName] = useState('gemini-2.5-flash');

  const [searchTerm, setSearchTerm] = useState("");
  const [chatFilterStage, setChatFilterStage] = useState("Todas");
  const [chatFilterLabel, setChatFilterLabel] = useState("Todas");
  const [chatFilterAgent, setChatFilterAgent] = useState("Todos");

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  const [newNote, setNewNote] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', note: '' });
  
  // --- SETTINGS STATE ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'STAGES' | 'LABELS'>('STAGES');
  const [newItemName, setNewItemName] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  
  // Temporary state for settings modal
  const [tempCrmStages, setTempCrmStages] = useState<any[]>([]);
  const [tempAvailableLabels, setTempAvailableLabels] = useState<{ name: string; color: string; }[]>([]);

  // ADDED: State for inline editing in settings
  const [editingItem, setEditingItem] = useState<{ type: 'stage' | 'label', id: string, name: string } | null>(null);

  // ADDED: Handler for saving inline edit
  const handleSaveItemName = () => {
      if (!editingItem) return;
      if (!editingItem.name.trim()) {
          setEditingItem(null);
          return;
      }

      if (editingItem.type === 'stage') {
          setTempCrmStages(prev => prev.map(s => s.id === editingItem.id ? { ...s, name: editingItem.name } : s));
      } else {
          // For labels, id is the original name
          setTempAvailableLabels(prev => prev.map(l => l.name === editingItem.id ? { ...l, name: editingItem.name.toUpperCase() } : l));
      }
      setEditingItem(null);
  };

  // Default labels if not provided
  const [availableLabels, setAvailableLabels] = useState<{ name: string; color: string; }[]>([
    { name: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { name: 'URGENTE', color: 'bg-red-100 text-red-700 border-red-200' },
    { name: 'RECLAMO', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { name: 'NUEVO', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { name: 'EMPRESA', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { name: 'POSTVENTA', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ]);

  const normalizeText = (text: string) => (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const getCurrentCrmData = () => { 
    if (!selectedChatId) return null; 
    const phone = selectedChatId.replace(/\D/g, ''); 
    return crmDb ? (crmDb[phone] || null) : null; 
  };
  
  const currentCrmData = getCurrentCrmData();
  const isRegisteredClient = clients.some(c => c.phone?.replace(/\D/g,'') === selectedChatId?.replace(/\D/g,''));
  
  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    if(crmDb) {
        Object.values(crmDb).forEach(c => {
            if(c.assignedAgent) agents.add(c.assignedAgent);
        });
    }
    // Ensure currentUser is available in dropdown even if not in DB yet
    if(currentUser) agents.add(currentUser);
    return Array.from(agents);
  }, [crmDb, currentUser]);

  useEffect(() => {
      if (targetChatPhone && status === 'READY') {
          const cleanPhone = targetChatPhone.replace(/\D/g, '');
          const chatId = `${cleanPhone}@c.us`;
          setSearchTerm(cleanPhone);
          loadChat(chatId);
          if (onClearTargetChat) onClearTargetChat();
      }
  }, [targetChatPhone, status, onClearTargetChat]);
  
  // Sync products ref
  useEffect(() => {
      productsRef.current = products;
  }, [products]);

  // Update active model name for display from localStorage
  useEffect(() => {
      const model = localStorage.getItem('sapi_ai_model');
      if (model) setActiveModelName(model);
  }, [isAiBotActive]); 

  // Save templates to LS
  useEffect(() => {
      localStorage.setItem('sapi_whatsapp_templates', JSON.stringify(templates));
  }, [templates]);

  // --- AGENT REASSIGNMENT LOGIC ---
  const handleAgentChangeRequest = () => {
       if (!currentCrmData) return;
       setNewAgentName(currentCrmData.assignedAgent || currentUser || '');
       setAdminPass('');
       setShowAgentAuthModal(true);
  };

  const confirmAgentChange = () => {
      if (adminPass !== '1234') {
          alert('Clave de administrador incorrecta. No se puede reasignar.');
          return;
      }
      if (newAgentName) {
          updateCrmField('assignedAgent', newAgentName);
          setShowAgentAuthModal(false);
          alert(`Agente reasignado a: ${newAgentName}`);
      }
  };

  const filteredChats = useMemo(() => {
    let displayList = [...(chats || [])];
    const term = normalizeText(searchTerm);

    if (term) {
        const existingPhones = new Set(displayList.map(c => c.id?.user || c.id?._serialized?.replace(/\D/g, '') || ''));
        if(crmDb) {
            const crmMatches = Object.values(crmDb).filter(c => { 
                const name = normalizeText(c?.name || ''); 
                const phone = c?.phone || '';
                return (name.includes(term) || phone.includes(term)) && !existingPhones.has(phone); 
            }).map(c => ({ 
                id: { _serialized: `${c.phone}@c.us`, user: c.phone }, 
                name: c.name, 
                unreadCount: 0, 
                timestamp: Date.now() / 1000, 
                lastMessage: { body: '' }, 
                isCrmContact: true 
            }));
            displayList = [...displayList, ...crmMatches];
        }
    }

    return displayList.filter(c => {
        const phone = c.id?.user || c.id?._serialized?.replace(/\D/g, '') || '';
        if (!phone) return false;
        if (term) {
             const name = normalizeText(c.name || '');
             if (!name.includes(term) && !phone.includes(term)) return false;
        }
        const crmData = crmDb ? crmDb[phone] : null;
        if (chatFilterStage !== "Todas" && crmData?.stage !== chatFilterStage) return false;
        if (chatFilterLabel !== "Todas" && !(crmData?.labels || []).includes(chatFilterLabel)) return false;
        if (chatFilterAgent !== "Todos" && crmData?.assignedAgent !== chatFilterAgent) return false;
        return true;
    });
  }, [chats, searchTerm, crmDb, chatFilterStage, chatFilterLabel, chatFilterAgent]);

  // Sync ref for socket callback
  useEffect(() => {
    isAiBotActiveRef.current = isAiBotActive;
  }, [isAiBotActive]);

  useEffect(() => {
    botMutedChatsRef.current = botMutedChats;
  }, [botMutedChats]);

  // Toggle Bot for Specific Chat
  const toggleBotForChat = (chatId: string) => {
    setBotMutedChats(prev => {
        const newSet = new Set(prev);
        if (newSet.has(chatId)) {
            newSet.delete(chatId);
        } else {
            newSet.add(chatId);
        }
        return newSet;
    });
  };
  
  // --- FORWARD LOGIC ---
  const handleForwardMessage = (msg: any) => {
      setForwardingMsg(msg);
      setShowForwardModal(true);
      setForwardSearchTerm("");
  };

  const executeForward = async (targetChatId: string) => {
    if (!forwardingMsg || isForwarding) return;
    setIsForwarding(true);
    
    try {
        let content = forwardingMsg.body;
        let media = undefined;

        const isMedia = forwardingMsg.type === 'image' || forwardingMsg.type === 'video' || forwardingMsg.type === 'document' || forwardingMsg.type === 'audio' || forwardingMsg.type === 'ptt';
        
        if (isMedia) {
             const downloaded = await fetchMedia(selectedChatId!, forwardingMsg.id._serialized);
             if (downloaded) {
                 media = downloaded;
                 content = forwardingMsg.caption || ""; 
             } else if (forwardingMsg.body.startsWith('data:')) {
                 const parts = forwardingMsg.body.split(',');
                 media = {
                     mimetype: forwardingMsg.mimetype || (forwardingMsg.type === 'image' ? 'image/jpeg' : 'application/octet-stream'),
                     data: parts[1],
                     filename: forwardingMsg.filename
                 };
                 content = forwardingMsg.caption || "";
             }
        }

        await api('/messages', {
            method: 'POST',
            body: JSON.stringify({
                chatId: targetChatId,
                content: content,
                media: media
            })
        });
        
        setShowForwardModal(false);
        setForwardingMsg(null);
    } catch (e) {
        console.error("Error forwarding:", e);
        alert("Error al reenviar el mensaje");
    } finally {
        setIsForwarding(false);
    }
  };

  // --- EDIT MESSAGE LOGIC ---
  const handleEditMessage = (msg: any) => {
      setEditingMessage(msg);
      setMsgInput(msg.body || "");
      if (document.querySelector('input[placeholder="Escribe un mensaje..."]')) {
          (document.querySelector('input[placeholder="Escribe un mensaje..."]') as HTMLElement).focus();
      }
  };

  const cancelEdit = () => {
      setEditingMessage(null);
      setMsgInput("");
  };

  // --- TEMPLATE LOGIC ---
  const handleSaveTemplate = () => {
      if (!newTemplateData.title || !newTemplateData.content) return alert("Título y contenido requeridos");
      
      if (editingTemplate) {
          setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...newTemplateData } : t));
          setEditingTemplate(null);
      } else {
          setTemplates(prev => [...prev, { id: Date.now().toString(), ...newTemplateData }]);
      }
      setNewTemplateData({ title: '', content: '' });
      setTemplateViewMode('LIST'); 
  };

  const handleEditTemplate = (t: Template) => {
      setEditingTemplate(t);
      setNewTemplateData({ title: t.title, content: t.content });
      setTemplateViewMode('EDIT'); 
  };
  
  const handleCreateTemplate = () => {
      setEditingTemplate(null);
      setNewTemplateData({ title: '', content: '' });
      setTemplateViewMode('EDIT');
  };

  const handleDeleteTemplate = (id: string) => {
      if(confirm("¿Eliminar plantilla?")) setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleUseTemplate = (content: string) => {
      setMsgInput(content);
      setShowTemplateModal(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') { audioRef.current = new Audio(NOTIFICATION_SOUND); alarmRef.current = new Audio(ALARM_SOUND); }
    if (socket && !socket.connected) { socket.connect(); } else if (socket) { setStatus('READY'); fetchChats(); }
    if (!socket) return;
    const onConnect = () => setStatus(prev => (prev === 'DISCONNECTED' || prev === 'CONNECTION_ERROR' ? 'INITIALIZING' : prev));
    const onDisconnect = () => setStatus('DISCONNECTED');
    const onQr = (qr: string) => { setStatus('QR_READY'); setQrCode(qr); };
    const onReady = () => { setStatus('READY'); fetchChats(); };
    const onMessage = (msg: any) => { 
        if (!msg.fromMe) {
            handleNewMsg(msg); 
            if (document.visibilityState === 'visible') {
                audioRef.current?.play().catch(() => {});
            }
            if (isAiBotActiveRef.current && !botMutedChatsRef.current.has(msg.from)) {
                console.log("[Background Process] Generating AI Reply for:", msg.from);
                generateAutoReply(msg.body, msg.from);
            }
        }
    };
    socket.on('connect', onConnect); 
    socket.on('disconnect', onDisconnect); 
    socket.on('qr', onQr); 
    socket.on('ready', onReady); 
    socket.on('message', onMessage);
    return () => { 
        socket.off('connect', onConnect); 
        socket.off('disconnect', onDisconnect); 
        socket.off('qr', onQr); 
        socket.off('ready', onReady); 
        socket.off('message', onMessage); 
    };
  }, []);

  const api = async (path: string, opts?: any) => { 
      try { 
          const res = await fetch(`${BACKEND_URL}${path}`, { 
              ...opts, 
              headers: { 
                  "Content-Type": "application/json", 
                  "ngrok-skip-browser-warning": "true",
                  ...opts?.headers 
              } 
          }); 
          return await res.json(); 
      } catch (e) { 
          return null; 
      } 
  };
  const fetchChats = async () => { const data = await api('/chats'); if (Array.isArray(data) && data.length > 0) { setChats(data); } };
  
  const generateAutoReply = async (userMessage: string, chatId: string) => {
    try {
        const savedModel = localStorage.getItem('sapi_ai_model') || 'gemini-2.5-flash';
        const savedConfigStr = localStorage.getItem('sapi_ai_config');
        const savedConfig = savedConfigStr ? JSON.parse(savedConfigStr) : {};
        let systemInstruction = savedConfig.systemInstruction || "Eres un asistente útil y breve de ventas.";
        
        const useInventory = localStorage.getItem('sapi_ai_use_inventory') === 'true';
        if (useInventory && productsRef.current.length > 0) {
             const inventoryList = productsRef.current.slice(0, 40).map(p => 
                 `- ${p.name}: S/ ${p.price} (Stock: ${p.stock})`
             ).join('\n');
             systemInstruction += `\n\n[INVENTARIO DISPONIBLE (RESUMEN)]:\n${inventoryList}\n\nSi el cliente pregunta por algo fuera de esta lista, indica que verificarás en almacén.`;
        }

        const isOpenAI = savedModel.startsWith('gpt');
        let replyText = "";
        let errorMsg = "";

        if (isOpenAI) {
            const apiKey = localStorage.getItem('sapi_ai_openai_key');
            if (!apiKey) {
                console.warn("AI Bot: No OpenAI Key found.");
                errorMsg = "Error: Falta OpenAI Key en Asistente IA.";
            } else {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: savedModel,
                            messages: [
                                { role: "system", content: systemInstruction },
                                { role: "user", content: userMessage }
                            ],
                            max_tokens: 300
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    replyText = data.choices?.[0]?.message?.content || "";
                } catch (e: any) {
                    errorMsg = `OpenAI Error: ${e.message}`;
                }
            }

        } else {
            const apiKey = localStorage.getItem('sapi_ai_google_key') || localStorage.getItem('sapi_ai_apikey') || process.env.API_KEY || '';
            if (!apiKey) {
                console.warn("AI Bot: No Google API Key found.");
                errorMsg = "Error: Falta Google API Key en Asistente IA.";
            } else {
                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const response = await ai.models.generateContent({
                        model: savedModel, 
                        contents: userMessage,
                        config: {
                            systemInstruction: systemInstruction
                        }
                    });
                    replyText = response.text || "";
                } catch (e: any) {
                    errorMsg = `Gemini Error: ${e.message}`;
                    if (e.message?.includes('404')) errorMsg = "Error: Modelo no encontrado o acceso denegado.";
                }
            }
        }
        
        if (replyText) {
            await api('/messages', { method: 'POST', body: JSON.stringify({ chatId, content: replyText }) });
            setSelectedChatId(prev => {
                if (prev === chatId) {
                     const aiMsg = { 
                         id: { _serialized: 'ai-' + Date.now(), fromMe: true }, 
                         body: replyText, 
                         type: 'chat', 
                         timestamp: Date.now() / 1000, 
                         fromMe: true, 
                         ack: 1 
                     };
                     setMessages(prevMsgs => [...prevMsgs, aiMsg]);
                     if (document.visibilityState === 'visible') {
                        setTimeout(()=>msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                     }
                }
                return prev;
            });
        } else if (errorMsg) {
             console.error(errorMsg);
             setSelectedChatId(prev => {
                if (prev === chatId) {
                     const sysMsg = { 
                         id: { _serialized: 'sys-' + Date.now(), fromMe: true }, 
                         body: `⚠️ ${errorMsg}`, 
                         type: 'e2e_notification', 
                         timestamp: Date.now() / 1000, 
                         fromMe: true, 
                         ack: 0 
                     };
                     setMessages(prevMsgs => [...prevMsgs, sysMsg]);
                     if (document.visibilityState === 'visible') {
                        setTimeout(()=>msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                     }
                }
                return prev;
            });
        }

    } catch (error) {
        console.error("AI Auto-Reply Critical Error:", error);
    }
  };

  const loadChat = async (id: string) => { 
      setSelectedChatId(id); 
      const isVirtual = !chats.some(c => c.id._serialized === id); 
      if (isVirtual) { setMessages([]); } else { const data = await api(`/chats/${id}/messages`); if(data && Array.isArray(data)) { setMessages(data); } else { setMessages([]); } } 
      setTimeout(()=>msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200); 
      const phone = id.replace(/\D/g, ''); 
      if (crmDb && !crmDb[phone]) { 
          const chatInfo = chats.find(c => c.id._serialized === id); 
          setCrmDb(prev => ({ ...prev, [phone]: { name: chatInfo?.name || id, phone, stage: 'Nuevo', labels: [], notes: [] } })); 
      }
  };
  
  const handleNewMsg = (msg: any) => { 
      if (msg.fromMe) return;
      setSelectedChatId(prev => { 
          if(prev === msg.from) { 
              setMessages(m => { const exists = (m || []).some(ex => ex.id._serialized === msg.id._serialized); return exists ? m : [...(m || []), msg]; }); 
              if (document.visibilityState === 'visible') {
                setTimeout(()=>msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); 
              }
          } 
          return prev; 
      }); 
      fetchChats(); 
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setChatFile(e.target.files[0]); } };

  const updateCrmField = (field: keyof CrmContact, value: any) => {
      if (!selectedChatId) return;
      const phone = selectedChatId.replace(/\D/g, '');
      if (crmDb && crmDb[phone]) {
          setCrmDb(prev => ({
              ...prev,
              [phone]: { ...prev[phone], [field]: value }
          }));
      }
  };

  const sendMessage = async () => {
      if(isSendingMessage) return;
      if((!msgInput.trim() && !chatFile) || !selectedChatId) return;
      const phone = selectedChatId.replace(/\D/g, '');
      const crmContact = crmDb ? crmDb[phone] : null;
      
      // AUTO ASSIGNMENT LOGIC: If no agent, current user claims the chat
      if (crmContact && !crmContact.assignedAgent && currentUser) { 
          updateCrmField('assignedAgent', currentUser); 
      }
      
      setIsSendingMessage(true);
      const txt = msgInput || '';
      let optimisticMediaData = null;
      let rawBase64 = null;
      if (chatFile) {
          try {
              const b64 = await fileToBase64(chatFile);
              rawBase64 = b64.includes('base64,') ? b64.split('base64,')[1] : b64;
              optimisticMediaData = { mimetype: chatFile.type || 'application/octet-stream', data: rawBase64, filename: chatFile.name };
          } catch (e) { console.error("Error file:", e); setIsSendingMessage(false); return; }
      }
      
      let fileType = 'chat';
      if (chatFile) {
          if (chatFile.type.startsWith('video/')) fileType = 'video';
          else if (chatFile.type.startsWith('image/')) fileType = 'image';
          else if (chatFile.type.startsWith('audio/')) fileType = 'audio';
          else fileType = 'document';
      }

      if (editingMessage) {
        setMessages(prev => prev.map(m => m.id._serialized === editingMessage.id._serialized ? { ...m, body: txt, _data: { ...m._data, isEdited: true } } : m));
        setMsgInput("");
        setEditingMessage(null);
        setIsSendingMessage(false);
        return;
      }

      const tempId = 'temp-' + Date.now();
      const optimisticMsg = { 
          id: { _serialized: tempId, fromMe: true }, 
          body: chatFile ? rawBase64 : txt, 
          type: fileType, 
          mimetype: chatFile ? chatFile.type : undefined, 
          timestamp: Date.now() / 1000, 
          fromMe: true, 
          ack: 0, 
          caption: chatFile ? txt : undefined 
      };
      
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(()=>msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setMsgInput(""); setChatFile(null); if(chatFileInputRef.current) chatFileInputRef.current.value = '';
      
      const response = await api('/messages', { method:'POST', body: JSON.stringify({ chatId: selectedChatId, content: txt, caption: txt, media: optimisticMediaData }) });
      setIsSendingMessage(false);
      
      if (response && response.id) {
          const realMsg = { ...response, body: chatFile ? rawBase64 : response.body, timestamp: response.timestamp || Math.floor(Date.now() / 1000) };
          setMessages(prev => prev.map(m => m.id._serialized === tempId ? realMsg : m));
      }
  };

  const addNote = () => { 
      if (!newNote.trim()) return; 
      const notes = currentCrmData?.notes || []; 
      const updatedNotes = [...notes, { id: Date.now(), text: newNote, date: new Date().toISOString() }]; 
      updateCrmField('notes', updatedNotes); 
      setNewNote(""); 
  };

  const getLabelStyle = (labelName: string) => availableLabels.find(l => l.name === labelName)?.color || 'bg-slate-100 text-slate-600 border-slate-200';

  const toggleLabel = (label: string) => {
      if (!currentCrmData) return;
      const currentLabels = currentCrmData.labels || [];
      const newLabels = currentLabels.includes(label) ? currentLabels.filter(l => l !== label) : [...currentLabels, label];
      updateCrmField('labels', newLabels);
  };
  
  const handleOpenSettings = () => {
    setTempCrmStages(JSON.parse(JSON.stringify(crmStages || [])));
    setTempAvailableLabels(JSON.parse(JSON.stringify(availableLabels)));
    setShowSettingsModal(true);
  };
  
  const handleSaveSettings = () => {
    if (setCrmStages) setCrmStages(tempCrmStages);
    setAvailableLabels(tempAvailableLabels);
    setShowSettingsModal(false);
  };

  const stageColorPalette = ['border-slate-400', 'border-rose-500', 'border-amber-500', 'border-emerald-500', 'border-blue-500', 'border-violet-500', 'border-pink-500'];
  const labelColorPalette = ['bg-slate-100 text-slate-600 border-slate-200', 'bg-rose-100 text-rose-600 border-rose-200', 'bg-amber-100 text-amber-600 border-amber-200', 'bg-emerald-100 text-emerald-600 border-emerald-200', 'bg-blue-100 text-blue-600 border-blue-200', 'bg-violet-100 text-violet-600 border-violet-200', 'bg-pink-100 text-pink-600 border-pink-200'];
  
  const updateStageColor = (stageId: string, color: string) => setTempCrmStages(prev => prev.map(s => s.id === stageId ? { ...s, color } : s));
  const updateLabelColor = (labelName: string, color: string) => setTempAvailableLabels(prev => prev.map(l => l.name === labelName ? { ...l, color } : l));
  
  const handleAddStage = () => { 
      if (!newItemName) return; 
      setTempCrmStages(prev => [...prev, { id: newItemName, name: newItemName, color: 'border-slate-400' }]); 
      setNewItemName(""); 
  };
  
  const deleteStage = (id: string) => { 
      if (!confirm("¿Eliminar etapa?")) return; 
      setTempCrmStages(prev => prev.filter(s => s.id !== id)); 
  };
  
  const handleAddLabel = () => { 
      if (!newLabelName) return; 
      const upperName = newLabelName.toUpperCase(); 
      if (!tempAvailableLabels.some(l => l.name === upperName)) { 
          setTempAvailableLabels([...tempAvailableLabels, { name: upperName, color: 'bg-slate-100 text-slate-600 border-slate-200' }]); 
      } 
      setNewLabelName(""); 
  };
  
  const deleteLabel = (labelName: string) => { 
      if (!confirm("¿Eliminar etiqueta?")) return; 
      setTempAvailableLabels(tempAvailableLabels.filter(l => l.name !== labelName)); 
  };

  const handleSchedule = () => { 
      if (!scheduleData.date || !scheduleData.time) return alert("Fecha y hora requeridas"); 
      const isoString = `${scheduleData.date}T${scheduleData.time}`; 
      updateCrmField('nextFollowUp', isoString); 
      if(scheduleData.note) { 
          const notes = currentCrmData?.notes || []; 
          const updatedNotes = [...notes, { id: Date.now(), text: `📅 Agendado: ${scheduleData.note}`, date: new Date().toISOString() }]; 
          updateCrmField('notes', updatedNotes); 
      } 
      setShowScheduleModal(false); setScheduleData({ date: '', time: '', note: '' }); 
  };

  useEffect(() => { if (!chatFile) { setPreviewUrl(null); return; } const objectUrl = URL.createObjectURL(chatFile); setPreviewUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [chatFile]);

  const handleLogout = async () => { 
      if(!confirm("¿Cerrar sesión?")) return; 
      setStatus('DISCONNECTED'); setQrCode(''); 
      try { if(socket && socket.connected) socket.emit('logout'); await fetch(`${BACKEND_URL}/logout`, { method: 'POST' }); } catch(e) {} 
      setChats([]); setMessages([]); setSelectedChatId(null); 
      if(socket) socket.disconnect(); setTimeout(() => { if(socket) socket.connect(); }, 1000); 
  };

  const simulateIncomingMessage = () => {
    const fakeMsg = {
        fromMe: false,
        from: selectedChatId || '123456789@c.us',
        id: { _serialized: 'fake-' + Date.now(), fromMe: false },
        body: 'Hola, quiero información sobre precios.',
        timestamp: Date.now() / 1000,
        type: 'chat'
    };
    if (isAiBotActiveRef.current && !botMutedChatsRef.current.has(fakeMsg.from)) {
        generateAutoReply(fakeMsg.body, fakeMsg.from);
    }
    handleNewMsg(fakeMsg);
  };

  if (status === 'QR_READY' || (status === 'QR')) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white animate-in fade-in">
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md animate-in zoom-in-95">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6 text-lg">Escanea el código QR</h3>
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border border-slate-100 w-full max-w-[320px]">
                    <div className="w-full aspect-square relative">
                         <QRCodeSVG value={qrCode} size={undefined} style={{ width: '100%', height: '100%' }} level={"H"} includeMargin={false} />
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (status !== 'READY') {
     return (
         <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-center p-4">
             <Loader2 size={64} className="text-emerald-500 animate-spin mb-6"/>
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">{status === 'DISCONNECTED' ? 'Desconectado' : 'Conectando...'}</h2>
             <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs">Recargar</button>
         </div>
     )
  }

  return (
    <div className="flex h-full w-full bg-[#f0f2f5] overflow-hidden text-slate-800 font-sans relative">
      <div className="w-[360px] bg-white border-r border-slate-300 flex flex-col z-20 overflow-hidden shrink-0">
          {/* ... (Sidebar Filters) ... */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between p-2 bg-slate-100 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">WhatsApp Activo</span>
                  </div>
                  <button 
                    onClick={() => setIsAiBotActive(!isAiBotActive)} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                        isAiBotActive 
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md animate-pulse' 
                        : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    <Bot size={12} />
                    {isAiBotActive ? 'IA Bot ON' : 'IA Bot OFF'}
                  </button>
              </div>
              <div className="space-y-2">
                    <div className="flex gap-1 mb-1">
                         <select className="flex-1 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" value={chatFilterStage} onChange={e => setChatFilterStage(e.target.value)}>
                            <option value="Todas">Etapa: Todas</option>
                            {crmStages && crmStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                         <select className="flex-1 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" value={chatFilterLabel} onChange={e => setChatFilterLabel(e.target.value)}>
                            <option value="Todas">Etiqueta: Todas</option>
                            {availableLabels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                         </select>
                         <select className="flex-1 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" value={chatFilterAgent} onChange={e => setChatFilterAgent(e.target.value)}>
                            <option value="Todos">Agente: Todos</option>
                            {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
                         </select>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400" placeholder="Buscar chat..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100">
              {filteredChats.map(c => {
                  const phone = c.id?.user || c.id?._serialized?.replace(/\D/g, '') || '';
                  if (!phone) return null; 
                  const contactCrm = crmDb ? crmDb[phone] : null;
                  const stageInfo = contactCrm ? (crmStages || []).find(s => s.id === contactCrm.stage) : null;
                  const stageBgColor = stageInfo ? (stageInfo.color || '').replace('border', 'bg') : 'bg-slate-400';

                  return (
                    <div key={c.id._serialized} onClick={() => loadChat(c.id._serialized)} className={`p-4 border-b border-slate-200 cursor-pointer hover:bg-white transition-all ${selectedChatId===c.id._serialized ? 'bg-white border-l-4 border-l-emerald-500' : 'bg-white/50'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-800 truncate max-w-[180px]">{c.name || c.id.user}</span>
                            {c.unreadCount > 0 && <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 rounded-full">{c.unreadCount}</span>}
                        </div>
                        <div className="text-xs text-slate-500 truncate mb-1.5">{c.lastMessage?.body || 'Multimedia'}</div>
                        {(contactCrm?.assignedAgent || contactCrm?.stage || (contactCrm?.labels || []).length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {stageInfo && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${stageBgColor}`}></div>
                                        {contactCrm.stage}
                                    </span>
                                )}
                                {(contactCrm.labels || []).map(label => {
                                    const labelStyle = getLabelStyle(label);
                                    return <span key={label} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${labelStyle}`}>{label}</span>
                                })}
                                {contactCrm.assignedAgent && <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><UserCheck size={10}/> {contactCrm.assignedAgent}</span>}
                            </div>
                        )}
                    </div>
                  );
              })}
          </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-[#e5ddd5] relative">
          {selectedChatId ? (
            <>
                <div className="h-16 bg-white border-b border-slate-300 flex justify-between items-center px-4 shadow-sm z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                            {(currentCrmData?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm truncate max-w-[200px] uppercase">{currentCrmData?.name || 'Cargando...'}</h3>
                            {currentCrmData?.assignedAgent && (
                                <div className="text-[9px] text-slate-400 font-bold tracking-widest flex items-center gap-1 mt-0.5"><UserCheck size={10} className="text-emerald-500"/> {currentCrmData.assignedAgent}</div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isAiBotActive && !botMutedChats.has(selectedChatId) && (
                            <div className="hidden md:flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                                <Cpu size={12}/>
                                <span className="text-[9px] font-bold uppercase">{activeModelName}</span>
                            </div>
                        )}
                        <button
                            onClick={() => toggleBotForChat(selectedChatId)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                                botMutedChats.has(selectedChatId)
                                ? 'bg-slate-200 text-slate-500 border-slate-300'
                                : 'bg-purple-100 text-purple-700 border-purple-200'
                            }`}
                            title={botMutedChats.has(selectedChatId) ? "Reanudar IA" : "Pausar IA"}
                        >
                            {botMutedChats.has(selectedChatId) ? <PowerOff size={12}/> : <Power size={12}/>}
                            {botMutedChats.has(selectedChatId) ? 'IA Pausada' : 'IA Activa'}
                        </button>
                        <button onClick={simulateIncomingMessage} className="p-1.5 text-slate-300 hover:text-blue-500" title="Simular Mensaje Entrante (Debug)">
                            <Zap size={14}/>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {messages.map((m, i) => ( 
                            <div key={i} className={`flex ${m.fromMe?'justify-end':'justify-start'}`}> 
                                {m.type === 'e2e_notification' ? (
                                    <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm max-w-[80%] mx-auto text-center">
                                        {m.body}
                                    </div>
                                ) : (
                                    <MessageBubble m={m} chatId={selectedChatId} onForward={handleForwardMessage} onEdit={handleEditMessage} />
                                )}
                            </div> 
                        ))}
                        <div ref={msgsEndRef}/>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 flex gap-4 items-center relative">
                    {editingMessage && (
                        <div className="absolute -top-10 left-0 right-0 bg-yellow-100 text-yellow-800 px-4 py-2 text-xs font-bold flex justify-between items-center border-t border-yellow-200 shadow-sm animate-in slide-in-from-bottom-2">
                            <span>✏️ Editando mensaje...</span>
                            <button onClick={cancelEdit} className="p-1 hover:bg-yellow-200 rounded-full"><X size={14}/></button>
                        </div>
                    )}
                    <div className="flex-1 relative">
                        {chatFile && ( <div className="absolute bottom-full mb-2 left-0 bg-white p-2 rounded-xl flex items-center gap-3 border border-slate-200 shadow-lg animate-in slide-in-from-bottom-2 max-w-[300px]"> <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0"> <Paperclip size={20} className="text-slate-400"/> </div> <div className="flex-1 min-w-0"> <p className="text-xs font-bold text-slate-700 truncate">{chatFile.name}</p> </div> <button onClick={() => setChatFile(null)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"> <X size={16}/> </button> </div> )}
                        <input className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] outline-none focus:border-emerald-500 focus:bg-white font-medium text-sm transition-all" placeholder="Escribe un mensaje..." value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}/>
                        <button onClick={() => { setShowTemplateModal(true); setTemplateViewMode('LIST'); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 p-1 transition-colors" title="Plantillas">
                            <LayoutTemplate size={20}/>
                        </button>
                        <button onClick={() => chatFileInputRef.current?.click()} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"> <Paperclip size={20}/> </button>
                        <input type="file" ref={chatFileInputRef} className="hidden" onChange={handleChatFileSelect} accept="image/*,video/*,audio/*,application/*" />
                    </div>
                    <button onClick={sendMessage} disabled={isSendingMessage} className={`w-9 h-9 p-2 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${editingMessage ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}> 
                        {isSendingMessage ? <Loader2 size={16} className="animate-spin"/> : editingMessage ? <Check size={16}/> : <Send size={16}/>} 
                    </button>
                </div>
            </>
          ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-300"> <div className="w-32 h-32 bg-slate-200 rounded-[3rem] flex items-center justify-center mb-6 shadow-inner"> <MessageCircle size={64} className="opacity-20"/> </div> <h3 className="font-black uppercase tracking-[0.2em] text-slate-400">Selecciona un chat</h3> </div> )}
      </div>

      {/* CRM SIDEBAR */}
      {selectedChatId && (
        <div className="w-[340px] bg-white border-l border-slate-300 shadow-2xl z-30 flex flex-col h-full shrink-0">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div> <h3 className="font-black text-base text-slate-800 uppercase tracking-tighter truncate max-w-[200px]">{currentCrmData?.name || 'Cliente'}</h3> <p className="text-[10px] text-slate-400 font-bold tracking-widest">{currentCrmData?.phone}</p> </div>
                    <button onClick={handleOpenSettings} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"> <Settings size={18}/> </button>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    {/* AGENT FIELD - LOCKED BY DEFAULT */}
                    <div className="flex-1 space-y-1">
                        <div className="text-[9px] font-black text-slate-400 uppercase">Agente Asignado</div>
                        <div className="flex gap-2 items-center">
                             <div className={`flex-1 p-2 border rounded-lg text-xs font-bold uppercase truncate ${currentCrmData?.assignedAgent ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {currentCrmData?.assignedAgent || 'SIN ASIGNAR'}
                             </div>
                             <button 
                                onClick={handleAgentChangeRequest} 
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shadow-sm border border-slate-200"
                                title="Cambiar Agente (Admin)"
                             >
                                <Lock size={14}/>
                             </button>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase">Etapa</div>
                            <select className={`w-full p-2 bg-white rounded-lg text-xs font-black uppercase text-indigo-700 outline-none focus:border-indigo-500 border-l-4 ${currentCrmData?.stage ? ((crmStages || []).find(s=>s.id === currentCrmData.stage)?.color || 'border-l-slate-400') : 'border-l-slate-400'}`} value={currentCrmData?.stage || 'Nuevo'} onChange={(e) => updateCrmField('stage', e.target.value)}> {crmStages && crmStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)} </select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase">Etiqueta</div>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none uppercase" onChange={(e) => { if(e.target.value) { toggleLabel(e.target.value); e.target.value = ''; } }}> <option value="">+ Añadir</option> {availableLabels.filter(l => !(currentCrmData?.labels || []).includes(l.name)).map(l => ( <option key={l.name} value={l.name}>{l.name}</option> ))} </select>
                        </div>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex flex-wrap gap-1.5">
                        {currentCrmData?.labels && currentCrmData.labels.map(label => (
                            <span key={label} className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${getLabelStyle(label)}`}>
                                {label} <button onClick={() => toggleLabel(label)} className="hover:text-red-500"><X size={10}/></button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            {/* ... Rest of CRM Sidebar Actions & Notes ... */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                    {!isRegisteredClient ? ( <button onClick={() => onRegisterClientFromCrm(currentCrmData?.name || '', currentCrmData?.phone || '')} className="flex flex-col items-center justify-center p-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl border border-orange-200 transition-all active:scale-95 group"> <UserPlus size={18} className="mb-1"/> <span className="text-[8px] font-black uppercase">Registrar</span> </button> ) : ( <div className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 opacity-60"> <Check size={18} className="mb-1"/> <span className="text-[8px] font-black uppercase">Validado</span> </div> )}
                    <button onClick={() => onNavigate && onNavigate(ViewState.POS)} className="flex flex-col items-center justify-center p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200 transition-all active:scale-95 group"> <ShoppingBag size={18} className="mb-1"/> <span className="text-[8px] font-black uppercase">Pedido</span> </button>
                    <button onClick={() => setShowScheduleModal(true)} className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200 transition-all active:scale-95 group"> <CalendarClock size={18} className="mb-1"/> <span className="text-[8px] font-black uppercase">Agendar</span> </button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm overflow-hidden flex-1 min-h-[300px]"> <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50"> <StickyNote size={14} className="text-amber-500"/> <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas de Seguimiento</span> </div> <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50/30">
                    {(currentCrmData?.notes || []).map((n, i) => ( <div key={i} className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 shadow-sm animate-in slide-in-from-left-2"> <p className="text-[10px] font-medium text-amber-900 leading-relaxed">{n.text}</p> <span className="text-[8px] font-black text-amber-600/60 block text-right mt-1 uppercase">{new Date(n.date).toLocaleString()}</span> </div> ))}
                </div> <div className="p-2 bg-white border-t border-slate-100 flex gap-1"> <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-amber-400 transition-all" placeholder="Escribir nota..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()}/> <button onClick={addNote} className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><Plus size={16}/></button> </div> </div>
                <div className="pt-6 mt-6 border-t border-slate-200"> <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"> <LogOut size={16}/> Cerrar Sesión </button> </div>
            </div>
        </div>
      )}
      
      {/* AGENT REASSIGNMENT MODAL */}
      {showAgentAuthModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock size={24}/>
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Reasignar Agente</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Autorización requerida</p>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nuevo Agente</label>
                        <select 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none uppercase"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                        >
                            <option value="">-- SELECCIONAR --</option>
                            {uniqueAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contraseña Admin</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-black tracking-widest outline-none focus:border-indigo-500"
                            placeholder="****"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowAgentAuthModal(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-[10px] hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                        <button onClick={confirmAgentChange} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 animate-in zoom-in-95 flex flex-col max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-white flex items-center gap-2">
                        <LayoutTemplate size={16} className="text-blue-500"/> Plantillas de Mensajes
                    </h3>
                    <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); setNewTemplateData({title: '', content: ''}); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {templateViewMode === 'EDIT' ? (
                        // FORM VIEW (Create/Edit)
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3 animate-in slide-in-from-right-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</h4>
                                <button onClick={() => setTemplateViewMode('LIST')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft size={12}/> Volver</button>
                            </div>
                            <input 
                                type="text" 
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none"
                                placeholder="Título de Plantilla..."
                                value={newTemplateData.title}
                                onChange={(e) => setNewTemplateData({...newTemplateData, title: e.target.value})}
                                autoFocus
                            />
                            <textarea 
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium outline-none resize-none h-32"
                                placeholder="Contenido del mensaje..."
                                value={newTemplateData.content}
                                onChange={(e) => setNewTemplateData({...newTemplateData, content: e.target.value})}
                            ></textarea>
                            <div className="flex justify-end gap-2 pt-2">
                                 <button onClick={() => setTemplateViewMode('LIST')} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg text-[10px] uppercase">Cancelar</button>
                                 <button onClick={handleSaveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 transition-colors">
                                     {editingTemplate ? 'Actualizar' : 'Guardar'}
                                 </button>
                            </div>
                        </div>
                    ) : (
                        // LIST VIEW
                        <div className="flex flex-col h-full animate-in slide-in-from-left-4">
                            <button 
                                onClick={handleCreateTemplate}
                                className="mb-4 w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                            >
                                <Plus size={14}/> Nueva Plantilla
                            </button>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {templates.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <LayoutTemplate size={40} className="mx-auto mb-2 text-slate-400"/>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Sin plantillas guardadas</p>
                                    </div>
                                ) : templates.map(t => (
                                    <div key={t.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-300 transition-all group cursor-pointer" onClick={() => handleUseTemplate(t.content)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h5 className="font-bold text-xs text-slate-700 dark:text-white uppercase">{t.title}</h5>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditTemplate(t); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit size={12}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{t.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* FORWARD MODAL */}
      {showForwardModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-white flex items-center gap-2">
                        <Share size={16} className="text-blue-500"/> Reenviar Mensaje
                    </h3>
                    <button onClick={() => { setShowForwardModal(false); setForwardingMsg(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:border-blue-500 font-bold"
                            placeholder="Buscar chat..."
                            value={forwardSearchTerm}
                            onChange={(e) => setForwardSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredChats.filter(c => {
                        const term = normalizeText(forwardSearchTerm);
                        const name = normalizeText(c.name || '');
                        const phone = c.id?.user || '';
                        return !term || name.includes(term) || phone.includes(term);
                    }).map(c => (
                        <div key={c.id._serialized} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                                    {(c.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{c.name || c.id.user}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{c.id.user}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => executeForward(c.id._serialized)}
                                disabled={isForwarding}
                                className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
                            >
                                {isForwarding ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
      
      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 animate-in zoom-in-95 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-white flex items-center gap-2">
                            <Settings size={16} className="text-slate-500"/> Configuración CRM
                        </h3>
                        <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
                        <button onClick={() => setActiveConfigTab('STAGES')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeConfigTab === 'STAGES' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}>Etapas</button>
                        <button onClick={() => setActiveConfigTab('LABELS')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeConfigTab === 'LABELS' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}>Etiquetas</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {activeConfigTab === 'STAGES' ? (
                        <>
                            <div className="flex gap-2">
                                <input className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none" placeholder="Nueva Etapa..." value={newItemName} onChange={e => setNewItemName(e.target.value)}/>
                                <button onClick={handleAddStage} className="p-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg active:scale-95 transition-all"><Plus size={16}/></button>
                            </div>
                            <div className="space-y-2">
                                {tempCrmStages.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl group">
                                        <div className={`w-3 h-3 rounded-full border-2 ${s.color.replace('border-', 'border-').replace('text-', 'bg-').replace('-700', '-500')}`}></div>
                                        {editingItem?.type === 'stage' && editingItem.id === s.id ? (
                                            <input autoFocus className="flex-1 bg-transparent border-b border-slate-400 outline-none text-xs font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} onBlur={handleSaveItemName} onKeyDown={e => e.key === 'Enter' && handleSaveItemName()}/>
                                        ) : (
                                            <span className="flex-1 text-xs font-bold text-slate-700 dark:text-white cursor-pointer" onClick={() => setEditingItem({type: 'stage', id: s.id, name: s.name})}>{s.name}</span>
                                        )}
                                        
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="relative group/color">
                                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-slate-400"><Palette size={14}/></button>
                                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 flex gap-1 z-50 hidden group-hover/color:flex">
                                                    {stageColorPalette.map(c => (
                                                        <button key={c} onClick={() => updateStageColor(s.id, c)} className={`w-4 h-4 rounded-full ${c.replace('border-', 'bg-').replace('-500', '-500')} hover:scale-125 transition-transform`}></button>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={() => deleteStage(s.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <input className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none uppercase" placeholder="NUEVA ETIQUETA..." value={newLabelName} onChange={e => setNewLabelName(e.target.value)}/>
                                <button onClick={handleAddLabel} className="p-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg active:scale-95 transition-all"><Plus size={16}/></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tempAvailableLabels.map(l => (
                                    <div key={l.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase group relative ${l.color}`}>
                                        {editingItem?.type === 'label' && editingItem.id === l.name ? (
                                            <input autoFocus className="bg-transparent border-b border-current outline-none w-20" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} onBlur={handleSaveItemName} onKeyDown={e => e.key === 'Enter' && handleSaveItemName()}/>
                                        ) : (
                                            <span className="cursor-pointer" onClick={() => setEditingItem({type: 'label', id: l.name, name: l.name})}>{l.name}</span>
                                        )}
                                        
                                        <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="relative group/color">
                                                <button className="hover:scale-110"><Palette size={10}/></button>
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 flex gap-1 z-50 hidden group-hover/color:flex w-max">
                                                    {labelColorPalette.map(c => (
                                                        <button key={c} onClick={() => updateLabelColor(l.name, c)} className={`w-3 h-3 rounded-full border ${c.split(' ')[0]}`}></button>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={() => deleteLabel(l.name)} className="hover:text-red-600"><X size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={handleSaveSettings} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-primary-700 transition-all active:scale-95">Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
