const PURCHASE_HISTORY_PREFIX = 'filmate.purchaseHistory.';
export const PURCHASE_HISTORY_UPDATED = 'filmate:purchase-history-updated';

const getUserKey = (userId) => `${PURCHASE_HISTORY_PREFIX}${userId || 'guest'}`;

export const getSessionUserId = (session) =>
  session?.user?.id_usuario || session?.user?.id || session?.user?.user_id || 'guest';

export const readPurchaseHistory = (userId) => {
  try {
    const rawHistory = globalThis.window.localStorage.getItem(getUserKey(userId));
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch {
    return [];
  }
};

export const savePurchaseHistory = (userId, purchases) => {
  try {
    globalThis.window.localStorage.setItem(getUserKey(userId), JSON.stringify(purchases.slice(0, 50)));
    globalThis.window.dispatchEvent(new CustomEvent(PURCHASE_HISTORY_UPDATED));
  } catch {
    // El historial local es auxiliar; la compra no debe fallar por almacenamiento.
  }
};

export const addPurchaseToHistory = (userId, purchase) => {
  if (!purchase) return;

  const previousHistory = readPurchaseHistory(userId);
  const nextPurchase = {
    ...purchase,
    id: String(purchase.id || purchase.transactionId || purchase.pedidoNumber || Date.now()),
    createdAt: purchase.createdAt || new Date().toISOString(),
  };
  const nextHistory = [
    nextPurchase,
    ...previousHistory.filter((item) => String(item.id) !== String(nextPurchase.id)),
  ];

  savePurchaseHistory(userId, nextHistory);
};
