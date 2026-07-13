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

const getPurchaseKey = (purchase) => {
  const rawId = purchase?.id ?? purchase?.transactionId ?? purchase?.pedidoNumber ?? purchase?.orderNumber;
  return String(rawId || '').trim();
};

export const mergePurchaseHistory = (localPurchases = [], remotePurchases = []) => {
  const normalizedLocal = Array.isArray(localPurchases) ? localPurchases : [];
  const normalizedRemote = Array.isArray(remotePurchases) ? remotePurchases : [];
  const mergedPurchases = [...normalizedLocal, ...normalizedRemote];
  const byKey = new Map();

  mergedPurchases.forEach((purchase) => {
    if (!purchase) return;

    const purchaseKey = getPurchaseKey(purchase);
    const normalizedPurchase = {
      ...purchase,
      id: purchaseKey || String(purchase?.id || purchase?.transactionId || purchase?.pedidoNumber || Date.now()),
      createdAt: purchase?.createdAt || new Date().toISOString(),
    };

    if (purchaseKey) {
      if (!byKey.has(purchaseKey)) {
        byKey.set(purchaseKey, normalizedPurchase);
      }
      return;
    }

    byKey.set(String(normalizedPurchase.id), normalizedPurchase);
  });

  return Array.from(byKey.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 50);
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
