import React, { useState } from 'react';
import { 
  ClipboardEdit, 
  Wrench, 
  ArrowLeft, 
  CheckCircle, 
  Camera, 
  UserCircle, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

// --- MOCK DATA ---
const USERS = [
  { id: 'u1', name: 'Andi', dept: 'Produksi' },
  { id: 'u2', name: 'Dini', dept: 'Gudang' },
  { id: 'u3', name: 'Budi', dept: 'Maintenance' }
];

const DEPARTMENTS = ['Produksi', 'Gudang', 'Maintenance', 'HRGA', 'Sales'];
const AREAS = ['Line Produksi A', 'Gudang Material', 'Ruang Panel', 'Lorong Utama', 'Area Parkir'];
const AKAR_4M = ['Manusia (Man)', 'Mesin (Machine)', 'Material (Material)', 'Metode (Method)'];

const INITIAL_FINDINGS = [
  { 
    id: 'TRF-001', type: 'Safety', area: 'Ruang Panel', targetDept: 'Maintenance', status: 'Open', 
    desc: 'Kabel panel terkelupas dan tidak ada penutup', date: '2026-11-18', 
    category: 'E: Electric', rank: 'A', akarMasalah4M: 'Mesin (Machine)'
  },
  { 
    id: 'TRF-002', type: '5S', area: 'Lorong Utama', targetDept: 'Gudang', status: 'Open', 
    desc: 'Tumpukan kardus menghalangi jalur evakuasi', date: '2026-11-17', 
    limaR: 'R1: Ringkas', sqcdm: 'S: Safety', akarMasalah4M: 'Metode (Method)'
  }
];

export default function UserPortal() {
  // --- STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [findings, setFindings] = useState(INITIAL_FINDINGS);
  const [currentView, setCurrentView] = useState('HOME'); // HOME, CREATE, TASK_LIST, RESOLVE
  const [selectedTask, setSelectedTask] = useState(null);
  const [toast, setToast] = useState(null);

  // Form States (Create)
  const [createType, setCreateType] = useState('Safety');
  const [formData, setFormData] = useState({
    area: AREAS[0], targetDept: DEPARTMENTS[0], desc: '', akarMasalah4M: AKAR_4M[0], dueDate: '',
    category: 'A: Apparatus', rank: 'B', limaR: 'R1: Ringkas', sqcdm: 'S: Safety'
  });

  // Form States (Resolve)
  const [resolveData, setResolveData] = useState({
    kaizenAction: 'Eliminasi', descAction: '', prevAction: ''
  });

  // --- DERIVED STATE ---
  const myOpenTasks = findings.filter(f => f.targetDept === currentUser.dept && f.status === 'Open');

  // --- HANDLERS ---
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.desc || !formData.dueDate) {
      alert("Harap isi deskripsi dan tenggat waktu!");
      return;
    }
    const newFinding = {
      id: `TRF-00${findings.length + 1}`,
      type: createType,
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      ...formData
    };
    setFindings([...findings, newFinding]);
    showToast('Temuan berhasil dilaporkan!');
    setCurrentView('HOME');
    // Reset Form
    setFormData({ ...formData, desc: '', dueDate: '' });
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!resolveData.descAction) {
      alert("Harap isi deskripsi tindakan perbaikan!");
      return;
    }
    
    setFindings(prev => prev.map(f => 
      f.id === selectedTask.id ? { ...f, status: 'Closed' } : f
    ));
    showToast('Tugas perbaikan berhasil ditutup!');
    setCurrentView('TASK_LIST');
    setResolveData({ kaizenAction: 'Eliminasi', descAction: '', prevAction: '' });
  };

  // --- VIEWS COMPONENTS ---

  const renderHome = () => (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      <div className="bg-emerald-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10">
          <ShieldAlert size={120} />
        </div>
        <h2 className="text-2xl font-bold mb-1">Halo, {currentUser.name}!</h2>
        <p className="text-emerald-100 mb-4">Departemen: {currentUser.dept}</p>
        <p className="text-sm bg-emerald-800/50 p-3 rounded-lg border border-emerald-600/50">
          <Info size={16} className="inline mr-2 -mt-1"/>
          Pastikan Anda selalu menggunakan APD saat berkeliling area pabrik.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Tombol Auditor */}
        <button 
          onClick={() => setCurrentView('CREATE')}
          className="bg-white border-2 border-emerald-500 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <ClipboardEdit size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800 text-lg">Buat Temuan Baru</h3>
              <p className="text-xs text-gray-500">Lapor form Safety / 5S (Auditor)</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" />
        </button>

        {/* Tombol PIC */}
        <button 
          onClick={() => setCurrentView('TASK_LIST')}
          className="bg-white border-2 border-amber-400 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Wrench size={24} />
              </div>
              {myOpenTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
                  {myOpenTasks.length}
                </span>
              )}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800 text-lg">Tugas Perbaikan</h3>
              <p className="text-xs text-gray-500">Area {currentUser.dept} (PIC)</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" />
        </button>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="flex flex-col bg-gray-50 min-h-full pb-20 animate-slide-up">
      {/* Tab Switcher */}
      <div className="bg-white p-4 shadow-sm flex gap-2 justify-center sticky top-0 z-10">
        <button 
          onClick={() => setCreateType('Safety')}
          className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${createType === 'Safety' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          <ShieldAlert size={18} /> Safety Patrol
        </button>
        <button 
          onClick={() => setCreateType('5S')}
          className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${createType === '5S' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          <Sparkles size={18} /> 5S/5R Patrol
        </button>
      </div>

      <form onSubmit={handleCreateSubmit} className="p-4 flex flex-col gap-4">
        {/* COMMON FIELDS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Area / Lokasi Kejadian</label>
            <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Akar Masalah (4M)</label>
            <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.akarMasalah4M} onChange={e => setFormData({...formData, akarMasalah4M: e.target.value})}>
              {AKAR_4M.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* CONDITIONAL FIELDS */}
        {createType === 'Safety' ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1">Kategori STOP 6</label>
                <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option>A: Apparatus</option>
                  <option>B: Big Heavy</option>
                  <option>C: Car/Vehicle</option>
                  <option>D: Drop/Fall</option>
                  <option>E: Electric</option>
                  <option>F: Fire</option>
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-bold text-gray-500 mb-1">Rank</label>
                <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg font-bold text-red-600" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})}>
                  <option>A</option><option>B</option><option>C</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Kategori 5R</label>
              <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg" value={formData.limaR} onChange={e => setFormData({...formData, limaR: e.target.value})}>
                <option>R1: Ringkas</option><option>R2: Rapi</option><option>R3: Resik</option>
                <option>R4: Rawat</option><option>R5: Rajin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Efek Bisnis (SQCDM)</label>
              <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg" value={formData.sqcdm} onChange={e => setFormData({...formData, sqcdm: e.target.value})}>
                <option>S: Safety</option><option>Q: Quality</option><option>C: Cost</option>
                <option>D: Delivery</option><option>M: Moral</option>
              </select>
            </div>
          </div>
        )}

        {/* DETAILS & PIC */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Deskripsi Temuan</label>
            <textarea className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24" placeholder="Jelaskan detail bahaya/kotor..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})}></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Departemen Tujuan (PIC)</label>
            <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg font-bold text-emerald-700" value={formData.targetDept} onChange={e => setFormData({...formData, targetDept: e.target.value})}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Tenggat Waktu (Due Date)</label>
            <input type="date" className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Foto Before (Bukti)</label>
            <button type="button" className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-emerald-500 hover:text-emerald-500 transition-colors">
              <Camera size={32} className="mb-2"/>
              <span className="text-sm font-semibold">Ambil Foto / Upload</span>
            </button>
          </div>
        </div>

        <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg mt-2 ${createType === 'Safety' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          SUBMIT TEMUAN
        </button>
      </form>
    </div>
  );

  const renderTaskList = () => (
    <div className="p-4 bg-gray-50 min-h-full animate-slide-up">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tugas Area {currentUser.dept}</h2>
          <p className="text-sm text-gray-500">Temuan berstatus Open</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold border border-amber-200">
          {myOpenTasks.length} Tugas
        </div>
      </div>

      {myOpenTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center mt-10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Hore! Area Anda Bersih</h3>
          <p className="text-sm text-gray-500">Tidak ada temuan terbuka untuk departemen {currentUser.dept}. Pertahankan!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myOpenTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => { setSelectedTask(task); setCurrentView('RESOLVE'); }}
              className="bg-white rounded-xl p-4 shadow-sm border-l-4 hover:shadow-md transition-shadow cursor-pointer border-l-red-500 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${task.type === 'Safety' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {task.type} Patrol
                </span>
                <span className="text-xs font-mono text-gray-400">{task.id}</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{task.desc}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                <span className="flex items-center gap-1"><MapPin size={12}/> {task.area}</span>
                <span className="flex items-center gap-1 text-red-500 font-semibold"><Calendar size={12}/> Due: {task.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderResolveForm = () => {
    if (!selectedTask) return null;
    return (
      <div className="flex flex-col bg-gray-50 min-h-full pb-20 animate-slide-up">
        {/* BEFORE CARD */}
        <div className="bg-red-50 p-4 border-b border-red-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Detail Temuan (Before)</h3>
            <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded font-mono">{selectedTask.id}</span>
          </div>
          <p className="text-sm text-gray-800 font-medium bg-white p-3 rounded border border-red-100 shadow-sm mb-3">"{selectedTask.desc}"</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <p>📍 Area: <span className="font-semibold text-gray-800">{selectedTask.area}</span></p>
            <p>⚠️ Tipe: <span className="font-semibold text-gray-800">{selectedTask.type}</span></p>
            <p>🔍 4M: <span className="font-semibold text-gray-800">{selectedTask.akarMasalah4M}</span></p>
            <p>📅 Due: <span className="font-semibold text-red-600">{selectedTask.date}</span></p>
          </div>
        </div>

        {/* AFTER FORM */}
        <form onSubmit={handleResolveSubmit} className="p-4 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
            <h3 className="font-bold text-emerald-700 flex items-center gap-2 border-b pb-2"><Wrench size={18}/> Form Tindakan (After)</h3>
            
            {selectedTask.type === 'Safety' ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tindakan Kaizen (Hierarki)</label>
                <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg outline-none" value={resolveData.kaizenAction} onChange={e => setResolveData({...resolveData, kaizenAction: e.target.value})}>
                  <option>Eliminasi (Menghilangkan Bahaya)</option>
                  <option>Substitusi (Mengganti Material)</option>
                  <option>Modifikasi (Engineering Control)</option>
                  <option>Administrasi (SOP / Rambu)</option>
                  <option>APD (Alat Pelindung Diri)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tindakan Pencegahan (Preventive Kaizen)</label>
                <textarea className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-16" placeholder="Apa ide Anda agar masalah ini tidak terulang?" value={resolveData.prevAction} onChange={e => setResolveData({...resolveData, prevAction: e.target.value})}></textarea>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Deskripsi Perbaikan (Corrective)</label>
              <textarea className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24" placeholder="Jelaskan apa yang sudah Anda perbaiki saat ini..." value={resolveData.descAction} onChange={e => setResolveData({...resolveData, descAction: e.target.value})}></textarea>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Foto After (Bukti Selesai) - WAJIB</label>
              <button type="button" className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-500 transition-colors">
                <Camera size={32} className="mb-2"/>
                <span className="text-sm font-semibold">Ambil Foto After</span>
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-4 rounded-xl font-bold text-white shadow-lg mt-2 bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
            <CheckCircle size={20} /> TUNTASKAN TEMUAN
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-200">
      {/* MOBILE DEVICE CONTAINER */}
      <div className="w-full max-w-md h-[90vh] bg-white shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative border-4 border-gray-800">
        
        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-medium animate-slide-up flex items-center gap-2 w-max max-w-[90%]">
            <CheckCircle size={16} className="text-emerald-400"/> {toast}
          </div>
        )}

        {/* HEADER */}
        <header className="bg-gray-900 text-white p-4 flex items-center justify-between z-20 shadow-md h-16 shrink-0">
          <div className="flex items-center gap-3">
            {currentView !== 'HOME' ? (
              <button onClick={() => setCurrentView(currentView === 'RESOLVE' ? 'TASK_LIST' : 'HOME')} className="p-1 hover:bg-gray-800 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            ) : (
              <ShieldAlert size={28} className="text-emerald-500" />
            )}
            <h1 className="font-bold text-lg">{currentView === 'HOME' ? 'YFI Patrol' : currentView === 'CREATE' ? 'Lapor Temuan' : currentView === 'TASK_LIST' ? 'Daftar Tugas' : 'Tutup Temuan'}</h1>
          </div>
          
          {/* USER SWITCHER */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-full pl-2 pr-1 py-1 border border-gray-700">
            <UserCircle size={20} className="text-gray-400" />
            <select 
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer appearance-none pr-4"
              value={currentUser.id}
              onChange={(e) => {
                setCurrentUser(USERS.find(u => u.id === e.target.value));
                setCurrentView('HOME'); // Reset view on user change
              }}
            >
              {USERS.map(u => (
                <option key={u.id} value={u.id} className="bg-gray-800">{u.name} ({u.dept})</option>
              ))}
            </select>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          {currentView === 'HOME' && renderHome()}
          {currentView === 'CREATE' && renderCreateForm()}
          {currentView === 'TASK_LIST' && renderTaskList()}
          {currentView === 'RESOLVE' && renderResolveForm()}
        </div>

      </div>

      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      `}} />
    </div>
  );
}