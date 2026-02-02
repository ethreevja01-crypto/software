import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, RefreshCw, Receipt, Search, ArrowLeft } from 'lucide-react';

interface Ticket {
    _id: string;
    id: string;
    amount: number;
    date: string;
    mobile?: string;
    paymentMode?: string;
    createdAt: string;
    items: any[];
}

export default function Accounts() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await axios.get(`${API_URL}/api/tickets`);
            // Filter only UPI tickets for Accounts page
            const upiTickets = response.data.filter((t: any) => t.paymentMode?.toLowerCase() === 'upi');
            setTickets(upiTickets);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const downloadCSV = () => {
        if (tickets.length === 0) return;

        const headers = ['Ticket ID', 'Date', 'Amount', 'Mobile', 'Payment Mode', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...tickets.map(t => [
                t.id,
                `"${t.date}"`,
                t.amount,
                t.mobile || '',
                t.paymentMode?.toLowerCase() || 'upi',
                t.createdAt
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `upi_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalRevenue = tickets.reduce((sum, t) => sum + t.amount, 0);

    const filteredTickets = tickets.filter(t => {
        const idMatch = t.id ? t.id.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const mobileMatch = t.mobile ? t.mobile.includes(searchTerm) : false;
        return idMatch || mobileMatch;
    });

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-blue-900 text-white shadow-xl sticky top-0 z-20 border-b border-white/10">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none text-white">UPI ACCOUNTS</h1>
                            <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mt-0.5">Payment Tracking</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2 border-r border-white/20 pr-4">
                            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mb-0.5">Authenticated</span>
                            <span className="text-sm font-black text-white">{JSON.parse(localStorage.getItem('user') || '{}').email || 'Admin'}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-blue-800 hover:bg-rose-600 text-white p-2.5 rounded-xl transition-all shadow-lg border border-blue-700 hover:border-rose-500 group"
                            title="Logout"
                        >
                            <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-6 max-w-7xl">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-bold uppercase mb-1">Total UPI Revenue</p>
                        <p className="text-3xl font-black text-blue-600">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-bold uppercase mb-1">UPI Transactions</p>
                        <p className="text-3xl font-black text-slate-900">{tickets.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-bold uppercase mb-1">Average UPI Txn</p>
                        <p className="text-3xl font-black text-slate-900">
                            ₹{tickets.length > 0 ? Math.round(totalRevenue / tickets.length).toLocaleString() : 0}
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search UPI transactions..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchTickets}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            disabled={loading}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={downloadCSV}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                            disabled={loading || tickets.length === 0}
                        >
                            <Download size={18} />
                            <span>Export UPI CSV</span>
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                    <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <RefreshCw size={32} className="animate-spin mb-3 text-slate-300" />
                                                <span className="font-medium">Loading UPI records...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            No UPI transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTickets.map((ticket) => (
                                        <tr key={ticket._id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-50 p-2 rounded-lg text-blue-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <Receipt size={16} />
                                                    </div>
                                                    <span className="font-mono text-sm font-bold text-slate-700">{ticket.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {ticket.mobile ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {ticket.mobile}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-blue-600 font-black text-base">₹{ticket.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-sm">
                                                    UPI
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
