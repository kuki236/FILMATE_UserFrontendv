import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { AlertTriangle, ArrowLeft, Banknote, CheckCircle2, CreditCard, Minus, Plus, ShoppingCart, Smartphone, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { checkoutOrder } from './filmateApi';
import { getAuthSession } from './authSession';

const FALLBACK_IMAGE = 'https://placehold.co/400x400/0f172a/f8fafc?text=Filmate';

const productosData = {
  combos: [
    {
      id: 1,
      nombre: 'Combo Pareja',
      descripcion: '1 cancha gigante + 2 gaseosas medianas.',
      precio: 35,
      imagen: 'https://images.pexels.com/photos/7603978/pexels-photo-7603978.jpeg',
    },
    {
      id: 2,
      nombre: 'Combo Familiar',
      descripcion: '2 canchas gigantes + 4 gaseosas medianas + 2 nachos.',
      precio: 65,
      imagen: 'https://images.pexels.com/photos/10397068/pexels-photo-10397068.jpeg',
    },
  ],
  popcorn: [
    {
      id: 3,
      nombre: 'Popcorn Grande',
      descripcion: 'Cancha dulce grande.',
      precio: 18,
      imagen: 'https://images.pexels.com/photos/10353949/pexels-photo-10353949.jpeg',
    },
  ],
  bebidas: [
    {
      id: 4,
      nombre: 'Gaseosa Grande 32oz',
      descripcion: 'Bebida fria grande.',
      precio: 12,
      imagen: 'https://images.pexels.com/photos/9459202/pexels-photo-9459202.jpeg',
    },
  ],
};

const categoryLabels = {
  combos: 'Combos',
  popcorn: 'Cancha / Popcorn',
  bebidas: 'Bebidas',
};

const DEFAULT_TARIFF_PRICE = 22.5;

const paymentOptions = [
  {
    id: 'tarjeta',
    label: 'Tarjeta',
    description: 'Visa, Mastercard o débito.',
    icon: CreditCard,
  },
  {
    id: 'yape',
    label: 'Yape',
    description: 'Pago rápido con código o número.',
    icon: Smartphone,
  },
  {
    id: 'plin',
    label: 'Plin',
    description: 'Transferencia instantánea.',
    icon: Smartphone,
  },
  {
    id: 'efectivo',
    label: 'Efectivo',
    description: 'Paga en caja al recoger.',
    icon: Banknote,
  },
];

function TicketContent({ carrito, total, pedidoNumber, fechaCompra, bookingContext, reservationId }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20">
            <img src="/favicon.png" alt="Filmate" className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Filmate</p>
            <h2 className="text-2xl font-bold">Ticket de compra</h2>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {bookingContext && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Reserva de película</p>
            <p className="mt-2 text-lg font-bold text-white">{bookingContext.pelicula}</p>
            <p className="mt-1 text-sm text-slate-200">
              {bookingContext.sede} · {bookingContext.horario} · {bookingContext.sala}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Asientos: {bookingContext.asientos?.length ? bookingContext.asientos.join(', ') : 'Sin asientos seleccionados'}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Numero de pedido</p>
              <p className="text-2xl font-bold text-white">{pedidoNumber}</p>
              {reservationId && (
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-blue-300">
                  Reserva #{reservationId}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Fecha</p>
              <p className="text-sm text-slate-200">{fechaCompra.toLocaleString('es-PE')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Detalle del pedido
          </p>
          <div className="space-y-3">
            {carrito.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="font-semibold text-white">{item.nombre}</p>
                  <p className="text-sm text-slate-400">
                    {item.cantidad} x S/. {item.precio.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold text-blue-300">
                  S/. {(item.precio * item.cantidad).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-200">Total a pagar</span>
            <span className="text-2xl font-bold text-white">S/. {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-white p-4">
          <div className="mx-auto flex h-[210px] w-[210px] items-center justify-center">
            <QRCodeCanvas
              value={`FILMATE-${pedidoNumber}-${total.toFixed(2)}`}
              size={170}
              level="H"
              includeMargin
              fgColor="#0f172a"
              bgColor="#ffffff"
              className="block"
            />
          </div>
        </div>

        <p className="text-center text-sm text-slate-400">
          Presenta este QR en el mostrador para recoger tu pedido.
        </p>
      </div>
    </div>
  );
}

export const Dulceria = () => {
  const [carrito, setCarrito] = useState(() => {
    return [];
  });
  const [showVerification, setShowVerification] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [skipSnacksForReservation, setSkipSnacksForReservation] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('tarjeta');
  const [pendingExitAction, setPendingExitAction] = useState(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [pedidoNumber] = useState(() => {
    try {
      const saved = sessionStorage.getItem('filmate-dulceria-pedido');
      return saved ? Number(saved) : Math.floor(100000 + Math.random() * 900000);
    } catch {
      return Math.floor(100000 + Math.random() * 900000);
    }
  });
  const [fechaCompra] = useState(() => {
    try {
      const saved = sessionStorage.getItem('filmate-dulceria-fecha');
      return saved ? new Date(saved) : new Date();
    } catch {
      return new Date();
    }
  });
  const [imageFallbacks, setImageFallbacks] = useState({});
  const [scrollState, setScrollState] = useState({
    combos: { atStart: true, atEnd: false },
    popcorn: { atStart: true, atEnd: false },
    bebidas: { atStart: true, atEnd: false },
  });
  const ticketRef = useRef(null);
  const sectionRefs = {
    combos: useRef(null),
    popcorn: useRef(null),
    bebidas: useRef(null),
  };
  const navigate = useNavigate();
  const location = useLocation();
  const bookingContext = location.state || null;
  const isSeatFlow = Boolean(bookingContext?.pelicula);
  const authSession = getAuthSession();
  const pageTitle = isSeatFlow ? 'Completa tu compra' : 'Elige tus snacks favoritos';
  const pageSubtitle = isSeatFlow
    ? 'Tu compra incluye una reserva de película y asientos seleccionados.'
    : 'Explora combos, popcorn y bebidas para armar tu pedido.';

  const snacksTotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const seatsCount = bookingContext?.asientos?.length || 0;
  const reservationTotal = isSeatFlow ? seatsCount * DEFAULT_TARIFF_PRICE : 0;
  const total = snacksTotal + reservationTotal;
  const paymentSnackTotal = isSeatFlow && skipSnacksForReservation ? 0 : snacksTotal;
  const paymentTotal = isSeatFlow ? reservationTotal + paymentSnackTotal : total;

  useEffect(() => {
    try {
      sessionStorage.setItem('filmate-dulceria-pedido', String(pedidoNumber));
      sessionStorage.setItem('filmate-dulceria-fecha', fechaCompra.toISOString());
    } catch {
      // Si el almacenamiento falla, la compra sigue funcionando en memoria.
    }
  }, [carrito, pedidoNumber, fechaCompra]);

  const agregarProducto = (producto) => {
    setLastAddedId(producto.id);
    window.setTimeout(() => setLastAddedId((current) => (current === producto.id ? null : current)), 700);

    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id);

      if (existe) {
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }

      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const actualizarCantidad = (id, cantidad) => {
    setCarrito((prev) =>
      cantidad <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );
  };

  const handleImageError = (id, nombre) => {
    setImageFallbacks((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: `https://placehold.co/800x800/0f172a/f8fafc?text=${encodeURIComponent(nombre)}` };
    });
  };

  const requestExit = (action) => {
    setPendingExitAction(action);
    setShowExitConfirm(true);
  };

  const closeExitConfirm = () => {
    setPendingExitAction(null);
    setShowExitConfirm(false);
  };

  const openNotice = (title, message) => {
    setNoticeTitle(title);
    setNoticeMessage(message);
    setShowNotice(true);
  };

  const closeNotice = () => {
    setShowNotice(false);
    setNoticeTitle('');
    setNoticeMessage('');
  };

  const confirmExit = () => {
    const action = pendingExitAction;
    closeExitConfirm();

    if (action === 'verification') {
      setShowPayment(false);
      setShowVerification(true);
      return;
    }

    if (action === 'dulceria') {
      setShowSuccess(false);
      setShowPayment(false);
      setShowVerification(false);
      return;
    }

    if (action === 'cartelera') {
      limpiarYSalir();
    }
  };

  const scrollCategory = (key, direction) => {
    const container = sectionRefs[key]?.current;
    if (!container) return;

    const amount = Math.min(container.clientWidth * 0.8, 320);
    if (direction === 'left' && container.scrollLeft <= amount) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      window.setTimeout(() => updateScrollState(key), 180);
      return;
    }

    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });

    window.setTimeout(() => updateScrollState(key), 180);
  };

  const updateScrollState = (key) => {
    const container = sectionRefs[key]?.current;
    if (!container) return;

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const atStart = container.scrollLeft <= 64;
    const atEnd = container.scrollLeft >= maxScrollLeft - 64;

    setScrollState((prev) => ({
      ...prev,
      [key]: { atStart, atEnd },
    }));
  };

  useEffect(() => {
    const syncScrollState = () => {
      Object.keys(sectionRefs).forEach((key) => {
        updateScrollState(key);
      });
    };

    const timer = window.setTimeout(syncScrollState, 0);
    window.addEventListener('resize', syncScrollState);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', syncScrollState);
    };
  }, []);

  const cerrarYVolverACartelera = () => {
    limpiarYSalir();
  };

  const cerrarDespuesDePago = () => {
    setShowSuccess(false);
    setShowVerification(false);
    setShowPayment(false);
    setShowExitConfirm(false);

    if (isSeatFlow) {
      limpiarYSalir();
      return;
    }

    setCarrito([]);
  };

  const limpiarYSalir = () => {
    setShowSuccess(false);
    setShowVerification(false);
    setShowPayment(false);
    setShowExitConfirm(false);
    setCarrito([]);
    try {
      sessionStorage.removeItem('filmate-dulceria-pedido');
      sessionStorage.removeItem('filmate-dulceria-fecha');
    } catch {
      // no-op
    }
    navigate('/menuPrincipal');
  };

  const descargarPDF = async () => {
    if (!ticketRef.current || isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 14;
      let y = 14;

      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, pageWidth, pdf.internal.pageSize.getHeight(), 'F');

      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(marginX, y, pageWidth - marginX * 2, 22, 4, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Filmate', marginX + 8, y + 9);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Ticket de compra', marginX + 8, y + 16);

      y += 30;

      if (bookingContext) {
        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(marginX, y, pageWidth - marginX * 2, 30, 4, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('Reserva de película', marginX + 8, y + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(bookingContext.pelicula || 'Película'), marginX + 8, y + 15);
        pdf.text(`${bookingContext.sede || ''} · ${bookingContext.horario || ''} · ${bookingContext.sala || ''}`, marginX + 8, y + 22);
        const seatsText = `Asientos: ${(bookingContext.asientos && bookingContext.asientos.length) ? bookingContext.asientos.join(', ') : 'Sin asientos seleccionados'}`;
        pdf.text(seatsText, marginX + 8, y + 28);
        y += 36;
      }
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(marginX, y, pageWidth - marginX * 2, 24, 4, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Pedido: ${pedidoNumber}`, marginX + 8, y + 9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Fecha: ${fechaCompra.toLocaleString('es-PE')}`, marginX + 8, y + 16);

      y += 32;
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(marginX, y, pageWidth - marginX * 2, 12 + carrito.length * 10, 4, 4, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Detalle del pedido', marginX + 8, y + 8);

      let lineY = y + 16;
      pdf.setFont('helvetica', 'normal');
      carrito.forEach((item) => {
        pdf.text(`${item.cantidad} x ${item.nombre}`, marginX + 8, lineY);
        const amount = `S/. ${(item.precio * item.cantidad).toFixed(2)}`;
        pdf.text(amount, pageWidth - marginX - pdf.getTextWidth(amount), lineY);
        lineY += 8;
      });

      y = lineY + 6;
      pdf.setFillColor(30, 64, 175);
      pdf.roundedRect(marginX, y, pageWidth - marginX * 2, 16, 4, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Total a pagar', marginX + 8, y + 10);
      pdf.text(`S/. ${total.toFixed(2)}`, pageWidth - marginX - pdf.getTextWidth(`S/. ${total.toFixed(2)}`) - 8, y + 10);

      y += 24;
      const qrCanvas = ticketRef.current.querySelector('canvas');
      if (qrCanvas) {
        const qrDataUrl = qrCanvas.toDataURL('image/png');
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(marginX + 28, y, 70, 70, 4, 4, 'F');
        pdf.addImage(qrDataUrl, 'PNG', marginX + 33, y + 5, 60, 60);
        y += 78;
      }

      pdf.setTextColor(148, 163, 184);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Presenta este QR en el mostrador para recoger tu pedido.', marginX, y);
      if (bookingContext) {
        y += 8;
        pdf.text('Incluye tu reserva y tus asientos al presentar el ticket.', marginX, y);
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ticket-${pedidoNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        limpiarYSalir();
        setIsGeneratingPDF(false);
      }, 800);
    } catch (error) {
      console.error('No se pudo generar el PDF', error);
      setIsGeneratingPDF(false);
      openNotice('Error al generar el PDF', 'No se pudo generar el ticket PDF. Intenta de nuevo.');
    }
  };

  const iniciarPago = () => {
    setCheckoutError('');
    setSkipSnacksForReservation(false);
    setShowVerification(false);
    setShowPayment(true);
  };

  const omitirSnacks = () => {
    setCheckoutError('');
    setSkipSnacksForReservation(true);
    setShowVerification(false);
    setShowPayment(true);
  };

  const confirmarPago = async () => {
    if (isProcessingPayment) return;

    if (isSeatFlow) {
      const userId = authSession?.user?.id_usuario;
      const seatIds = bookingContext?.seatIds || [];

      if (!userId) {
        setCheckoutError('Debes iniciar sesión para completar una reserva.');
        return;
      }

      if (!bookingContext?.id_funcion || seatIds.length === 0) {
        setCheckoutError('No se encontraron asientos o función válidos para reservar.');
        return;
      }

      try {
        setCheckoutError('');
        setIsProcessingPayment(true);

        const response = await checkoutOrder({
          id_usuario: userId,
          id_funcion: bookingContext.id_funcion,
          ids_asientos: seatIds,
          id_tarifa: 1,
          metodo_pago: selectedPaymentMethod,
          snacks: (skipSnacksForReservation ? [] : carrito).map((item) => ({
            id_producto: item.id,
            cantidad: item.cantidad,
          })),
        });

        setCheckoutResult(response);
        setShowPayment(false);
        setShowSuccess(true);
      } catch (err) {
        setCheckoutError(err?.message || 'No se pudo completar la reserva.');
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    setIsProcessingPayment(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    setIsProcessingPayment(false);
    setShowPayment(false);
    setShowSuccess(true);
  };

  const selectedPayment = paymentOptions.find((option) => option.id === selectedPaymentMethod);

  const volverAAsientos = () => {
    if (bookingContext?.movieId) {
      navigate(`/menuPrincipal/detallePelicula/${bookingContext.movieId}`, {
        state: bookingContext.returnToSeatSelection
          ? {
              movieState: bookingContext.returnToSeatSelection.movieState || null,
              selectedShow: bookingContext.returnToSeatSelection.selectedShow || null,
              selectedSeats: bookingContext.returnToSeatSelection.selectedSeats || [],
            }
          : bookingContext.movieState || null,
      });
      return;
    }

    navigate(-1);
  };

  const renderCategory = (key, productos) => (
    <section className="mb-12">
      <div className="mb-5">
        <h3 className="text-2xl font-bold text-white">{categoryLabels[key]}</h3>
      </div>

      <div className="relative">
        {!scrollState[key]?.atStart && (
          <button
            onClick={() => scrollCategory(key, 'left')}
            aria-label={`Desplazar ${categoryLabels[key]} a la izquierda`}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-950/90 px-3 py-3 text-white shadow-lg shadow-black/30 backdrop-blur transition-all hover:border-blue-500 hover:bg-slate-900 sm:-left-4"
          >
            <span className="text-xl leading-none">‹</span>
          </button>
        )}

        <div
          ref={sectionRefs[key]}
          className="product-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-3 pt-2 pr-2 pl-12 snap-x snap-mandatory sm:pl-14 sm:pr-14"
          onScroll={() => updateScrollState(key)}
        >
          {productos.map((producto) => {
            const imageSrc = imageFallbacks[producto.id] || producto.imagen;

            return (
              <article
                key={producto.id}
                className={`group product-card relative flex-shrink-0 overflow-hidden rounded-2xl border bg-slate-900 transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 snap-start ${
                  lastAddedId === producto.id ? 'border-emerald-400 ring-2 ring-emerald-400/60 animate-pulse' : 'border-slate-700'
                }`}
              >
                {lastAddedId === producto.id && (
                  <div className="absolute left-3 top-3 z-30 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Agregado
                  </div>
                )}

                <div className="absolute right-3 top-3 z-20">
                  <div className="peer flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-xs font-bold text-white shadow-lg backdrop-blur">
                    ?
                  </div>
                  <div className="pointer-events-none absolute right-0 top-9 z-20 w-56 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 peer-hover:opacity-100">
                    {producto.descripcion}
                  </div>
                </div>

                <div className="aspect-square overflow-hidden bg-slate-800">
                  <img
                    src={imageSrc}
                    alt={producto.nombre}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(producto.id, producto.nombre)}
                  />
                </div>

                <div className="p-4">
                  <h4 className="mb-2 text-sm font-semibold text-white sm:text-base">{producto.nombre}</h4>
                  <p className="mb-3 text-lg font-bold text-blue-400">S/. {producto.precio.toFixed(2)}</p>
                  <button
                    onClick={() => agregarProducto(producto)}
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
                  >
                    Agregar
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!scrollState[key]?.atEnd && (
          <button
            onClick={() => scrollCategory(key, 'right')}
            aria-label={`Desplazar ${categoryLabels[key]} a la derecha`}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-950/90 px-3 py-3 text-white shadow-lg shadow-black/30 backdrop-blur transition-all hover:border-blue-500 hover:bg-slate-900 sm:-right-4"
          >
            <span className="text-xl leading-none">›</span>
          </button>
        )}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-blue-300">
              {isSeatFlow ? 'Flujo con reserva' : 'Flujo libre'}
            </p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">{pageTitle}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              {pageSubtitle}
            </p>
          </div>

          {bookingContext && (
            <div className="mb-8 rounded-3xl border border-blue-400/40 bg-blue-500/10 p-5 text-white shadow-lg shadow-blue-950/20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-blue-300">Reserva seleccionada</p>
                  <h2 className="mt-1 text-2xl font-bold">{bookingContext.pelicula}</h2>
                  <p className="mt-2 text-slate-200">
                    {bookingContext.sede} · {bookingContext.horario} · {bookingContext.sala}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-slate-950/40 px-4 py-3">
                  <p className="text-sm text-slate-300">Asientos elegidos</p>
                  <p className="text-lg font-bold text-white">
                    {bookingContext.asientos?.length ? bookingContext.asientos.join(', ') : 'Sin asientos'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={volverAAsientos}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:border-sky-300 hover:bg-slate-950"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a asientos
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-3">
              {renderCategory('combos', productosData.combos)}
              {renderCategory('popcorn', productosData.popcorn)}
              {renderCategory('bebidas', productosData.bebidas)}
            </div>

            <aside className="h-fit rounded-2xl border border-slate-700 bg-slate-900 p-6 lg:sticky lg:top-24">
              <div className="mb-6 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Tu carrito</h2>
              </div>

              {carrito.length === 0 ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-slate-400">Tu carrito esta vacio</p>
                  {isSeatFlow && (
                    <button
                      onClick={omitirSnacks}
                      className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Omitir snacks
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 max-h-96 space-y-4 overflow-y-auto pr-1">
                    {carrito.map((item) => (
                      <div key={item.id} className="border-b border-slate-700 pb-4">
                        <p className="mb-1 font-semibold text-white">{item.nombre}</p>
                        <p className="mb-3 text-sm text-slate-300">
                          {item.cantidad} x S/. {item.precio.toFixed(2)}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-black transition-colors hover:bg-yellow-500"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-white">{item.cantidad}</span>
                          <button
                            onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-black transition-colors hover:bg-yellow-500"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6 border-t border-slate-700 pt-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-slate-300">Total</span>
                      <span className="text-2xl font-bold text-white">S/. {total.toFixed(2)}</span>
                    </div>
                    {isSeatFlow && (
                      <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
                        <div className="flex items-center justify-between">
                          <span>Asientos ({seatsCount})</span>
                          <span>S/. {reservationTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Snacks</span>
                          <span>S/. {snacksTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {isSeatFlow && (
                      <button
                        onClick={omitirSnacks}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        Omitir snacks
                      </button>
                    )}
                    <button
                      onClick={() => setShowVerification(true)}
                      className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      Confirmar pedido
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>

      {showVerification && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-[95vw] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-md">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-white sm:text-xl">Verifica tu compra</h2>
              <button
                onClick={() => requestExit('dulceria')}
                className="text-slate-400 transition-colors hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[85vh] overflow-y-auto px-4 py-5 sm:px-6">
              <p className="mb-4 text-sm text-slate-300">
                Tu pedido de confiteria sera preparado con estos productos.
              </p>

              <div className="mb-6 space-y-3 border-y border-slate-700 py-4">
                {carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.nombre}</p>
                      <p className="text-sm text-slate-400">
                        {item.cantidad} x S/. {item.precio.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-black transition-colors hover:bg-yellow-500"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-white">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-black transition-colors hover:bg-yellow-500"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6 rounded-xl bg-slate-800 p-4">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal snacks</span>
                  <span>S/. {snacksTotal.toFixed(2)}</span>
                </div>
                {isSeatFlow && (
                  <div className="mt-2 flex items-center justify-between text-slate-300">
                    <span>Subtotal asientos</span>
                    <span>S/. {reservationTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-2 text-lg font-bold text-white">
                  <span>Total</span>
                  <span>S/. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => requestExit('dulceria')}
                  className="flex-1 rounded-lg bg-slate-700 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  Cancelar pedido
                </button>
                <button
                  onClick={iniciarPago}
                  className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Pagar ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-[95vw] flex-col overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-md">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-white sm:text-xl">Pago</h2>
              <button
                onClick={() => {
                  requestExit('verification');
                }}
                className="text-slate-400 transition-colors hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-4 py-5 sm:px-6">
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-sm text-slate-300">Total a cobrar</p>
                <p className="text-3xl font-bold text-white">S/. {paymentTotal.toFixed(2)}</p>
                {isSeatFlow && (
                  <p className="mt-2 text-sm text-slate-200">
                    Asientos: {seatsCount} · Subtotal asientos: S/. {reservationTotal.toFixed(2)}
                  </p>
                )}
                {isSeatFlow && skipSnacksForReservation && (
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    Snacks omitidos: no se cobrarán en esta compra.
                  </p>
                )}
              </div>

              {checkoutError && (
                <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {checkoutError}
                </div>
              )}

              {bookingContext && (
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Película y asientos</p>
                  <p className="mt-2 text-lg font-bold text-white">{bookingContext.pelicula}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {bookingContext.sede} · {bookingContext.horario} · {bookingContext.sala}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {bookingContext.asientos?.length ? bookingContext.asientos.join(', ') : 'Sin asientos'}
                  </p>
                </div>
              )}

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const active = selectedPaymentMethod === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedPaymentMethod(option.id)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? 'border-blue-400 bg-blue-500/10 ring-2 ring-blue-400/40'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            active ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{option.label}</p>
                          <p className="text-xs text-slate-400">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-6 rounded-xl bg-slate-800 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                  <span>Método seleccionado</span>
                  <span className="text-blue-300">{selectedPayment?.label}</span>
                </div>
                <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                  <span>Estado</span>
                  <span className={isProcessingPayment ? 'text-yellow-300' : 'text-emerald-300'}>
                    {isProcessingPayment ? 'Procesando...' : 'Listo para pagar'}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 ${
                      isProcessingPayment ? 'w-[85%] animate-pulse' : 'w-[30%]'
                    }`}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 pb-1">
                <button
                  onClick={() => {
                    requestExit('verification');
                  }}
                  className="flex-1 rounded-lg bg-slate-700 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPago}
                  disabled={isProcessingPayment}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-800"
                >
                  {isProcessingPayment ? 'Pagando...' : `Pagar con ${selectedPayment?.label || 'método'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-[95vw] overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 shadow-2xl sm:max-w-md">
            <div className="flex items-center gap-4 border-b border-slate-700 px-4 py-4 sm:px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  {pendingExitAction === 'verification' ? '¿Cancelar el pago?' : '¿Seguro que quieres salir?'}
                </h2>
                <p className="text-sm text-slate-400">
                  {pendingExitAction === 'verification'
                    ? 'Volverás a la verificación del pedido.'
                    : 'Tu pedido se mantendrá guardado mientras sigas en esta sesión.'}
                </p>
              </div>
            </div>

            <div className="px-4 py-5 sm:px-6">
              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                {pendingExitAction === 'verification'
                  ? 'Si cancelas, regresarás al resumen de tu compra para revisar o cambiar tus productos.'
                  : 'Si sales ahora, volverás a la dulcería y no perderás lo que ya llevas en el carrito.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={closeExitConfirm}
                  className="flex-1 rounded-lg bg-slate-700 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  No, volver
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 rounded-lg bg-yellow-500 py-2 font-semibold text-slate-950 transition-colors hover:bg-yellow-400"
                >
                  {pendingExitAction === 'verification' ? 'Sí, volver' : 'Sí, salir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotice && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-[95vw] overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 shadow-2xl sm:max-w-md">
            <div className="flex items-center gap-4 border-b border-slate-700 px-4 py-4 sm:px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">{noticeTitle}</h2>
                <p className="text-sm text-slate-400">Revisa el mensaje antes de continuar.</p>
              </div>
            </div>

            <div className="px-4 py-5 sm:px-6">
              <p className="mb-6 text-sm leading-relaxed text-slate-300">{noticeMessage}</p>
              <button
                onClick={closeNotice}
                className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div className="relative w-full max-w-[95vw] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-2xl">
            <button
              onClick={cerrarDespuesDePago}
              className="absolute left-4 top-4 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <div className="max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <div ref={ticketRef}>
                <TicketContent
                  carrito={carrito}
                  total={total}
                  pedidoNumber={pedidoNumber}
                  fechaCompra={fechaCompra}
                  bookingContext={bookingContext}
                  reservationId={checkoutResult?.id_reserva}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2">
                <button
                  onClick={cerrarDespuesDePago}
                  className="rounded-lg bg-slate-700 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  {isSeatFlow ? 'Volver a cartelera' : 'Volver a dulcería'}
                </button>
                <button
                  onClick={descargarPDF}
                  disabled={isGeneratingPDF}
                  className="rounded-lg bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
                >
                  {isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF y salir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Dulceria;
