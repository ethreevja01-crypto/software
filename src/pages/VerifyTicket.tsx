import { useState } from 'react';
import { Scan, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft, RefreshCw, QrCode } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import axios from 'axios';
import { API_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';

export default function VerifyTicket() {
    const [ticketId, setTicketId] = useState('');
    const [status, setStatus] = useState<'idle' | 'valid' | 'used' | 'invalid' | 'expired'>('idle');
    const [ticketData, setTicketData] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleScan = (result: string) => {
        if (result) {
            setTicketId(result);
            setShowScanner(false);
            verifyTicket(result);
        }
    };

    const verifyTicket = async (idToVerify?: string) => {
        const id = idToVerify || ticketId;
        if (!id.trim()) return;

        let searchId = id.trim();

        try {
            if (searchId.startsWith('{')) {
                const parsed = JSON.parse(searchId);
                if (parsed.id) {
                    searchId = parsed.id;
                    setTicketId(searchId);
                }
            }
        } catch (e) {
            // Not a JSON string
        }

        setTicketData(null);

        try {
            // Use the verify endpoint to redeem
            const response = await axios.post(`${API_URL}/api/tickets/${searchId}/verify`);
            const ticket = response.data;

            setStatus('valid');
            setTicketData(ticket);
        } catch (e: any) {
            console.error(e);
            if (e.response && e.response.status === 400 && e.response.data?.ticket) {
                // Ticket exists but is used/invalid
                const ticket = e.response.data.ticket;
                if (ticket.status === 'used') {
                    setStatus('used');
                    setTicketData(ticket);
                    return;
                } else if (ticket.status === 'invalid' && e.response.data.message === 'Ticket expired') {
                    setStatus('expired');
                    setTicketData(ticket);
                    return;
                }
            } else if (e.response && e.response.status === 404) {
                // Fallback: Check Local Storage (for immediate sync gap)
                const localTickets = JSON.parse(localStorage.getItem('pos_tickets') || '{}');
                const localTicket = localTickets[searchId];

                if (localTicket) {
                    console.log('Found in local storage, treating as valid (unsynced)');
                    // If local ticket says valid, verify it
                    if (localTicket.status === 'used') {
                        setStatus('used');
                        setTicketData(localTicket);
                    } else {
                        // Attempt to sync it now?
                        // For now, just show valid to unblock the user
                        setStatus('valid');
                        setTicketData({ ...localTicket, _isLocal: true });

                        // Try to background sync it
                        axios.post(`${API_URL}/api/tickets`, localTicket).catch(err => console.error('Background sync failed', err));
                    }
                    return;
                }

                setStatus('invalid');
                return;
            }
            // Fallback for other errors
            setStatus('invalid');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-900">
            <header className="bg-slate-900 text-white p-4 shadow-xl z-10 border-b border-white/10">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/pos')}
                            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors border border-slate-700 hover:border-slate-500"
                        >
                            <ArrowLeft className="text-white" size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">VERIFY TICKET</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wider">ETHREE POS</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl">
                    {/* Main Card */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50">
                        {/* Status Sections */}
                        {status === 'idle' && (
                            <div className="p-12 text-center bg-slate-50/50">
                                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                                    <Scan className="w-10 h-10 text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Ready to Verify</h2>
                                <p className="text-slate-500 text-lg">Scan a QR code or enter ticket ID manually.</p>
                            </div>
                        )}

                        {status === 'valid' && (
                            <div className="p-12 text-center bg-emerald-50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-100">
                                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                                </div>
                                <h2 className="text-3xl font-black text-emerald-800 mb-2 tracking-tight">VALID TICKET</h2>
                                {ticketData._isLocal && (
                                    <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full mb-2 border border-amber-200">
                                        ⚡ Verified Locally (Unsynced)
                                    </span>
                                )}
                                <div className="bg-white/60 rounded-xl p-4 max-w-sm mx-auto backdrop-blur-sm border border-emerald-100">
                                    <p className="text-slate-600 font-semibold text-lg flex justify-between">
                                        <span>Amount:</span>
                                        <span className="text-emerald-700 font-bold">₹{ticketData.amount}</span>
                                    </p>
                                    <p className="text-slate-500 text-sm mt-1">{new Date(ticketData.date).toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {status === 'used' && (
                            <div className="p-12 text-center bg-amber-50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/10 ring-4 ring-amber-100">
                                    <AlertCircle className="w-12 h-12 text-amber-500" />
                                </div>
                                <h2 className="text-3xl font-black text-amber-800 mb-2 tracking-tight">ALREADY USED</h2>
                                <p className="text-amber-700/80 font-medium text-lg">
                                    This ticket was redeemed on<br />
                                    <span className="font-bold text-amber-900">{ticketData.usedAt ? new Date(ticketData.usedAt).toLocaleString() : 'Earlier'}</span>
                                </p>
                            </div>
                        )}

                        {status === 'expired' && (
                            <div className="p-12 text-center bg-orange-50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/10 ring-4 ring-orange-100">
                                    <AlertCircle className="w-12 h-12 text-orange-500" />
                                </div>
                                <h2 className="text-3xl font-black text-orange-800 mb-2 tracking-tight">TICKET EXPIRED</h2>
                                <p className="text-orange-700/80 font-medium text-lg">
                                    This ticket was valid only on<br />
                                    <span className="font-bold text-orange-900">{new Date(ticketData.createdAt).toLocaleDateString()}</span>
                                </p>
                            </div>
                        )}

                        {status === 'invalid' && (
                            <div className="p-12 text-center bg-rose-50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/10 ring-4 ring-rose-100">
                                    <XCircle className="w-12 h-12 text-rose-500" />
                                </div>
                                <h2 className="text-3xl font-black text-rose-800 mb-2 tracking-tight">INVALID TICKET</h2>
                                <p className="text-rose-700/80 font-medium text-lg">This Ticket ID does not exist in the system.</p>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-8 bg-white border-t border-slate-100">
                            {showScanner ? (
                                <div className="rounded-2xl overflow-hidden border-2 border-slate-900 relative bg-black h-64 shadow-inner">
                                    <Scanner
                                        onScan={(result) => result && result[0] && handleScan(result[0].rawValue)}
                                        onError={(error) => console.log(error)}
                                    />
                                    <button
                                        onClick={() => setShowScanner(false)}
                                        className="absolute top-4 right-4 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold hover:bg-white/20 transition-colors border border-white/20 text-sm"
                                    >
                                        Close Camera
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-4">
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="flex-1 bg-slate-900 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] group"
                                    >
                                        <div className="bg-white/10 p-2 rounded-lg group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
                                            <QrCode size={24} />
                                        </div>
                                        <span className="text-lg">Scan QR Code</span>
                                    </button>

                                    <div className="flex-[1.5] relative">
                                        <input
                                            type="text"
                                            value={ticketId}
                                            onChange={(e) => setTicketId(e.target.value)}
                                            placeholder="Manually enter Ticket ID..."
                                            className="w-full h-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono font-medium text-lg placeholder-slate-400"
                                        />
                                        <button
                                            onClick={() => verifyTicket()}
                                            disabled={loading}
                                            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : 'Check'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reset Button */}
                            {status !== 'idle' && !showScanner && (
                                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                                    <button
                                        onClick={() => {
                                            setStatus('idle');
                                            setTicketId('');
                                            setTicketData(null);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 mx-auto transition-colors"
                                    >
                                        <RefreshCw size={14} />
                                        Verify Another Ticket
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
