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
    paymentMode?: string;
    settings?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
        scale?: number;
    };
}

export const Ticket = forwardRef<HTMLDivElement, TicketProps & { subTickets?: any[], skipMaster?: boolean, isPreview?: boolean }>(({ items, total, date, ticketId, subTickets, skipMaster, isPreview, paymentMode, settings: margins }, ref) => {

    const TicketContent = ({ data, items: ticketItems, total: ticketTotal, hasPageBreak = false }: { data: any, items?: CartItem[], total?: number, hasPageBreak?: boolean }) => {
        const displayItems = ticketItems || items;
        const displayTotal = ticketTotal !== undefined ? ticketTotal : total;
        const mainItemName = displayItems && displayItems.length > 0 ? displayItems[0].name.toUpperCase() : 'ANY RIDE';
        const isFreeRide = displayTotal === 0;

        // Use provided date or fallback to current time formatted
        let dateObj = new Date();
        if (date && date !== '') {
            dateObj = new Date(date);
        }

        // Format to matches the image: DD-MM-YYYY
        const dateFormat = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

        // Format time: hh:mm A
        let hours = dateObj.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const timeFormat = `${String(hours).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} ${ampm}`;

        const shortId = data.id.split('-').slice(-2).join('-').toUpperCase(); // Extracted ID like 731-R1

        const content = (
            <div className={`bg-white text-black font-mono ticket-content ${hasPageBreak ? 'page-break-before' : ''}`}
                style={{
                    pageBreakBefore: hasPageBreak ? 'always' : 'auto',
                    width: '3.5in', // Slightly wider to match aspect ratio
                    backgroundColor: 'white',
                    margin: isPreview ? '0 auto' : '0',
                    paddingTop: margins ? `${margins.top}px` : '10px',
                    paddingBottom: margins ? `${margins.bottom}px` : '10px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    transformOrigin: 'top center',
                    transform: `translateX(${(margins?.left || 0) - (margins?.right || 0)}px) scale(${margins?.scale || 1})`,
                    fontFamily: 'Courier New, Courier, monospace' // Ensures monospace look like the receipt
                }}
            >
                <style>{`
                    @media print {
                        @page { 
                            margin: 0 !important; 
                            size: 3.5in auto !important;
                        }
                        html, body {
                            width: 3.5in !important;
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
                            width: 3.5in !important;
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

                {/* Header Row: ETHREE and Date */}
                <div className="flex justify-between items-end mb-1">
                    <h1 className="font-extrabold tracking-tighter leading-none m-0 p-0" style={{ fontSize: '32pt', fontFamily: 'Impact, sans-serif' }}>ETHREE</h1>
                    <div className="font-bold text-right leading-none pb-1" style={{ fontSize: '14pt', letterSpacing: '2px' }}>
                        {dateFormat}
                    </div>
                </div>

                {/* Sub-Header Row: Tagline and Time/ID */}
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-black text-white px-2 py-1 inline-block mt-1 print:inline-block">
                        <span className="font-bold whitespace-nowrap" style={{ fontSize: '10pt' }}>Eat. Enjoy. Entertain</span>
                    </div>
                    <div className="text-right font-bold leading-tight pl-2 whitespace-nowrap" style={{ fontSize: '11pt' }}>
                        <div>{timeFormat}</div>
                        <div>ID: {shortId}</div>
                    </div>
                </div>

                {/* Middle Content: Price Block & QR Code */}
                <div className="flex justify-between items-center mb-4 px-2">
                    {/* Left: Name and Price */}
                    <div className="flex flex-col items-center justify-center flex-1 pr-2 overflow-hidden">
                        <div className="font-bold text-center mb-2 leading-tight uppercase" style={{ fontSize: isFreeRide ? '16pt' : '12pt', wordBreak: 'break-word' }}>
                            {isFreeRide ? 'FREE RIDE' : mainItemName}
                        </div>
                        <div className="bg-black text-white rounded-xl flex flex-col items-center justify-center shadow-sm px-4 py-2" style={{ minWidth: '100px' }}>
                            <span className="font-bold leading-none" style={{ fontSize: '28pt' }}>{displayTotal}/-</span>
                            {paymentMode && (
                                <span className="font-bold text-[8pt] uppercase tracking-wider mt-1 border-t border-white/30 w-full text-center pt-0.5">{paymentMode}</span>
                            )}
                        </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="flex flex-col items-center justify-center pl-2">
                        <div className="bg-white border-[3px] border-black rounded-lg p-1.5 shadow-sm inline-block">
                            <QRCodeSVG value={JSON.stringify({ id: data.id })} size={110} level="M" />
                        </div>
                        <div className="font-bold mt-1" style={{ fontSize: '11pt' }}>QR CODE</div>
                    </div>
                </div>

                {/* Divider Line */}
                <div className="h-1 bg-slate-300 w-full my-3"></div>

                {/* Footer Notes */}
                <div className="text-center flex flex-col items-center justify-center px-1 font-bold space-y-2">
                    <div className="whitespace-nowrap" style={{ fontSize: '9pt' }}>VALID ON BOOKED DATE ONLY . EXPIRES ON SCAN</div>

                    <div className="text-slate-600 whitespace-nowrap" style={{ fontSize: '11pt' }}>For Reward Points Login to:</div>

                    <div className="font-extrabold tracking-widest leading-none my-1 whitespace-nowrap" style={{ fontSize: '15pt' }}>WWW.ETHREE.IN</div>

                    <div className="whitespace-nowrap" style={{ fontSize: '8.5pt' }}>NO REFUND - NON TRANSFERABLE - VISIT AGAIN</div>

                    <div className="font-extrabold mt-1 whitespace-nowrap" style={{ fontSize: '16pt', letterSpacing: '1px' }}>Ph: 70369 23456</div>
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
                    items={ticket.items}
                    total={ticket.amount}
                    hasPageBreak={!skipMaster || idx > 0}
                />
            ))}
        </div>
    );
});

Ticket.displayName = 'Ticket';
