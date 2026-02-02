import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Ride } from '../data/rides';
import { RideCard } from '../components/RideCard';
import { Cart } from '../components/Cart';
import { Ticket } from '../components/Ticket';
// TicketVerifier removed
import { Ticket as TicketIcon, ScanLine, LogOut, WifiOff, RefreshCw, Printer, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CartItem extends Ride {
    quantity: number;
}

export default function POS() {
    const [cart, setCart] = useState<CartItem[]>([]);
    // currentTicketId and currentTicketDate removed as they were unused state
    const [mobileNumber, setMobileNumber] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
    const [loadingPoints, setLoadingPoints] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | null>(null);
    const [rides, setRides] = useState<Ride[]>([]);
    const [loadingRides, setLoadingRides] = useState(true);
    // State for preview and cropping
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [ticketsToSave, setTicketsToSave] = useState<any[]>([]);
    const [printSettings, setPrintSettings] = useState(() => {
        const saved = localStorage.getItem('efour_print_settings');
        return saved ? JSON.parse(saved) : { top: 0, bottom: 0, left: 0, right: 0, scale: 1 };
    });

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('efour_print_settings', JSON.stringify(printSettings));
    }, [printSettings]);

    const loggedUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

    // State to hold the ticket currently being printed/reprinted
    const [printData, setPrintData] = useState<{
        items: CartItem[];
        total: number;
        date: string;
        id: string;
        mobile: string;
        paymentMode?: string;
        subTickets?: any[];
        skipMaster?: boolean;
        earnedPoints?: number;
    } | null>(null);


    // Offline Logic State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const ticketRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
            navigate('/admin');
        }
    }, [navigate]);

    // Fetch Rides from API
    useEffect(() => {
        const fetchRides = async () => {
            setLoadingRides(true);
            try {
                // Use relative path (/api) in production by default
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                // Append timestamp to prevent caching
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/products?t=${Date.now()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Fetched Rides:', response.data);
                setRides(response.data);
            } catch (error) {
                console.error('Failed to fetch rides', error);
                // Fallback to static rides if API fails? 
                // Better to show error or empty. 
            } finally {
                setLoadingRides(false);
            }
        };
        fetchRides();
    }, []);

    // Monitor Network Status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check for pending tickets
        const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
        setPendingCount(pending.length);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-Sync when Online
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            syncOfflineTickets();
        }
    }, [isOnline, pendingCount]);

    // Fetch Loyalty Points (Debounced)
    useEffect(() => {
        if (mobileNumber.length === 10) {
            const timer = setTimeout(() => {
                fetchLoyaltyPoints(mobileNumber);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setLoyaltyPoints(null);
        }
    }, [mobileNumber]);

    const fetchLoyaltyPoints = async (mobile: string) => {
        setLoadingPoints(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'https://software-tawny-gamma.vercel.app';
            const res = await axios.get(`${API_URL}/api/loyalty/${mobile}`);
            if (res.data.points !== undefined) {
                setLoyaltyPoints(res.data.points);
            }
        } catch (e) {
            console.error('Failed to fetch points', e);
        } finally {
            setLoadingPoints(false);
        }
    };

    const addRewardToCart = useCallback(() => {
        setCart(prev => [...prev, {
            id: 'reward-1',
            name: '🎁 Free Priority Ride',
            price: 0,
            quantity: 1,
            description: 'Loyalty Reward (100 Pts)'
        }]);
    }, []);

    const syncOfflineTickets = async () => {
        setIsSyncing(true);
        const stored = localStorage.getItem('pending_tickets') || '[]';
        let pending: any[];

        try {
            pending = JSON.parse(stored);
        } catch (e) {
            pending = [];
        }

        if (!Array.isArray(pending)) {
            console.error('Pending tickets is not an array, resetting.');
            localStorage.setItem('pending_tickets', '[]');
            setPendingCount(0);
            setIsSyncing(false);
            return;
        }

        if (pending.length === 0) return;

        console.log(`Attempting to sync ${pending.length} tickets to ${import.meta.env.VITE_API_URL || 'https://software-tawny-gamma.vercel.app'}/api/tickets`);
        setIsSyncing(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/tickets`, pending);
            localStorage.setItem('pending_tickets', '[]');
            setPendingCount(0);
            alert(`Synced ${pending.length} offline tickets to server.`);
        } catch (error: any) {
            console.error('Sync failed', error);
            if (error.response?.status === 400) {
                console.error('Bad request, data might be malformed. Clearing queue.');
                localStorage.setItem('pending_tickets', '[]');
                setPendingCount(0);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const addToCart = useCallback((ride: Ride) => {
        setCart(prev => {
            const rideId = ride._id || ride.id;
            const existing = prev.find(item => (item._id || item.id) === rideId);
            if (existing) {
                return prev.map(item =>
                    (item._id || item.id) === rideId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...ride, quantity: 1 }];
        });
    }, []);

    const updateQuantitySimple = useCallback((id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            const itemId = item._id || item.id;
            if (itemId === id) {
                return { ...item, quantity: item.quantity + delta };
            }
            return item;
        }).filter(item => item.quantity > 0));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
    const totalWithTax = total; // Tax removed


    const confirmPrint = async () => {
        // Generate Ticket ID
        const ticketId = `TXN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        const date = new Date().toLocaleString();

        // Removed unused state setters

        const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');

        // Handle Split Saving: Regular Items vs Combo Items
        const ticketsToSave: any[] = [];
        const subTickets: any[] = [];

        // 1. Prepare Regular Summary Ticket (for context/accounting)
        const regularTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const masterTicket = {
            id: ticketId,
            amount: regularTotal,
            date: date,
            items: cart,
            status: 'valid',
            mobile: mobileNumber,
            paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
            createdBy: loggedUser.name || loggedUser.email || 'Cashier',
            createdAt: new Date().toISOString(),
            isCoupon: false // Explicitly mark master ticket
        };
        ticketsToSave.push(masterTicket);

        // 2. Prepare Individual Ride Tickets
        cart.forEach(item => {
            const isCombo = item.name.toLowerCase().includes('combo') || ['19', '20', '21'].includes(item.id);
            if (isCombo) {
                // Special Case: Combo Ride prints 6 tickets per quantity
                for (let i = 0; i < item.quantity * 6; i++) {
                    const subId = `${ticketId}-C${subTickets.length + 1}`;
                    const subTicket = {
                        id: subId,
                        amount: 100, // Fixed price per sub-ticket for combo
                        date: date,
                        items: [{ ...item, quantity: 1, name: item.name.replace(/\(5\s*Rides\)/gi, '(6 Rides)').toUpperCase(), price: 100 }],
                        total: 100,
                        status: 'valid',
                        mobile: mobileNumber,
                        paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
                        createdBy: loggedUser.name || 'Unknown',
                        createdAt: new Date().toISOString(),
                        isCoupon: true,
                        parentId: ticketId
                    };
                    ticketsToSave.push(subTicket);
                    subTickets.push(subTicket);
                }
            } else {
                // General Case: Every other ride prints one ticket per quantity
                for (let i = 0; i < item.quantity; i++) {
                    const subId = `${ticketId}-R${subTickets.length + 1}`;
                    const subTicket = {
                        id: subId,
                        amount: item.price,
                        date: date,
                        items: [{ ...item, quantity: 1 }], // Single ride per ticket
                        status: 'valid',
                        mobile: mobileNumber,
                        paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
                        createdBy: loggedUser.name || 'Unknown',
                        createdAt: new Date().toISOString(),
                        isCoupon: true,
                        parentId: ticketId
                    };
                    ticketsToSave.push(subTicket);
                    subTickets.push(subTicket);
                }
            }
        });

        // Save to localStorage (Legacy/Redundancy)
        const tickets = JSON.parse(localStorage.getItem('pos_tickets') || '{}');
        ticketsToSave.forEach(t => tickets[t.id] = t);
        localStorage.setItem('pos_tickets', JSON.stringify(tickets));

        // Set print data for the Ticket component
        const newPrintData = {
            items: cart,
            total: totalWithTax,
            date: date,
            id: ticketId,
            mobile: mobileNumber,
            paymentMode: paymentMode as string | undefined,
            subTickets: subTickets, // Pass sub-tickets for printing
            skipMaster: true, // Skip summary receipt, print only individual tickets
            earnedPoints: mobileNumber ? (Math.floor(totalWithTax / 100) * 10) : 0
        };

        setPrintData(newPrintData);
        setTicketsToSave(ticketsToSave);
        setShowPrintPreview(true);
    };

    const handlePreviewConfirm = async () => {
        setShowPrintPreview(false);

        // 1. Trigger Print Immediately (Fastest UX)
        setTimeout(() => {
            window.print();
            setShowSuccessModal(true);
            setCart([]);
            setPaymentMode(null);
            setMobileNumber('');
        }, 100);

        // 2. Save to Backend in Background (Non-blocking)
        const saveToBackend = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'https://software-tawny-gamma.vercel.app';
                if (!isOnline) throw new Error('Offline');

                // Bulk Save Tickets
                await axios.post(`${API_URL}/api/tickets`, ticketsToSave);

                // Process Loyalty
                if (mobileNumber && mobileNumber.length === 10) {
                    if (totalWithTax >= 100) {
                        try {
                            const loyaltyRes = await axios.post(`${API_URL}/api/loyalty/earn`, {
                                mobile: mobileNumber,
                                amount: totalWithTax,
                                ticketId: printData?.id || ''
                            });
                            if (loyaltyRes.data.points !== undefined) {
                                setLoyaltyPoints(loyaltyRes.data.points);
                            }
                        } catch (e) { }
                    }
                    const rewardItem = cart.find(i => i.id === 'reward-1');
                    if (rewardItem) {
                        for (let i = 0; i < rewardItem.quantity; i++) {
                            try {
                                await axios.post(`${API_URL}/api/loyalty/redeem`, { mobile: mobileNumber, ticketId: printData?.id || '' });
                            } catch (e) { }
                        }
                    }
                }
            } catch (error) {
                console.log('Background save failed, queueing locally.');
                const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
                ticketsToSave.forEach(t => pending.push(t));
                localStorage.setItem('pending_tickets', JSON.stringify(pending));
                setPendingCount(prev => prev + ticketsToSave.length);
            }
        };

        saveToBackend();
    };

    const handleReprint = async () => {
        if (!printData) return;

        // Security Feature: Generate NEW Ticket ID for reprints to prevent scams/reuse
        // This forces the cashier to account for every printed slip as a new transaction in the system.
        const newTicketId = `TXN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        const date = new Date().toLocaleString();

        const newTicketData = {
            id: newTicketId,
            amount: printData.total, // Fix: backend expects 'amount', printData has 'total'
            date: date,
            items: printData.items,
            mobile: printData.mobile,
            paymentMode: (printData.paymentMode || 'cash') as 'cash' | 'upi',
            status: 'valid',
            createdAt: new Date().toISOString(),
            isCoupon: false
        };

        // Handle SubTickets regeneration if needed
        let newSubTickets: any[] = [];
        if (printData.subTickets && printData.subTickets.length > 0) {
            newSubTickets = printData.subTickets.map((t, index) => {
                const suffix = t.id.includes('-C') ? 'C' : 'R';
                return {
                    ...t,
                    id: `${newTicketId}-${suffix}${index + 1}`,
                    parentId: newTicketId,
                    date: date,
                    createdAt: new Date().toISOString()
                };
            });
        }

        const ticketsToSave = [newTicketData, ...newSubTickets];

        // Update UI State for Printing
        setPrintData({
            ...printData, // Preserve items, earnedPoints, etc.
            date: date,
            id: newTicketId,
            subTickets: newSubTickets
        });

        // Save New Transaction to Backend
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            if (!isOnline) throw new Error('Offline');
            await Promise.all(ticketsToSave.map(t => axios.post(`${API_URL}/api/tickets`, t)));
        } catch (error) {
            console.log('Backend unavailable during reprint, queueing locally.');
            const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
            ticketsToSave.forEach(t => pending.push(t));
            localStorage.setItem('pending_tickets', JSON.stringify(pending));
            setPendingCount(prev => prev + ticketsToSave.length);
        }

        // Wait for state update then print
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Screen Layout */}
            <div className="print:hidden flex flex-col h-screen">
                <header className="bg-slate-900 border-b border-slate-800 text-white p-3 md:p-4 shadow-xl z-20 sticky top-0">
                    <div className="container mx-auto flex items-center justify-between">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-300 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
                                <img
                                    src="logo.jpeg"
                                    alt="ETHREE Logo"
                                    className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-white ring-1 ring-slate-900"
                                />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none flex items-center gap-1.5">ETHREE <span className="text-amber-400">POS</span> <span className="text-xs text-amber-400 font-bold bg-amber-900 px-1 rounded ring-1 ring-amber-500/50">v5.0</span> <span className="text-[9px] bg-sky-500 text-white px-1 rounded-full animate-pulse tracking-tighter shadow-[0_0_10px_rgba(14,165,233,0.5)]">SECURE v5.0</span></h1>

                            </div>

                            {/* User Info */}
                            <div className="hidden lg:flex flex-col border-l border-slate-700 pl-4 ml-2">
                                <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest leading-none mb-1">Authenticated Email</span>
                                <span className="text-xs font-bold text-white tracking-wide">{loggedUser.email || 'staff@company.com'}</span>
                            </div>

                            {/* Status Indicators (Mobile Optimized) */}
                            <div className="ml-2 md:ml-4 flex items-center gap-2">
                                {isOnline ? (
                                    <div className="px-2 py-0.5 md:py-1 bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-500/20 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="hidden md:inline">Online</span>
                                    </div>
                                ) : (
                                    <div className="px-2 py-0.5 md:py-1 bg-rose-500/10 text-rose-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-rose-500/20 backdrop-blur-sm">
                                        <WifiOff size={10} />
                                        <span>Offline</span>
                                    </div>
                                )}

                                {pendingCount > 0 && (
                                    <div className="px-2 py-0.5 md:py-1 bg-amber-500/10 text-amber-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-amber-500/20">
                                        <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                                        <span>{pendingCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:gap-4">
                            <button
                                onClick={() => navigate('/verify')}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all border border-slate-700 active:scale-95"
                            >
                                <ScanLine size={18} />
                                <span className="hidden md:inline font-bold text-sm">Verify</span>
                            </button>

                            <div className="h-6 md:h-8 w-px bg-slate-800 mx-0.5"></div>

                            <button
                                onClick={handleLogout}
                                className="group relative p-2 md:px-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                                title="Logout"
                            >
                                <div className="hidden sm:flex flex-col items-end mr-1 lg:hidden">
                                    <span className="text-[10px] font-bold text-white leading-none mb-0.5">{loggedUser.name?.split(' ')[0]}</span>
                                    <span className="text-[8px] font-bold text-slate-500 tracking-tighter uppercase">{loggedUser.role}</span>
                                </div>
                                <LogOut size={20} className="relative z-10" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden container mx-auto p-4 flex gap-6">
                    <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2 pb-20 md:pb-0 custom-scrollbar">
                            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-3 text-blue-950 sticky top-0 bg-slate-100 z-10 py-2">
                                <span className="w-1.5 h-6 md:h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-sm"></span>
                                Available Rides
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 md:gap-3 pb-24 md:pb-0">
                                {loadingRides ? (
                                    <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400">
                                        <RefreshCw size={32} className="animate-spin mb-2" />
                                        <span className="text-sm font-bold">Loading rides...</span>
                                    </div>
                                ) : rides.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                                            <TicketIcon size={40} className="opacity-20" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-500">NO RIDES AVAILABLE</h3>
                                        <p className="text-sm">Check your connection or try refreshing.</p>
                                        <p className="text-[10px] bg-slate-200 px-2 py-0.5 rounded mt-4 font-mono">API: {import.meta.env.VITE_API_URL || 'RELATIVE'}</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
                                        >
                                            REFRESH NOW
                                        </button>
                                    </div>
                                ) : (
                                    rides.map(ride => (
                                        <RideCard key={ride._id || ride.id} ride={ride} onAdd={addToCart} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Cart Sidebar */}
                    <div className="hidden md:block w-[350px] lg:w-[400px] shrink-0 border-l border-slate-200 pl-4 bg-slate-100 h-full">
                        <Cart
                            items={cart}
                            onUpdateQuantity={updateQuantitySimple}
                            onClear={clearCart}
                            onPrint={confirmPrint}
                            paymentMode={paymentMode}
                            onPaymentModeChange={setPaymentMode}
                            mobileNumber={mobileNumber}
                            onMobileNumberChange={setMobileNumber}
                            loyaltyPoints={loyaltyPoints}
                            loadingPoints={loadingPoints}
                            onAddReward={addRewardToCart}
                            hasReward={!!cart.find(i => i.id === 'reward-1')}
                        />
                    </div>
                </main>

                {/* Mobile Cart Floating Button */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
                    {cart.length > 0 && (
                        <button
                            onClick={() => setShowMobileCart(true)}
                            className="w-full bg-slate-900 text-white rounded-xl p-4 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </div>
                                <span className="font-bold text-lg">View Cart</span>
                            </div>
                            <span className="font-mono text-xl font-black text-amber-400">₹{totalWithTax}</span>
                        </button>
                    )}
                </div>

                {/* Mobile Cart Modal */}
                {showMobileCart && (
                    <div className="md:hidden fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in slide-in-from-bottom duration-200">
                        <div className="bg-white p-4 flex items-center justify-between shadow-sm border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
                            <button
                                onClick={() => setShowMobileCart(false)}
                                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-4">
                            <Cart
                                items={cart}
                                onUpdateQuantity={updateQuantitySimple}
                                onClear={clearCart}
                                onPrint={confirmPrint}
                                paymentMode={paymentMode}
                                onPaymentModeChange={setPaymentMode}
                                mobileNumber={mobileNumber}
                                onMobileNumberChange={setMobileNumber}
                                loyaltyPoints={loyaltyPoints}
                                loadingPoints={loadingPoints}
                                onAddReward={addRewardToCart}
                                hasReward={!!cart.find(i => i.id === 'reward-1')}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Print Layout - Managed by visibility rules in Ticket.tsx */}
            <div className="hidden print:block print-container" style={{ width: '3in' }}>
                <div className="p-0">
                    <Ticket
                        ref={ticketRef}
                        items={printData?.items || []}
                        total={printData?.total || 0}
                        date={printData?.date || ''}
                        ticketId={printData?.id || ''}
                        mobileNumber={printData?.mobile || ''}
                        subTickets={printData?.subTickets}
                        skipMaster={printData?.skipMaster}
                        earnedPoints={printData?.earnedPoints}
                        settings={printSettings}
                    />
                </div>
            </div>

            {/* Print Preview Modal */}
            {showPrintPreview && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[70] p-4 print:hidden overflow-hidden">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in slide-in-from-bottom-10 duration-500 ring-1 ring-white/20">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">PRINT PREVIEW</h3>
                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-200">Interactive Crop</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Drag handles to adjust margins & prevent cutting</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPrintSettings({ top: 0, bottom: 0, left: 0, right: 0, scale: 1 })}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowPrintPreview(false)}
                                    className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Area with Cropping */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 custom-scrollbar relative select-none">
                            <div className="relative mx-auto" style={{ width: 'fit-content' }}>
                                {/* Draggable Crop Controls Overlay */}
                                <div className="absolute inset-0 z-20 pointer-events-none border-2 border-dashed border-sky-400/50 rounded-sm">
                                    {/* Top Handle */}
                                    <div
                                        className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto group z-30 flex items-center justify-center"
                                        onMouseDown={(e) => {
                                            const startY = e.clientY;
                                            const startTop = printSettings.top;
                                            const move = (moveEvent: MouseEvent) => {
                                                const delta = moveEvent.clientY - startY;
                                                setPrintSettings((prev: any) => ({ ...prev, top: Math.max(0, startTop + delta) }));
                                            };
                                            const end = () => {
                                                window.removeEventListener('mousemove', move);
                                                window.removeEventListener('mouseup', end);
                                            };
                                            window.addEventListener('mousemove', move);
                                            window.addEventListener('mouseup', end);
                                        }}
                                    >
                                        <div className="w-12 h-1 bg-sky-500 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute bottom-full mb-1 bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            Top: {(printSettings.top / 96).toFixed(2)}"
                                        </div>
                                    </div>

                                    {/* Bottom Handle */}
                                    <div
                                        className="absolute -bottom-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto group z-30 flex items-center justify-center"
                                        onMouseDown={(e) => {
                                            const startY = e.clientY;
                                            const startBottom = printSettings.bottom;
                                            const move = (moveEvent: MouseEvent) => {
                                                const delta = startY - moveEvent.clientY;
                                                setPrintSettings((prev: any) => ({ ...prev, bottom: Math.max(0, startBottom + delta) }));
                                            };
                                            const end = () => {
                                                window.removeEventListener('mousemove', move);
                                                window.removeEventListener('mouseup', end);
                                            };
                                            window.addEventListener('mousemove', move);
                                            window.addEventListener('mouseup', end);
                                        }}
                                    >
                                        <div className="w-12 h-1 bg-sky-500 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute top-full mt-1 bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            Bottom: {(printSettings.bottom / 96).toFixed(2)}"
                                        </div>
                                    </div>

                                    {/* Horizontal Shift Handle (Left/Right Offset) */}
                                    <div
                                        className="absolute inset-y-0 -left-6 w-12 cursor-ew-resize pointer-events-auto group z-30 flex flex-col items-center justify-center gap-1"
                                        onMouseDown={(e) => {
                                            const startX = e.clientX;
                                            const startLeft = printSettings.left;
                                            const move = (moveEvent: MouseEvent) => {
                                                const delta = moveEvent.clientX - startX;
                                                setPrintSettings((prev: any) => ({ ...prev, left: startLeft + delta }));
                                            };
                                            const end = () => {
                                                window.removeEventListener('mousemove', move);
                                                window.removeEventListener('mouseup', end);
                                            };
                                            window.addEventListener('mousemove', move);
                                            window.addEventListener('mouseup', end);
                                        }}
                                    >
                                        <div className="w-1.5 h-16 bg-sky-500 rounded-full opacity-40 group-hover:opacity-100 transition-opacity shadow-sm"></div>
                                        <div className="absolute right-full mr-2 bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            Shift: {(printSettings.left / 96).toFixed(2)}"
                                        </div>
                                    </div>

                                    {/* Scale Handle (Bottom Right Corner) */}
                                    <div
                                        className="absolute -bottom-6 -right-6 w-12 h-12 cursor-nwse-resize pointer-events-auto group z-40 flex items-center justify-center"
                                        onMouseDown={(e) => {
                                            const startY = e.clientY;
                                            const startScale = printSettings.scale || 1;
                                            const move = (moveEvent: MouseEvent) => {
                                                const delta = startY - moveEvent.clientY;
                                                const newScale = Math.max(0.5, Math.min(1.5, startScale + (delta / 200)));
                                                setPrintSettings((prev: any) => ({ ...prev, scale: newScale }));
                                            };
                                            const end = () => {
                                                window.removeEventListener('mousemove', move);
                                                window.removeEventListener('mouseup', end);
                                            };
                                            window.addEventListener('mousemove', move);
                                            window.addEventListener('mouseup', end);
                                        }}
                                    >
                                        <div className="w-4 h-4 border-r-4 border-b-4 border-sky-500 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute top-full mt-2 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            Size: {(printSettings.scale * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden" style={{ width: '3in' }}>
                                    <Ticket
                                        items={printData?.items || []}
                                        total={printData?.total || 0}
                                        date={printData?.date || ''}
                                        ticketId={printData?.id || ''}
                                        mobileNumber={printData?.mobile || ''}
                                        subTickets={printData?.subTickets}
                                        skipMaster={printData?.skipMaster}
                                        earnedPoints={printData?.earnedPoints}
                                        isPreview={true}
                                        settings={printSettings}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 bg-white rounded-b-3xl grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowPrintPreview(false)}
                                className="w-full px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98] uppercase text-xs tracking-widest border border-slate-200"
                            >
                                Cancel / Edit
                            </button>
                            <button
                                onClick={handlePreviewConfirm}
                                className="w-full px-4 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                            >
                                <Printer size={18} />
                                Confirm & Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-in fade-in zoom-in duration-300 ring-1 ring-slate-900/5">
                        <div className="mx-auto bg-emerald-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner">
                            <TicketIcon className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Printing Complete</h2>
                        {printData?.earnedPoints && printData.earnedPoints > 0 ? (
                            <div className="mb-8">
                                <p className="text-slate-500 text-lg leading-relaxed">Please collect your tickets.</p>
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
                                    <span>✨ Earned {printData.earnedPoints} Loyalty Points</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 mb-8 text-lg leading-relaxed">Please collect your tickets from the printer.</p>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={closeSuccessModal}
                                className="w-full px-4 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 text-lg active:scale-[0.98]"
                            >
                                Done
                            </button>
                            <button
                                onClick={handleReprint}
                                className="w-full px-4 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-base flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Reprint Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
