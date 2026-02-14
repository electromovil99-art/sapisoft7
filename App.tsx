
import React, { useState, useEffect } from 'react';
import { 
  ViewState, Product, Client, Supplier, Category, Brand, SaleRecord, 
  PurchaseRecord, StockMovement, CashMovement, ServiceOrder, 
  SystemUser, AuthSession, Tenant, BankAccount, GeoLocation, 
  Quotation, Presale, Branch, WarehouseTransfer, CashTransferRequest, 
  CashBoxSession, CartItem, PaymentBreakdown, InventoryHistorySession,
  CrmContact
} from './types';
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

const App = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  // --- DATA STATE ---
  const [products, setProducts] = useState<Product[]>([...TECH_PRODUCTS, ...PHARMA_PRODUCTS]);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: '1', name: 'TECNOLOGIA GLOBAL SAC', ruc: '20100000001', phone: '999888777', digitalBalance: 0 }
  ]);
  const [categories, setCategories] = useState<Category[]>(TECH_CATEGORIES);
  const [brands, setBrands] = useState<Brand[]>([{ id: '1', name: 'SAMSUNG' }, { id: '2', name: 'APPLE' }]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
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
  const [companyName, setCompanyName] = useState('Mi Empresa S.A.C.');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('PEN');
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
    setSession({
      user,
      businessName: user.companyName,
      token: 'mock-token',
      baseCurrency: tenant?.baseCurrency || 'PEN'
    });
    setCompanyName(user.companyName);
    setBaseCurrency(tenant?.baseCurrency || 'PEN');
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentView(ViewState.DASHBOARD);
  };

  const handleRegisterFromCRM = (name: string, phone: string) => {
      setPendingClientData({ name, phone });
      setCurrentView(ViewState.CLIENTS);
  };

  const handleAddClient = (c: Client) => {
      setClients(prev => [...prev, c]);
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

  const handleAddProduct = (p: Product) => setProducts(prev => [...prev, p]);
  const handleUpdateProduct = (p: Product) => setProducts(prev => prev.map(pr => pr.id === p.id ? p : pr));
  const handleDeleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const handleAddProducts = (newProds: Product[]) => setProducts(prev => [...prev, ...newProds]);

  const handleProcessSale = (cart: CartItem[], total: number, docType: string, clientName: string, paymentBreakdown: PaymentBreakdown, ticketId: string, detailedPayments: any[], currency: string, exchangeRate: number) => {
      const sale: SaleRecord = {
          id: ticketId,
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

      if (sale.paymentBreakdown.cash === 0 && sale.paymentBreakdown.card === 0 && sale.paymentBreakdown.yape === 0 && sale.paymentBreakdown.bank === 0 && sale.paymentBreakdown.wallet === 0) {
          setClients(prevClients => prevClients.map(c => {
              if (c.name === clientName) {
                  return { ...c, creditUsed: (c.creditUsed || 0) + total };
              }
              return c;
          }));
      }

      // Batch update stock to prevent multiple re-renders and race conditions with state
      setProducts(prevProducts => {
          const updatedProducts = [...prevProducts];
          cart.forEach(item => {
              const index = updatedProducts.findIndex(p => p.id === item.id);
              if (index !== -1) {
                  updatedProducts[index] = { 
                      ...updatedProducts[index], 
                      stock: updatedProducts[index].stock - item.quantity 
                  };
              }
          });
          return updatedProducts;
      });

      const newStockMoves: StockMovement[] = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          const currentStock = (product?.stock || 0) - item.quantity;
          
          return {
              id: 'MOV-' + Date.now() + Math.random(),
              branchId: currentBranchId,
              date: sale.date,
              time: sale.time,
              productId: item.id,
              productName: item.name,
              type: 'SALIDA',
              quantity: item.quantity,
              currentStock: currentStock, // Approximation for log
              reference: `${docType} #${ticketId}`,
              user: session?.user.fullName || 'Admin'
          };
      });
      setStockMovements(prev => [...newStockMoves, ...prev]);

      // GENERATE FINANCIAL MOVEMENTS FOR ALL PAYMENTS (CASH & BANK)
      const newCashMovements: CashMovement[] = [];
      if (detailedPayments && detailedPayments.length > 0) {
          detailedPayments.forEach((payment: any) => {
              if (payment.method === 'Saldo Favor') return;

              const movement: CashMovement = {
                  id: 'M-' + Date.now() + Math.random(),
                  branchId: currentBranchId,
                  date: sale.date,
                  time: sale.time,
                  type: 'Ingreso',
                  paymentMethod: payment.method,
                  concept: `VENTA ${docType} #${ticketId}`,
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
              id: 'M-' + Date.now(),
              branchId: currentBranchId,
              date: sale.date,
              time: sale.time,
              type: 'Ingreso',
              paymentMethod: 'Efectivo',
              concept: `VENTA ${docType} #${ticketId}`,
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
  };

  const handleProcessPurchase = (cart: CartItem[], total: number, docType: string, supplierName: string, paymentCondition: 'Contado' | 'Credito', creditDays: number, detailedPayments: any[], currency?: string, exchangeRate?: number) => {
      const purchase: PurchaseRecord = {
          id: 'PUR-' + Date.now(),
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

      // Batch update stock and cost
      setProducts(prevProducts => {
          const updatedProducts = [...prevProducts];
          cart.forEach(item => {
              const index = updatedProducts.findIndex(p => p.id === item.id);
              if (index !== -1) {
                  updatedProducts[index] = { 
                      ...updatedProducts[index], 
                      stock: updatedProducts[index].stock + item.quantity,
                      cost: item.price
                  };
              }
          });
          return updatedProducts;
      });

      const newStockMoves: StockMovement[] = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          const currentStock = (product?.stock || 0) + item.quantity;
          return {
              id: 'MOV-' + Date.now() + Math.random(),
              branchId: currentBranchId,
              date: purchase.date,
              time: purchase.time,
              productId: item.id,
              productName: item.name,
              type: 'ENTRADA',
              quantity: item.quantity,
              currentStock: currentStock, // Approximation
              reference: `COMPRA ${docType}`,
              user: session?.user.fullName || 'Admin',
              unitCost: item.price
          };
      });
      setStockMovements(prev => [...newStockMoves, ...prev]);

      // GENERATE FINANCIAL MOVEMENTS FOR PURCHASES
      if (paymentCondition === 'Contado' && detailedPayments) {
          const newPurchaseMovements: CashMovement[] = [];
          detailedPayments.forEach((p: any) => {
              newPurchaseMovements.push({
                  id: 'M-' + Date.now() + Math.random(),
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
      }
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
        return newSales;
    });

    // We need to find the sale to know which client to update.
    // Since state updates are batched, we might use 'sales' from closure, or better find it in prevSales above.
    // For simplicity, we find it from current sales state which is fine for reading.
    const saleForClient = sales.find(s => s.id === ticketId);
    
    if (saleForClient) {
        setClients(prevClients => {
            return prevClients.map(c => {
                if (c.name === saleForClient.clientName) {
                    let newCreditUsed = Math.max(0, c.creditUsed - allocatedAmount);
                    let newDigitalBalance = c.digitalBalance;
                    if (excess > 0) newDigitalBalance += excess;
                    return { ...c, creditUsed: newCreditUsed, digitalBalance: newDigitalBalance };
                }
                return c;
            });
        });
    }

    // REGISTER MOVEMENT
    const m: CashMovement = {
        id: 'M-' + Date.now() + Math.random(),
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
  
  const handleAddService = (s: ServiceOrder) => setServices(prev => [s, ...prev]);
  
  const handleFinalizeService = (serviceId: string, total: number, finalStatus: 'Entregado' | 'Devolucion', paymentBreakdown: PaymentBreakdown) => {
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: finalStatus, cost: total } : s));
      if (paymentBreakdown.cash > 0) {
          setCashMovements(prev => [
              {
                  id: 'M-' + Date.now(),
                  branchId: currentBranchId,
                  date: new Date().toLocaleDateString('es-PE'),
                  time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
                  type: 'Ingreso',
                  paymentMethod: 'Efectivo',
                  concept: `SERVICIO TECNICO #${serviceId}`,
                  amount: paymentBreakdown.cash,
                  user: session?.user.fullName || 'Admin',
                  category: 'SERVICIO',
                  financialType: 'Variable'
              },
              ...prev
          ]);
      }
  };
  
  const handleMarkRepaired = (id: string) => setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'Reparado' } : s));
  const handleAddSupplier = (s: Supplier) => setSuppliers(prev => [...prev, s]);
  const handleDeleteSupplier = (id: string) => setSuppliers(prev => prev.filter(s => s.id !== id));
  const handleAddBrand = (b: Brand) => setBrands(prev => [...prev, b]);
  const handleDeleteBrand = (id: string) => setBrands(prev => prev.filter(b => b.id !== id));
  const handleAddCategory = (c: Category) => setCategories(prev => [...prev, c]);
  const handleDeleteCategory = (id: string) => setCategories(prev => prev.filter(c => c.id !== id));
  const handleAddLocation = (loc: GeoLocation) => setLocations(prev => [...prev, loc]);
  const handleDeleteLocation = (id: string) => setLocations(prev => prev.filter(l => l.id !== id));
  const handleResetLocations = () => setLocations(MOCK_LOCATIONS);
  const handleAddUser = (u: SystemUser) => setUsers(prev => [...prev, u]);
  const handleUpdateUser = (u: SystemUser) => setUsers(prev => prev.map(usr => usr.id === u.id ? u : usr));
  const handleDeleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  const handleAddBankAccount = (b: BankAccount) => setBankAccounts(prev => [...prev, b]);
  const handleUpdateBankAccount = (b: BankAccount) => setBankAccounts(prev => prev.map(bk => bk.id === b.id ? b : bk));
  const handleDeleteBankAccount = (id: string) => setBankAccounts(prev => prev.filter(b => b.id !== id));
  
  // NEW: Update Wallet Balance AND Record Cash Movement
  const handleUpdateClientBalance = (clientId: string, amountChange: number, reason: string, paymentMethod: any, accountId?: string) => {
      // Find client name before update for the record concept
      const client = clients.find(c => c.id === clientId);
      const clientName = client ? client.name : 'CLIENTE';

      setClients(prev => prev.map(c => c.id === clientId ? { ...c, digitalBalance: c.digitalBalance + amountChange } : c));
      
      const type = amountChange > 0 ? 'Ingreso' : 'Egreso';
      const absAmount = Math.abs(amountChange);
      
      const movement: CashMovement = {
          id: 'M-WALLET-' + Date.now(),
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
      }
  };

  const handleAddMovement = (m: CashMovement) => setCashMovements(prev => [m, ...prev]);
  const handleAddQuotation = (q: Quotation) => setQuotations(prev => [q, ...prev]);
  const handleDeleteQuotation = (id: string) => setQuotations(prev => prev.filter(q => q.id !== id));
  const handleLoadQuotation = (q: Quotation) => {
      setCart(q.items);
      if (q.clientName) {
          const c = clients.find(cl => cl.name === q.clientName);
          if (c) setPosClient(c);
      }
      setCurrentView(ViewState.POS);
  };
  const handleAddPresale = (p: Presale) => setPresales(prev => [p, ...prev]);
  const handleDeletePresale = (id: string) => setPresales(prev => prev.filter(p => p.id !== id));
  const handleLoadPresale = (p: Presale) => { alert("Procesando entrega de preventa " + p.id); };
  const handleProcessCreditNote = (originalSaleId: string, itemsToReturn: { itemId: string, quantity: number }[], totalRefund: number, breakdown: PaymentBreakdown, detailedRefunds?: any[]) => {
      alert("Nota de crédito procesada por S/ " + totalRefund);
  };
  const handleProcessInventorySession = (s: InventoryHistorySession) => setInventoryHistory(prev => [s, ...prev]);
  const handleCloneBranch = (sourceId: string, newName: string) => {
      const newBranch: Branch = { id: 'BR-' + Date.now(), name: newName, address: '', isMain: false };
      setBranches(prev => [...prev, newBranch]);
  };
  const handleSwitchBranch = (id: string) => setCurrentBranchId(id);
  const handleAddBranch = (name: string, address: string, phone: string) => setBranches(prev => [...prev, { id: 'BR-' + Date.now(), name, address, phone, isMain: false }]);
  const handleUpdateBranch = (b: Branch) => setBranches(prev => prev.map(br => br.id === b.id ? b : br));
  const handleDeleteBranch = (id: string) => setBranches(prev => prev.filter(b => b.id !== id));
  const handleAddTenant = (t: Tenant) => setTenants(prev => [...prev, t]);
  const handleUpdateTenant = (id: string, updates: Partial<Tenant>) => setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const handleDeleteTenant = (id: string) => setTenants(prev => prev.filter(t => t.id !== id));
  const handleResetTenantData = (id: string) => alert("Datos reseteados para tenant " + id);
  const handleSyncDownload = (data: any) => {
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
      onNavigate={setCurrentView}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
      session={session}
      onLogout={handleLogout}
      isSyncEnabled={isSyncEnabled}
      toggleSyncMode={() => setIsSyncEnabled(!isSyncEnabled)}
      branches={branches}
      currentBranchId={currentBranchId}
      onSwitchBranch={handleSwitchBranch}
      onCreateBranch={(name, addr) => handleAddBranch(name, addr, '')}
    >
      {currentView === ViewState.DASHBOARD && (
        <Dashboard onNavigate={setCurrentView} session={session} cashMovements={cashMovements} clients={clients} services={services} products={products} navStructure={navStructure} />
      )}
      
      {currentView === ViewState.POS && (
        <SalesModule products={products} clients={clients} categories={categories} purchasesHistory={purchases} stockMovements={stockMovements} bankAccounts={bankAccounts} locations={locations} onAddClient={handleAddClient} onProcessSale={handleProcessSale} cart={cart} setCart={setCart} client={posClient} setClient={setPosClient} quotations={quotations} onLoadQuotation={handleLoadQuotation} onAddQuotation={handleAddQuotation} onAddPresale={handleAddPresale} systemBaseCurrency={baseCurrency} branches={branches} currentBranchId={currentBranchId} onNavigate={setCurrentView} onUpdateClientBalance={handleUpdateClientBalance} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.ACCOUNTS_RECEIVABLE && (
        <AccountsReceivableModule clients={clients} salesHistory={sales} bankAccounts={bankAccounts} onRegisterPayment={handleRegisterPaymentReceivable} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.ACCOUNTS_PAYABLE && (
        <AccountsPayableModule suppliers={suppliers} purchasesHistory={purchases} bankAccounts={bankAccounts} onRegisterPayment={handleRegisterPaymentPayable} isCashBoxOpen={!!currentCashSession} />
      )}

      {currentView === ViewState.SERVICES && (
        <ServicesModule services={services} products={products} categories={categories} bankAccounts={bankAccounts} onAddService={handleAddService} onFinalizeService={handleFinalizeService} onMarkRepaired={handleMarkRepaired} clients={clients} onAddClient={handleAddClient} onOpenWhatsApp={(name, phone) => { window.open(`https://wa.me/${phone}`); }} locations={locations} currentBranchId={currentBranchId} />
      )}
      
      {currentView === ViewState.INVENTORY && (
        <InventoryModule products={products} brands={brands} categories={categories} onUpdateProduct={handleUpdateProduct} onAddProduct={handleAddProduct} onAddProducts={handleAddProducts} onDeleteProduct={handleDeleteProduct} onNavigate={setCurrentView} salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} />
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
        <WhatsAppModule clients={clients} onAddClient={handleAddClient} products={products} chats={chats} setChats={setChats} currentUser={session.user.fullName} onNavigate={setCurrentView} crmDb={crmDb} setCrmDb={setCrmDb} crmStages={crmStages} setCrmStages={setCrmStages} onRegisterClientFromCrm={handleRegisterFromCRM} targetChatPhone={targetChatPhone} onClearTargetChat={() => setTargetChatPhone(null)} />
      </div>

      {currentView === ViewState.BROADCAST && (
        <BroadcastModule crmDb={crmDb} crmStages={crmStages} />
      )}

      {currentView === ViewState.CRM && (
        <CrmModule crmDb={crmDb} setCrmDb={setCrmDb} stages={crmStages} onNavigate={setCurrentView} onOpenChat={(phone) => { setTargetChatPhone(phone); setCurrentView(ViewState.WHATSAPP); }} />
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
      {currentView === ViewState.HISTORY_QUERIES && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='ventas' products={products} />}
      {currentView === ViewState.PURCHASES_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='compras' products={products} />}
      {currentView === ViewState.INGRESOS_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='ingresos' products={products} />}
      {currentView === ViewState.EGRESOS_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='egresos' products={products} />}
      {currentView === ViewState.PRODUCT_HISTORY_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='historial_producto' products={products} />}
      {currentView === ViewState.KARDEX_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='kardex' products={products} />}
      {currentView === ViewState.CREDIT_NOTE_HISTORY && <HistoryQueries salesHistory={sales} purchasesHistory={purchases} stockMovements={stockMovements} cashMovements={cashMovements} initialTab='notas_credito' products={products} />}
      {currentView === ViewState.LOCATIONS && <LocationsModule locations={locations} onAddLocation={handleAddLocation} onDeleteLocation={handleDeleteLocation} onResetLocations={handleResetLocations} />}
      {currentView === ViewState.USER_PRIVILEGES && <UserPrivilegesModule users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
      {currentView === ViewState.CREDIT_NOTE && <CreditNoteModule salesHistory={sales} onProcessCreditNote={handleProcessCreditNote} bankAccounts={bankAccounts} />}
      {currentView === ViewState.QUOTATIONS && <QuotationModule quotations={quotations} onLoadQuotation={handleLoadQuotation} onDeleteQuotation={handleDeleteQuotation} />}
      {currentView === ViewState.PRESALES && <PresaleModule presales={presales} onLoadPresale={handleLoadPresale} onDeletePresale={handleDeletePresale} products={products} clients={clients} categories={categories} purchasesHistory={purchases} stockMovements={stockMovements} bankAccounts={bankAccounts} locations={locations} onAddClient={handleAddClient} onAddPresale={handleAddPresale} systemBaseCurrency={baseCurrency} branches={branches} currentBranchId={currentBranchId} quotations={quotations} onAddQuotation={handleAddQuotation} />}
      {currentView === ViewState.DATABASE_CONFIG && <DatabaseModule isSyncEnabled={isSyncEnabled} data={{ products, clients, movements: cashMovements, sales, services, suppliers, brands, categories, bankAccounts }} onSyncDownload={handleSyncDownload} />}
      {currentView === ViewState.CONFIG_PRINTER && <PrintConfigModule />}
      {currentView === ViewState.MEDIA_EDITOR && <MediaEditorModule onUpdateHeroImage={() => {}} onUpdateFeatureImage={() => {}} />}
      {currentView === ViewState.SUPER_ADMIN_DASHBOARD && <SuperAdminModule tenants={tenants} onAddTenant={handleAddTenant} onUpdateTenant={handleUpdateTenant} onDeleteTenant={handleDeleteTenant} onResetTenantData={handleResetTenantData} />}
      {currentView === ViewState.CASH_BOX_HISTORY && <CashBoxHistoryModule sessions={cashBoxSessions} bankAccounts={bankAccounts} />}
      {currentView === ViewState.BANK_ACCOUNTS && <BankAccountsModule bankAccounts={bankAccounts} onAddBankAccount={handleAddBankAccount} onUpdateBankAccount={handleUpdateBankAccount} onDeleteBankAccount={handleDeleteBankAccount} onUniversalTransfer={handleUniversalTransfer} />}
      {currentView === ViewState.BANK_HISTORY && <BankHistoryModule cashMovements={cashMovements} bankAccounts={bankAccounts} />}
      {currentView === ViewState.COMPANY_PROFILE && <CompanyProfileModule companyName={companyName} onUpdateCompanyName={setCompanyName} companyLogo={companyLogo} onUpdateLogo={setCompanyLogo} baseCurrency={baseCurrency} onUpdateBaseCurrency={setBaseCurrency} />}
      {currentView === ViewState.SYSTEM_DIAGNOSTICS && <SystemDiagnosticsModule products={products} cashMovements={cashMovements} stockMovements={stockMovements} onAddCashMovement={handleAddMovement} onAddProduct={handleAddProduct} onProcessSale={handleProcessSale} onProcessPurchase={handleProcessPurchase} onProcessCreditNote={handleProcessCreditNote} onAddService={handleAddService} currentBranchId={currentBranchId} />}
      {currentView === ViewState.GATEWAY_CONFIG && <GatewayConfigModule />}
      {currentView === ViewState.BRANCH_MANAGEMENT && <BranchManagementModule branches={branches} onAddBranch={handleAddBranch} onUpdateBranch={handleUpdateBranch} onDeleteBranch={handleDeleteBranch} onCloneBranch={handleCloneBranch} onSwitchBranch={handleSwitchBranch} currentBranchId={currentBranchId} />}
      {currentView === ViewState.WAREHOUSE_TRANSFER && <WarehouseTransferModule branches={branches} currentBranchId={currentBranchId} products={products} onProcessTransfer={(t) => setWarehouseTransfers(prev => [t, ...prev])} onConfirmTransfer={(t) => {
              const updated = { ...t, status: 'COMPLETED' as const };
              setWarehouseTransfers(prev => prev.map(tr => tr.id === t.id ? updated : tr));
              const newMoves: StockMovement[] = t.items.map(i => {
                  const prod = products.find(p => p.id === i.productId);
                  const currentStock = (prod?.stock || 0) + i.quantity; // Note: using closure product, ideally should batch update products too
                  return { id: 'MOV-' + Date.now() + Math.random(), branchId: currentBranchId, date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), productId: i.productId, productName: i.productName, type: 'ENTRADA', quantity: i.quantity, currentStock: currentStock, reference: `TRASPASO RECIBIDO #${t.id}`, user: session?.user.fullName || 'Admin' };
              });
              setStockMovements(prev => [...newMoves, ...prev]);
              
              // Also update products stock
              setProducts(prevProds => {
                  const newProds = [...prevProds];
                  t.items.forEach(i => {
                      const idx = newProds.findIndex(p => p.id === i.productId);
                      if (idx !== -1) {
                          newProds[idx] = { ...newProds[idx], stock: newProds[idx].stock + i.quantity };
                      }
                  });
                  return newProds;
              });

          }} onRejectTransfer={(t) => setWarehouseTransfers(prev => prev.map(tr => tr.id === t.id ? { ...tr, status: 'REJECTED' } : tr))} history={warehouseTransfers} quotations={presales} />}
      {currentView === ViewState.CASH_TRANSFERS && <CashTransferModule bankAccounts={bankAccounts} movements={cashMovements} requests={cashTransferRequests} branches={branches} currentBranchId={currentBranchId} onInitiateTransfer={(from, to, amount, rate, ref, op, targetBranchId) => {
              const req: CashTransferRequest = { id: 'REQ-' + Date.now(), date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), fromBranchId: currentBranchId, fromBranchName: branches.find(b => b.id === currentBranchId)?.name || '', toBranchId: targetBranchId, toBranchName: branches.find(b => b.id === targetBranchId)?.name || '', amount, currency: baseCurrency, status: 'PENDING', user: session?.user.fullName || 'Admin', notes: ref };
              setCashTransferRequests(prev => [req, ...prev]);
              handleAddMovement({ id: 'M-' + Date.now(), branchId: currentBranchId, date: req.date, time: req.time, type: 'Egreso', paymentMethod: 'Efectivo', concept: `TRASPASO A ${req.toBranchName}`, amount: amount, user: session?.user.fullName || 'Admin', category: 'TRANSFERENCIA SALIENTE', financialType: 'Variable' });
          }} onConfirmTransfer={(req) => {
              setCashTransferRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'COMPLETED' } : r));
              handleAddMovement({ id: 'M-' + Date.now(), branchId: currentBranchId, date: new Date().toLocaleDateString('es-PE'), time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }), type: 'Ingreso', paymentMethod: 'Efectivo', concept: `RECEPCIÓN DE ${req.fromBranchName}`, amount: req.amount, user: session?.user.fullName || 'Admin', category: 'TRANSFERENCIA ENTRANTE', financialType: 'Variable' });
          }} systemBaseCurrency={baseCurrency} isCashBoxOpen={!!currentCashSession} />}
      {currentView === ViewState.INVENTORY_ADJUSTMENT && <InventoryAdjustmentModule products={products} salesHistory={sales} onProcessInventorySession={handleProcessInventorySession} sessionUser={session.user.fullName} history={inventoryHistory} />}
      {currentView === ViewState.AI_ASSISTANT && session && <AiAssistantModule sessionUser={session.user.fullName} products={products} />}
    </Layout>
  );
};

export default App;
