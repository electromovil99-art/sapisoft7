
import React, { useState, useEffect } from 'react';
import { User, Shield, Check, Lock, Plus, Trash2, Edit2, Search, Users, Save, X, Key, LayoutGrid, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, CheckSquare, Square } from 'lucide-react';
import { SystemUser, UserRole } from '../types';

interface UserPrivilegesModuleProps {
    users: SystemUser[];
    onAddUser: (u: SystemUser) => void;
    onUpdateUser: (u: SystemUser) => void;
    onDeleteUser: (id: string) => void;
}

// Definición expandida y clara de los permisos
const PERMISSION_GROUPS = {
    'PUNTO DE VENTA (POS)': [
        { id: 'pos.access', label: 'Acceso al Módulo' },
        { id: 'pos.process_sale', label: 'Procesar Venta' },
        { id: 'pos.apply_discount', label: 'Aplicar Descuentos' },
        { id: 'pos.change_price', label: 'Modificar Precios Manualmente' },
        { id: 'pos.credit_sale', label: 'Autorizar Venta a Crédito' },
        { id: 'pos.void_ticket', label: 'Anular/Eliminar Tickets' }
    ],
    'ALMACÉN E INVENTARIO': [
        { id: 'inv.access', label: 'Ver Inventario' },
        { id: 'inv.create', label: 'Crear Productos' },
        { id: 'inv.edit', label: 'Editar Productos' },
        { id: 'inv.delete', label: 'Eliminar Productos' },
        { id: 'inv.stock_adjust', label: 'Ajuste Manual de Stock' },
        { id: 'inv.view_costs', label: 'Ver Costos de Compra' },
        { id: 'inv.transfers', label: 'Gestionar Transferencias' }
    ],
    'TESORERÍA (CAJA)': [
        { id: 'cash.access', label: 'Ver Módulo Caja' },
        { id: 'cash.open_close', label: 'Apertura y Cierre' },
        { id: 'cash.income', label: 'Registrar Ingresos Extras' },
        { id: 'cash.expense', label: 'Registrar Gastos/Egresos' },
        { id: 'bank.access', label: 'Ver Cuentas Bancarias' },
        { id: 'bank.manage', label: 'Gestionar Bancos' }
    ],
    'CRM Y TERCEROS': [
        { id: 'crm.access', label: 'Acceso CRM' },
        { id: 'cli.manage', label: 'Gestionar Clientes' },
        { id: 'cli.credit', label: 'Editar Línea Crédito' },
        { id: 'prov.manage', label: 'Gestionar Proveedores' }
    ],
    'REPORTES Y ANÁLISIS': [
        { id: 'rpt.sales', label: 'Ver Reporte Ventas' },
        { id: 'rpt.finance', label: 'Ver Reporte Financiero' },
        { id: 'rpt.inventory', label: 'Ver Auditoría Inventario' }
    ],
    'ADMINISTRACIÓN': [
        { id: 'admin.users', label: 'Gestionar Usuarios' },
        { id: 'admin.config', label: 'Configuración Sistema' },
        { id: 'admin.backup', label: 'Respaldo Base de Datos' }
    ]
};

export const UserPrivilegesModule: React.FC<UserPrivilegesModuleProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
    // Estado de selección y edición
    const [editingId, setEditingId] = useState<string | 'NEW' | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'CREDENTIALS' | 'PERMISSIONS'>('CREDENTIALS');
    
    // Estado del formulario
    const [formData, setFormData] = useState<Partial<SystemUser>>({
        fullName: '',
        username: '',
        password: '',
        role: 'VENDEDOR',
        permissions: [],
        active: true,
        companyName: '', 
        industry: 'RETAIL'
    });

    // Cargar datos al seleccionar un usuario
    useEffect(() => {
        if (editingId && editingId !== 'NEW') {
            const userToEdit = users.find(u => u.id === editingId);
            if (userToEdit) {
                setFormData({ ...userToEdit });
            }
            setActiveTab('CREDENTIALS');
        } else if (editingId === 'NEW') {
            // Resetear form para nuevo usuario
            setFormData({
                fullName: '',
                username: '',
                password: '',
                role: 'VENDEDOR',
                permissions: [], // Empezar vacío para vendedor
                active: true,
                companyName: users[0]?.companyName || 'Mi Empresa',
                industry: users[0]?.industry || 'RETAIL'
            });
            setActiveTab('CREDENTIALS');
        }
    }, [editingId, users]);

    const filteredUsers = users.filter(u => 
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = () => {
        if (!formData.username || !formData.fullName || (!formData.password && editingId === 'NEW')) {
            alert("Por favor complete las credenciales obligatorias.");
            setActiveTab('CREDENTIALS');
            return;
        }

        // Lógica de permisos para Admin
        const finalPermissions = (formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN')
            ? ['ALL'] 
            : formData.permissions || [];

        if (editingId === 'NEW') {
            const newUser: SystemUser = {
                id: `USR-${Date.now()}`,
                fullName: formData.fullName,
                username: formData.username.toUpperCase(),
                password: formData.password || '123456',
                role: formData.role as UserRole,
                active: formData.active ?? true,
                permissions: finalPermissions,
                companyName: formData.companyName || 'SapiSoft',
                industry: formData.industry as any
            };
            onAddUser(newUser);
        } else if (editingId) {
            const updatedUser: SystemUser = {
                ...formData as SystemUser,
                username: formData.username.toUpperCase(),
                permissions: finalPermissions
            };
            onUpdateUser(updatedUser);
        }
        
        setEditingId(null);
    };

    const togglePermission = (permId: string) => {
        if (formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN') return; 

        const currentPerms = formData.permissions || [];
        if (currentPerms.includes(permId)) {
            setFormData({ ...formData, permissions: currentPerms.filter(p => p !== permId) });
        } else {
            setFormData({ ...formData, permissions: [...currentPerms, permId] });
        }
    };

    const toggleGroupPermissions = (permsInGroup: {id: string}[]) => {
        if (formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN') return;

        const currentPerms = formData.permissions || [];
        const groupIds = permsInGroup.map(p => p.id);
        
        // Verificar si todos están marcados
        const allActive = groupIds.every(id => currentPerms.includes(id));

        if (allActive) {
            // Desactivar todos
            setFormData({ ...formData, permissions: currentPerms.filter(p => !groupIds.includes(p)) });
        } else {
            // Activar todos (agregar los que falten)
            const newPerms = [...currentPerms];
            groupIds.forEach(id => {
                if (!newPerms.includes(id)) newPerms.push(id);
            });
            setFormData({ ...formData, permissions: newPerms });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("¿Estás seguro de eliminar este usuario permanentemente?")) {
            onDeleteUser(id);
            if (editingId === id) setEditingId(null);
        }
    };

    // Helper para verificar si un grupo está completamente activo
    const isGroupActive = (permsInGroup: {id: string}[]) => {
        if (!formData.permissions) return false;
        return permsInGroup.every(p => formData.permissions!.includes(p.id));
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500">
            
            {/* SIDEBAR LISTA USUARIOS */}
            <div className="w-80 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2 mb-4">
                        <Users size={20} className="text-primary-600"/> Equipo
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                        <input 
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none focus:border-primary-500 transition-colors" 
                            placeholder="Buscar usuario..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredUsers.map(user => (
                        <button 
                            key={user.id} 
                            onClick={() => setEditingId(user.id)} 
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all group ${editingId === user.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 border' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${editingId === user.id ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-600'}`}>
                                {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className={`font-bold text-xs truncate ${editingId === user.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>{user.fullName}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{user.role}</div>
                            </div>
                            {user.role === 'ADMIN' && <Shield size={12} className="text-amber-500"/>}
                        </button>
                    ))}
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button 
                        onClick={() => setEditingId('NEW')} 
                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={16}/> Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* AREA PRINCIPAL */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden relative">
                {editingId ? (
                    <>
                        {/* HEADER */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 dark:bg-slate-900/50 gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    {editingId === 'NEW' ? <User size={24} className="text-primary-500"/> : <Edit2 size={24} className="text-primary-500"/>}
                                    {editingId === 'NEW' ? 'Crear Nuevo Usuario' : `Editando: ${formData.fullName}`}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {editingId === 'NEW' ? 'Defina credenciales y permisos' : `ID: ${formData.id}`}
                                </p>
                            </div>
                            
                            <div className="flex gap-2">
                                {editingId !== 'NEW' && (
                                    <button onClick={() => handleDelete(String(editingId))} className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-transparent hover:border-red-100 transition-all font-bold text-[10px] uppercase flex items-center gap-2">
                                        <Trash2 size={16}/> Eliminar
                                    </button>
                                )}
                                <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                    <X size={20}/>
                                </button>
                            </div>
                        </div>

                        {/* TABS NAVEGACIÓN */}
                        <div className="px-8 pt-6 flex gap-1 border-b border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={() => setActiveTab('CREDENTIALS')}
                                className={`px-6 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'CREDENTIALS' ? 'bg-white dark:bg-slate-800 text-primary-600 border-x border-t border-slate-100 dark:border-slate-700 -mb-px z-10' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Credenciales
                            </button>
                            <button 
                                onClick={() => setActiveTab('PERMISSIONS')}
                                className={`px-6 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'PERMISSIONS' ? 'bg-white dark:bg-slate-800 text-primary-600 border-x border-t border-slate-100 dark:border-slate-700 -mb-px z-10' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Matriz de Permisos
                            </button>
                        </div>

                        {/* CONTENIDO PESTAÑAS */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            
                            {/* PESTAÑA 1: CREDENCIALES */}
                            {activeTab === 'CREDENTIALS' && (
                                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nombre Completo</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-primary-500 transition-all"
                                                    value={formData.fullName}
                                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                                    placeholder="Ej. Juan Pérez"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Usuario (Login)</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-primary-500 transition-all uppercase"
                                                    value={formData.username}
                                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                                    placeholder="JUANP"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Contraseña</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-primary-500 transition-all"
                                                        value={formData.password}
                                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                                        placeholder="••••••"
                                                    />
                                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                                </div>
                                            </div>

                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Rol del Sistema</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button 
                                                        onClick={() => setFormData({...formData, role: 'VENDEDOR'})}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.role === 'VENDEDOR' ? 'border-primary-500 bg-white dark:bg-slate-800 shadow-md' : 'border-transparent bg-slate-200 dark:bg-slate-700 opacity-60'}`}
                                                    >
                                                        <span className="block font-black text-sm uppercase">Vendedor</span>
                                                        <span className="text-[10px] text-slate-500">Permisos configurables</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setFormData({...formData, role: 'ADMIN'})}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.role === 'ADMIN' ? 'border-amber-500 bg-white dark:bg-slate-800 shadow-md' : 'border-transparent bg-slate-200 dark:bg-slate-700 opacity-60'}`}
                                                    >
                                                        <span className="block font-black text-sm uppercase">Administrador</span>
                                                        <span className="text-[10px] text-slate-500">Acceso Total (Full)</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="col-span-2 pt-2">
                                                <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors bg-slate-100/50">
                                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.active ? 'translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-white block">Usuario Activo</span>
                                                        <span className="text-[10px] text-slate-400">Permitir acceso al sistema</span>
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={formData.active} 
                                                        onChange={e => setFormData({...formData, active: e.target.checked})}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 2: MATRIZ DE PERMISOS */}
                            {activeTab === 'PERMISSIONS' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {(formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN') ? (
                                        <div className="p-10 text-center border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem]">
                                            <Shield size={64} className="mx-auto text-amber-500 mb-4"/>
                                            <h3 className="text-xl font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">Acceso Total Habilitado</h3>
                                            <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mt-2 max-w-md mx-auto">
                                                Los usuarios con rol de <strong>ADMINISTRADOR</strong> tienen acceso irrestricto a todos los módulos. No es necesario configurar permisos individuales.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {Object.entries(PERMISSION_GROUPS).map(([category, perms]) => (
                                                <div key={category} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                                                    {/* Header Grupo */}
                                                    <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                        <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{category}</h4>
                                                        <button 
                                                            onClick={() => toggleGroupPermissions(perms)}
                                                            className="text-[9px] font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            {isGroupActive(perms) ? 'Desactivar Todo' : 'Activar Todo'}
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Lista Permisos */}
                                                    <div className="p-3 space-y-1">
                                                        {perms.map(p => {
                                                            const isActive = formData.permissions?.includes(p.id);
                                                            return (
                                                                <div 
                                                                    key={p.id} 
                                                                    onClick={() => togglePermission(p.id)}
                                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-white border-primary-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-200/50'}`}
                                                                >
                                                                    <span className={`text-[11px] font-bold uppercase ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                                                        {p.label}
                                                                    </span>
                                                                    
                                                                    {/* Switch Visual */}
                                                                    <div className={`w-9 h-5 rounded-full relative transition-colors ${isActive ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'translate-x-4' : ''}`}></div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0 z-20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden md:block">
                                {formData.role === 'ADMIN' ? 'Usuario con privilegios totales' : `Permisos asignados: ${formData.permissions?.length || 0}`}
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button 
                                    onClick={() => setEditingId(null)} 
                                    className="flex-1 md:flex-none px-8 py-3.5 rounded-xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    className="flex-1 md:flex-none px-10 py-3.5 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={16}/> Guardar Usuario
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 p-10 text-center opacity-60">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                            <Shield size={48} strokeWidth={1.5}/>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Gestión de Accesos</h3>
                        <p className="text-xs font-bold mt-2 max-w-xs leading-relaxed">Seleccione un usuario de la lista para editar sus permisos o cree uno nuevo para comenzar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default UserPrivilegesModule;
