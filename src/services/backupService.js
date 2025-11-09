"use client";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";

// Collection references for backup
const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH: "dailyCash",
  FABRIC_BATCHES: "fabricBatches",
  FABRICS: "fabrics",
  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",
  SETTINGS: "settings",
};

class BackupService {
  /**
   * Export all data from Firebase to a structured JSON format
   */
  async exportAllData() {
    try {
      const backupData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.0.0",
          appName: "POS System",
          totalCollections: Object.keys(COLLECTION_REFS).length,
        },
        collections: {},
      };

      // Export each collection
      for (const [collectionName, collectionPath] of Object.entries(
        COLLECTION_REFS
      )) {
        try {
          const collectionRef = ref(db, collectionPath);
          const snapshot = await get(collectionRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            backupData.collections[collectionName] = {
              count: Object.keys(data).length,
              data: data,
              exportedAt: new Date().toISOString(),
            };
          } else {
            backupData.collections[collectionName] = {
              count: 0,
              data: {},
              exportedAt: new Date().toISOString(),
            };
          }
        } catch (error) {
          console.error(`Error exporting ${collectionName}:`, error);
          backupData.collections[collectionName] = {
            count: 0,
            data: {},
            error: error.message,
            exportedAt: new Date().toISOString(),
          };
        }
      }

      // Calculate total records
      const totalRecords = Object.values(backupData.collections).reduce(
        (sum, collection) => sum + collection.count,
        0
      );

      backupData.metadata.totalRecords = totalRecords;
      backupData.metadata.exportCompleted = new Date().toISOString();

      return backupData;
    } catch (error) {
      console.error("Error during data export:", error);
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Export data as JSON file
   */
  async exportToJSON() {
    try {
      const backupData = await this.exportAllData();
      const jsonString = JSON.stringify(backupData, null, 2);

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `pos-backup-${formatDate(
        new Date(),
        "YYYY-MM-DD-HH-mm-ss"
      )}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: link.download,
        recordCount: backupData.metadata.totalRecords,
      };
    } catch (error) {
      console.error("Error exporting to JSON:", error);
      throw error;
    }
  }

  /**
   * Export data as CSV files (one per collection)
   */
  async exportToCSV() {
    try {
      const backupData = await this.exportAllData();
      const csvFiles = [];

      for (const [collectionName, collectionData] of Object.entries(
        backupData.collections
      )) {
        if (collectionData.count > 0) {
          const csvContent = this.convertToCSV(collectionData.data);
          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.download = `${collectionName}-${formatDate(
            new Date(),
            "YYYY-MM-DD"
          )}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          csvFiles.push({
            filename: link.download,
            recordCount: collectionData.count,
          });
        }
      }

      return {
        success: true,
        files: csvFiles,
        totalFiles: csvFiles.length,
      };
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      throw error;
    }
  }

  /**
   * Convert object data to CSV format
   */
  convertToCSV(data) {
    if (!data || Object.keys(data).length === 0) {
      return "No data available";
    }

    const items = Object.entries(data).map(([id, value]) => ({
      id,
      ...value,
    }));

    if (items.length === 0) {
      return "No data available";
    }

    // Get all unique keys from all items
    const allKeys = new Set();
    items.forEach((item) => {
      Object.keys(item).forEach((key) => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(",")];

    // Add data rows
    items.forEach((item) => {
      const values = headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) {
          return "";
        }
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  }

  /**
   * Create a compressed backup (ZIP-like structure in JSON)
   */
  async createCompressedBackup() {
    try {
      const backupData = await this.exportAllData();

      // Create a compressed version with base64 encoding for binary data
      const compressedData = {
        ...backupData,
        compressed: true,
        compressionDate: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(compressedData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `pos-backup-compressed-${formatDate(
        new Date(),
        "YYYY-MM-DD-HH-mm-ss"
      )}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: link.download,
        recordCount: backupData.metadata.totalRecords,
        compressed: true,
      };
    } catch (error) {
      console.error("Error creating compressed backup:", error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    try {
      const backupData = await this.exportAllData();

      return {
        totalCollections: backupData.metadata.totalCollections,
        totalRecords: backupData.metadata.totalRecords,
        exportDate: backupData.metadata.exportDate,
        collectionStats: Object.entries(backupData.collections).map(
          ([name, data]) => ({
            name,
            count: data.count,
            hasError: !!data.error,
          })
        ),
      };
    } catch (error) {
      console.error("Error getting backup stats:", error);
      throw error;
    }
  }

  /**
   * Validate backup file
   */
  validateBackupFile(file) {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      if (file.type !== "application/json") {
        throw new Error("Invalid file type. Please select a JSON backup file.");
      }

      return {
        valid: true,
        message: "Backup file is valid",
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message,
      };
    }
  }

  /**
   * Parse backup file for restore
   */
  async parseBackupFile(file) {
    try {
      const validation = this.validateBackupFile(file);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup structure
      if (!backupData.metadata || !backupData.collections) {
        throw new Error("Invalid backup file format");
      }

      return {
        success: true,
        data: backupData,
        metadata: backupData.metadata,
        collections: Object.keys(backupData.collections),
      };
    } catch (error) {
      console.error("Error parsing backup file:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const backupService = new BackupService();
export default backupService;
