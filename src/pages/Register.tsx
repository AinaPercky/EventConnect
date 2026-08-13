import React, { useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Loader2, QrCode } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    emailOrPhone: '',
    organization: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        // Generate QR Code image
        const scanUrl = `${window.location.origin}/scan?token=${data.qrCodeToken}`;
        const url = await QRCode.toDataURL(scanUrl);
        setQrDataUrl(url);
        setSuccess(true);
      } else {
        alert(data.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau');
    }
    setLoading(false);
  };

  if (success && qrDataUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Inscription validée !</h2>
            <p className="text-slate-600 mt-2">
              Merci {formData.firstName}. Vous êtes maintenant enregistré en tant que présent.
            </p>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block shadow-sm">
            <img src={qrDataUrl} alt="Votre QR Code" className="w-48 h-48 mx-auto mix-blend-multiply" />
            <p className="text-sm text-slate-500 mt-2 font-medium">Votre badge d'accès</p>
          </div>
          
          <button 
            onClick={() => { setSuccess(false); setFormData({firstName: '', lastName: '', emailOrPhone: '', organization: ''}); setQrDataUrl(null); }}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Nouvelle inscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
          <QrCode size={32} />
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
          Bienvenue !
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Veuillez remplir ce formulaire pour vous enregistrer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Prénom</label>
                <div className="mt-1">
                  <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Nom</label>
                <div className="mt-1">
                  <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Email ou Téléphone</label>
              <div className="mt-1">
                <input required type="text" value={formData.emailOrPhone} onChange={e => setFormData({...formData, emailOrPhone: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Organisation <span className="text-slate-400 font-normal">(Optionnel)</span></label>
              <div className="mt-1">
                <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <button disabled={loading} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'VALIDER MA PRÉSENCE'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
