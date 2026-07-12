export const buildLocalSnackOnlyCheckout = ({ pedidoNumber, total, carrito, paymentMethod }) => ({
  id_transaccion: Number(pedidoNumber) || Date.now(),
  estado_pago: 'Aprobado',
  monto_boletos: 0,
  monto_confiteria: Number(total || 0),
  monto_total: Number(total || 0),
  metodo_pago: paymentMethod || 'Pago confirmado',
  boletos: [],
  qr: null,
  localOnly: true,
  snacks: (carrito || []).map((item) => ({
    id: item.id,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precio: Number(item.precio || 0),
    subtotal: Number(item.precio || 0) * Number(item.cantidad || 0),
  })),
});
