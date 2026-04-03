"use client";
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";
import { ProductService } from "@/services/productService";

const ProductContext = createContext(null);

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const productService = useMemo(() => new ProductService(db, logger), []);

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [productService]);

  const addProduct = useCallback(async (data) => {
    try {
      return await productService.addProduct(data);
    } catch (err) {
      logger.error("Context addProduct error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const updateProduct = useCallback(async (id, data) => {
    try {
      await productService.updateProduct(id, data);
      toast({ title: "Success", description: "Product updated successfully" });
    } catch (err) {
      logger.error("Context updateProduct error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      await productService.deleteProduct(id);
      toast({ title: "Success", description: "Product deleted successfully" });
    } catch (err) {
      logger.error("Context deleteProduct error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const addProductTransaction = useCallback(async (productId, data) => {
    try {
      await productService.addProductTransaction(productId, data);
      toast({ title: "Success", description: "Transaction logged successfully" });
    } catch (err) {
      logger.error("Context addProductTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const updateProductTransaction = useCallback(async (productId, transactionId, data) => {
    try {
      await productService.updateProductTransaction(productId, transactionId, data);
      toast({ title: "Success", description: "Transaction updated successfully" });
    } catch (err) {
      logger.error("Context updateProductTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const deleteProductTransaction = useCallback(async (productId, transactionId) => {
    try {
      await productService.deleteProductTransaction(productId, transactionId);
      toast({ title: "Success", description: "Transaction deleted successfully" });
    } catch (err) {
      logger.error("Context deleteProductTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [productService, toast]);

  const totals = useMemo(() => {
    return products.reduce((acc, product) => {
      acc.totalCost += product.totalCost || 0;
      acc.totalSales += product.totalSales || 0;
      acc.totalNetProfit += product.netProfit || 0;
      acc.totalPartnerInvestment += product.totalPartnerInvestment || 0;
      return acc;
    }, {
      totalCost: 0,
      totalSales: 0,
      totalNetProfit: 0,
      totalPartnerInvestment: 0
    });
  }, [products]);

  const value = {
    products,
    totals,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addProductTransaction,
    updateProductTransaction,
    deleteProductTransaction
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
