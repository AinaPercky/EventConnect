import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { Participant } from '../types.ts';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Users, UserCheck, UserX, Download, Plus, QrCode, Printer, Upload } from 'lucide-react';

export default function Dashboard() {
  const { getToken } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Participant Form
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', emailOrPhone: '', organization: '' });

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let mounted = true;

    const fetchInitial = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const res = await fetch('/api/participants', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && mounted) {
          const data = await res.json();
          setParticipants(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInitial();

    const setupSSE = async () => {
      const token = await getToken();
      if (!token) return;
      // We append token in URL query since EventSource doesn't support headers natively, or we use a polyfill.
      // Wait, standard EventSource doesn't support Bearer auth.
      // For simplicity, we can fallback to polling, or pass token in URL.
      // Let's just do polling every 3 seconds for this context to avoid SSE auth issues in standard browsers without polyfills.
    };
    
    // Polling fallback
    const interval = setInterval(fetchInitial, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ firstName: '', lastName: '', emailOrPhone: '', organization: '' });
      // Polling will pick up the update
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      // Skip header if it exists
      const startIndex = lines[0].toLowerCase().includes('prénom') ? 1 : 0;
      const newParticipants = [];

      for (let i = startIndex; i < lines.length; i++) {
        // Simple CSV parse. Assuming Format: Prénom,Nom,Email ou Téléphone,Organisation
        const [firstName, lastName, emailOrPhone, organization] = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (firstName && lastName && emailOrPhone) {
          newParticipants.push({ firstName, lastName, emailOrPhone, organization });
        }
      }

      if (newParticipants.length > 0) {
        const replace = window.confirm(
          "Voulez-vous VIDER la liste actuelle des participants avant d'importer ce fichier ?\n\n" +
          "• OK : Effacer l'ancienne liste et remplacer par le fichier.\n" +
          "• Annuler : Conserver l'ancienne liste et ajouter ceux du fichier à la suite."
        );

        const token = await getToken();
        await fetch('/api/participants/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ participants: newParticipants, replace })
        });
        
        // Force reload to get fresh data with DB IDs and Tokens
        window.location.reload();
      }
    };
    reader.readAsText(file);
  };

  const generatePDF = async (list: Participant[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const badgeWidth = 85;
    const badgeHeight = 55;
    const marginX = 20;
    const marginY = 20;
    const spaceX = 10;
    const spaceY = 10;
    
    let x = marginX;
    let y = marginY;

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      
      // Draw Badge Border
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3);
      
      // Top header color band
      doc.setFillColor(37, 99, 235); // Blue-600
      doc.roundedRect(x, y, badgeWidth, 12, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("ÉVÈNEMENT OFFICIEL", x + badgeWidth / 2, y + 8, { align: 'center' });
      
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFontSize(14);
      doc.text(`${p.firstName} ${p.lastName}`, x + 5, y + 25);
      
      if (p.organization) {
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(p.organization, x + 5, y + 32);
      }
      
      // Generate QR
      const scanUrl = `${window.location.origin}/scan?token=${p.qrCodeToken}`;
      const qrData = await QRCode.toDataURL(scanUrl, { width: 100, margin: 1 });
      // Add QR image to PDF
      doc.addImage(qrData, 'PNG', x + badgeWidth - 35, y + 18, 30, 30);
      
      // Move to next position (2 columns grid)
      if (x === marginX) {
        x += badgeWidth + spaceX;
      } else {
        x = marginX;
        y += badgeHeight + spaceY;
      }
      
      // Add new page if out of space
      if (y + badgeHeight > 297 - marginY && i < list.length - 1) {
        doc.addPage();
        x = marginX;
        y = marginY;
      }
    }
    
    doc.save("badges.pdf");
  };

  const presentCount = participants.filter(p => p.status === 'present').length;
  const registeredCount = participants.length;

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">EventConnect Summit</h2>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">En Direct</span>
        </div>
        <div className="flex items-center space-x-4">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center shadow-sm">
            <Upload className="w-4 h-4 mr-2" />
            Importer CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nouveau Participant
          </button>
          <div className="text-slate-400 text-sm hidden sm:block">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>
      
      <div className="p-8 flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inscrits</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{registeredCount}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Présents</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{presentCount}</span>
              <span className="text-xs text-emerald-500 font-medium">
                {registeredCount > 0 ? Math.round((presentCount / registeredCount) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Attente Scan</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{registeredCount - presentCount}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
             <a href="/register" target="_blank" className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center flex items-center justify-center hover:text-blue-600 transition-colors">
              <QrCode className="w-4 h-4 mr-1" /> Lien QR Inscription
             </a>
          </div>
        </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Nouvel Ajout Rapide</h3>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600 uppercase">Prénom</label>
              <input required type="text" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600 uppercase">Nom</label>
              <input required type="text" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600 uppercase">Email / Tél</label>
              <input required type="text" value={formData.emailOrPhone} onChange={e=>setFormData({...formData, emailOrPhone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm" />
            </div>
            <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors h-[42px]">
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors h-[42px]">
              Annuler
            </button>
          </form>
        </div>
      )}

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Derniers Émargements</h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => {
                  const csv = [
                    ['Nom', 'Prenom', 'Contact', 'Organisation', 'Statut', 'Heure Arrivee'].join(','),
                    ...participants.map(p => [
                      `"${p.lastName}"`,
                      `"${p.firstName}"`,
                      `"${p.emailOrPhone}"`,
                      `"${p.organization || ''}"`,
                      p.status,
                      p.scannedAt ? `"${new Date(p.scannedAt).toLocaleString()}"` : ''
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'participants.csv';
                  a.click();
                }}
                className="text-blue-600 text-xs font-semibold hover:underline flex items-center"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </button>
              <button 
                onClick={() => generatePDF(participants)}
                className="text-blue-600 text-xs font-semibold hover:underline flex items-center"
              >
                <Printer className="w-3 h-3 mr-1" />
                Badges PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase font-bold">
                <tr>
                  <th className="px-6 py-3">Participant</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Organisation</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3">Heure d'arrivée</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.firstName} {p.lastName}</td>
                    <td className="px-6 py-4 text-slate-500">{p.emailOrPhone}</td>
                    <td className="px-6 py-4 text-slate-500">{p.organization || '-'}</td>
                    <td className="px-6 py-4">
                      {p.status === 'present' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">Présent</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">Attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.scannedAt ? new Date(p.scannedAt).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => generatePDF([p])}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-md hover:underline"
                      >
                        Badge
                      </button>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Aucun participant inscrit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
