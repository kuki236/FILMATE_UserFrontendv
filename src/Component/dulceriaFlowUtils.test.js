import { describe, expect, it } from 'vitest';
import { buildLocalSnackOnlyCheckout } from './dulceriaFlowUtils';

describe('dulceriaFlowUtils', () => {
  it('builds a local success payload for snack-only purchases', () => {
    const payload = buildLocalSnackOnlyCheckout({
      pedidoNumber: 123456,
      total: 24.5,
      carrito: [{ id: 1, nombre: 'Combo', cantidad: 2, precio: 12.25 }],
      paymentMethod: 'Tarjeta •••• 4242',
    });

    expect(payload.localOnly).toBe(true);
    expect(payload.estado_pago).toBe('Aprobado');
    expect(payload.monto_total).toBe(24.5);
    expect(payload.metodo_pago).toBe('Tarjeta •••• 4242');
    expect(payload.boletos).toEqual([]);
  });
});
