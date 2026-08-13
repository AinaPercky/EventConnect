import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../components/AuthContext.tsx';
import { Participant } from '../types.ts';
import { CheckCircle2, XCircle, Loader2, ScanLine } from 'lucide-react';

export default function Scan() {
  const { getToken } = useAuth();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; participant?: Participant } | null>(null);

  useEffect(() => {
    // Check if token is in URL
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get('token');
    
    if (tokenFromUrl && !scannedData && !loading && !result) {
      setScannedData(tokenFromUrl);
      // Clean up URL so refresh doesn't resubmit
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Only init if we haven't scanned yet
    if (scannedData || loading || result) return;

    const scanner = new Html5QrcodeScanner('reader', { 
      qrbox: { width: 250, height: 250 },
      fps: 10,
      videoConstraints: { facingMode: "environment" }
    }, false);

    scanner.render(
      (decodedText) => {
        scanner.pause(true);
        // Extract token if it's a full URL
        let tokenToProcess = decodedText;
        try {
          const url = new URL(decodedText);
          tokenToProcess = url.searchParams.get('token') || decodedText;
        } catch {
          // not a URL, keep decodedText as tokenToProcess
        }
        setScannedData(tokenToProcess);
      },
      (error) => {
        // Handle scan errors quietly
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [scannedData, loading, result]);

  useEffect(() => {
    if (!scannedData) return;

    const processScan = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token: scannedData })
        });
        
        const data = await res.json();
        if (res.ok) {
          setResult({ success: true, message: "Présence validée", participant: data });
        } else {
          setResult({ 
            success: false, 
            message: data.error || "Erreur de scan", 
            participant: data.participant 
          });
        }
      } catch (err) {
        setResult({ success: false, message: "Erreur réseau" });
      }
      setLoading(false);
    };

    processScan();
  }, [scannedData]);

  const resetScan = () => {
    setScannedData(null);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Scan Émargement</h1>
        <p className="text-slate-600 mt-2">Scannez le badge QR d'un participant pour valider son entrée.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {(!scannedData && !result) ? (
          <div className="p-6 bg-slate-900">
            <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-white shadow-lg"></div>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center text-slate-500">
                <Loader2 className="animate-spin w-12 h-12 mb-4 text-blue-600" />
                <p className="font-medium text-lg">Validation en cours...</p>
              </div>
            ) : result ? (
              <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
                {result.success ? (
                  <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                ) : (
                  <XCircle className="w-20 h-20 text-rose-500" />
                )}
                
                <h2 className={`text-2xl font-bold ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {result.message}
                </h2>
                
                {result.participant && (
                  <div className="bg-slate-50 px-8 py-6 rounded-xl border border-slate-200 text-left mt-4 w-full max-w-sm shadow-sm">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Participant</p>
                    <p className="text-xl font-bold text-slate-900">{result.participant.firstName} {result.participant.lastName}</p>
                    {result.participant.organization && (
                      <p className="text-slate-600 mt-1">{result.participant.organization}</p>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={resetScan}
                  className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center shadow-sm"
                >
                  <ScanLine className="w-5 h-5 mr-2" />
                  Scanner un autre badge
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Loader2 className="animate-spin w-12 h-12 mb-4 text-blue-600" />
                <p className="font-medium text-lg">Traitement du badge...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
