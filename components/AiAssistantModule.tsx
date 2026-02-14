
import React, { useState, useRef, useEffect } from 'react';
import { 
    MessageSquare, Database, Settings, Key, BarChart3, 
    Send, Image as ImageIcon, Mic, Trash2, Eraser, 
    UploadCloud, FileText, Cpu, Zap, DollarSign, Activity, 
    Save, X, ShieldCheck, Loader2, RefreshCw, ToggleLeft, ToggleRight, Check, CheckCircle2, AlertTriangle, Globe, Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Product } from '../types';

interface AiAssistantModuleProps {
    sessionUser: string;
    products: Product[];
}

type TabView = 'CHAT' | 'DATA' | 'CONFIG' | 'CONNECTION' | 'USAGE';

interface Message {
    id: string;
    role: 'user' | 'model' | 'assistant'; // 'assistant' for OpenAI mapping
    text: string;
    timestamp: Date;
    image?: string;
    usage?: { promptTokens: number, responseTokens: number };
}

interface TokenStats {
    prompt: number;
    response: number;
    total: number;
    cost: number;
}

export const AiAssistantModule: React.FC<AiAssistantModuleProps> = ({ sessionUser, products }) => {
    // --- ESTADO GENERAL ---
    const [activeTab, setActiveTab] = useState<TabView>('CHAT');
    
    // --- ESTADO FEEDBACK VISUAL ---
    const [keysSaved, setKeysSaved] = useState(false);
    const [configSaved, setConfigSaved] = useState(false);

    // --- ESTADO CONEXIÓN (DOBLE LLAVE) ---
    const [googleKey, setGoogleKey] = useState(() => localStorage.getItem('sapi_ai_google_key') || localStorage.getItem('sapi_ai_apikey') || '');
    const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('sapi_ai_openai_key') || '');
    
    const [isCustomKey, setIsCustomKey] = useState(() => !!localStorage.getItem('sapi_ai_google_key') || !!localStorage.getItem('sapi_ai_openai_key'));
    
    // --- ESTADO CONFIGURACIÓN (PERSISTENTE) ---
    const [config, setConfig] = useState(() => {
        const savedConfig = localStorage.getItem('sapi_ai_config');
        if (savedConfig) {
            return JSON.parse(savedConfig);
        }
        // Default configuration
        return {
            systemInstruction: `Eres SapiBot, un asistente experto en ventas y gestión de inventario para ${sessionUser}.
Responde siempre de forma profesional, concisa y usa formato Markdown para resaltar precios, códigos y totales (ej: **S/ 100.00**).
Si te preguntan por stock, consulta los datos proporcionados.`,
            enableAudio: false,
            enableImages: true,
            temperature: 0.7
        };
    });

    // --- ESTADO FUENTE DE DATOS (PERSISTENTE) ---
    const [model, setModel] = useState(() => localStorage.getItem('sapi_ai_model') || 'gemini-2.5-flash');
    const [useInventory, setUseInventory] = useState(() => localStorage.getItem('sapi_ai_use_inventory') === 'true');
    
    const [uploadedFile, setUploadedFile] = useState<{name: string, content: string} | null>(null);

    // --- ESTADO CHAT ---
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `👋 Hola **${sessionUser}**. Sistema SapiBot listo.\n\nModelo activo: **${model}**\nInventario: **${useInventory ? 'Conectado' : 'Desconectado'}**`, timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0); 
    const [attachedImage, setAttachedImage] = useState<{file: File, preview: string} | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contextFileRef = useRef<HTMLInputElement>(null);

    // --- ESTADO CONSUMO ---
    const [stats, setStats] = useState<TokenStats>({ prompt: 0, response: 0, total: 0, cost: 0 });

    // --- EFECTOS DE PERSISTENCIA ---
    useEffect(() => {
        if (activeTab === 'CHAT') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activeTab]);

    // Save model to LS whenever it changes (and on mount if default)
    useEffect(() => {
        localStorage.setItem('sapi_ai_model', model);
    }, [model]);

    // Save config to LS whenever it changes (and on mount if default)
    useEffect(() => {
        localStorage.setItem('sapi_ai_config', JSON.stringify(config));
    }, [config]);

    // Save inventory setting
    useEffect(() => {
        localStorage.setItem('sapi_ai_use_inventory', String(useInventory));
    }, [useInventory]);

    // --- HELPERS ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleClearChat = () => {
        setMessages([{ 
            id: Date.now().toString(), 
            role: 'model', 
            text: '♻️ **Memoria Reiniciada**\n\nEl historial ha sido borrado. Estoy listo para una nueva consulta.', 
            timestamp: new Date() 
        }]);
    };

    const handleSaveKeys = () => {
        if (googleKey) localStorage.setItem('sapi_ai_google_key', googleKey);
        else localStorage.removeItem('sapi_ai_google_key');

        if (openaiKey) localStorage.setItem('sapi_ai_openai_key', openaiKey);
        else localStorage.removeItem('sapi_ai_openai_key');
        
        // Limpieza de legacy key
        localStorage.removeItem('sapi_ai_apikey');
        
        setIsCustomKey(!!googleKey || !!openaiKey);

        // Efecto visual de guardado
        setKeysSaved(true);
        setTimeout(() => setKeysSaved(false), 2000);
    };

    const handleSaveConfig = () => {
        localStorage.setItem('sapi_ai_config', JSON.stringify(config));
        
        // Efecto visual de guardado
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setAttachedImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleContextFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const text = await file.text();
            setUploadedFile({ name: file.name, content: text.substring(0, 5000) });
        }
    };

    // Función de espera para backoff
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleSendMessage = async () => {
        if ((!input.trim() && !attachedImage) || isLoading) return;
        
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            image: attachedImage?.preview,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachedImage(null);
        setIsLoading(true);
        setRetryCount(0);

        try {
            // Lógica de Selección de Llave según el modelo
            const isOpenAI = model.startsWith('gpt');
            let activeKey = '';

            if (isOpenAI) {
                activeKey = openaiKey;
                if (!activeKey || !activeKey.startsWith('sk-')) {
                    throw new Error("Para usar OpenAI, necesitas una llave válida (sk-...) en la pestaña 'Llave'.");
                }
            } else {
                // Gemini: Usar llave custom o la del sistema (.env)
                activeKey = googleKey || process.env.API_KEY || '';
            }

            // Construir Prompt con Datos
            let systemPrompt = config.systemInstruction;
            if (useInventory) {
                // LIMITAMOS EL INVENTARIO A 50 ITEMS PARA NO SATURAR EL CONTEXTO
                const inventorySummary = products.slice(0, 50).map(p => `- ${p.name} (${p.code}): Stock ${p.stock}, Precio S/ ${p.price}`).join('\n');
                systemPrompt += `\n\n[DATOS DEL INVENTARIO ACTUAL - Muestra de 50 items]:\n${inventorySummary}`;
            }
            if (uploadedFile) {
                systemPrompt += `\n\n[CONTEXTO ADICIONAL - ${uploadedFile.name}]:\n${uploadedFile.content}`;
            }

            let generatedText = "";
            let usageMetadata = null;

            // FIX: LIMIT HISTORY TO LAST 10 MESSAGES TO PREVENT CONTEXT OVERFLOW
            const historyLimit = 10;
            const recentMessages = messages.slice(-historyLimit);

            if (isOpenAI) {
                // --- LÓGICA OPENAI ---
                const openAIMessages = [
                    { role: "system", content: systemPrompt },
                    ...recentMessages.map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.text // Simplificado: Solo texto para historial por ahora
                    }))
                ];
                
                // Agregar mensaje actual
                if (userMsg.image && attachedImage) {
                    const base64Data = await fileToBase64(attachedImage.file); 
                    const fullDataUrl = `data:${attachedImage.file.type};base64,${base64Data}`;
                    
                    openAIMessages.push({
                        role: "user",
                        content: [
                            { type: "text", text: userMsg.text || "Analiza esta imagen." },
                            { type: "image_url", image_url: { url: fullDataUrl } }
                        ] as any
                    });
                } else {
                    openAIMessages.push({ role: "user", content: userMsg.text });
                }

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${activeKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: openAIMessages,
                        temperature: config.temperature,
                        max_tokens: 1000
                    })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                
                generatedText = data.choices[0].message.content;
                
                // Mapear métricas de OpenAI a estructura interna
                if (data.usage) {
                    usageMetadata = {
                        promptTokenCount: data.usage.prompt_tokens,
                        candidatesTokenCount: data.usage.completion_tokens,
                        totalTokenCount: data.usage.total_tokens
                    };
                }

            } else {
                // --- LÓGICA GOOGLE GEMINI ---
                const ai = new GoogleGenAI({ apiKey: activeKey });
                const requestConfig: any = {
                    temperature: config.temperature,
                    systemInstruction: systemPrompt,
                };

                const executeCall = async (retryAttempt = 0): Promise<any> => {
                    try {
                        if (retryAttempt > 0) {
                            setRetryCount(retryAttempt);
                            await wait(1000 * retryAttempt); 
                        }

                        if (userMsg.image && attachedImage) {
                            const base64Data = await fileToBase64(attachedImage.file);
                            return await ai.models.generateContent({
                                model: model,
                                config: requestConfig,
                                contents: {
                                    role: 'user',
                                    parts: [
                                        { inlineData: { mimeType: attachedImage.file.type, data: base64Data } },
                                        { text: userMsg.text || "Analiza esta imagen." }
                                    ]
                                }
                            });
                        } else {
                            const chat = ai.chats.create({
                                model: model,
                                config: requestConfig,
                                history: recentMessages.map(m => ({
                                    role: m.role === 'model' ? 'model' : 'user',
                                    parts: [{ text: m.text }]
                                }))
                            });
                            return await chat.sendMessage({ message: userMsg.text });
                        }
                    } catch (err: any) {
                        if ((err.message?.includes('503') || err.status === 503 || err.message?.includes('429')) && retryAttempt < 3) {
                            console.warn(`Intento ${retryAttempt + 1} fallido (sobrecarga). Reintentando...`);
                            return executeCall(retryAttempt + 1);
                        }
                        throw err;
                    }
                };

                const result = await executeCall();
                generatedText = result.text || "";
                usageMetadata = result.usageMetadata;
            }

            const modelMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: generatedText,
                timestamp: new Date(),
                usage: usageMetadata ? { 
                    promptTokens: usageMetadata.promptTokenCount, 
                    responseTokens: usageMetadata.candidatesTokenCount 
                } : undefined
            };

            setMessages(prev => [...prev, modelMsg]);

            if (usageMetadata) {
                // Costo aproximado (mezcla de precios, simplificado)
                let costPerToken = 0.00000015; // Base Gemini Flash
                
                if (model === 'gpt-4o') costPerToken = 0.000005; // $5.00 / 1M input avg
                else if (model === 'gpt-4-turbo') costPerToken = 0.00001; // $10.00 / 1M input
                else if (model === 'gpt-4o-mini') costPerToken = 0.0000004; // $0.15 / 1M input (Muy barato)
                else if (model === 'gpt-3.5-turbo') costPerToken = 0.000001; // $0.50 / 1M input
                else if (model.includes('pro')) costPerToken = 0.000005; // Gemini Pro

                setStats(prev => ({
                    prompt: prev.prompt + usageMetadata.promptTokenCount,
                    response: prev.response + usageMetadata.candidatesTokenCount,
                    total: prev.total + usageMetadata.totalTokenCount,
                    cost: prev.cost + (usageMetadata.totalTokenCount * costPerToken) 
                }));
            }

        } catch (error: any) {
            console.error(error);
            let errorText = `❌ **Error de conexión**\n\n${error.message}`;
            
            if (error.message.includes('503') || error.message.includes('overloaded')) {
                errorText = `⚠️ **Servidores Saturados**\n\nEl modelo está recibiendo demasiadas peticiones. Intenta de nuevo en unos segundos.`;
            }
            if (error.message.includes('quota') || error.message.includes('429')) {
                errorText = `⚠️ **Créditos Agotados (OpenAI)**\n\nTu llave API ha excedido su límite de uso gratuito o de pago.\n\n👉 **Solución:** Cambia al modelo **GPT-4o Mini** (es mucho más barato) o recarga créditos en platform.openai.com.`;
            }
            if (error.message.includes('context length') || error.message.includes('tokens')) {
                errorText = `⚠️ **Memoria Llena**\n\nLa conversación es demasiado larga para el modelo. Se ha intentado recortar automáticamente. Si el error persiste, usa el botón "Limpiar Chat".`;
            }

            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                text: errorText, 
                timestamp: new Date() 
            }]);
        } finally {
            setIsLoading(false);
            setRetryCount(0);
        }
    };

    // --- RENDERIZADO DE PESTAÑAS ---
    // ... (rest of render functions remain identical)
    
    // 1. PESTAÑA CHAT
    const renderChat = () => (
        <div className="flex flex-col h-full relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                    onClick={handleClearChat} 
                    className="p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors shadow-sm"
                    title="Limpiar Chat (Borrador)"
                >
                    <Trash2 size={18}/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                        }`}>
                            {msg.image && (
                                <img src={msg.image} className="w-full h-auto rounded-lg mb-2 border border-white/20" alt="User upload" />
                            )}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                        strong: ({node, ...props}) => <span className="font-black" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                        li: ({node, ...props}) => <li className="mb-0.5" {...props} />
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                            {msg.usage && (
                                <div className="mt-2 text-[9px] opacity-60 flex justify-between gap-4 font-mono border-t border-white/10 pt-1">
                                    <span>In: {msg.usage.promptTokens}</span>
                                    <span>Out: {msg.usage.responseTokens}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-indigo-500"/>
                            <span className="text-xs text-slate-500">
                                {retryCount > 0 ? `Reintentando conexión (${retryCount}/3)...` : 'Pensando...'}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                {attachedImage && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
                        <img src={attachedImage.preview} className="w-8 h-8 rounded object-cover"/>
                        <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[150px] truncate">{attachedImage.file.name}</span>
                        <button onClick={() => setAttachedImage(null)}><X size={14}/></button>
                    </div>
                )}
                <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-950 p-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors ${!config.enableImages ? 'opacity-50 cursor-not-allowed' : 'text-slate-500'}`}
                        disabled={!config.enableImages}
                        title="Subir Imagen"
                    >
                        <ImageIcon size={20}/>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
                    
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="Escribe tu consulta..."
                        className="flex-1 bg-transparent border-none outline-none text-sm py-3 min-h-[44px] max-h-32 resize-none text-slate-800 dark:text-white placeholder:text-slate-400"
                        rows={1}
                    />
                    
                    <button 
                        onClick={handleSendMessage}
                        disabled={isLoading || (!input.trim() && !attachedImage)}
                        className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
                    >
                        <Send size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );

    // 2. PESTAÑA FUENTE DE DATOS
    const renderDataSource = () => (
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={16}/> Modelo de Inteligencia
                </h3>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Seleccionar Motor</label>
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                        <optgroup label="Google Gemini (Requiere llave AIza...)">
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (RECOMENDADO)</option>
                            <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                            <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
                        </optgroup>
                        <optgroup label="OpenAI GPT (Requiere llave sk-...)">
                            <option value="gpt-4o-mini">GPT-4o Mini (RECOMENDADO - Muy Económico)</option>
                            <option value="gpt-4o">GPT-4o (Omni)</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
                        </optgroup>
                    </select>
                    
                    {model.startsWith('gpt') && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex gap-2 items-start">
                            <Globe size={16} className="text-blue-500 shrink-0 mt-0.5"/>
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                                <strong>Modo OpenAI Activo:</strong> Asegúrate de haber ingresado una API Key que comience con <code>sk-...</code> en la pestaña "Llave".
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Database size={16}/> Contexto de Datos
                </h3>
                
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm">Inventario ERP en Tiempo Real</div>
                        <div className="text-xs text-slate-500 mt-1">Permitir a la IA leer productos, stock y precios.</div>
                    </div>
                    <button 
                        onClick={() => setUseInventory(!useInventory)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${useInventory ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${useInventory ? 'translate-x-6' : ''}`}></div>
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed text-center">
                    {uploadedFile ? (
                        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-3">
                                <FileText size={20} className="text-indigo-600"/>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">{uploadedFile.name}</div>
                                    <div className="text-[10px] text-indigo-500">Cargado en memoria</div>
                                </div>
                            </div>
                            <button onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                        </div>
                    ) : (
                        <div onClick={() => contextFileRef.current?.click()} className="cursor-pointer group">
                            <UploadCloud size={40} className="mx-auto text-slate-300 group-hover:text-indigo-500 transition-colors mb-2"/>
                            <p className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Cargar Archivo de Contexto</p>
                            <p className="text-[10px] text-slate-400 mt-1">.TXT, .CSV, .MD (Máx 5MB)</p>
                        </div>
                    )}
                    <input type="file" ref={contextFileRef} className="hidden" accept=".txt,.csv,.md" onChange={handleContextFileSelect}/>
                </div>
            </div>
        </div>
    );

    // 3. PESTAÑA CONFIGURACIÓN (Prompt)
    const renderConfig = () => (
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in h-full flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={16}/> Prompt del Sistema (Cerebro)
                </h3>
                <textarea 
                    className="flex-1 w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 resize-none shadow-inner leading-relaxed"
                    value={config.systemInstruction}
                    onChange={e => setConfig({...config, systemInstruction: e.target.value})}
                    placeholder="Define la personalidad y reglas de la IA..."
                    rows={10}
                />
                <div className="flex justify-between items-center mt-3">
                    <p className="text-[10px] text-slate-400">Este texto define cómo se comportará la IA en cada respuesta.</p>
                    <button 
                        onClick={handleSaveConfig}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 ${configSaved ? 'bg-emerald-600 text-white' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white'}`}
                    >
                        {configSaved ? <CheckCircle2 size={16}/> : <Save size={16}/>}
                        {configSaved ? 'Guardado' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );

    // 4. PESTAÑA CONEXIÓN (LLAVES - SEPARADO)
    const renderConnection = () => (
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in h-full overflow-y-auto custom-scrollbar pb-32">
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Key size={100}/></div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">Estado de Llaves</h3>
                <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${googleKey ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-slate-300'}`}></div>
                        <span className="text-[10px] font-bold tracking-widest uppercase">GOOGLE {googleKey ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${openaiKey ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-slate-300'}`}></div>
                        <span className="text-[10px] font-bold tracking-widest uppercase">OPENAI {openaiKey ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
                    Gestiona tus proveedores de IA de forma independiente.
                </p>
            </div>

            <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16}/> Gestión de Credenciales
                </h3>
                
                <div className="space-y-4">
                    
                    {/* INPUT GOOGLE */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 relative group">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                            <Sparkles size={12}/> Google Gemini (AI Studio)
                        </label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="password" 
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                placeholder="AIzaSy..."
                                value={googleKey}
                                onChange={(e) => setGoogleKey(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* INPUT OPENAI */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 relative group">
                        <label className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                            <Globe size={12}/> OpenAI (GPT-4 / GPT-3.5)
                        </label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="password" 
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-teal-500 transition-colors"
                                placeholder="sk-proj-..."
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* BOTÓN GUARDAR */}
                    <button 
                        onClick={handleSaveKeys}
                        className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 ${keysSaved ? 'bg-emerald-600 text-white' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white'}`}
                    >
                        {keysSaved ? <Check size={16}/> : <Save size={16}/>} 
                        {keysSaved ? 'Credenciales Guardadas' : 'Guardar Todas las Llaves'}
                    </button>

                </div>
            </div>
        </div>
    );

    // 5. PESTAÑA CONSUMO
    const renderUsage = () => (
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in h-full overflow-y-auto custom-scrollbar pb-32">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={16}/> Monitoreo de Uso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Tokens de Entrada</p>
                    <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{stats.prompt}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Tokens de Salida</p>
                    <div className="text-3xl font-black text-purple-700 dark:text-purple-300">{stats.response}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-6 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Estimado Sesión</p>
                    <div className="text-4xl font-black flex items-center gap-1">
                        <span className="text-emerald-400 text-xl">$</span> {stats.cost.toFixed(6)}
                    </div>
                </div>
                <div className="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <DollarSign size={24} className="text-emerald-500"/>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col-reverse md:flex-row bg-slate-50 dark:bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* SIDEBAR DE NAVEGACIÓN (BOTTOM BAR ON MOBILE) */}
            <div className="w-full md:w-20 bg-white dark:bg-slate-900 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-8 border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 gap-1 md:gap-6 shrink-0 h-16 md:h-full z-10">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white shadow-lg mb-4">
                    <Cpu size={20}/>
                </div>
                
                <nav className="flex flex-row md:flex-col gap-1 md:gap-4 w-full px-2 justify-around md:justify-center">
                    {[
                        { id: 'CHAT', icon: MessageSquare, label: 'Chat' },
                        { id: 'DATA', icon: Database, label: 'Datos' },
                        { id: 'CONFIG', icon: Settings, label: 'Config' },
                        { id: 'CONNECTION', icon: Key, label: 'Llave' },
                        { id: 'USAGE', icon: BarChart3, label: 'Uso' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabView)}
                            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all group relative ${
                                activeTab === tab.id 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            title={tab.label}
                        >
                            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            {/* Indicator for Desktop */}
                            {activeTab === tab.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full hidden md:block"></div>
                            )}
                            {/* Indicator for Mobile */}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-t-full md:hidden"></div>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ÁREA DE CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative h-full">
                {/* Título de Sección */}
                <div className="h-14 md:h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-950 shrink-0">
                    <h2 className="text-xs md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        {activeTab === 'CHAT' && <><MessageSquare size={18} className="text-indigo-500"/> Centro de Comando AI</>}
                        {activeTab === 'DATA' && <><Database size={18} className="text-indigo-500"/> Fuentes de Conocimiento</>}
                        {activeTab === 'CONFIG' && <><Settings size={18} className="text-indigo-500"/> Configuración del Sistema</>}
                        {activeTab === 'CONNECTION' && <><Key size={18} className="text-indigo-500"/> Credenciales y API</>}
                        {activeTab === 'USAGE' && <><Activity size={18} className="text-indigo-500"/> Métricas de Consumo</>}
                    </h2>
                </div>

                {/* Contenido Dinámico */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'CHAT' && renderChat()}
                    {activeTab === 'DATA' && renderDataSource()}
                    {activeTab === 'CONFIG' && renderConfig()}
                    {activeTab === 'CONNECTION' && renderConnection()}
                    {activeTab === 'USAGE' && renderUsage()}
                </div>
            </div>
        </div>
    );
};
