import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit3, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../types';
import { fetchDataFromSupabase, syncDataToSupabase, deleteDataFromSupabase, subscribeToSupabaseChanges } from '../services/supabaseService';

export const AgendaModule: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [filterStatus, setFilterStatus] = useState<'TODAS' | 'PENDIENTE' | 'COMPLETADA'>('TODAS');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', notes: '', dueDate: new Date().toISOString().split('T')[0], priority: 'MEDIA' });

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const data = await fetchDataFromSupabase('tasks');
                setTasks(data || []);
            } catch (error) {
                console.error("Error loading tasks:", error);
            }
        };
        loadTasks();

        const subscription = subscribeToSupabaseChanges('tasks', (payload) => {
            loadTasks(); // Simple reload for now
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (!isAuthorized) {
        // ... (keep existing auth UI)
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-900 p-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm text-center">
                    <Lock className="mx-auto text-primary-600 mb-4" size={48} />
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">Acceso Restringido</h2>
                    <p className="text-slate-500 text-sm mb-6">Ingrese la clave para acceder a la agenda.</p>
                    <input 
                        type="password" 
                        className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-center text-lg font-mono tracking-widest mb-4"
                        placeholder="••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (password === '121190' ? setIsAuthorized(true) : alert('Clave incorrecta'))}
                    />
                    <button onClick={() => password === '121190' ? setIsAuthorized(true) : alert('Clave incorrecta')} className="w-full py-3 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all">Acceder</button>
                </div>
            </div>
        );
    }

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setNewTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = async () => {
        if (!newTask.title || !newTask.dueDate) return alert("Complete título y fecha");
        
        const taskToSave = {
            ...editingTask,
            ...newTask,
            status: editingTask ? editingTask.status : 'PENDIENTE',
            createdAt: editingTask ? editingTask.createdAt : new Date().toISOString()
        } as Task;

        try {
            await syncDataToSupabase('tasks', [taskToSave]);
            setNewTask({ title: '', notes: '', dueDate: new Date().toISOString().split('T')[0], priority: 'MEDIA' });
            setEditingTask(null);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving task:", error);
            alert("Error al guardar la tarea");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteDataFromSupabase('tasks', taskId);
        } catch (error) {
            console.error("Error deleting task:", error);
            alert("Error al eliminar la tarea");
        }
    };

    const filteredTasks = tasks.filter(t => (filterStatus === 'TODAS' || t.status === filterStatus));

    const priorityColors = {
        ALTA: 'border-l-4 border-l-red-500 bg-red-50/50',
        MEDIA: 'border-l-4 border-l-amber-500 bg-amber-50/50',
        BAJA: 'border-l-4 border-l-emerald-500 bg-emerald-50/50'
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 relative">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2"><Calendar className="text-primary-600"/> Agenda CRM</h1>
                <div className="flex items-center gap-2">
                    <select className="p-2 bg-white border rounded-xl text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                        <option value="TODAS">Todas</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="COMPLETADA">Completadas</option>
                    </select>
                    <button onClick={() => setIsAuthorized(false)} className="text-slate-400 hover:text-slate-600"><Unlock size={20}/></button>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-2">
                {filteredTasks.map(task => (
                    <div key={task.id} className={`bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-row items-center gap-2 ${priorityColors[task.priority as keyof typeof priorityColors] || ''}`}>
                        <div className="flex-grow min-w-0">
                            <h4 className={`font-bold text-sm truncate ${task.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</h4>
                            <p className="text-slate-500 text-[10px] truncate">{task.notes} • {task.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <select className="text-[10px] p-0.5 bg-slate-100 rounded w-16" value={task.status} onChange={e => syncDataToSupabase('tasks', [{...task, status: e.target.value as any}])}>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="EN_PROCESO">Proceso</option>
                                <option value="COMPLETADA">Hecho</option>
                            </select>
                            <select className="text-[10px] p-0.5 bg-slate-100 rounded w-12" value={task.priority} onChange={e => syncDataToSupabase('tasks', [{...task, priority: e.target.value as any}])}>
                                <option value="BAJA">Baja</option>
                                <option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option>
                            </select>
                            <button onClick={() => openEditModal(task)} className="text-blue-400"><Edit3 size={14}/></button>
                            <button onClick={() => setTaskToDelete(task.id)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Add Button */}
            <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700"><Plus size={24}/></button>

            {/* Task Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-xl">
                        <h3 className="font-black text-slate-800 dark:text-white mb-4">{editingTask ? "Editar Tarea" : "Nueva Tarea"}</h3>
                        <div className="flex flex-col gap-3">
                            <input type="text" placeholder="Título..." className="p-3 bg-slate-50 border rounded-xl" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                            
                            {/* Date Navigation */}
                            <div className="flex items-center gap-2 p-2 bg-slate-50 border rounded-xl">
                                <button type="button" onClick={() => {
                                    const d = new Date(newTask.dueDate!);
                                    d.setDate(d.getDate() - 1);
                                    setNewTask({...newTask, dueDate: d.toISOString().split('T')[0]});
                                }} className="p-2 bg-white rounded-lg border"><ChevronLeft size={16}/></button>
                                
                                <div className="flex-grow text-center text-sm font-bold text-slate-700">
                                    {new Date(newTask.dueDate!).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>

                                <button type="button" onClick={() => {
                                    const d = new Date(newTask.dueDate!);
                                    d.setDate(d.getDate() + 1);
                                    setNewTask({...newTask, dueDate: d.toISOString().split('T')[0]});
                                }} className="p-2 bg-white rounded-lg border"><ChevronRight size={16}/></button>
                                
                                <div className="relative">
                                    <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                                    <button type="button" className="p-2 bg-white rounded-lg border"><Calendar size={16}/></button>
                                </div>
                            </div>

                            <textarea placeholder="Detalles..." className="p-3 bg-slate-50 border rounded-xl h-24" value={newTask.notes} onChange={e => setNewTask({...newTask, notes: e.target.value})} />
                            <select className="p-3 bg-slate-50 border rounded-xl" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                <option value="BAJA">Baja</option>
                                <option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option>
                            </select>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="flex-grow p-3 bg-slate-100 rounded-xl">Cancelar</button>
                                <button onClick={handleSaveTask} className="flex-grow p-3 bg-primary-600 text-white rounded-xl">{editingTask ? "Guardar" : "Crear"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Deletion Confirmation */}
            {taskToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-xl text-center">
                        <h3 className="font-black text-slate-800 dark:text-white mb-4">¿Eliminar tarea?</h3>
                        <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setTaskToDelete(null)} className="flex-grow p-3 bg-slate-100 rounded-xl">Cancelar</button>
                            <button onClick={() => { handleDeleteTask(taskToDelete); setTaskToDelete(null); }} className="flex-grow p-3 bg-red-600 text-white rounded-xl">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
