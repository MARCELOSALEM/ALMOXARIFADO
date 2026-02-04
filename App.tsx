
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  FileText, 
  AlertTriangle,
  Plus,
  Minus,
  TrendingUp,
  Download,
  Search,
  CheckCircle2,
  BrainCircuit,
  Anchor,
  Trash2,
  PlusCircle,
  X,
  History,
  Ship
} from 'lucide-react';
import { InventoryItem, Movement, MovementType, ViewState } from './types.ts';
import { generateInventoryPDF, generateMovementPDF } from './services/pdfService.ts';
import { getStockInsights } from './services/geminiService.ts';

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Coletes Salva-vidas Pro', category: 'Segurança', quantity: 45, unit: 'un', minLevel: 20, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Boia Circular Rígida', category: 'Salvamento', quantity: 8, unit: 'un', minLevel: 10, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Sinalizador de Fumaça', category: 'Sinalização', quantity: 15, unit: 'un', minLevel: 5, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Kit Primeiros Socorros Marítimo', category: 'Médico', quantity: 3, unit: 'un', minLevel: 5, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Balsa Autoinflável 12p', category: 'Salvamento', quantity: 2, unit: 'un', minLevel: 2, lastUpdated: new Date().toISOString() },
];

const INITIAL_MOVEMENTS: Movement[] = [
  { id: 'm1', itemId: '1', itemName: 'Coletes Salva-vidas Pro', type: MovementType.IN, quantity: 50, destination: 'Doca Principal', date: '2023-10-20T10:00:00', user: 'Admin' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('seasafety_inv');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });
  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('seasafety_mov');
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [modalType, setModalType] = useState<MovementType>(MovementType.IN);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [movementFormData, setMovementFormData] = useState({ itemId: '', quantity: 1, destination: '' });
  const [newItemFormData, setNewItemFormData] = useState({ name: '', category: '', quantity: 0, unit: 'un', minLevel: 5 });

  useEffect(() => {
    localStorage.setItem('seasafety_inv', JSON.stringify(inventory));
    localStorage.setItem('seasafety_mov', JSON.stringify(movements));
  }, [inventory, movements]);

  const criticalItems = useMemo(() => inventory.filter(item => item.quantity <= item.minLevel), [inventory]);
  const totalItems = useMemo(() => inventory.reduce((acc, curr) => acc + curr.quantity, 0), [inventory]);

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === movementFormData.itemId);
    if (!item) return;

    if (modalType === MovementType.OUT && item.quantity < movementFormData.quantity) {
      alert('Estoque insuficiente para esta saída!');
      return;
    }

    const newQuantity = modalType === MovementType.IN 
      ? item.quantity + movementFormData.quantity 
      : item.quantity - movementFormData.quantity;

    const newMovement: Movement = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      itemName: item.name,
      type: modalType,
      quantity: movementFormData.quantity,
      destination: modalType === MovementType.OUT ? (movementFormData.destination || 'Indefinido') : 'Depósito Interno',
      date: new Date().toISOString(),
      user: 'Operador Logístico'
    };

    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity, lastUpdated: new Date().toISOString() } : i));
    setMovements(prev => [newMovement, ...prev]);
    setIsMovementModalOpen(false);
    setMovementFormData({ itemId: '', quantity: 1, destination: '' });
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...newItemFormData,
      lastUpdated: new Date().toISOString()
    };
    setInventory(prev => [...prev, newItem]);
    setIsNewItemModalOpen(false);
  };

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    const insight = await getStockInsights(inventory);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0F172A] text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="p-8 border-b border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3 group-hover:rotate-0 transition-transform">
            <Ship className="text-white" size={28} />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter text-white">SEA<span className="text-orange-500">SAFETY</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Logística Marítima</p>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Geral' },
            { id: 'inventory', icon: Package, label: 'Estoque de Materiais' },
            { id: 'movements', icon: History, label: 'Histórico Operacional' },
            { id: 'reports', icon: FileText, label: 'Relatórios & Exportação' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${view === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <item.icon size={22} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
            <button 
              onClick={fetchAiInsights}
              disabled={loadingAi}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white px-4 py-4 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 group"
            >
              <BrainCircuit className={loadingAi ? 'animate-spin' : 'group-hover:scale-110 transition-transform'} size={24} />
              <span className="font-bold">{loadingAi ? 'Consultando IA...' : 'Análise com IA'}</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-1 p-10">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-black text-[#1E293B] tracking-tight">
              {view === 'dashboard' && 'Visão Estratégica'}
              {view === 'inventory' && 'Inventário Geral'}
              {view === 'movements' && 'Movimentações'}
              {view === 'reports' && 'Exportação de Dados'}
            </h2>
            <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Sistema Operacional Ativo • {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="flex gap-4">
             <button 
              onClick={() => { setModalType(MovementType.IN); setIsMovementModalOpen(true); }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              <Plus size={20} /> Entrada
            </button>
            <button 
              onClick={() => { setModalType(MovementType.OUT); setIsMovementModalOpen(true); }}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              <Minus size={20} /> Saída
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard label="Total em Unidades" value={totalItems} icon={Package} color="bg-blue-500" />
              <StatCard label="Tipos de Materiais" value={inventory.length} icon={TrendingUp} color="bg-indigo-500" />
              <StatCard label="Itens em Alerta" value={criticalItems.length} icon={AlertTriangle} color="bg-rose-500" isAlert={criticalItems.length > 0} />
              <StatCard label="Saídas (30 dias)" value={movements.filter(m => m.type === MovementType.OUT).length} icon={ArrowLeftRight} color="bg-amber-500" />
            </div>

            {aiInsight && (
              <div className="bg-[#0F172A] rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <BrainCircuit className="text-indigo-400" size={24} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">IA de Logística Marítima</span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-xl leading-relaxed text-slate-200 whitespace-pre-wrap font-medium">{aiInsight}</p>
                  </div>
                </div>
                <Anchor className="absolute -right-16 -bottom-16 opacity-5 text-white" size={320} />
              </div>
            )}
          </div>
        )}

        {/* Inventory View */}
        {view === 'inventory' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-50/50">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por material ou categoria..."
                  className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsNewItemModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all"
              >
                <PlusCircle size={20} /> Adicionar Novo Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Material de Segurança</th>
                    <th className="px-8 py-5">Categoria</th>
                    <th className="px-8 py-5">Saldo</th>
                    <th className="px-8 py-5">Mínimo</th>
                    <th className="px-8 py-5">Status Operacional</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 text-lg">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">ID: {item.id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight">{item.category}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`text-xl font-black ${item.quantity <= item.minLevel ? 'text-rose-600' : 'text-slate-800'}`}>
                          {item.quantity} <span className="text-xs font-bold text-slate-400 uppercase">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-bold">{item.minLevel} {item.unit}</td>
                      <td className="px-8 py-6">
                        {item.quantity <= item.minLevel ? (
                          <div className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter ring-1 ring-rose-200 animate-pulse">
                            <AlertTriangle size={16} /> Reposição Imediata
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter ring-1 ring-emerald-200">
                            <CheckCircle2 size={16} /> Nível Seguro
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setItemToDelete(item)}
                          className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Movements View */}
        {view === 'movements' && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Data e Hora</th>
                    <th className="px-8 py-5">Operação</th>
                    <th className="px-8 py-5">Material</th>
                    <th className="px-8 py-5">Volume</th>
                    <th className="px-8 py-5">Destino / Local</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 text-slate-500 font-medium text-sm">
                        {new Date(m.date).toLocaleDateString('pt-BR')} <br/>
                        <span className="text-[10px] text-slate-400">{new Date(m.date).toLocaleTimeString('pt-BR')}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] ring-1 ${m.type === MovementType.IN ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-800">{m.itemName}</td>
                      <td className="px-8 py-6 font-black text-slate-700">{m.quantity} un</td>
                      <td className="px-8 py-6 text-slate-500 font-medium italic text-sm">{m.destination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports View */}
        {view === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
            <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Package size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">Relatório de Inventário</h3>
              <p className="text-slate-500 mb-8 font-medium">Gere um PDF completo com todos os materiais, níveis de estoque e alertas de reposição atualizados.</p>
              <button 
                onClick={() => generateInventoryPDF(inventory, 'Inventário SEASAFETY')}
                className="w-full py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download size={20} /> Baixar Inventário (.pdf)
              </button>
            </div>
            <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ArrowLeftRight size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">Log de Movimentações</h3>
              <p className="text-slate-500 mb-8 font-medium">Exporte o histórico completo de entradas e saídas para auditorias de segurança e conformidade.</p>
              <button 
                onClick={() => generateMovementPDF(movements)}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20"
              >
                <Download size={20} /> Baixar Movimentações (.pdf)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
             <div className={`p-8 flex justify-between items-center text-white ${modalType === MovementType.IN ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  {modalType === MovementType.IN ? <Plus size={28} /> : <Minus size={28} />}
                  Registrar {modalType === MovementType.IN ? 'Entrada' : 'Saída'}
                </h3>
                <p className="text-white/70 text-sm font-bold mt-1">Atualização de fluxo operacional</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={32} /></button>
            </div>
            <form onSubmit={handleMovement} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Selecionar Material</label>
                <select 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                  value={movementFormData.itemId}
                  onChange={(e) => setMovementFormData({...movementFormData, itemId: e.target.value})}
                >
                  <option value="">Clique para selecionar...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Atual: {item.quantity})</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantidade</label>
                  <input 
                    type="number" required min="1"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    value={movementFormData.quantity}
                    onChange={(e) => setMovementFormData({...movementFormData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Destino / Finalidade</label>
                  <input 
                    type="text" 
                    required={modalType === MovementType.OUT}
                    disabled={modalType === MovementType.IN}
                    placeholder={modalType === MovementType.IN ? "Depósito Interno" : "Ex: Barco Alpha, Cais 4..."}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                    value={modalType === MovementType.IN ? "Depósito Interno" : movementFormData.destination}
                    onChange={(e) => setMovementFormData({...movementFormData, destination: e.target.value})}
                  />
                </div>
              </div>
              
              <button type="submit" className={`w-full py-5 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${modalType === MovementType.IN ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>
                Confirmar Operação
              </button>
            </form>
          </div>
        </div>
      )}

      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 bg-orange-600 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black flex items-center gap-3"><PlusCircle size={28} /> Novo Material</h3>
              <button onClick={() => setIsNewItemModalOpen(false)}><X size={32} /></button>
            </div>
            <form onSubmit={handleAddNewItem} className="p-10 space-y-5">
              <input type="text" required placeholder="Nome do Equipamento (Ex: Colete G)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold outline-none focus:border-orange-500" onChange={(e) => setNewItemFormData({...newItemFormData, name: e.target.value})} />
              <input type="text" required placeholder="Categoria (Ex: Salvamento, Médico...)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold outline-none focus:border-orange-500" onChange={(e) => setNewItemFormData({...newItemFormData, category: e.target.value})} />
              <div className="grid grid-cols-2 gap-5">
                <input type="number" required placeholder="Estoque Inicial" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold outline-none focus:border-orange-500" onChange={(e) => setNewItemFormData({...newItemFormData, quantity: parseInt(e.target.value)})} />
                <input type="number" required placeholder="Nível Mínimo" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold outline-none focus:border-orange-500" onChange={(e) => setNewItemFormData({...newItemFormData, minLevel: parseInt(e.target.value)})} />
              </div>
              <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-600/20">Cadastrar no Sistema</button>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#0F172A]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Excluir Item?</h3>
            <p className="text-slate-500 mb-8 font-medium">Você está prestes a remover <span className="text-slate-800 font-bold">"{itemToDelete.name}"</span> do inventário oficial.</p>
            <div className="flex gap-4">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Cancelar</button>
              <button onClick={() => { setInventory(prev => prev.filter(i => i.id !== itemToDelete.id)); setItemToDelete(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, isAlert = false }: any) => (
  <div className={`bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex items-start justify-between relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${isAlert ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`}>
    <div>
      <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-4xl font-black tracking-tighter ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg`}>
      <Icon size={28} />
    </div>
  </div>
);

export default App;
