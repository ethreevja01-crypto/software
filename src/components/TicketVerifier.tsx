import { useState } from 'react';
import { Scan, CheckCircle, XCircle, AlertCircle, Camera, Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import axios from 'axios';

export function TicketVerifier() {
    const [ticketId, setTicketId] = useState('');
    const [status, setStatus] = useState<'idle' | 'valid' | 'used' | 'invalid'>('idle');
    const [ticketData, setTicketData] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [loading, setLoading] = useState(false);

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

        // Try to parse if it's a JSON string (from QR scan)
        try {
            if (searchId.startsWith('{')) {
                const parsed = JSON.parse(searchId);
                if (parsed.id) {
                    searchId = parsed.id;
                    setTicketId(searchId);
                }
            }
        } catch (e) {
            // Not a JSON string, assume raw ID
        }

        setLoading(true);
        setStatus('idle');
        setTicketData(null);

        try {
            // Backend lookup
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await axios.get(`${API_URL}/api/tickets/${searchId}`);
            const ticket = response.data;

            if (ticket.status === 'used') {
                setStatus('used');
                setTicketData(ticket);
            } else {
                setStatus('valid');
                setTicketData(ticket);
            }
        } catch (e) {
            console.error(e);
            setStatus('invalid');
        } finally {
            setLoading(false);
        }
    };

    // redeemTicket removed as it was unused implementation logic

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-md mx-auto mt-8">
            <div className="flex items-center gap-2 mb-4">
                <Scan className="w-6 h-6 text-blue-900" />
                <h2 className="text-xl font-bold text-slate-800">Verify Ticket</h2>
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="Enter Ticket ID"
                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                <button
                    onClick={() => setShowScanner(!showScanner)}
                    className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300"
                    title="Toggle Camera"
                >
                    <Camera size={20} />
                </button>
                <button
                    onClick={() => verifyTicket()}
                    disabled={loading}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin w-4 h-4" />}
                    Verify
                </button>
            </div>

            {showScanner && (
                <div className="mb-6 rounded-lg overflow-hidden border border-slate-300 relative bg-black">
                    <Scanner
                        onScan={(result) => result && result[0] && handleScan(result[0].rawValue)}
                        onError={(error) => console.log(error)}
                    />
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            onClick={() => setShowScanner(false)}
                            className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'valid' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col items-center text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                    <h3 className="text-emerald-700 font-bold text-lg">QR Verified</h3>
                    <p className="text-emerald-600 text-sm mb-4">Amount: ₹{ticketData.amount} | Date: {ticketData.date}</p>
                </div>
            )}

            {status === 'used' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col items-center text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
                    <h3 className="text-amber-700 font-bold text-lg">QR Expired / Used</h3>
                    <p className="text-amber-600 text-sm">Used at: {ticketData.usedAt ? new Date(ticketData.usedAt).toLocaleString() : 'Previously'}</p>
                </div>
            )}

            {status === 'invalid' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col items-center text-center">
                    <XCircle className="w-12 h-12 text-red-500 mb-2" />
                    <h3 className="text-red-700 font-bold text-lg">Invalid Ticket</h3>
                    <p className="text-red-600 text-sm">This ticket ID does not exist in the system.</p>
                </div>
            )}
        </div>
    );
}
