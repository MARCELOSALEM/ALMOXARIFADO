
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
  XCircle,
  BrainCircuit,
  Anchor,
  Trash2,
  PlusCircle
} from 'lucide-react';
import { InventoryItem, Movement, MovementType, ViewState } from './types';
import { generateInventoryPDF, generateMovementPDF } from './services/pdfService';
import { getStockInsights } from './services/geminiService';

// Initial Mock Data
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Coletes Salva-vidas Pro', category: 'Segurança', quantity: 45, unit: 'un', minLevel: 20, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Boia Circular Rígida', category: 'Salvamento', quantity: 8, unit: 'un', minLevel: 10, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Sinalizador de Fumaça', category: 'Sinalização', quantity: 15, unit: 'un', minLevel: 5, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Kit Primeiros Socorros Marítimo', category: 'Médico', quantity: 3, unit: 'un', minLevel: 5, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Balsa Autoinflável 12p', category: 'Salvamento', quantity: 2, unit: 'un', minLevel: 2, lastUpdated: new Date().toISOString() },
];

const INITIAL_MOVEMENTS: Movement[] = [
  { id: 'm1', itemId: '1', itemName: 'Coletes Salva-vidas Pro', type: MovementType.IN, quantity: 50, destination: 'Doca Principal', date: '2023-10-20T10:00:00', user: 'Logística' },
  { id: 'm2', itemId: '1', itemName: 'Coletes Salva-vidas Pro', type: MovementType.OUT, quantity: 5, destination: 'Embarcação Alpha', date: '2023-10-21T14:30:00', user: 'Logística' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [movements, setMovements] = useState<Movement[]>(INITIAL_MOVEMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals visibility
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  
  const [modalType, setModalType] = useState<MovementType>(MovementType.IN);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Form States
  const [movementFormData, setMovementFormData] = useState({
    itemId: '',
    quantity: 0,
    destination: ''
  });

  const [newItemFormData, setNewItemFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'un',
    minLevel: 0
  });

  const criticalItems = useMemo(() => inventory.filter(item => item.quantity <= item.minLevel), [inventory]);
  const totalStockValue = useMemo(() => inventory.reduce((acc, curr) => acc + curr.quantity, 0), [inventory]);

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === movementFormData.itemId);
    if (!item) return;

    if (modalType === MovementType.OUT && item.quantity < movementFormData.quantity) {
      alert('Estoque insuficiente!');
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
      destination: modalType === MovementType.OUT ? movementFormData.destination : 'Entrada em Depósito',
      date: new Date().toISOString(),
      user: 'Logística'
    };

    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity, lastUpdated: new Date().toISOString() } : i));
    setMovements(prev => [newMovement, ...prev]);
    setIsMovementModalOpen(false);
    setMovementFormData({ itemId: '', quantity: 0, destination: '' });
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemFormData.name,
      category: newItemFormData.category,
      quantity: newItemFormData.quantity,
      unit: newItemFormData.unit,
      minLevel: newItemFormData.minLevel,
      lastUpdated: new Date().toISOString()
    };

    setInventory(prev => [...prev, newItem]);
    
    // Register the initial stock as an "IN" movement if quantity > 0
    if (newItem.quantity > 0) {
      const initialMovement: Movement = {
        id: Math.random().toString(36).substr(2, 9),
        itemId: newItem.id,
        itemName: newItem.name,
        type: MovementType.IN,
        quantity: newItem.quantity,
        destination: 'Estoque Inicial',
        date: new Date().toISOString(),
        user: 'Logística'
      };
      setMovements(prev => [initialMovement, ...prev]);
    }

    setIsNewItemModalOpen(false);
    setNewItemFormData({ name: '', category: '', quantity: 0, unit: 'un', minLevel: 0 });
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    setInventory(prev => prev.filter(i => i.id !== itemToDelete.id));
    // Optionally remove movements or keep them for history. 
    // Usually, we keep history but the item is "soft deleted" or just removed from active inventory.
    setItemToDelete(null);
  };

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    const insight = await getStockInsights(inventory);
    setAiInsight(insight || "Erro ao obter insights.");
    setLoadingAi(false);
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-20 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Anchor className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tighter text-orange-500">SEASAFETY</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setView('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Package size={20} />
            <span className="font-medium">Estoque</span>
          </button>
          <button 
            onClick={() => setView('movements')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'movements' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <ArrowLeftRight size={20} />
            <span className="font-medium">Movimentações</span>
          </button>
          <button 
            onClick={() => setView('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'reports' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Relatórios</span>
          </button>
        </nav>

        <div className="p-4 mt-auto">
            <button 
              onClick={fetchAiInsights}
              disabled={loadingAi}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-4 py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <BrainCircuit size={20} />
              <span>{loadingAi ? 'Analisando...' : 'IA Insights'}</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {view === 'dashboard' && 'Painel de Controle'}
              {view === 'inventory' && 'Materiais de Segurança'}
              {view === 'movements' && 'Log de Operações'}
              {view === 'reports' && 'Exportação e Relatórios'}
            </h1>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex gap-3">
             <button 
              onClick={() => { setModalType(MovementType.IN); setIsMovementModalOpen(true); }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95"
            >
              <Plus size={18} /> Entrada
            </button>
            <button 
              onClick={() => { setModalType(MovementType.OUT); setIsMovementModalOpen(true); }}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95"
            >
              <Minus size={18} /> Saída
            </button>
            {view === 'inventory' && (
              <button 
                onClick={() => setIsNewItemModalOpen(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95"
              >
                <PlusCircle size={18} /> Novo Material
              </button>
            )}
          </div>
        </header>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Total de Materiais</p>
                  <h3 className="text-3xl font-bold text-slate-800">{inventory.length}</h3>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Package size={24} /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Volume em Depósito</p>
                  <h3 className="text-3xl font-bold text-slate-800">{totalStockValue}</h3>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><TrendingUp size={24} /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Itens Críticos</p>
                  <h3 className="text-3xl font-bold text-rose-600">{criticalItems.length}</h3>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={24} /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Ações de Segurança</p>
                  <h3 className="text-3xl font-bold text-emerald-600">{movements.length}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowLeftRight size={24} /></div>
              </div>
            </div>

            {/* AI Insights Card */}
            {aiInsight && (
              <div className="bg-gradient-to-br from-slate-900 to-orange-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-orange-400">
                    <BrainCircuit size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">IA SEASAFETY INTELLIGENCE</span>
                  </div>
                  <p className="text-lg leading-relaxed text-orange-100 whitespace-pre-wrap">{aiInsight}</p>
                </div>
                <div className="absolute -right-20 -top-20 opacity-10">
                    <Anchor size={300} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Alertas de Reposição</h3>
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full">{criticalItems.length} itens</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Equipamento</th>
                        <th className="px-6 py-4">Atual</th>
                        <th className="px-6 py-4">Mínimo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {criticalItems.length > 0 ? criticalItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                          <td className="px-6 py-4 font-bold text-rose-600">{item.quantity} {item.unit}</td>
                          <td className="px-6 py-4 text-slate-500">{item.minLevel} {item.unit}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Nenhum equipamento em nível crítico</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Histórico de Operações</h3>
                  <button onClick={() => setView('movements')} className="text-orange-600 text-sm font-semibold hover:underline">Ver todas</button>
                </div>
                <div className="p-4 space-y-4">
                  {movements.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${m.type === MovementType.IN ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {m.type === MovementType.IN ? <Plus size={18} /> : <Minus size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{m.itemName}</p>
                          <p className="text-xs text-slate-400">{new Date(m.date).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${m.type === MovementType.IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.type === MovementType.IN ? '+' : '-'}{m.quantity}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">{m.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory View */}
        {view === 'inventory' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar material de segurança..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => generateInventoryPDF(inventory, 'Inventário SEASAFETY Completo')}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl font-medium transition-all"
                >
                  <Download size={18} /> Exportar Inventário
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Saldo Atual</th>
                    <th className="px-6 py-4">Qtd. Mínima</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{item.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${item.quantity <= item.minLevel ? 'text-rose-600' : 'text-slate-800'}`}>
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{item.minLevel} {item.unit}</td>
                      <td className="px-6 py-4">
                        {item.quantity <= item.minLevel ? (
                          <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-rose-200">
                            <AlertTriangle size={14} /> Crítico
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-200">
                            <CheckCircle2 size={14} /> Conforme
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setItemToDelete(item)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Excluir Material"
                        >
                          <Trash2 size={18} />
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Registro de Movimentação</h3>
               <button 
                onClick={() => generateMovementPDF(movements)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md"
              >
                <Download size={18} /> Exportar Histórico
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Material</th>
                    <th className="px-6 py-4">Quantidade</th>
                    <th className="px-6 py-4">Destino/Origem</th>
                    <th className="px-6 py-4">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-sm">{new Date(m.date).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${m.type === MovementType.IN ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{m.itemName}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{m.quantity}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm italic">{m.destination}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports View */}
        {view === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Relatório Geral</h3>
              <p className="text-slate-500 text-sm mb-6">PDF detalhado de todos os equipamentos de segurança cadastrados na SEASAFETY.</p>
              <button 
                onClick={() => generateInventoryPDF(inventory, 'Relatório Geral de Equipamentos')}
                className="mt-auto w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all"
              >
                Gerar PDF
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Alerta de Reposição</h3>
              <p className="text-slate-500 text-sm mb-6">Lista urgente de equipamentos que atingiram o estoque mínimo de segurança.</p>
              <button 
                onClick={() => generateInventoryPDF(criticalItems, 'Equipamentos Abaixo do Mínimo')}
                className="mt-auto w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-200"
              >
                Gerar PDF
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <ArrowLeftRight size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Histórico Operacional</h3>
              <p className="text-slate-500 text-sm mb-6">Relatório de todas as saídas para embarcações e entradas de fornecedores.</p>
              <button 
                onClick={() => generateMovementPDF(movements)}
                className="mt-auto w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Movement Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-6 flex justify-between items-center text-white ${modalType === MovementType.IN ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {modalType === MovementType.IN ? <Plus size={24} /> : <    Minus size={24} />}
                {modalType === MovementType.IN ? 'Entrada em Depósito' : 'Saída de Equipamento'}
              </h3>
              <button onClick={() => setIsMovementModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleMovement} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Equipamento</label>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={movementFormData.itemId}
                  onChange={(e) => setMovementFormData({...movementFormData, itemId: e.target.value})}
                >
                  <option value="">Selecione um item...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Saldo: {item.quantity} {item.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={movementFormData.quantity || ''}
                  onChange={(e) => setMovementFormData({...movementFormData, quantity: parseInt(e.target.value)})}
                  placeholder="Ex: 10"
                />
              </div>
              {modalType === MovementType.OUT && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Embarcação / Destino</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={movementFormData.destination}
                    onChange={(e) => setMovementFormData({...movementFormData, destination: e.target.value})}
                    placeholder="Ex: Embarcação SeaQuest"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsMovementModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className={`flex-1 px-6 py-3 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95 ${modalType === MovementType.IN ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 flex justify-between items-center text-white bg-orange-600">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <PlusCircle size={24} />
                Cadastrar Novo Material
              </h3>
              <button onClick={() => setIsNewItemModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleAddNewItem} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Equipamento</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newItemFormData.name}
                  onChange={(e) => setNewItemFormData({...newItemFormData, name: e.target.value})}
                  placeholder="Ex: Boia de Salvamento Tipo 2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newItemFormData.category}
                    onChange={(e) => setNewItemFormData({...newItemFormData, category: e.target.value})}
                    placeholder="Salvamento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Unidade</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newItemFormData.unit}
                    onChange={(e) => setNewItemFormData({...newItemFormData, unit: e.target.value})}
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="m">m (Metro)</option>
                    <option value="kg">kg (Quilo)</option>
                    <option value="kit">kit (Conjunto)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estoque Inicial</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newItemFormData.quantity || ''}
                    onChange={(e) => setNewItemFormData({...newItemFormData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nível Mínimo</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newItemFormData.minLevel || ''}
                    onChange={(e) => setNewItemFormData({...newItemFormData, minLevel: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Material?</h3>
            <p className="text-slate-500 mb-8">
              Você tem certeza que deseja remover <strong>{itemToDelete.name}</strong> do inventário da SEASAFETY? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteItem}
                className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
