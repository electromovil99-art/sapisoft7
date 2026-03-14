
import React, { useState, useEffect } from 'react';
import { 
  ViewState, Product, Client, Supplier, Category, Brand, SaleRecord, 
  PurchaseRecord, StockMovement, CashMovement, ServiceOrder, 
  SystemUser, AuthSession, Tenant, BankAccount, GeoLocation, 
  Quotation, Presale, Branch, WarehouseTransfer, CashTransferRequest, 
  CashBoxSession, CartItem, PaymentBreakdown, InventoryHistorySession,
  CrmContact, PaymentMethodType, Task
} from './types';
import { AgendaModule } from './components/AgendaModule';
import { 
  TECH_PRODUCTS, PHARMA_PRODUCTS, MOCK_CLIENTS, MOCK_SERVICES, 
  MOCK_CASH_MOVEMENTS, MOCK_LOCATIONS, TECH_CATEGORIES 
} from './constants';
import { INITIAL_NAV_STRUCTURE } from './navigation';
import { socket } from './socketService';

// Components
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SalesModule from './components/SalesModule';
import InventoryModule from './components/InventoryModule';
import PurchaseModule from './components/PurchaseModule';
import ServicesModule from './components/ServicesModule';
import CashModule from './components/CashModule';
import ClientsModule from './components/ClientsModule';
import SuppliersModule from './components/SuppliersModule';
import ResourceManagement from './components/ResourceManagement';
import SalesReportModule from './components/SalesReportModule';
import ProfitReportModule from './components/ProfitReportModule';
import InventoryAuditModule from './components/InventoryAuditModule';
import BusinessEvolutionModule from './components/BusinessEvolutionModule';
import FinancialStrategyModule from './components/FinancialStrategyModule';
import HistoryQueries from './components/HistoryQueries';
import LocationsModule from './components/LocationsModule';
import UserPrivilegesModule from './components/UserPrivilegesModule';
import CreditNoteModule from './components/CreditNoteModule';
import ClientWalletModule from './components/ClientWalletModule';
import WhatsAppModule from './components/WhatsAppModule';
import BroadcastModule from './components/BroadcastModule';
import QuotationModule from './components/QuotationModule';
import PresaleModule from './components/PresaleModule';
import DatabaseModule from './components/DatabaseModule';
import { SunatModule } from './components/SunatModule';
import PrintConfigModule from './components/PrintConfigModule';
import MediaEditorModule from './components/MediaEditorModule';
import SuperAdminModule from './components/SuperAdminModule';
import CashBoxHistoryModule from './components/CashBoxHistoryModule';
import BankAccountsModule from './components/BankAccountsModule';
import BankHistoryModule from './components/BankHistoryModule';
import CompanyProfileModule from './components/CompanyProfileModule';
import SystemDiagnosticsModule from './components/SystemDiagnosticsModule';
import GatewayConfigModule from './components/GatewayConfigModule';
import BranchManagementModule from './components/BranchManagementModule';
import WarehouseTransferModule from './components/WarehouseTransferModule';
import CashTransferModule from './components/CashTransferModule';
import InventoryAdjustmentModule from './components/InventoryAdjustmentModule';
import CrmModule from './components/CrmModule'; 
import AccountsReceivableModule from './components/AccountsReceivableModule'; 
import AccountsPayableModule from './components/AccountsPayableModule'; 
import { AiAssistantModule } from './components/AiAssistantModule';

import { 
  generateUUID, 
  generateTransactionId, 
  formatDocumentId, 
  getNextSequence 
} from './utils/traceability';

import { getNextModuleId, getNextGlobalSupportId, getNextGlobalTransactionId } from './services/counterService';
import { recorrelateHistory } from './services/historyService';

import { syncDataToSupabase, deleteDataFromSupabase, fetchDataFromSupabase, subscribeToSupabaseChanges } from './services/supabaseService';

const App = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // --- SUPABASE REALTIME SYNC ---
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchDataFromSupabase('system_users');
        if (data && data.length > 0) {
          const hasAdmin = data.some((u: any) => u.username?.toUpperCase() === 'ADMIN');
          const hasSuper = data.some((u: any) => u.username?.toUpperCase() === 'SUPER');
          
          let finalUsers = [...data];
          if (!hasAdmin) {
            finalUsers.push({ id: '1', username: 'ADMIN', password: '123', fullName: 'Administrador Principal', role: 'ADMIN', active: true, permissions: ['ALL'], companyName: 'SapiSoft Demo', industry: 'TECH' });
          }
          if (!hasSuper) {
            finalUsers.push({ id: '2', username: 'SUPER', password: '123', fullName: 'Super Admin', role: 'SUPER_ADMIN', active: true, permissions: ['ALL'], companyName: 'SapiSoft Corp', industry: 'TECH' });
          }
          setUsers(finalUsers);
        }
      } catch (e) {
        console.error("Error fetching users:", e);
      }
    };
    loadUsers();

    const loadSales = async () => {
      try {
        const data = await fetchDataFromSupabase('sales');
        setSales(data || []);
      } catch (e) {
        console.error("Error fetching sales:", e);
      }
    };
    loadSales();

    const loadCashBoxSessions = async () => {
      try {
        const data = await fetchDataFromSupabase('cash_box_sessions');
        setCashBoxSessions(data || []);
      } catch (e) {
        console.error("Error fetching cash box sessions:", e);
      }
    };
    loadCashBoxSessions();

    const loadCashMovements = async () => {
      try {
        const data = await fetchDataFromSupabase('cash_movements');
        setCashMovements(data || []);
      } catch (e) {
        console.error("Error fetching cash movements:", e);
      }
    };
    loadCashMovements();

    const subscriptionUsers = subscribeToSupabaseChanges('system_users', (payload) => {
      if (payload.eventType === 'INSERT') {
        setUsers(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new : u));
      } else if (payload.eventType === 'DELETE') {
        setUsers(prev => prev.filter(u => u.id !== payload.old.id));
      }
    });

    const subscription = subscribeToSupabaseChanges('sales', (payload) => {
      if (payload.eventType === 'INSERT') {
        setSales(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setSales(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      } else if (payload.eventType === 'DELETE') {
        setSales(prev => prev.filter(s => s.id !== payload.old.id));
      }
    });

    const subscriptionSessions = subscribeToSupabaseChanges('cash_box_sessions', (payload) => {
      if (payload.eventType === 'INSERT') {
        setCashBoxSessions(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setCashBoxSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      } else if (payload.eventType === 'DELETE') {
        setCashBoxSessions(prev => prev.filter(s => s.id !== payload.old.id));
      }
    });

    const subscriptionMovements = subscribeToSupabaseChanges('cash_movements', (payload) => {
      if (payload.eventType === 'INSERT') {
        setCashMovements(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setCashMovements(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      } else if (payload.eventType === 'DELETE') {
        setCashMovements(prev => prev.filter(s => s.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
      subscriptionSessions.unsubscribe();
      subscriptionMovements.unsubscribe();
      subscriptionUsers.unsubscribe();
    };
  }, []);

  const addToOfflineQueue = (tableName: string, data: any, isDelete: boolean) => {
      const queue = JSON.parse(localStorage.getItem('supabase_sync_queue') || '[]');
      queue.push({
          id: Date.now().toString() + Math.random().toString(),
          tableName,
          data,
          isDelete,
          timestamp: Date.now()
      });
      localStorage.setItem('supabase_sync_queue', JSON.stringify(queue));
      setPendingSyncCount(queue.length);
  };

  const processOfflineQueue = async () => {
      if (!navigator.onLine) return;
      const queue = JSON.parse(localStorage.getItem('supabase_sync_queue') || '[]');
      if (queue.length === 0) return;

      const remainingQueue = [...queue];
      for (const action of queue) {
          try {
              if (action.isDelete) {
                  await deleteDataFromSupabase(action.tableName, action.data);
              } else {
                  await syncDataToSupabase(action.tableName, Array.isArray(action.data) ? action.data : [action.data]);
              }
              remainingQueue.shift();
              localStorage.setItem('supabase_sync_queue', JSON.stringify(remainingQueue));
              setPendingSyncCount(remainingQueue.length);
          } catch (e) {
              console.error("Failed to process queued action", action, e);
              break;
          }
      }
  };

  const [syncError, setSyncError] = useState<string | null>(null);

  const syncToSupabase = async (tableName: string, data: any, isDelete: boolean = false) => {
      // SIEMPRE añadir a la cola si no está online o si la sincronización está desactivada
      // Esto asegura que los datos no se pierdan.
      if (localStorage.getItem('isSupabaseActive') !== 'true' || !navigator.onLine) {
          addToOfflineQueue(tableName, data, isDelete);
          if (localStorage.getItem('isSupabaseActive') !== 'true') {
              console.warn(`Sincronización desactivada para ${tableName}, datos en cola.`);
          }
          return;
      }

      try {
          if (isDelete) {
              await deleteDataFromSupabase(tableName, data);
          } else {
              await syncDataToSupabase(tableName, Array.isArray(data) ? data : [data]);
          }
      } catch (e: any) {
          console.error(`Error syncing ${tableName} to Supabase:`, e);
          setSyncError(`Error sincronizando ${tableName}: ${e.message}`);
          setTimeout(() => setSyncError(null), 5000);
          addToOfflineQueue(tableName, data, isDelete);
      }
  };

  const [session, setSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('app_session');
    const lastActivity = localStorage.getItem('last_activity');
    
    if (saved && lastActivity) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (now - parseInt(lastActivity, 10) < oneHour) {
        return JSON.parse(saved);
      } else {
        localStorage.removeItem('app_session');
        localStorage.removeItem('last_activity');
      }
    }
    return null;
  });
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('isSyncEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSyncMode = () => {
    setIsSyncEnabled((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('isSyncEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

  // --- DATA STATE ---
  const [products, setProducts] = useState<Product[]>([...TECH_PRODUCTS, ...PHARMA_PRODUCTS]);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: '1', name: 'TECNOLOGIA GLOBAL SAC', ruc: '20100000001', phone: '999888777', digitalBalance: 0 }
  ]);
  const [categories, setCategories] = useState<Category[]>(TECH_CATEGORIES);
  const [brands, setBrands] = useState<Brand[]>([{ id: '1', name: 'SAMSUNG' }, { id: '2', name: 'APPLE' }]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(MOCK_CASH_MOVEMENTS);
  const [services, setServices] = useState<ServiceOrder[]>(MOCK_SERVICES);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [presales, setPresales] = useState<Presale[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: '1', bankName: 'BCP', accountNumber: '193-0000000-0-01', currency: 'PEN', alias: 'Cuenta Principal', useInSales: true, useInPurchases: true }
  ]);
  const [locations, setLocations] = useState<GeoLocation[]>(MOCK_LOCATIONS);
  
  const [users, setUsers] = useState<SystemUser[]>([
    { id: '1', username: 'ADMIN', password: '123', fullName: 'Administrador Principal', role: 'ADMIN', active: true, permissions: ['ALL'], companyName: 'SapiSoft Demo', industry: 'TECH' },
    { id: '2', username: 'SUPER', password: '123', fullName: 'Super Admin', role: 'SUPER_ADMIN', active: true, permissions: ['ALL'], companyName: 'SapiSoft Corp', industry: 'TECH' }
  ]);
  
  const [tenants, setTenants] = useState<Tenant[]>([
    { id: '1', companyName: 'SapiSoft Demo', industry: 'TECH', status: 'ACTIVE', subscriptionEnd: '31/12/2030', ownerName: 'Admin Demo', phone: '900000000', planType: 'FULL', baseCurrency: 'PEN' }
  ]);
  const [branches, setBranches] = useState<Branch[]>([
    { id: 'BR-001', name: 'SEDE PRINCIPAL', address: 'AV. CENTRAL 123', isMain: true }
  ]);
  const [currentBranchId, setCurrentBranchId] = useState<string>('BR-001');
  const [warehouseTransfers, setWarehouseTransfers] = useState<WarehouseTransfer[]>([]);
  const [cashTransferRequests, setCashTransferRequests] = useState<CashTransferRequest[]>([]);
  const [cashBoxSessions, setCashBoxSessions] = useState<CashBoxSession[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistorySession[]>([]);

  useEffect(() => {
    if (cashBoxSessions.length > 0) {
      const activeSession = cashBoxSessions.find(s => s.status === 'OPEN' && s.branchId === currentBranchId);
      if (activeSession) {
        setCurrentCashSession(activeSession);
      } else {
        setCurrentCashSession(undefined);
      }
    }
  }, [cashBoxSessions]);

  // --- HISTORY HANDLING ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        if (event.state.view) setCurrentView(event.state.view);
        if (event.state.hasOwnProperty('folder')) setActiveMobileCategory(event.state.folder);
      } else {
        setCurrentView(ViewState.DASHBOARD);
        setActiveMobileCategory(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state
    window.history.replaceState({ view: currentView, folder: activeMobileCategory }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- OFFLINE SYNC HANDLING ---
  useEffect(() => {
      const handleOnline = () => {
          setIsOffline(false);
          processOfflineQueue();
      };
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial check
      const queue = JSON.parse(localStorage.getItem('supabase_sync_queue') || '[]');
      setPendingSyncCount(queue.length);
      if (navigator.onLine && queue.length > 0) {
          processOfflineQueue();
      }

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const handleNavigate = (view: ViewState) => {
    if (view !== currentView) {
      // Si navegamos a una vista que no es Dashboard, mantenemos la carpeta actual en el estado de historia
      window.history.pushState({ view, folder: activeMobileCategory }, '', `#${view.toLowerCase()}`);
      setCurrentView(view);
    }
  };

  const handleOpenFolder = (catId: string) => {
    window.history.pushState({ view: ViewState.DASHBOARD, folder: catId }, '', `#folder-${catId}`);
    setActiveMobileCategory(catId);
  };

  const handleCloseFolder = () => {
    if (activeMobileCategory) {
      window.history.back();
    }
  };

  const handleBack = () => {
    const isSuperAdmin = session?.user.role === 'SUPER_ADMIN';
    if (activeMobileCategory && currentView === ViewState.DASHBOARD) {
      // If in folder on mobile, close it
      setActiveMobileCategory(null);
      window.history.pushState({ view: ViewState.DASHBOARD, folder: null }, '', '#');
    } else if (currentView !== ViewState.DASHBOARD && currentView !== ViewState.SUPER_ADMIN_DASHBOARD) {
      // If in submodule, go back to dashboard/folder
      setCurrentView(isSuperAdmin ? ViewState.SUPER_ADMIN_DASHBOARD : ViewState.DASHBOARD);
      window.history.pushState({ view: isSuperAdmin ? ViewState.SUPER_ADMIN_DASHBOARD : ViewState.DASHBOARD, folder: activeMobileCategory }, '', activeMobileCategory ? `#folder-${activeMobileCategory}` : '#');
    } else {
      // Already at top level
      setCurrentView(isSuperAdmin ? ViewState.SUPER_ADMIN_DASHBOARD : ViewState.DASHBOARD);
    }
  };
  
  // --- CRM STATE ---
  const [crmDb, setCrmDb] = useState<Record<string, CrmContact>>(() => {
      const db: Record<string, CrmContact> = {};
      try {
        MOCK_CLIENTS.forEach(c => {
            if (c.phone) {
                const phone = c.phone.replace(/\D/g, '');
                if(phone) {
                    db[phone] = {
                        phone: phone,
                        name: c.name,
                        stage: 'Nuevo',
                        labels: c.tags || [],
                        notes: [],
                        lastInteraction: c.lastPurchaseDate,
                        email: c.email,
                        address: c.address
                    };
                }
            }
        });
      } catch (e) { console.error("Error init CRM DB", e); }
      return db;
  });
  
  const [crmStages, setCrmStages] = useState<any[]>([
      { id: 'Nuevo', name: 'Nuevo', color: 'border-slate-400' },
      { id: 'Interesado', name: 'Interesado', color: 'border-blue-500' },
      { id: 'Seguimiento', name: 'Seguimiento', color: 'border-amber-500' },
      { id: 'Venta', name: 'Venta', color: 'border-emerald-500' },
      { id: 'Perdido', name: 'Perdido', color: 'border-red-500' }
  ]);
  
  // --- UI STATE FOR MODULES ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posClient, setPosClient] = useState<Client | null>(null);
  
  const [chats, setChats] = useState<any[]>([]);

  const [currentCashSession, setCurrentCashSession] = useState<CashBoxSession | undefined>(undefined);
  const [companyName, setCompanyName] = useState(() => {
    const saved = localStorage.getItem('app_session');
    if (saved) {
      const session = JSON.parse(saved);
      return session.businessName || 'Mi Empresa S.A.C.';
    }
    return 'Mi Empresa S.A.C.';
  });
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState(() => {
    const saved = localStorage.getItem('app_session');
    if (saved) {
      const session = JSON.parse(saved);
      return session.baseCurrency || 'PEN';
    }
    return 'PEN';
  });
  const [navStructure, setNavStructure] = useState(INITIAL_NAV_STRUCTURE);
  
  const [pendingClientData, setPendingClientData] = useState<{name: string, phone: string} | null>(null);
  const [targetChatPhone, setTargetChatPhone] = useState<string | null>(null);

  const [fixedExpenses, setFixedExpenses] = useState<string[]>(['Alquiler', 'Luz', 'Agua', 'Internet', 'Planilla']);
  const [fixedIncomes, setFixedIncomes] = useState<string[]>(['Alquiler Subarriendo', 'Regalias']);

  useEffect(() => {
    // Safely connect socket on mount
    if (socket && !socket.connected) {
      try {
        socket.connect();
      } catch (e) {
        console.warn("Socket auto-connect failed:", e);
      }
    }
  }, []);

  // --- ACTIONS ---
  const handleLogin = (user: SystemUser) => {
    const tenant = tenants.find(t => t.companyName === user.companyName);
    const newSession = {
      user,
      businessName: user.companyName,
      token: 'mock-token',
      baseCurrency: tenant?.baseCurrency || 'PEN'
    };
    setSession(newSession);
    localStorage.setItem('app_session', JSON.stringify(newSession));
    localStorage.setItem('last_activity', Date.now().toString());
    setCompanyName(user.companyName);
    setBaseCurrency(tenant?.baseCurrency || 'PEN');
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('app_session');
    localStorage.removeItem('last_activity');
    handleNavigate(ViewState.DASHBOARD);
  };

  // --- INACTIVITY TIMEOUT ---
  useEffect(() => {
    if (!session) return;

    const updateActivity = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity) {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (now - parseInt(lastActivity, 10) >= oneHour) {
          handleLogout();
        }
      }
    };

    // Update activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    // Check inactivity every minute
    const interval = setInterval(checkInactivity, 60000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [session]);

  const handleRegisterFromCRM = (name: string, phone: string) => {
      setPendingClientData({ name, phone });
      handleNavigate(ViewState.CLIENTS);
  };

  const handleAddClient = (c: Client) => {
      setClients(prev => [...prev, c]);
      syncToSupabase('clients', c);
      if (c.phone) {
          const cleanPhone = c.phone.replace(/\D/g, '');
          setCrmDb(prev => ({
              ...prev,
              [cleanPhone]: {
                  ...(prev[cleanPhone] || {}),
                  name: c.name,
                  phone: cleanPhone,
                  stage: prev[cleanPhone]?.stage || 'Nuevo',
                  labels: [...(prev[cleanPhone]?.labels || []), 'Cliente'],
                  notes: prev[cleanPhone]?.notes || []
              }
          }));
      }
  };

  const handleAddProduct = (p: Product) => {
      setProducts(prev => [...prev, p]);
      syncToSupabase('products', p);
  };
  const handleUpdateProduct = (p: Product) => {
      setProducts(prev => prev.map(pr => pr.id === p.id ? p : pr));
      syncToSupabase('products', p);
  };
  const handleDeleteProduct = (id: string) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      syncToSupabase('products', id, true);
  };
  const handleAddProducts = (newProds: Product[]) => {
      setProducts(prev => [...prev, ...newProds]);
      syncToSupabase('products', newProds);
  };

  const handleUpdateSaleSunatStatus = (ticketId: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR', response: string) => {
      setSales(prev => prev.map(s => s.id === ticketId ? { 
          ...s, 
          sunatStatus: status, 
          sunatResponse: response,
          sunatHash: status === 'ACCEPTED' ? `HASH-${Date.now()}-${Math.random().toString(36).substring(7)}` : s.sunatHash
      } : s));
  };

  const handleUpdateSaleData = (ticketId: string, updates: Partial<SaleRecord>) => {
      setSales(prev => prev.map(s => s.id === ticketId ? { ...s, ...updates } : s));
  };

  const handleProcessSale = async (cart: CartItem[], total: number, docType: string, clientName: string, paymentBreakdown: PaymentBreakdown, ticketId: string, detailedPayments: any[], currency: string, exchangeRate: number) => {
      // Generate Traceability IDs
      const globalId = await getNextGlobalTransactionId();
      
      const companyId = session?.user.companyName || 'SapiSoft Demo';
      const branchId = currentBranchId;
      const moduleType = docType.includes('NOTA DE CREDITO') ? 'NOTA_CREDITO' : 'VENTA';
      
      // If ticketId is not provided or is just a timestamp, generate a proper correlative
      const nextId = await getNextModuleId(companyId, branchId, moduleType);
      const correlativeId = ticketId && ticketId.includes('-') ? ticketId : formatDocumentId(docType.substring(0, 3).toUpperCase(), nextId);

      const sale: SaleRecord = {
          id: ticketId || generateUUID(),
          globalId: globalId,
          correlativeId: correlativeId,
          tenantId: session?.businessName || 'SapiSoft Demo',
          branchId: currentBranchId,
          date: new Date().toLocaleDateString('es-PE'),
          time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
          clientName,
          docType,
          total,
          currency,
          exchangeRate,
          items: cart,
          paymentBreakdown,
          detailedPayments,
          user: session?.user.fullName || 'Admin'
      };
      // Use functional update to avoid race conditions
      setSales(prev => [sale, ...prev]);
      syncToSupabase('sales', sale);

      // Update product stock
      const updatedProducts: Product[] = [];
      setProducts(prev => {
          const newProducts = [...prev];
          cart.forEach(item => {
              const idx = newProducts.findIndex(p => p.id === item.id);
              if (idx !== -1) {
                  newProducts[idx] = { ...newProducts[idx], stock: newProducts[idx].stock - item.quantity };
                  updatedProducts.push(newProducts[idx]);
              }
          });
          return newProducts;
      });
      if (updatedProducts.length > 0) {
          syncToSupabase('products', updatedProducts);
      }

      const newStockMoves: StockMovement[] = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          const currentStock = (product?.stock || 0) - item.quantity;
          
          return {
              id: 'MOV-' + generateUUID(),
              globalId: globalId, // Link to the main transaction
              branchId: currentBranchId,
              date: sale.date,
              time: sale.time,
              productId: item.id,
              productName: item.name,
              type: 'SALIDA',
              quantity: item.quantity,
              currentStock: currentStock, // Approximation for log
              reference: `${correlativeId}`,
              user: session?.user.fullName || 'Admin'
          };
      });
      setStockMovements(prev => [...newStockMoves, ...prev]);
      syncToSupabase('stock_movements', newStockMoves);

      // GENERATE FINANCIAL MOVEMENTS FOR ALL PAYMENTS (CASH & BANK)
      const newCashMovements: CashMovement[] = [];
      if (detailedPayments && detailedPayments.length > 0) {
          detailedPayments.forEach((payment: any) => {
              if (payment.method === 'Saldo Favor') return;

              const movement: CashMovement = {
                  id: 'M-' + generateUUID(),
                  globalId: globalId, // Use the SAME globalId as the sale to link them in traceability
                  tenantId: session?.businessName || 'SapiSoft Demo',
                  branchId: currentBranchId,
                  date: sale.date,
                  time: sale.time,
                  type: 'Ingreso',
                  paymentMethod: payment.method,
                  concept: `PAGO VENTA ${correlativeId}`,
                  amount: payment.amount,
                  user: session?.user.fullName || 'Admin',
                  category: 'VENTA',
                  financialType: 'Variable',
                  currency: sale.currency,
                  accountId: payment.accountId,
                  referenceId: payment.reference
              };
              newCashMovements.push(movement);
          });
      } else if (paymentBreakdown.cash > 0) {
           const m: CashMovement = {
              id: 'M-' + generateUUID(),
              globalId: globalId, // Use the SAME globalId as the sale
              tenantId: session?.businessName || 'SapiSoft Demo',
              branchId: currentBranchId,
              date: sale.date,
              time: sale.time,
              type: 'Ingreso',
              paymentMethod: 'Efectivo',
              concept: `PAGO VENTA ${correlativeId}`,
              amount: paymentBreakdown.cash,
              user: session?.user.fullName || 'Admin',
              category: 'VENTA',
              financialType: 'Variable',
              currency: sale.currency
          };
          newCashMovements.push(m);
      }
      
      // Use functional update to ensure no movements are lost if multiple updates happen quickly (e.g., sale + wallet deposit)
      setCashMovements(prev => [...newCashMovements, ...prev]);
      if (newCashMovements.length > 0) {
          syncToSupabase('cash_movements', newCashMovements);
          
          // Update current cash session if open
          if (currentCashSession && currentCashSession.status === 'OPEN') {
              const updatedSession = { ...currentCashSession };
              newCashMovements.forEach(m => {
                  if (m.paymentMethod === 'Efectivo') {
                      updatedSession.expectedCashAtClose += Number(m.amount);
                  } else {
                      updatedSession.expectedDigitalAtClose += Number(m.amount);
                  }
              });
              setCurrentCashSession(updatedSession);
              setCashBoxSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
              syncToSupabase('cash_box_sessions', updatedSession);
          }
      }

      return { globalId, correlativeId };
  };

  const handleProcessPurchase = async (cart: CartItem[], total: number, docType: string, supplierName: string, paymentCondition: 'Contado' | 'Credito', creditDays: number, detailedPayments: any[], currency?: string, exchangeRate?: number) => {
      const globalId = await getNextGlobalTransactionId();
      
      const companyId = session?.user.companyName || 'SapiSoft Demo';
      const branchId = currentBranchId;
      const moduleType = 'COMPRA';
      
      const nextId = await getNextModuleId(companyId, branchId, moduleType);
      const correlativeId = formatDocumentId('PUR', nextId);

      const purchase: PurchaseRecord = {
          id: 'PUR-' + generateUUID(),
          globalId: globalId,
          correlativeId: correlativeId,
          tenantId: session?.businessName || 'SapiSoft Demo',
          branchId: currentBranchId,
          date: new Date().toLocaleDateString('es-PE'),
          time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
          supplierName,
          docType,
          total,
          currency: currency || baseCurrency,
          exchangeRate: exchangeRate || 1,
          items: cart,
          paymentCondition,
          detailedPayments,
          user: session?.user.fullName || 'Admin'
      };
      setPurchases(prev => [purchase, ...prev]);
      syncToSupabase('purchases', purchase);

      // Update product stock and cost
      const updatedProducts: Product[] = [];
      setProducts(prev => {
          const newProducts = [...prev];
          cart.forEach(item => {
              const idx = newProducts.findIndex(p => p.id === item.id);
              if (idx !== -1) {
                  const currentStock = newProducts[idx].stock;
                  const currentCost = newProducts[idx].cost;
                  const newStock = currentStock + item.quantity;
                  const newCost = ((currentStock * currentCost) + (item.quantity * item.price)) / newStock;
                  newProducts[idx] = { ...newProducts[idx], stock: newStock, cost: newCost };
                  updatedProducts.push(newProducts[idx]);
              }
          });
          return newProducts;
      });
      if (updatedProducts.length > 0) {
          syncToSupabase('products', updatedProducts);
      }

      const newStockMoves: StockMovement[] = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          const currentStock = (product?.stock || 0) + item.quantity;
          return {
              id: 'MOV-' + generateUUID(),
              globalId: globalId,
              branchId: currentBranchId,
              date: purchase.date,
              time: purchase.time,
              productId: item.id,
              productName: item.name,
              type: 'ENTRADA',
              quantity: item.quantity,
              currentStock: currentStock, // Approximation
              reference: `COMPRA ${correlativeId}`,
              user: session?.user.fullName || 'Admin',
              unitCost: item.price
          };
      });
      setStockMovements(prev => [...newStockMoves, ...prev]);
      syncToSupabase('stock_movements', newStockMoves);

      // GENERATE FINANCIAL MOVEMENTS FOR PURCHASES
      if (paymentCondition === 'Contado' && detailedPayments) {
          const newPurchaseMovements: CashMovement[] = [];
          detailedPayments.forEach((p: any) => {
              newPurchaseMovements.push({
                  id: 'M-' + generateUUID(),
                  globalId: globalId,
                  branchId: currentBranchId,
                  date: purchase.date,
                  time: purchase.time,
                  type: 'Egreso',
                  paymentMethod: p.method,
                  concept: `COMPRA ${docType} - ${supplierName}`,
                  amount: p.amount,
                  user: session?.user.fullName || 'Admin',
                  category: 'COMPRA',
                  financialType: 'Variable',
                  currency: purchase.currency,
                  accountId: p.accountId,
                  referenceId: p.reference
              });
          });
          setCashMovements(prev => [...newPurchaseMovements, ...prev]);
          if (newPurchaseMovements.length > 0) {
              syncToSupabase('cash_movements', newPurchaseMovements);
          }
      }

      return { globalId, correlativeId };
  };

  const handleRegisterPaymentReceivable = (ticketId: string, amount: number, paymentDetails: any, allocations?: Record<string, number>) => {
    const receivedAmount = paymentDetails.amount || amount;
    const allocatedAmount = amount;
    const excess = Math.max(0, receivedAmount - allocatedAmount);
    
    setSales(prevSales => {
        const saleIndex = prevSales.findIndex(s => s.id === ticketId);
        if (saleIndex === -1) return prevSales;
        const sale = prevSales[saleIndex];
        const newPayment = { ...paymentDetails, amount: allocatedAmount, allocations, id: Math.random().toString() };
        const updatedSale = { ...sale, detailedPayments: [...(sale.detailedPayments || []), newPayment] };
        const newSales = [...prevSales];
        newSales[saleIndex] = updatedSale;
        syncToSupabase('sales', updatedSale);
        return newSales;
    });

    // We need to find the sale to know which client to update.
    // Since state updates are batched, we might use 'sales' from closure, or better find it in prevSales above.
    // For simplicity, we find it from current sales state which is fine for reading.
    const saleForClient = sales.find(s => s.id === ticketId);
    
    if (saleForClient) {
        setClients(prevClients => {
            const newClients = prevClients.map(c => {
                if (c.name === saleForClient.clientName) {
                    let newCreditUsed = Math.max(0, c.creditUsed - allocatedAmount);
                    let newDigitalBalance = c.digitalBalance;
                    if (excess > 0) newDigitalBalance += excess;
                    const updatedClient = { ...c, creditUsed: newCreditUsed, digitalBalance: newDigitalBalance };
                    syncToSupabase('clients', updatedClient);
                    return updatedClient;
                }
                return c;
            });
            return newClients;
        });
    }

    // REGISTER MOVEMENT
    const m: CashMovement = {
        id: 'M-' + Date.now() + Math.random(),
        tenantId: session?.businessName || 'SapiSoft Demo',
        branchId: currentBranchId,
        date: paymentDetails.date,
        time: paymentDetails.time,
        type: 'Ingreso',
        paymentMethod: paymentDetails.method,
        concept: `ABONO VENTA #${ticketId} (Inc. ${excess > 0 ? 'Excedente' : ''})`,
        amount: receivedAmount,
        user: session?.user.fullName || 'Admin',
        category: 'COBRANZA',
        financialType: 'Variable',
        currency: saleForClient?.currency || 'PEN',
        accountId: paymentDetails.accountId,
        referenceId: paymentDetails.reference
    };
    setCashMovements(prev => [m, ...prev]);
  };

  const handleRegisterPaymentPayable = (purchaseId: string, amount: number, paymentDetails: any, allocations?: Record<string, number>) => {
      setPurchases(prevPurchases => {
          const idx = prevPurchases.findIndex(p => p.id === purchaseId);
          if (idx === -1) return prevPurchases;
          const purchase = prevPurchases[idx];
          const newPayment = { ...paymentDetails, amount: amount, allocations, id: Math.random().toString() };
          const updatedPurchase = { ...purchase, detailedPayments: [...(purchase.detailedPayments || []), newPayment] };
          const newArr = [...prevPurchases];
          newArr[idx] = updatedPurchase;
          return newArr;
      });

      const purchaseForSupplier = purchases.find(p => p.id === purchaseId);
      const receivedAmount = paymentDetails.amount || amount;
      const allocatedAmount = amount;
      const excess = Math.max(0, receivedAmount - allocatedAmount);

      if (purchaseForSupplier && excess > 0) {
          setSuppliers(prevSuppliers => {
             return prevSuppliers.map(s => {
                 if(s.name === purchaseForSupplier.supplierName) {
                     return { ...s, digitalBalance: (s.digitalBalance || 0) + excess };
                 }
                 return s;
             });
          });
      }

      // REGISTER MOVEMENT
      const m: CashMovement = {
          id: 'M-' + Date.now() + Math.random(),
          tenantId: session?.businessName || 'SapiSoft Demo',
          branchId: currentBranchId,
          date: paymentDetails.date,
          time: paymentDetails.time,
          type: 'Egreso',
          paymentMethod: paymentDetails.method,
          concept: `PAGO COMPRA #${purchaseId}`,
          amount: receivedAmount,
          user: session?.user.fullName || 'Admin',
          category: 'PAGO PROVEEDOR',
          financialType: 'Variable',
          currency: purchaseForSupplier?.currency || 'PEN',
          accountId: paymentDetails.accountId,
          referenceId: paymentDetails.reference
      };
      setCashMovements(prev => [m, ...prev]);
  };
  
  const handleAddService = async (s: ServiceOrder) => {
      const globalId = await getNextGlobalTransactionId();
      const enrichedService = {
          ...s,
          globalId: s.globalId || globalId,
          tenantId: s.tenantId || session?.businessName || 'SapiSoft Demo',
          branchId: s.branchId || currentBranchId
      };
      setServices(prev => [enrichedService, ...prev]);
      syncToSupabase('service_orders', enrichedService);
  };
  const handleAddTask = (task: Task) => setTasks([...tasks, task]);
  const handleUpdateTask = (updatedTask: Task) => setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  const handleDeleteTask = (taskId: string) => setTasks(tasks.filter(t => t.id !== taskId));
  const handleUpdateService = (s: ServiceOrder) => {
      setServices(prev => prev.map(item => item.id === s.id ? s : item));
      syncToSupabase('service_orders', s);
  };
  
  const handleFinalizeService = (serviceId: string, total: number, finalStatus: 'Entregado' | 'Devolucion', paymentBreakdown: PaymentBreakdown) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-PE');
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

      const laborAmount = service.cost;
      const productsAmount = (service.usedProducts || []).reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const calculatedTotal = laborAmount + productsAmount;

      setServices(prev => {
          const newServices = prev.map(s => s.id === serviceId ? { ...s, status: finalStatus, exitDate: dateStr, exitTime: timeStr } : s);
          const updatedService = newServices.find(s => s.id === serviceId);
          if (updatedService) syncToSupabase('service_orders', updatedService);
          return newServices;
      });
      
      if (finalStatus === 'Devolucion') return;

      const newMovements: CashMovement[] = [];

      const addMovementsForMethod = (method: PaymentMethodType, amount: number) => {
          if (amount <= 0) return;

          // Proportional split
          const laborPart = calculatedTotal > 0 ? (amount * (laborAmount / calculatedTotal)) : amount;
          const productsPart = calculatedTotal > 0 ? (amount * (productsAmount / calculatedTotal)) : 0;

          if (laborPart > 0.01) {
              newMovements.push({
                  id: 'M-SRV-' + Date.now() + Math.random(),
                  branchId: currentBranchId,
                  date: dateStr,
                  time: timeStr,
                  type: 'Ingreso',
                  paymentMethod: method,
                  concept: `SERVICIO TECNICO #${serviceId} (MANO DE OBRA)`,
                  amount: laborPart,
                  user: session?.user.fullName || 'Admin',
                  category: 'SERVICIO',
                  financialType: 'Variable',
                  currency: baseCurrency
              });
          }

          if (productsPart > 0.01) {
              newMovements.push({
                  id: 'M-PRD-' + Date.now() + Math.random(),
                  branchId: currentBranchId,
                  date: dateStr,
                  time: timeStr,
                  type: 'Ingreso',
                  paymentMethod: method,
                  concept: `VENTA REPUESTOS - SERVICIO #${serviceId}`,
                  amount: productsPart,
                  user: session?.user.fullName || 'Admin',
                  category: 'SERVICIO',
                  financialType: 'Variable',
                  currency: baseCurrency
              });
          }
      };

      addMovementsForMethod('Efectivo', paymentBreakdown.cash);
      addMovementsForMethod('Yape', paymentBreakdown.yape);
      addMovementsForMethod('Tarjeta', paymentBreakdown.card);
      addMovementsForMethod('Deposito', paymentBreakdown.bank);
      addMovementsForMethod('Saldo Favor', paymentBreakdown.wallet);

      if (newMovements.length > 0) {
          setCashMovements(prev => [...newMovements, ...prev]);
          syncToSupabase('cash_movements', newMovements);
      }

      // RECORD AS A SALE SO IT APPEARS IN SALES HISTORY
      const saleItems: CartItem[] = [];
      
      if (laborAmount > 0) {
          saleItems.push({
              id: 'MANO-DE-OBRA',
              code: 'SRV-001',
              name: 'MANO DE OBRA - ' + service.deviceModel,
              price: laborAmount,
              cost: 0,
              stock: 9999,
              location: 'TALLER',
              quantity: 1,
              category: 'SERVICIOS',
              brand: 'SapiSoft',
              discount: 0,
              total: laborAmount
          });
      }
      
      if (service.usedProducts && service.usedProducts.length > 0) {
          service.usedProducts.forEach(p => {
              const originalProduct = products.find(prod => prod.id === p.productId);
              saleItems.push({
                  id: p.productId,
                  code: originalProduct?.code || 'REP-' + p.productId,
                  name: p.productName,
                  price: p.price,
                  cost: originalProduct?.cost || 0,
                  stock: originalProduct?.stock || 0,
                  location: originalProduct?.location || 'ALMACEN',
                  quantity: p.quantity,
                  category: originalProduct?.category || 'REPUESTOS',
                  brand: originalProduct?.brand || '',
                  discount: 0,
                  total: p.price * p.quantity
              });
          });
      }

      const newSale: SaleRecord = {
          id: 'SRV-' + serviceId,
          tenantId: session?.businessName || 'SapiSoft Demo',
          branchId: currentBranchId,
          date: dateStr,
          time: timeStr,
          clientName: service.client,
          docType: 'TICKET SERVICIO',
          total: total,
          currency: baseCurrency,
          exchangeRate: 1,
          items: saleItems,
          paymentBreakdown: paymentBreakdown,
          user: session?.user.fullName || 'Admin'
      };

      setSales(prev => [newSale, ...prev]);
      syncToSupabase('sales', newSale);

      // RECORD STOCK MOVEMENTS FOR KARDEX
      if (service.usedProducts && service.usedProducts.length > 0) {
          const newStockMoves: StockMovement[] = service.usedProducts.map(p => {
              const product = products.find(prod => prod.id === p.productId);
              const currentStock = (product?.stock || 0) - p.quantity;
              return {
                  id: 'MOV-SRV-' + Date.now() + Math.random(),
                  branchId: currentBranchId,
                  date: dateStr,
                  time: timeStr,
                  productId: p.productId,
                  productName: p.productName,
                  type: 'SALIDA',
                  quantity: p.quantity,
                  currentStock: currentStock,
                  reference: `TICKET SERVICIO #SRV-${serviceId}`,
                  user: session?.user.fullName || 'Admin'
              };
          });
          setStockMovements(prev => [...newStockMoves, ...prev]);
          syncToSupabase('stock_movements', newStockMoves);
          
          // Also update product stock in state
          const updatedProducts: Product[] = [];
          setProducts(prevProducts => {
              const updated = [...prevProducts];
              service.usedProducts?.forEach(p => {
                  const idx = updated.findIndex(prod => prod.id === p.productId);
                  if (idx !== -1) {
                      updated[idx] = { ...updated[idx], stock: updated[idx].stock - p.quantity };
                      updatedProducts.push(updated[idx]);
                  }
              });
              return updated;
          });
          if (updatedProducts.length > 0) {
              syncToSupabase('products', updatedProducts);
          }
      }
  };
  
  const handleMarkRepaired = (id: string) => {
      setServices(prev => {
          const newServices = prev.map(s => s.id === id ? { ...s, status: 'Reparado' as const } : s);
          const updatedService = newServices.find(s => s.id === id);
          if (updatedService) syncToSupabase('service_orders', updatedService);
          return newServices;
      });
  };
  const handleAddSupplier = (s: Supplier) => {
      setSuppliers(prev => [...prev, s]);
      syncToSupabase('suppliers', s);
  };
  const handleDeleteSupplier = (id: string) => {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      syncToSupabase('suppliers', id, true);
  };
  const handleAddBrand = (b: Brand) => {
      setBrands(prev => [...prev, b]);
      syncToSupabase('brands', b);
  };
  const handleDeleteBrand = (id: string) => {
      setBrands(prev => prev.filter(b => b.id !== id));
      syncToSupabase('brands', id, true);
  };
  const handleAddCategory = (c: Category) => {
      setCategories(prev => [...prev, c]);
      syncToSupabase('categories', c);
  };
  const handleDeleteCategory = (id: string) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      syncToSupabase('categories', id, true);
  };
  const handleAddLocation = (loc: GeoLocation) => {
      setLocations(prev => [...prev, loc]);
      syncToSupabase('locations', loc);
  };
  const handleDeleteLocation = (id: string) => {
      setLocations(prev => prev.filter(l => l.id !== id));
      syncToSupabase('locations', id, true);
  };
  const handleResetLocations = () => setLocations(MOCK_LOCATIONS);
  const handleAddUser = (u: SystemUser) => {
      setUsers(prev => [...prev, u]);
      syncToSupabase('system_users', u);
  };
  const handleUpdateUser = (u: SystemUser) => {
      setUsers(prev => prev.map(usr => usr.id === u.id ? u : usr));
      syncToSupabase('system_users', u);
  };
  const handleDeleteUser = (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
      syncToSupabase('system_users', id, true);
  };
  const handleAddBankAccount = (b: BankAccount) => {
      setBankAccounts(prev => [...prev, b]);
      syncToSupabase('bank_accounts', b);
  };
  const handleUpdateBankAccount = (b: BankAccount) => {
      setBankAccounts(prev => prev.map(bk => bk.id === b.id ? b : bk));
      syncToSupabase('bank_accounts', b);
  };
  const handleDeleteBankAccount = (id: string) => {
      setBankAccounts(prev => prev.filter(b => b.id !== id));
      syncToSupabase('bank_accounts', id, true);
  };
  
  // NEW: Update Wallet Balance AND Record Cash Movement
  const handleUpdateClientBalance = (clientId: string, amountChange: number, reason: string, paymentMethod: any, accountId?: string) => {
      // Find client name before update for the record concept
      const client = clients.find(c => c.id === clientId);
      const clientName = client ? client.name : 'CLIENTE';

      setClients(prev => {
          const newClients = prev.map(c => c.id === clientId ? { ...c, digitalBalance: c.digitalBalance + amountChange } : c);
          const updatedClient = newClients.find(c => c.id === clientId);
          if (updatedClient) syncToSupabase('clients', updatedClient);
          return newClients;
      });
      
      const type = amountChange > 0 ? 'Ingreso' : 'Egreso';
      const absAmount = Math.abs(amountChange);
      
      const movement: CashMovement = {
          id: 'M-WALLET-' + Date.now(),
          globalId: generateTransactionId(), // Unique global ID
          tenantId: session?.businessName || 'SapiSoft Demo',
          branchId: currentBranchId,
          date: new Date().toLocaleDateString('es-PE'),
          time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
          type: type,
          paymentMethod: paymentMethod || 'Efectivo',
          concept: `BILLETERA: ${clientName} - ${reason}`,
          amount: absAmount,
          user: session?.user.fullName || 'Admin',
          category: 'BILLETERA',
          financialType: 'Variable',
          accountId: accountId,
          currency: baseCurrency
      };

      // Functional update to avoid losing data if called in parallel with other cash updates
      setCashMovements(prev => [movement, ...prev]);
      syncToSupabase('cash_movements', movement);
  };

  const handleUniversalTransfer = (from: string, to: string, amount: number, rate: number, ref: string, op: string) => {
      alert(`Transferencia de ${amount} realizada de ${from} a ${to}`);
  };
  const handleOpenCashBox = (openingCash: number, notes: string, confirmedBankBalances: Record<string, string>) => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-PE');
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const newSession: CashBoxSession = {
          id: 'CS-' + Date.now(),
          branchId: currentBranchId,
          openingDate: `${dateStr} ${timeStr}`,
          closingDate: '',
          openingUser: session?.user.fullName || 'Admin',
          closingUser: '',
          status: 'OPEN',
          expectedOpening: openingCash,
          countedOpening: openingCash,
          openingDifference: 0,
          openingNotes: notes,
          confirmedDigitalAtOpen: Object.entries(confirmedBankBalances).reduce((acc, [k, v]) => ({...acc, [k]: Number(v)}), {}),
          expectedCashAtClose: 0,
          countedCashAtClose: 0,
          cashDifferenceAtClose: 0,
          expectedDigitalAtClose: 0,
          confirmedDigitalAtClose: {},
          closingNotes: ''
      };
      setCurrentCashSession(newSession);
      syncToSupabase('cash_box_sessions', newSession);
  };

  const handleCloseCashBox = (countedCash: number, systemCash: number, systemDigital: number, notes: string, confirmedBankBalances: Record<string, string>) => {
      if (currentCashSession) {
          const now = new Date();
          const dateStr = now.toLocaleDateString('es-PE');
          const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          const closedSession = {
              ...currentCashSession,
              closingDate: `${dateStr} ${timeStr}`,
              closingUser: session?.user.fullName || 'Admin',
              status: 'CLOSED' as const,
              expectedCashAtClose: systemCash,
              countedCashAtClose: countedCash,
              cashDifferenceAtClose: countedCash - systemCash,
              expectedDigitalAtClose: systemDigital,
              confirmedDigitalAtClose: Object.entries(confirmedBankBalances).reduce((acc, [k, v]) => ({...acc, [k]: Number(v)}), {}),
              closingNotes: notes
          };
          setCashBoxSessions(prev => [closedSession, ...prev]);
          setCurrentCashSession(undefined);
          syncToSupabase('cash_box_sessions', closedSession);
      }
  };

  const handleAddMovement = async (m: CashMovement) => {
      const globalId = await getNextGlobalTransactionId();
      const enrichedMovement = {
          ...m,
          globalId: m.globalId || globalId,
          tenantId: m.tenantId || session?.businessName || 'SapiSoft Demo'
      };
      setCashMovements(prev => [enrichedMovement, ...prev]);
      syncToSupabase('cash_movements', enrichedMovement);
  };
  const handleAddQuotation = async (q: Quotation) => {
      const globalId = await getNextGlobalTransactionId();
      const enrichedQuotation = {
          ...q,
          globalId: q.globalId || globalId,
          tenantId: q.tenantId || session?.businessName || 'SapiSoft Demo',
          branchId: q.branchId || currentBranchId
      };
      setQuotations(prev => [enrichedQuotation, ...prev]);
      syncToSupabase('quotations', enrichedQuotation);
  };
  const handleDeleteQuotation = (id: string) => {
      setQuotations(prev => prev.filter(q => q.id !== id));
      syncToSupabase('quotations', id, true);
  };
  const handleLoadQuotation = (q: Quotation) => {
      setCart(q.items);
      if (q.clientName) {
          const c = clients.find(cl => cl.name === q.clientName);
          if (c) setPosClient(c);
      }
      handleNavigate(ViewState.POS);
  };
  const handleAddPresale = async (p: Presale) => {
      const globalId = await getNextGlobalTransactionId();
      const enrichedPresale = {
          ...p,
          globalId: p.globalId || globalId,
          tenantId: p.tenantId || session?.businessName || 'SapiSoft Demo',
          branchId: p.branchId || currentBranchId
      };
      setPresales(prev => [enrichedPresale, ...prev]);
      syncToSupabase('presales', enrichedPresale);
  };
  const handleDeletePresale = (id: string) => {
      setPresales(prev => prev.filter(p => p.id !== id));
      syncToSupabase('presales', id, true);
  };
  const handleLoadPresale = (p: Presale) => { alert("Procesando entrega de preventa " + p.id); };
  const handleProcessCreditNote = (originalSaleId: string, itemsToReturn: { itemId: string, quantity: number }[], totalRefund: number, breakdown: PaymentBreakdown, detailedRefunds?: any[]) => {
      alert("Nota de crédito procesada por S/ " + totalRefund);
  };
  const handleProcessInventorySession = (s: InventoryHistorySession) => {
      setInventoryHistory(prev => [s, ...prev]);
      syncToSupabase('inventory_sessions', s);
  };
  const handleCloneBranch = (sourceId: string, newName: string) => {
      const newBranch: Branch = { id: 'BR-' + Date.now(), name: newName, address: '', isMain: false };
      setBranches(prev => [...prev, newBranch]);
      syncToSupabase('branches', newBranch);
  };
  const handleSwitchBranch = (id: string) => setCurrentBranchId(id);
  const handleAddBranch = (name: string, address: string, phone: string) => {
      const newBranch = { id: 'BR-' + Date.now(), name, address, phone, isMain: false };
      setBranches(prev => [...prev, newBranch]);
      syncToSupabase('branches', newBranch);
  };
  const handleUpdateBranch = (b: Branch) => {
      setBranches(prev => prev.map(br => br.id === b.id ? b : br));
      syncToSupabase('branches', b);
  };
  const handleDeleteBranch = (id: string) => {
      setBranches(prev => prev.filter(b => b.id !== id));
      syncToSupabase('branches', id, true);
  };
  const handleAddTenant = (t: Tenant) => {
      setTenants(prev => [...prev, t]);
      syncToSupabase('tenants', t);
  };
  const handleUpdateTenant = (id: string, updates: Partial<Tenant>) => {
      setTenants(prev => {
          const newTenants = prev.map(t => t.id === id ? { ...t, ...updates } : t);
          const updatedTenant = newTenants.find(t => t.id === id);
          if (updatedTenant) syncToSupabase('tenants', updatedTenant);
          return newTenants;
      });
  };
  const handleDeleteTenant = (id: string) => {
      setTenants(prev => prev.filter(t => t.id !== id));
      syncToSupabase('tenants', id, true);
  };
  const handleResetTenantData = (id: string) => alert("Datos reseteados para tenant " + id);
  const handleSyncDownload = (data: any) => {
      if (data.isSupabaseActive) {
          localStorage.setItem('isSupabaseActive', 'true');
          alert("¡Guardado en la nube activado! A partir de ahora los datos se guardarán en Supabase.");
          return;
      }
      if (data.products) setProducts(data.products);
      if (data.clients) setClients(data.clients);
      alert("Datos sincronizados desde la nube.");
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} users={users} tenants={tenants} heroImage={companyLogo || undefined} />;
  }

  return (
    <Layout
      companyName={companyName}
      companyLogo={companyLogo}
      navStructure={navStructure}
      currentView={currentView}
      activeFolder={activeMobileCategory}
      onNavigate={handleNavigate}
      onBack={handleBack}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
      session={session}
      onLogout={handleLogout}
      isSyncEnabled={isSyncEnabled}
      toggleSyncMode={toggleSyncMode}
      branches={branches}
      currentBranchId={currentBranchId}
      onSwitchBranch={handleSwitchBranch}
      onCreateBranch={(name, addr) => handleAddBranch(name, addr, '')}
      isOffline={isOffline}
      pendingSyncCount={pendingSyncCount}
    >
      {syncError && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
          {syncError}
        </div>
      )}
      {currentView === ViewState.DASHBOARD && (
        <Dashboard 
          onNavigate={handleNavigate} 
          session={session} 
          cashMovements={cashMovements} 
          clients={clients} 
          services={services} 
          products={products} 
          navStructure={navStructure}
          activeMobileCategory={activeMobileCategory}
          onOpenFolder={handleOpenFolder}
          onCloseFolder={handleCloseFolder}
        />
      )}
      
      {currentView === ViewState.POS && (
        <SalesModule products={products} clients={clients} categories={categories} purchasesHistory={purchases} stockMovements={stockMovements} bankAccounts={bankAccounts} locations={locations} onAddClient={handleAddClient} onProcessSale={handleProcessSale} cart={cart} setCart={setCart} client={posClient} setClient={setPosClient} quotations={quotations} onLoadQuotation={handleLoadQuotation} onAddQuotation={handleAddQuotation} onAddPresale={handleAddPresale} systemBaseCurrency={baseCurrency} branches={branches} currentBranchId={currentBranchId} onNavigate={handleNavigate} onUpdateClientBalance={handleUpdateClientBalance} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.SUNAT_BILLING && (
        <SunatModule sales={sales} onUpdateSaleSunatStatus={handleUpdateSaleSunatStatus} onUpdateSaleData={handleUpdateSaleData} />
      )}

      {currentView === ViewState.ACCOUNTS_RECEIVABLE && (
        <AccountsReceivableModule clients={clients} salesHistory={sales} bankAccounts={bankAccounts} onRegisterPayment={handleRegisterPaymentReceivable} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.ACCOUNTS_PAYABLE && (
        <AccountsPayableModule suppliers={suppliers} purchasesHistory={purchases} bankAccounts={bankAccounts} onRegisterPayment={handleRegisterPaymentPayable} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.SERVICES && (
        <ServicesModule services={services} products={products} categories={categories} bankAccounts={bankAccounts} onAddService={handleAddService} onUpdateService={handleUpdateService} onFinalizeService={handleFinalizeService} onMarkRepaired={handleMarkRepaired} clients={clients} onAddClient={handleAddClient} onOpenWhatsApp={(name, phone) => { window.open(`https://wa.me/${phone}`); }} locations={locations} currentBranchId={currentBranchId} onGetNextSupportId={getNextGlobalSupportId} />
      )}
      
      {currentView === ViewState.INVENTORY && (
        <InventoryModule products={products} brands={brands} categories={categories} onUpdateProduct={handleUpdateProduct} onAddProduct={handleAddProduct} onAddProducts={handleAddProducts} onDeleteProduct={handleDeleteProduct} onNavigate={handleNavigate} salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} />
      )}

      {currentView === ViewState.PURCHASES && (
        <PurchaseModule products={products} suppliers={suppliers} categories={categories} bankAccounts={bankAccounts} onAddSupplier={handleAddSupplier} locations={locations} onProcessPurchase={handleProcessPurchase} systemBaseCurrency={baseCurrency} />
      )}

      {currentView === ViewState.CASH && (
        <CashModule movements={cashMovements} salesHistory={sales} purchasesHistory={purchases} onAddMovement={handleAddMovement} bankAccounts={bankAccounts} onUniversalTransfer={handleUniversalTransfer} fixedExpenseCategories={fixedExpenses} fixedIncomeCategories={fixedIncomes} onAddFixedCategory={(cat, type) => type === 'Ingreso' ? setFixedIncomes(prev => [...prev, cat]) : setFixedExpenses(prev => [...prev, cat])} isCashBoxOpen={!!currentCashSession} lastClosingCash={0} onOpenCashBox={handleOpenCashBox} onCloseCashBox={handleCloseCashBox} systemBaseCurrency={baseCurrency} currentSession={currentCashSession} currentBranchId={currentBranchId} />
      )}

      {currentView === ViewState.CLIENT_WALLET && <ClientWalletModule clients={clients} locations={locations} onUpdateClientBalance={handleUpdateClientBalance} onAddClient={handleAddClient} bankAccounts={bankAccounts} isCashBoxOpen={!!currentCashSession} salesHistory={sales} cashMovements={cashMovements} />}

      {currentView === ViewState.CLIENTS && (
        <ClientsModule clients={clients} onAddClient={handleAddClient} onOpenWhatsApp={(name, phone) => window.open(`https://wa.me/${phone}`)} locations={locations} initialData={pendingClientData} onClearInitialData={() => setPendingClientData(null)} />
      )}

      {/* WHATSAPP IS NOW ALWAYS RENDERED BUT HIDDEN WHEN NOT ACTIVE TO KEEP SOCKET/AI ALIVE */}
      <div style={{ display: currentView === ViewState.WHATSAPP ? 'flex' : 'none', height: '100%', flex: 1, flexDirection: 'column' }}>
        <WhatsAppModule clients={clients} onAddClient={handleAddClient} products={products} chats={chats} setChats={setChats} currentUser={session?.user?.fullName || 'Admin'} onNavigate={handleNavigate} crmDb={crmDb} setCrmDb={setCrmDb} crmStages={crmStages} setCrmStages={setCrmStages} onRegisterClientFromCrm={handleRegisterFromCRM} targetChatPhone={targetChatPhone} onClearTargetChat={() => setTargetChatPhone(null)} />
      </div>

      {currentView === ViewState.BROADCAST && (
        <BroadcastModule crmDb={crmDb} crmStages={crmStages} />
      )}

      {currentView === ViewState.CRM && (
        <CrmModule crmDb={crmDb} setCrmDb={setCrmDb} stages={crmStages} onNavigate={handleNavigate} onOpenChat={(phone) => { setTargetChatPhone(phone); handleNavigate(ViewState.WHATSAPP); }} />
      )}

      {currentView === ViewState.SUPPLIERS && (
        <SuppliersModule suppliers={suppliers} onAddSupplier={handleAddSupplier} onDeleteSupplier={handleDeleteSupplier} purchasesHistory={purchases} />
      )}

      {currentView === ViewState.MANAGE_RESOURCES && (
        <ResourceManagement brands={brands} onAddBrand={handleAddBrand} onDeleteBrand={handleDeleteBrand} categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />
      )}

      {currentView === ViewState.SALES_REPORT && <SalesReportModule salesHistory={sales} />}
      {currentView === ViewState.PROFIT_REPORT && <ProfitReportModule salesHistory={sales} cashMovements={cashMovements} products={products} />}
      {currentView === ViewState.INVENTORY_AUDIT && <InventoryAuditModule history={inventoryHistory} products={products} />}
      {currentView === ViewState.BUSINESS_EVOLUTION && <BusinessEvolutionModule products={products} clients={clients} movements={cashMovements} />}
      {currentView === ViewState.FINANCIAL_STRATEGY && <FinancialStrategyModule products={products} salesHistory={sales} cashMovements={cashMovements} onAddCashMovement={handleAddMovement} />}
      {currentView === ViewState.HISTORY_QUERIES && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='ventas' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.PURCHASES_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='compras' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.INGRESOS_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='ingresos' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.EGRESOS_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='egresos' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.PRODUCT_HISTORY_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='historial_producto' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.KARDEX_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='kardex' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.CREDIT_NOTE_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='notas_credito' products={products} bankAccounts={bankAccounts} services={services} />}
      {currentView === ViewState.LOCATIONS && <LocationsModule locations={locations} onAddLocation={handleAddLocation} onDeleteLocation={handleDeleteLocation} onResetLocations={handleResetLocations} />}
      {currentView === ViewState.USER_PRIVILEGES && <UserPrivilegesModule users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
      {currentView === ViewState.CREDIT_NOTE && <CreditNoteModule salesHistory={sales} onProcessCreditNote={handleProcessCreditNote} bankAccounts={bankAccounts} />}
      {currentView === ViewState.QUOTATIONS && <QuotationModule quotations={quotations} onLoadQuotation={handleLoadQuotation} onDeleteQuotation={handleDeleteQuotation} />}
      {currentView === ViewState.PRESALES && <PresaleModule presales={presales} onLoadPresale={handleLoadPresale} onDeletePresale={handleDeletePresale} products={products} clients={clients} categories={categories} purchasesHistory={purchases} stockMovements={stockMovements} bankAccounts={bankAccounts} locations={locations} onAddClient={handleAddClient} onAddPresale={handleAddPresale} systemBaseCurrency={baseCurrency} branches={branches} currentBranchId={currentBranchId} quotations={quotations} onAddQuotation={handleAddQuotation} />}
      {currentView === ViewState.DATABASE_CONFIG && <DatabaseModule isSyncEnabled={isSyncEnabled} data={{ products, clients, movements: cashMovements, sales, services, suppliers, brands, categories, bankAccounts, cashBoxSessions }} onSyncDownload={handleSyncDownload} />}
      {currentView === ViewState.CONFIG_PRINTER && <PrintConfigModule />}
      {currentView === ViewState.MEDIA_EDITOR && <MediaEditorModule onUpdateHeroImage={() => {}} onUpdateFeatureImage={() => {}} />}
      {currentView === ViewState.SUPER_ADMIN_DASHBOARD && <SuperAdminModule tenants={tenants} onAddTenant={handleAddTenant} onUpdateTenant={handleUpdateTenant} onDeleteTenant={handleDeleteTenant} onResetTenantData={handleResetTenantData} sales={sales} purchases={purchases} cashMovements={cashMovements} services={services} quotations={quotations} presales={presales} products={products} clients={clients} onRecorrelateHistory={recorrelateHistory} />}
      {currentView === ViewState.CASH_BOX_HISTORY && <CashBoxHistoryModule sessions={cashBoxSessions} bankAccounts={bankAccounts} />}
      {currentView === ViewState.BANK_ACCOUNTS && <BankAccountsModule bankAccounts={bankAccounts} onAddBankAccount={handleAddBankAccount} onUpdateBankAccount={handleUpdateBankAccount} onDeleteBankAccount={handleDeleteBankAccount} onUniversalTransfer={handleUniversalTransfer} />}
      {currentView === ViewState.BANK_HISTORY && <BankHistoryModule cashMovements={cashMovements} bankAccounts={bankAccounts} />}
      {currentView === ViewState.COMPANY_PROFILE && <CompanyProfileModule companyName={companyName} onUpdateCompanyName={setCompanyName} companyLogo={companyLogo} onUpdateLogo={setCompanyLogo} baseCurrency={baseCurrency} onUpdateBaseCurrency={setBaseCurrency} />}
      {currentView === ViewState.SYSTEM_DIAGNOSTICS && <SystemDiagnosticsModule products={products} cashMovements={cashMovements} stockMovements={stockMovements} onAddCashMovement={handleAddMovement} onAddProduct={handleAddProduct} onProcessSale={handleProcessSale} onProcessPurchase={handleProcessPurchase} onProcessCreditNote={handleProcessCreditNote} onAddService={handleAddService} currentBranchId={currentBranchId} />}
      {currentView === ViewState.GATEWAY_CONFIG && <GatewayConfigModule />}
      {currentView === ViewState.BRANCH_MANAGEMENT && <BranchManagementModule branches={branches} onAddBranch={handleAddBranch} onUpdateBranch={handleUpdateBranch} onDeleteBranch={handleDeleteBranch} onCloneBranch={handleCloneBranch} onSwitchBranch={handleSwitchBranch} currentBranchId={currentBranchId} />}
      {currentView === ViewState.WAREHOUSE_TRANSFER && <WarehouseTransferModule branches={branches} currentBranchId={currentBranchId} products={products} onProcessTransfer={(t) => {
              setWarehouseTransfers(prev => [t, ...prev]);
              syncToSupabase('warehouse_transfers', t);
          }} onConfirmTransfer={(t) => {
              const updated = { ...t, status: 'COMPLETED' as const };
              setWarehouseTransfers(prev => prev.map(tr => tr.id === t.id ? updated : tr));
              syncToSupabase('warehouse_transfers', updated);
              const newMoves: StockMovement[] = t.items.map(i => {
                  const prod = products.find(p => p.id === i.productId);
                  const currentStock = (prod?.stock || 0) + i.quantity; // Note: using closure product, ideally should batch update products too
                  return { id: 'MOV-' + Date.now() + Math.random(), branchId: currentBranchId, date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), productId: i.productId, productName: i.productName, type: 'ENTRADA', quantity: i.quantity, currentStock: currentStock, reference: `TRASPASO RECIBIDO #${t.id}`, user: session?.user.fullName || 'Admin' };
              });
              setStockMovements(prev => [...newMoves, ...prev]);
              syncToSupabase('stock_movements', newMoves);
              
              // Also update products stock
              const updatedProducts: Product[] = [];
              setProducts(prevProds => {
                  const newProds = [...prevProds];
                  t.items.forEach(i => {
                      const idx = newProds.findIndex(p => p.id === i.productId);
                      if (idx !== -1) {
                          newProds[idx] = { ...newProds[idx], stock: newProds[idx].stock + i.quantity };
                          updatedProducts.push(newProds[idx]);
                      }
                  });
                  return newProds;
              });
              if (updatedProducts.length > 0) {
                  syncToSupabase('products', updatedProducts);
              }

          }} onRejectTransfer={(t) => {
              const updated = { ...t, status: 'REJECTED' as const };
              setWarehouseTransfers(prev => prev.map(tr => tr.id === t.id ? updated : tr));
              syncToSupabase('warehouse_transfers', updated);
          }} history={warehouseTransfers} quotations={presales} />}
      {currentView === ViewState.CASH_TRANSFERS && <CashTransferModule bankAccounts={bankAccounts} movements={cashMovements} requests={cashTransferRequests} branches={branches} currentBranchId={currentBranchId} onInitiateTransfer={(from, to, amount, rate, ref, op, targetBranchId) => {
              const req: CashTransferRequest = { id: 'REQ-' + Date.now(), date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), fromBranchId: currentBranchId, fromBranchName: branches.find(b => b.id === currentBranchId)?.name || '', toBranchId: targetBranchId, toBranchName: branches.find(b => b.id === targetBranchId)?.name || '', amount, currency: baseCurrency, status: 'PENDING', user: session?.user.fullName || 'Admin', notes: ref };
              setCashTransferRequests(prev => [req, ...prev]);
              syncToSupabase('cash_transfer_requests', req);
              handleAddMovement({ id: 'M-' + Date.now(), branchId: currentBranchId, date: req.date, time: req.time, type: 'Egreso', paymentMethod: 'Efectivo', concept: `TRASPASO A ${req.toBranchName}`, amount: amount, user: session?.user.fullName || 'Admin', category: 'TRANSFERENCIA SALIENTE', financialType: 'Variable' });
          }} onConfirmTransfer={(req) => {
              const updated = { ...req, status: 'COMPLETED' as const };
              setCashTransferRequests(prev => prev.map(r => r.id === req.id ? updated : r));
              syncToSupabase('cash_transfer_requests', updated);
              handleAddMovement({ id: 'M-' + Date.now(), branchId: currentBranchId, date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), type: 'Ingreso', paymentMethod: 'Efectivo', concept: `RECEPCIÓN DE ${req.fromBranchName}`, amount: req.amount, user: session?.user.fullName || 'Admin', category: 'TRANSFERENCIA ENTRANTE', financialType: 'Variable' });
          }} systemBaseCurrency={baseCurrency} isCashBoxOpen={!!currentCashSession} />}
      {currentView === ViewState.INVENTORY_ADJUSTMENT && <InventoryAdjustmentModule products={products} salesHistory={sales} onProcessInventorySession={handleProcessInventorySession} sessionUser={session?.user?.fullName || 'Admin'} history={inventoryHistory} />}
      {currentView === ViewState.AI_ASSISTANT && session && <AiAssistantModule sessionUser={session?.user?.fullName || 'Admin'} products={products} />}
      {currentView === ViewState.AGENDA && <AgendaModule />}
    </Layout>
  );
};

export default App;
