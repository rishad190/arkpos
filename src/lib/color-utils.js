/**
 * Calculates available colors and their quantities from batches
 * @param {string} productName - Name of the product to check
 * @param {Array<Object>} fabrics - Array of all fabrics
 * @param {Array<Object>} fabricBatches - Array of all fabric batches
 * @returns {Array<{color: string, quantity: number}>} Array of color and quantity objects
 */
export function getAvailableColors(productName, fabrics, fabricBatches) {
  if (!productName) return [];

  const fabric = fabrics.find(
    (f) => f.name.toLowerCase() === productName.toLowerCase()
  );
  if (!fabric) return [];

  const batches = fabricBatches.filter((b) => b.fabricId === fabric.id);

  const colorQuantities = batches.reduce((acc, batch) => {
    if (batch.color) {
      acc[batch.color] = (acc[batch.color] || 0) + batch.quantity;
    }
    return acc;
  }, {});

  return Object.entries(colorQuantities)
    .map(([color, quantity]) => ({ color, quantity }))
    .filter((item) => item.quantity > 0);
}

export function formatColorDisplay(color) {
  return color || "-";
}

export function formatProductWithColor(product) {
  return `${product.name}${product.color ? ` (${product.color})` : ""}`;
}

