import type { Ride } from '../data/rides';
import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface CartItem extends Ride {
    quantity: number;
}

interface TicketProps {
    items: CartItem[];
    total: number;
    date: string;
    ticketId: string;
    mobileNumber?: string;
    earnedPoints?: number;
}

interface TicketProps {
    items: CartItem[];
    total: number;
    date: string;
    ticketId: string;
    mobileNumber?: string;
    earnedPoints?: number;
    settings?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
        scale?: number;
    };
}

export const Ticket = forwardRef<HTMLDivElement, TicketProps & { subTickets?: any[], skipMaster?: boolean, isPreview?: boolean }>(({ items, total, date, ticketId, mobileNumber, subTickets, skipMaster, earnedPoints, isPreview, settings: margins }, ref) => {

    const TicketContent = ({ data, isCoupon = false, items: ticketItems, total: ticketTotal, hasPageBreak = false }: { data: any, isCoupon?: boolean, items?: CartItem[], total?: number, hasPageBreak?: boolean }) => {
        const displayItems = ticketItems || items;
        const displayTotal = ticketTotal !== undefined ? ticketTotal : total;

        const content = (
            <div className={`bg-white text-black font-mono w-full ticket-content ${hasPageBreak ? 'page-break-before' : ''}`}
                style={{
                    pageBreakBefore: hasPageBreak ? 'always' : 'auto',
                    width: '3in',
                    backgroundColor: 'white',
                    margin: isPreview ? '0 auto' : '0',
                    paddingTop: margins ? `${margins.top}px` : '0',
                    paddingBottom: margins ? `${margins.bottom}px` : '0',
                    /* Horizontal Shift (Offset) */
                    transformOrigin: 'top center',
                    transform: `translateX(${(margins?.left || 0) - (margins?.right || 0)}px) scale(${margins?.scale || 1})`,
                }}
            >
                <style>{`
                    @media print {
                        @page { 
                            margin: 0 !important; 
                            size: 3in auto !important;
                        }
                        html, body {
                            width: 3in !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            overflow: visible !important;
                        }
                        .print-container {
                            display: block !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 3in !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            z-index: 99999 !important;
                        }
                        .page-break-before {
                            page-break-before: always !important;
                        }
                        /* Apply offsets and padding in print */
                        .ticket-content {
                            padding-top: ${margins?.top || 0}px !important;
                            padding-bottom: ${margins?.bottom || 0}px !important;
                            transform-origin: top center !important;
                            transform: translateX(${(margins?.left || 0) - (margins?.right || 0)}px) scale(${margins?.scale || 1}) !important;
                        }
                    }
                `}</style>

                <div className="flex w-full gap-0 items-stretch border-t-2 border-black">
                    {/* Left Side: Branding and Critical Info (65% width) */}
                    <div className="w-[65%] flex flex-col justify-between text-center border-r-2 border-dashed border-black pr-1 pl-1">
                        <div className="pt-0">
                            <h1 className="font-black leading-none" style={{ fontSize: '26pt' }}>ETHREE</h1>
                            <p className="font-black italic leading-none uppercase" style={{ fontSize: '7.5pt', letterSpacing: '0.05em' }}>EAT ENJOY ENTERTAIN</p>
                            <div className="mt-1 border-y border-black py-0.5">
                                <span className="font-black" style={{ fontSize: '9pt' }}>📞 70369 23456</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center border-y-2 border-dashed border-black/20 py-0.5">
                            {isCoupon ? (
                                <div className="border-2 border-black text-black px-1.5 py-1.5">
                                    <span className="font-black leading-tight uppercase block" style={{ fontSize: '18pt' }}>{displayItems[0]?.name || 'ANY RIDE'}</span>
                                    <div className="flex justify-between items-center border-t border-black mt-1 pt-1">
                                        <span className="font-bold uppercase" style={{ fontSize: '8pt' }}>PASS • ETHREE</span>
                                        <span className="font-black" style={{ fontSize: '10pt' }}>₹{ticketTotal}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-0.5 text-left px-1">
                                    <div className="uppercase font-black border-b-2 border-black mb-1 flex justify-between" style={{ fontSize: '9pt' }}>
                                        <span>ITEMS</span>
                                        <span>PRICE</span>
                                    </div>
                                    {displayItems.map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="font-black leading-tight flex justify-between" style={{ fontSize: '9.5pt' }}>
                                            <span className="pr-1">{item.quantity}x {item.name.toUpperCase()}</span>
                                            <span>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t-2 border-black pt-1">
                            {!isCoupon ? (
                                <div className="flex flex-col items-center leading-none pb-1">
                                    <div className="mb-1">
                                        <span className="font-black uppercase block" style={{ fontSize: '8pt' }}>{date}</span>
                                    </div>
                                    <div className="flex items-end justify-center">
                                        <span className="font-black pr-1 mb-1" style={{ fontSize: '10pt' }}>TOTAL</span>
                                        <span className="font-black tracking-tighter" style={{ fontSize: '52pt' }}>₹{displayTotal}</span>
                                    </div>
                                    {earnedPoints ? <span className="font-black italic bg-black text-white px-2 mt-0.5" style={{ fontSize: '8pt' }}>★ {earnedPoints} PTS ★</span> : null}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center px-1 pb-1">
                                    <span className="font-black uppercase" style={{ fontSize: '8pt' }}>{date}</span>
                                    <span className="font-black uppercase border-t border-black mt-1 w-full" style={{ fontSize: '8pt' }}>ID:{data.id.slice(-6).toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: QR Code and Verify (35% width) */}
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                        <div className="mb-2">
                            <span style={{ fontSize: '8.5pt' }} className="font-black uppercase block border-b border-black pb-0.5">ID: {data.id.slice(-6).toUpperCase()}</span>
                        </div>

                        <div className="bg-white border-2 border-black p-1.5 shadow-sm">
                            <QRCodeSVG value={JSON.stringify({ id: data.id })} size={100} level="M" />
                        </div>

                        <span className="font-black uppercase leading-none mt-2 text-center" style={{ fontSize: '8pt', letterSpacing: '0.1em' }}>SCAN TO<br />VERIFY</span>

                        {mobileNumber && (
                            <div className="mt-6 text-center border-t-2 border-black pt-2 w-full px-1">
                                <span style={{ fontSize: '7.5pt' }} className="font-black uppercase block opacity-60">CUSTOMER</span>
                                <span style={{ fontSize: '11pt' }} className="font-black tracking-wider">{mobileNumber.slice(-10)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* HIGH-CONTRAST DARK WEBSITE FOOTER */}
                <div className="border-t-2 border-black bg-white text-black py-1.5 text-center px-1">
                    <div className="border border-black py-0.5">
                        <p style={{ fontSize: '7pt' }} className="font-black uppercase tracking-tight">VALID ON BOOKED DATE ONLY • EXPIRES AFTER SCAN</p>
                    </div>
                    <div className="mt-1.5 border-2 border-black py-1">
                        <p style={{ fontSize: '12pt' }} className="font-black tracking-widest leading-none">WWW.ETHREE.IN • <span className="text-[8pt] opacity-80">v5.0</span></p>
                    </div>
                </div>

                {/* Sub-Footer */}
                <div className="border-t border-dashed border-black py-1 text-center bg-white">
                    <p className="font-black uppercase tracking-tight" style={{ fontSize: '7.5pt' }}>No Refund • Non Transferable • Thank You</p>
                </div>
            </div>
        );

        return content;
    };

    return (
        <div ref={ref} className="print:block">
            {/* Main Receipt (Only show if NOT skipping) */}
            {!skipMaster && <TicketContent data={{ id: ticketId }} />}

            {/* Individual Tickets / Combo Coupons */}
            {subTickets && subTickets.map((ticket, idx) => (
                <TicketContent
                    key={ticket.id}
                    data={ticket}
                    isCoupon={ticket.isCoupon}
                    items={ticket.items}
                    total={ticket.amount}
                    hasPageBreak={!skipMaster || idx > 0}
                />
            ))}
        </div>
    );
});

Ticket.displayName = 'Ticket';
