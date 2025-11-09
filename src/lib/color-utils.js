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

/**
 * Formats a color display string, showing a dash if no color is provided
 * @param {string|null} color - The color to display
 * @returns {string} Formatted color string
 */
export function formatColorDisplay(color) {
  return color || "-";
}

/**
 * Formats a product display string including color if present
 * @param {Object} product - Product object containing name and color
 * @param {string} product.name - Product name
 * @param {string|null} product.color - Product color (optional)
 * @returns {string} Formatted product display string
 */
export function formatProductWithColor(product) {
  return `${product.name}${product.color ? ` (${product.color})` : ""}`;
}
