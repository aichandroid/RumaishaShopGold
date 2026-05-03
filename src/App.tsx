/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { 
  BarChart3, 
  Settings, 
  ShoppingCart, 
  BadgeDollarSign, 
  History, 
  Plus, 
  Trash2, 
  Download, 
  CheckCircle2, 
  X,
  Lock,
  Camera,
  Search,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  FileJson,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn, formatNumber, parseNumber } from './lib/utils';
import { Purchase, Sale, GoldPrice, AppMode } from './types';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { NumericFormat } from 'react-number-format';
import 'jspdf-autotable';

// Default PIN
const DEFAULT_PIN = '1234';

export default function App() {
  // State
  const [mode, setMode] = useState<AppMode>('purchase');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [pin, setPin] = useState(DEFAULT_PIN);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinAction, setPinAction] = useState<{ type: 'add' | 'delete', data?: any } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<any>(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isBackupReminderOpen, setIsBackupReminderOpen] = useState(false);
  
  // Refs
  const priceSnapshotRef = useRef<HTMLDivElement>(null);

  // Load Data & Initial Daily Backup Reminder
  useEffect(() => {
    const savedPurchases = localStorage.getItem('emas_purchases');
    const savedSales = localStorage.getItem('emas_sales');
    const savedPrices = localStorage.getItem('emas_prices');
    const savedPin = localStorage.getItem('emas_pin');

    const purchasesData = savedPurchases ? JSON.parse(savedPurchases) : [];
    const salesData = savedSales ? JSON.parse(savedSales) : [];

    if (savedPurchases) setPurchases(purchasesData);
    if (savedSales) setSales(salesData);
    if (savedPrices) setGoldPrices(JSON.parse(savedPrices));
    if (savedPin) setPin(savedPin);

    // Initial Daily Backup Reminder logic
    const lastBackup = localStorage.getItem('emas_last_backup');
    const today = new Date().toISOString().split('T')[0];
    // Only remind if there is data and it hasn't been backed up today
    if (lastBackup !== today && (purchasesData.length > 0 || salesData.length > 0)) {
      const timer = setTimeout(() => setIsBackupReminderOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('emas_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('emas_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('emas_prices', JSON.stringify(goldPrices));
  }, [goldPrices]);

  useEffect(() => {
    localStorage.setItem('emas_pin', pin);
  }, [pin]);

  // Handlers
  const handleProtectedAction = (type: 'add' | 'delete', data?: any) => {
    setPinAction({ type, data });
    setIsPinDialogOpen(true);
  };

  const handlePinSuccess = () => {
    if (!pinAction) return;

    if (pinAction.type === 'add') {
      // For adding, we usually show the confirm dialog first
      // But here we'll just proceed to what was intended
      if (confirmData) {
        if (mode === 'purchase') {
          setPurchases(prev => [confirmData, ...prev]);
        } else if (mode === 'sale') {
          setSales(prev => [confirmData, ...prev]);
        }
      }
    } else if (pinAction.type === 'delete') {
      if (mode === 'purchase') {
        setPurchases(prev => prev.filter(p => p.id !== pinAction.data));
      } else if (mode === 'sale') {
        setSales(prev => prev.filter(s => s.id !== pinAction.data));
      }
    }

    setPinAction(null);
    setConfirmData(null);
    setIsPinDialogOpen(false);
  };

  const exportToExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const wb = XLSX.utils.book_new();
    
    const purchaseData = purchases.map(p => ({
      Tanggal: p.date,
      'No Seri': p.serialNumber,
      'Harga Beli': p.price,
      Penjual: p.sellerName
    }));
    
    const salesData = sales.map(s => ({
      Tanggal: s.date,
      'Gramasi': s.weight,
      'No Seri': s.serialNumber,
      Pembeli: s.buyerName,
      'Harga Jual': s.sellingPrice,
      'Harga Restok': s.restockPrice,
      Keuntungan: s.profit
    }));

    const wsP = XLSX.utils.json_to_sheet(purchaseData);
    const wsS = XLSX.utils.json_to_sheet(salesData);
    
    XLSX.utils.book_append_sheet(wb, wsP, "Pembelian");
    XLSX.utils.book_append_sheet(wb, wsS, "Penjualan");
    
    XLSX.writeFile(wb, `Rekap_Emas_${dateStr}.xlsx`);
  };

  const handleRestoreExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const newPurchases: Purchase[] = [];
        const newSales: Sale[] = [];

        // Restore Purchases
        if (workbook.SheetNames.includes("Pembelian")) {
          const wsP = workbook.Sheets["Pembelian"];
          const rawP = XLSX.utils.sheet_to_json(wsP) as any[];
          rawP.forEach(row => {
            newPurchases.push({
              id: Math.random().toString(36).substr(2, 9),
              date: row.Tanggal || new Date().toISOString().split('T')[0],
              serialNumber: String(row['No Seri'] || ''),
              price: Number(row['Harga Beli'] || 0),
              sellerName: String(row.Penjual || '')
            });
          });
        }

        // Restore Sales
        if (workbook.SheetNames.includes("Penjualan")) {
          const wsS = workbook.Sheets["Penjualan"];
          const rawS = XLSX.utils.sheet_to_json(wsS) as any[];
          rawS.forEach(row => {
            newSales.push({
              id: Math.random().toString(36).substr(2, 9),
              date: row.Tanggal || new Date().toISOString().split('T')[0],
              weight: Number(row['Gramasi'] || 0),
              serialNumber: String(row['No Seri'] || ''),
              buyerName: String(row.Pembeli || ''),
              sellingPrice: Number(row['Harga Jual'] || 0),
              restockPrice: Number(row['Harga Restok'] || 0),
              profit: Number(row.Keuntungan || 0)
            });
          });
        }

        if (newPurchases.length > 0 || newSales.length > 0) {
          setPurchases(prev => [...prev, ...newPurchases]);
          setSales(prev => [...prev, ...newSales]);
          alert(`Berhasil memulihkan ${newPurchases.length} data pembelian dan ${newSales.length} data penjualan!`);
        } else {
          alert('Format file tidak dikenali atau data kosong.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file excel. Pastikan format sesuai.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    if (e.target) e.target.value = '';
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const dateStr = new Date().toISOString().split('T')[0];
    
    doc.text("Rekap Pembelian Emas", 14, 15);
    doc.autoTable({
      head: [['Tanggal', 'No Seri', 'Harga Beli', 'Penjual']],
      body: purchases.map(p => [p.date, p.serialNumber, p.price, p.sellerName]),
      startY: 20,
    });
    
    doc.addPage();
    doc.text("Rekap Penjualan Emas", 14, 15);
    doc.autoTable({
      head: [['Tanggal', 'No Seri', 'Gram', 'Harga Jual', 'Untung']],
      body: sales.map(s => [s.date, s.serialNumber, s.weight, s.sellingPrice, s.profit]),
      startY: 20,
    });
    
    doc.save(`Rekap_Emas_${dateStr}.pdf`);
  };

  const takePriceSnapshot = async () => {
    if (priceSnapshotRef.current) {
      const dataUrl = await toPng(priceSnapshotRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `Status_Harga_Emas_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleBackupAccept = () => {
    exportToExcel();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('emas_last_backup', today);
    setIsBackupReminderOpen(false);
  };

  const handleBackupDecline = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('emas_last_backup', today);
    setIsBackupReminderOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 mb-16 md:mb-0">
      {/* Sidebar Navigation - Hidden on Mobile */}
      <nav className="hidden md:flex w-64 bg-black text-white min-h-screen p-4 flex-col gap-2">
        <div className="flex items-center gap-3 px-4 py-8">
          <img 
            src="/logo.png" 
            alt="Rumaisha Shop" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback if image not found
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const title = parent.querySelector('h1');
                if (title) title.style.display = 'block';
              }
            }}
          />
          <h1 className="text-xl font-bold tracking-tight">Rumaisha Shop</h1>
        </div>

        <NavItem 
          active={mode === 'purchase'} 
          onClick={() => setMode('purchase')} 
          icon={<ShoppingCart size={20} />} 
          label="Pembelian" 
        />
        <NavItem 
          active={mode === 'sale'} 
          onClick={() => setMode('sale')} 
          icon={<BadgeDollarSign size={20} />} 
          label="Penjualan" 
        />
        <NavItem 
          active={mode === 'recap'} 
          onClick={() => setMode('recap')} 
          icon={<BarChart3 size={20} />} 
          label="Rekap Data" 
        />
        <NavItem 
          active={mode === 'prices'} 
          onClick={() => setMode('prices')} 
          icon={<TrendingUp size={20} />} 
          label="Harga Emas" 
        />
        <NavItem 
          active={mode === 'settings'} 
          onClick={() => setMode('settings')} 
          icon={<Settings size={20} />} 
          label="Pengaturan" 
        />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
        <AnimatePresence mode="wait">
          {mode === 'purchase' && (
            <PurchaseModule 
              purchases={purchases} 
              onAdd={(data) => {
                setConfirmData({ ...data, id: Math.random().toString(36).substr(2, 9) });
                setIsConfirmOpen(true);
              }}
              onDelete={(id) => handleProtectedAction('delete', id)}
            />
          )}

          {mode === 'sale' && (
            <SalesModule 
              sales={sales} 
              purchases={purchases}
              onAdd={(data) => {
                setConfirmData({ ...data, id: Math.random().toString(36).substr(2, 9) });
                setIsConfirmOpen(true);
              }}
              onDelete={(id) => handleProtectedAction('delete', id)}
            />
          )}

          {mode === 'recap' && (
            <RecapModule purchases={purchases} sales={sales} />
          )}

          {mode === 'prices' && (
            <PricesModule 
              snapshotRef={priceSnapshotRef} 
              onTakeSnapshot={takePriceSnapshot}
              searchDate={searchDate}
              setSearchDate={setSearchDate}
              goldPrices={goldPrices}
              setGoldPrices={setGoldPrices}
            />
          )}

          {mode === 'settings' && (
            <SettingsModule 
              pin={pin} 
              onUpdatePin={setPin}
              onExportExcel={exportToExcel}
              onRestoreExcel={handleRestoreExcel}
              onExportPDF={exportToPDF}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 bg-white/80 backdrop-blur-md">
        <MobileNavItem 
          active={mode === 'purchase'} 
          onClick={() => setMode('purchase')} 
          icon={<ShoppingCart size={20} />} 
          label="Beli" 
        />
        <MobileNavItem 
          active={mode === 'sale'} 
          onClick={() => setMode('sale')} 
          icon={<BadgeDollarSign size={20} />} 
          label="Jual" 
        />
        <MobileNavItem 
          active={mode === 'recap'} 
          onClick={() => setMode('recap')} 
          icon={<BarChart3 size={20} />} 
          label="Rekap" 
        />
        <MobileNavItem 
          active={mode === 'prices'} 
          onClick={() => setMode('prices')} 
          icon={<TrendingUp size={20} />} 
          label="Harga" 
        />
        <MobileNavItem 
          active={mode === 'settings'} 
          onClick={() => setMode('settings')} 
          icon={<Settings size={20} />} 
          label="Opsi" 
        />
      </div>

      {/* Dialogs */}
      <PINDialog 
        isOpen={isPinDialogOpen} 
        truePin={pin}
        onClose={() => setIsPinDialogOpen(false)} 
        onSuccess={handlePinSuccess}
      />

      <BackupReminderDialog 
        isOpen={isBackupReminderOpen}
        onClose={handleBackupDecline}
        onConfirm={handleBackupAccept}
      />

      <ConfirmDialog 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handleProtectedAction('add');
        }}
        data={confirmData}
        type={mode}
      />
    </div>
  );
}

// --- Sub-components ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
        active ? "bg-gold-500 text-white shadow-lg shadow-gold-500/20" : "hover:bg-white/10 text-slate-400"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all duration-200",
        active ? "text-gold-600" : "text-slate-400"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-lg transition-all",
        active ? "bg-gold-50 text-gold-600" : "transparent"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function PurchaseModule({ purchases, onAdd, onDelete }: { purchases: Purchase[], onAdd: (p: any) => void, onDelete: (id: string) => void }) {
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], serial: '', price: '', seller: '' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className=" luxury-card p-6 border-gold-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="text-gold-600" />
          Input Pembelian Emas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputGroup label="Tanggal" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
          <InputGroup label="No Seri" placeholder="Contoh: LM10293" value={formData.serial} onChange={v => setFormData({...formData, serial: v})} />
          <InputGroup label="Harga Beli" type="currency" placeholder="Rp" value={formData.price} onChange={v => setFormData({...formData, price: v})} />
          <InputGroup label="Nama Penjual" placeholder="John Doe" value={formData.seller} onChange={v => setFormData({...formData, seller: v})} />
        </div>
        <button 
          onClick={() => {
            if (!formData.serial || !formData.price || !formData.seller) return alert('Lengkapi data!');
            onAdd({ date: formData.date, serialNumber: formData.serial, price: Number(formData.price), sellerName: formData.seller });
            setFormData({ ...formData, serial: '', price: '', seller: '' });
          }}
          className="mt-6 w-full md:w-auto px-8 py-3 gold-gradient text-white rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Tambah Data
        </button>
      </div>

      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <History className="text-slate-400" />
          Riwayat Pembelian
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 italic text-black">
                <th className="py-4 font-normal">Tanggal</th>
                <th className="py-4 font-normal">No Seri</th>
                <th className="py-4 font-normal">Harga Beli</th>
                <th className="py-4 font-normal">Penjual</th>
                <th className="py-4 font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="py-4 text-slate-500">{formatDate(p.date)}</td>
                  <td className="py-4 font-bold">{p.serialNumber}</td>
                  <td className="py-4 text-gold-700 font-medium">{formatCurrency(p.price)}</td>
                  <td className="py-4">{p.sellerName}</td>
                  <td className="py-4">
                    <button onClick={() => onDelete(p.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && <p className="text-center py-12 text-slate-400">Belum ada data pembelian.</p>}
        </div>
      </div>
    </motion.div>
  );
}

function SalesModule({ sales, purchases, onAdd, onDelete }: { sales: Sale[], purchases: Purchase[], onAdd: (p: any) => void, onDelete: (id: string) => void }) {
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], weight: '', serial: '', buyer: '', selling: '', restock: '' });
  const [showManualSerial, setShowManualSerial] = useState(false);

  const profit = Number(formData.selling) - Number(formData.restock);

  const availableSerials = useMemo(() => {
    const soldSerials = new Set(sales.map(s => s.serialNumber));
    return [...new Set(purchases.map(p => p.serialNumber))].filter(sn => !soldSerials.has(sn));
  }, [purchases, sales]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="luxury-card p-6 border-gold-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BadgeDollarSign className="text-gold-600" />
          Input Penjualan Emas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputGroup label="Tanggal" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
          <InputGroup label="Gramasi" type="number" step="0.01" placeholder="Berat (gram)" value={formData.weight} onChange={v => setFormData({...formData, weight: v})} />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-black uppercase tracking-wider">No Seri</label>
            <div className="flex gap-2">
              {showManualSerial ? (
                <input 
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-gold-500 transition-colors"
                  value={formData.serial}
                  onChange={e => setFormData({...formData, serial: e.target.value})}
                  placeholder="Ketik No Seri..."
                />
              ) : (
                <select 
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-gold-500 transition-colors"
                  value={formData.serial}
                  onChange={e => setFormData({...formData, serial: e.target.value})}
                >
                  <option value="">Pilih No Seri (dari Stok)</option>
                  {availableSerials.map(sn => (
                    <option key={sn} value={sn}>{sn}</option>
                  ))}
                </select>
              )}
              <button 
                onClick={() => setShowManualSerial(!showManualSerial)}
                className="px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold"
              >
                {showManualSerial ? 'Pilih' : 'Manual'}
              </button>
            </div>
          </div>

          <InputGroup label="Nama Pembeli" placeholder="Jane Doe" value={formData.buyer} onChange={v => setFormData({...formData, buyer: v})} />
          <InputGroup label="Harga Jual" type="currency" placeholder="Rp" value={formData.selling} onChange={v => setFormData({...formData, selling: v})} />
          <InputGroup label="Harga Restok" type="currency" placeholder="Rp" value={formData.restock} onChange={v => setFormData({...formData, restock: v})} />
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gold-50 rounded-xl border border-gold-100">
          <div>
            <p className="text-sm text-gold-800">Perkiraan Keuntungan</p>
            <p className="text-2xl font-bold text-gold-950">{formatCurrency(profit || 0)}</p>
          </div>
          <button 
            onClick={() => {
              if (!formData.serial || !formData.selling || !formData.buyer) return alert('Lengkapi data!');
              onAdd({ 
                date: formData.date, 
                serialNumber: formData.serial, 
                weight: Number(formData.weight),
                buyerName: formData.buyer,
                sellingPrice: Number(formData.selling),
                restockPrice: Number(formData.restock),
                profit
              });
              setFormData({ ...formData, serial: '', selling: '', restock: '', buyer: '', weight: '' });
            }}
            className="w-full md:w-auto px-8 py-3 gold-gradient text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus size={20} /> Simpan Penjualan
          </button>
        </div>
      </div>

      {/* Sales History */}
      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <History className="text-slate-400" />
          Riwayat Penjualan
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 italic text-black">
                <th className="py-4 font-normal">Tanggal</th>
                <th className="py-4 font-normal">No Seri / Berat</th>
                <th className="py-4 font-normal">Harga Jual</th>
                <th className="py-4 font-normal">Keuntungan</th>
                <th className="py-4 font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-4 text-slate-500">{formatDate(s.date)}</td>
                  <td className="py-4">
                    <div className="font-bold">{s.serialNumber}</div>
                    <div className="text-xs text-slate-400">{s.weight} gram</div>
                  </td>
                  <td className="py-4 font-medium">{formatCurrency(s.sellingPrice)}</td>
                  <td className="py-4 text-green-600 font-bold">+{formatCurrency(s.profit)}</td>
                  <td className="py-4">
                    <button onClick={() => onDelete(s.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p className="text-center py-12 text-slate-400">Belum ada data penjualan.</p>}
        </div>
      </div>
    </motion.div>
  );
}

function RecapModule({ purchases, sales }: { purchases: Purchase[], sales: Sale[] }) {
  const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('month');

  const stats = useMemo(() => {
    const totalBuy = purchases.reduce((acc, curr) => acc + curr.price, 0);
    const totalSell = sales.reduce((acc, curr) => acc + curr.sellingPrice, 0);
    const totalProfit = sales.reduce((acc, curr) => acc + curr.profit, 0);
    return { totalBuy, totalSell, totalProfit };
  }, [purchases, sales]);

  const groupedData = useMemo(() => {
    const groups: Record<string, { buy: number, sell: number, profit: number, count: number }> = {};

    sales.forEach(s => {
      let key = '';
      const date = new Date(s.date);
      if (timeFilter === 'month') {
        key = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
      } else if (timeFilter === 'year') {
        key = date.getFullYear().toString();
      }

      if (!groups[key]) {
        groups[key] = { buy: 0, sell: 0, profit: 0, count: 0 };
      }
      groups[key].sell += s.sellingPrice;
      groups[key].profit += s.profit;
      groups[key].count += 1;
    });

    return Object.entries(groups).sort((a, b) => {
      return b[0].localeCompare(a[0]);
    });
  }, [sales, purchases, timeFilter]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 font-sans"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Investasi" 
          value={formatCurrency(stats.totalBuy)} 
          color="gold" 
          icon={Coins} 
          labelColor="#ffcf00" 
          valueColor="#f9cc00" 
        />
        <StatCard 
          label="Total Penjualan" 
          value={formatCurrency(stats.totalSell)} 
          color="blue" 
          icon={TrendingUp} 
          labelColor="#0070ff" 
          valueColor="#0470ff" 
        />
        <StatCard 
          label="Total Keuntungan" 
          value={formatCurrency(stats.totalProfit)} 
          color="green" 
          icon={BadgeDollarSign} 
          labelColor="#00d870" 
          valueColor="#00df79" 
        />
      </div>

      <div className="luxury-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-xl font-bold">Rekapitulasi Laporan</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['month', 'year'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setTimeFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  timeFilter === f ? "bg-white shadow text-gold-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {`Per ${f === 'month' ? 'Bulan' : 'Tahun'}`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {groupedData.map(([key, data]) => (
            <div 
              key={key} 
              className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4"
            >
              <div>
                <p className="font-bold text-slate-900">{key}</p>
                <p className="text-xs text-slate-400 capitalize">{data.count} Transaksi</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Penjualan</p>
                  <p className="font-bold text-slate-800">{formatCurrency(data.sell)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Untung</p>
                  <p className="font-bold text-green-600">+{formatCurrency(data.profit)}</p>
                </div>
              </div>
            </div>
          ))}
          {groupedData.length === 0 && (
            <div className="py-12 text-center text-slate-400 italic">
              Belum ada data untuk ditampilkan.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PricesModule({ snapshotRef, onTakeSnapshot, searchDate, setSearchDate, goldPrices, setGoldPrices }: any) {
  const addRow = () => {
    const newPrice: GoldPrice = {
      id: Math.random().toString(36).substr(2, 9),
      gram: 0,
      price: 0,
      type: 'Antam' // Default or unused
    };
    setGoldPrices([...goldPrices, newPrice]);
  };

  const updateRow = (id: string, field: 'gram' | 'price', value: string) => {
    setGoldPrices(goldPrices.map((p: any) => 
      p.id === id ? { ...p, [field]: Number(value) } : p
    ));
  };

  const removeRow = (id: string) => {
    setGoldPrices(goldPrices.filter((p: any) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ring-gold-500 outline-none"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={addRow}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-gold-600 text-white rounded-xl font-bold hover:bg-gold-700 transition-colors"
          >
            <Plus size={18} /> Tambah Kolom
          </button>
          <button 
            onClick={onTakeSnapshot}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            <Camera size={18} /> Snapshot
          </button>
        </div>
      </div>

      <div ref={snapshotRef} className="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner Logo */}
        <div className="w-full py-6 gold-gradient rounded-2xl mb-6 relative overflow-hidden flex flex-col items-center justify-center text-white">
           <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--gold-200)_0%,_transparent_70%)]" />
           <img 
             src="/logo.png" 
             alt="RUMAISHA SHOP" 
             className="h-24 object-contain relative z-10"
             onError={(e) => {
               e.currentTarget.style.display = 'none';
             }}
           />
           <h1 className="text-white text-xl md:text-2xl font-black italic tracking-widest relative z-10">RUMAISHA SHOP</h1>
           <p className="text-white/80 text-[8px] md:text-xs tracking-[0.3em] uppercase relative z-10">Premium Gold Jewelry</p>
        </div>

        <div className="text-center mb-6">
           <h2 className="text-lg md:text-2xl font-bold text-slate-800 uppercase tracking-tight">Daftar Harga Emas Hari Ini</h2>
           <p className="text-[#070708] italic text-xs md:text-sm">Update: {formatDate(searchDate)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px] sm:text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-900 text-gold-400">
                <th className="p-2 md:p-4 border border-slate-800 first:rounded-tl-xl text-left">Berat (Gram)</th>
                <th className="p-2 md:p-4 border border-slate-800">Harga (Rp)</th>
                <th className="p-2 md:p-4 border border-slate-800 last:rounded-tr-xl w-10"></th>
              </tr>
            </thead>
            <tbody>
              {goldPrices.map((p: any, i: number) => (
                <tr key={p.id} className="text-center group odd:bg-slate-50 hover:bg-gold-50 transition-colors">
                  <td className="p-1 md:p-2 border border-slate-100">
                    <input 
                      type="number"
                      step="0.01"
                      value={p.gram || ''}
                      onChange={(e) => updateRow(p.id, 'gram', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent px-2 py-1 outline-none font-bold text-slate-700 text-left"
                    />
                  </td>
                  <td className="p-1 md:p-2 border border-slate-100">
                    <NumericFormat
                      value={p.price || ''}
                      onValueChange={(values) => updateRow(p.id, 'price', values.value)}
                      thousandSeparator="."
                      decimalSeparator=","
                      placeholder="0"
                      className="w-full bg-transparent px-2 py-1 outline-none text-gold-700 font-medium text-right"
                    />
                  </td>
                  <td className="p-1 md:p-2 border border-slate-100">
                    <button 
                      onClick={() => removeRow(p.id)}
                      className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {goldPrices.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                    Belum ada data. Klik "Tambah Kolom" untuk mengisi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 text-center text-[8px] text-slate-300 uppercase tracking-widest">
          Created with Rumaisha Shop App © 2026
        </div>
      </div>
    </div>
  );
}

function SettingsModule({ pin, onUpdatePin, onExportExcel, onRestoreExcel, onExportPDF }: any) {
  const [newPin, setNewPin] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Lock className="text-gold-600" /> Pengaturan Keamanan
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2 uppercase">PIN Akses Baru</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="4 Digit PIN"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-500 transition-colors"
              />
              <button 
                onClick={() => {
                  if (newPin.length !== 4) return alert('PIN harus 4 digit!');
                  onUpdatePin(newPin);
                  setNewPin('');
                  alert('PIN berhasil diubah!');
                }}
                className="px-6 py-3 gold-gradient text-white rounded-xl font-bold"
              >
                Simpan PIN
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic">PIN digunakan setiap kali Anda menambah atau menghapus data transaksi.</p>
        </div>
      </div>

      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Download className="text-slate-600" /> Cadangan & Export Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={onExportExcel}
            className="flex items-center justify-between p-4 bg-green-50 border border-green-100 hover:bg-green-100 rounded-2xl group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white">
                <FileSpreadsheet size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-green-900 group-hover:translate-x-1 transition-transform" style={{ color: '#075c25' }}>Export Excel</p>
                <p className="text-xs text-green-600" style={{ color: '#058a37' }}>.xlsx (Data Lengkap)</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-2xl group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Upload size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-900 group-hover:translate-x-1 transition-transform" style={{ color: '#024597' }}>Restore Data</p>
                <p className="text-xs text-blue-600" style={{ color: '#032f8b' }}>Import .xlsx</p>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={onRestoreExcel} 
            />
          </button>

          <button 
            onClick={onExportPDF}
            className="flex items-center justify-between p-4 bg-red-50 border border-red-100 hover:bg-red-100 rounded-2xl group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white">
                <FileJson size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-red-900 group-hover:translate-x-1 transition-transform" style={{ color: '#890101' }}>Save as PDF</p>
                <p className="text-xs text-red-600" style={{ color: '#870106' }}>.pdf (Laporan)</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PINDialog({ isOpen, truePin, onClose, onSuccess }: any) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="luxury-card p-8 max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 rounded-full bg-gold-100 text-gold-600 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} />
        </div>
        <h3 className="text-xl font-bold mb-2">Verifikasi PIN</h3>
        <p className="text-slate-500 text-sm mb-6">Masukkan 4-digit PIN keamanan Anda untuk melanjutkan.</p>
        
        <div className="flex flex-col gap-4">
          <input 
            type="password"
            maxLength={4}
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
              if (e.target.value === truePin) {
                onSuccess();
              } else if (e.target.value.length === 4) {
                setError(true);
                setTimeout(() => setInput(''), 500);
              }
            }}
            className={cn(
              "text-center text-3xl font-black tracking-[0.5em] px-4 py-4 rounded-2xl border-2 outline-none transition-all",
              error ? "border-red-500 bg-red-50 text-red-500 animate-shake" : "border-slate-200 bg-slate-50 focus:border-gold-500"
            )}
          />
          {error && <p className="text-red-500 text-xs font-bold">PIN Salah! Silakan coba lagi.</p>}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-medium">Batalkan</button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmDialog({ isOpen, onClose, onConfirm, data, type }: any) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="luxury-card p-8 max-w-md w-full"
      >
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-gold-600" />
          Konfirmasi Simpan Data
        </h3>
        <div className="space-y-3 mb-8 text-sm">
          <div className="flex justify-between border-b border-slate-50 pb-2">
            <span className="text-slate-400 uppercase tracking-tighter font-bold">Jenis</span>
            <span className="font-bold text-gold-700 uppercase">{type === 'purchase' ? 'Pembelian' : 'Penjualan'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-2">
            <span className="text-slate-400">Tanggal</span>
            <span className="font-medium text-slate-800">{formatDate(data.date)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-2">
            <span className="text-slate-400">No Seri</span>
            <span className="font-bold text-slate-800">{data.serialNumber}</span>
          </div>
          <div className="flex justify-between py-2 bg-gold-50 px-2 rounded-lg">
            <span className="font-bold text-gold-900">{type === 'purchase' ? 'Harga Beli' : 'Nilai Transaksi'}</span>
            <span className="font-black text-gold-950 text-lg">
              {formatCurrency(type === 'purchase' ? data.price : data.sellingPrice)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Batal</button>
          <button onClick={onConfirm} className="flex-1 px-6 py-3 gold-gradient text-white rounded-xl font-bold shadow-lg">Konfirmasi</button>
        </div>
      </motion.div>
    </div>
  );
}

function InputGroup({ label, type, ...props }: any) {
  const isCurrency = type === 'currency';
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-black uppercase tracking-wider">{label}</label>
      {isCurrency ? (
        <NumericFormat
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-gold-500 transition-colors"
          thousandSeparator="."
          decimalSeparator=","
          value={props.value}
          onValueChange={(values) => props.onChange(values.value)}
          placeholder={props.placeholder}
        />
      ) : (
        <input 
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-gold-500 transition-colors"
          {...props}
          type={type}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, labelColor, valueColor }: { label: string, value: string, color: 'gold' | 'blue' | 'green', icon: any, labelColor?: string, valueColor?: string }) {
  const colors = {
    gold: "bg-amber-50 border-amber-200 text-amber-950",
    blue: "bg-blue-50 border-blue-200 text-blue-950",
    green: "bg-emerald-50 border-emerald-200 text-emerald-950",
  };

  const iconColors = {
    gold: "bg-amber-200/50 text-amber-700",
    blue: "bg-blue-200/50 text-blue-700",
    green: "bg-emerald-200/50 text-emerald-700",
  }

  return (
    <div className={cn("p-6 rounded-3xl border luxury-card font-sans flex items-start justify-between gap-4", colors[color])}>
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80" style={labelColor ? { color: labelColor } : {}}>{label}</p>
        <p className="text-2xl font-black" style={valueColor ? { color: valueColor } : {}}>{value}</p>
      </div>
      <div className={cn("p-3 rounded-2xl", iconColors[color])}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
  );
}

function BackupReminderDialog({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border border-gold-100"
      >
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
          <FileSpreadsheet size={40} />
        </div>
        <h3 className="text-2xl font-black mb-3 text-slate-800">Backup Data Harian</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Pagi! Demi keamanan data Anda, sangat disarankan untuk melakukan backup data ke Excel setiap hari. <span className="font-bold text-slate-700">Backup sekarang?</span>
        </p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm} 
            className="w-full py-4 gold-gradient text-white rounded-2xl font-black text-lg shadow-xl shadow-gold-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            IYA, BACKUP SEKARANG
          </button>
          <button 
            onClick={onClose} 
            className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold transition-colors"
          >
            Nanti Saja
          </button>
        </div>
      </motion.div>
    </div>
  );
}
