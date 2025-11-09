// Updated for flattened fabric structure where batches are nested within fabric object
export const calculateTotalQuantity = (fabric) => {
  if (!fabric || !fabric.batches) {
    return 0;
  }

  // Handle both array and object formats for batches
  const batches = Array.isArray(fabric.batches)
    ? fabric.batches
    : Object.values(fabric.batches || {});

  return batches.reduce((total, batch) => {
    if (!batch || !batch.items) {
      return total;
    }
    return (
      total +
      batch.items.reduce(
        (batchTotal, item) => batchTotal + (item.quantity || 0),
        0
      )
    );
  }, 0);
};

export const getQuantityByColor = (fabric) => {
  if (!fabric || !fabric.batches) {
    return {};
  }

  const colorQuantities = {};

  // Handle both array and object formats for batches
  const batches = Array.isArray(fabric.batches)
    ? fabric.batches
    : Object.values(fabric.batches || {});

  batches.forEach((batch) => {
    if (!batch || !batch.items) return;

    batch.items.forEach((item) => {
      if (!item || !item.colorName) return;

      const color = item.colorName;
      const quantity = item.quantity || 0;

      if (colorQuantities[color]) {
        colorQuantities[color] += quantity;
      } else {
        colorQuantities[color] = quantity;
      }
    });
  });

  return colorQuantities;
};

export const calculateAverageCost = (fabric) => {
  if (!fabric || !fabric.batches) {
    return 0;
  }

  // Handle both array and object formats for batches
  const batches = Array.isArray(fabric.batches)
    ? fabric.batches
    : Object.values(fabric.batches || {});

  let totalCost = 0;
  let totalQuantity = 0;

  batches.forEach((batch) => {
    if (!batch || !batch.items) return;

    const batchCost = Number(batch.costPerPiece || batch.unitCost || 0);
    const batchQuantity = batch.items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

    totalCost += batchCost * batchQuantity;
    totalQuantity += batchQuantity;
  });

  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
};

export const isLowStock = (fabric, threshold = 10) => {
  const totalQty = calculateTotalQuantity(fabric);
  return totalQty <= threshold;
};

// FIFO sale calculation for inventory reduction
export const calculateFifoSale = (
  fifoBatches,
  quantityNeeded,
  color = null
) => {
  let remainingQuantity = quantityNeeded;
  let totalCost = 0;
  const batchesUsed = [];

  // Sort batches by purchase date (FIFO)
  const sortedBatches = [...fifoBatches].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  for (const batch of sortedBatches) {
    if (remainingQuantity <= 0) break;

    const availableQuantity = batch.quantity || 0;

    if (availableQuantity > 0) {
      const quantityToUse = Math.min(availableQuantity, remainingQuantity);
      const batchCost = batch.unitCost || 0;

      totalCost += quantityToUse * batchCost;
      remainingQuantity -= quantityToUse;

      batchesUsed.push({
        batchId: batch.id,
        quantityUsed: quantityToUse,
        unitCost: batchCost,
        totalCost: quantityToUse * batchCost,
      });
    }
  }

  if (remainingQuantity > 0) {
    throw new Error(
      `Insufficient stock. Only ${
        quantityNeeded - remainingQuantity
      } units available.`
    );
  }

  return {
    totalCost,
    batchesUsed,
    quantitySold: quantityNeeded,
  };
};
