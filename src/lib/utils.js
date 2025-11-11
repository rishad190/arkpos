import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Tailwind class merger
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to DD-MM-YYYY
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Format currency with proper error handling
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency symbol (default: ৳)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = "৳") => {
  try {
    if (amount === undefined || amount === null) return `${currency}0`;
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      throw new Error("Invalid amount");
    }
    return `${currency}${numAmount.toLocaleString("en-IN")}`;
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${currency}0`;
  }
};

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {string} filename - Filename without extension
 * @returns {boolean} Success status
 */
export const exportToCSV = (data, filename) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid data format");
    }

    const BOM = "\uFEFF"; // Add BOM for proper Unicode handling
    const headers = Object.keys(data[0]);

    // Format value based on type
    const formatValue = (value, header) => {
      // Format dates
      if (
        value instanceof Date ||
        (typeof value === "string" && !isNaN(Date.parse(value)))
      ) {
        return formatDate(value);
      }

      // Format numbers
      if (typeof value === "number") {
        return value.toLocaleString("en-IN");
      }

      // Handle strings with commas
      return typeof value === "string" && value.includes(",")
        ? `"${value}"`
        : String(value || "");
    };

    const csvContent =
      BOM +
      [
        headers.join(","),
        ...data.map((row) =>
          headers.map((header) => formatValue(row[header], header)).join(",")
        ),
      ].join("\n");

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${formatDate(new Date())}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    alert("Failed to export CSV. Please try again.");
    return false;
  }
};

/**
 * Export data to PDF
 * @param {Array} data - Data to export
 * @param {string} filename - Filename without extension
 * @param {Object} options - PDF options
 * @returns {boolean} Success status
 */
export const exportToPDF = (data, filename, options = {}) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid data format");
    }

    const {
      title = filename,
      subtitle = `Generated on ${formatDate(new Date())}`,
      orientation = "portrait",
      pageSize = "a4",
      columns = Object.keys(data[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        dataKey: key,
      })),
    } = options;

    // Create PDF document
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: pageSize,
    });

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);

    // Add table
    autoTable(doc, {
      startY: 40,
      head: [columns.map((col) => col.header)],
      body: data.map((row) =>
        columns.map((col) => String(row[col.dataKey] ?? ""))
      ),
      theme: "grid",
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save PDF
    doc.save(`${filename}-${formatDate(new Date())}.pdf`);

    return true;
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return false;
  }
};

/**
 * Prints the content of a specified HTML element.
 * @param {string} elementId - The ID of the HTML element to print.
 */
export const printElement = (elementId) => {
  const printContent = document.getElementById(elementId);
  if (printContent) {
    const originalContents = document.body.innerHTML;
    const printArea = printContent.innerHTML;

    document.body.innerHTML = printArea;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore original state and scripts
  } else {
    console.error(`Element with ID "${elementId}" not found for printing.`);
    alert("Could not find the content to print.");
  }
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Calculate weighted average cost
 * @param {Array} items - Array of items with quantity and cost
 * @returns {number} Weighted average
 */
export const calculateWeightedAverage = (items) => {
  if (!items?.length) return 0;

  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
};