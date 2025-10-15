"use client";

import { formatDate } from "@/lib/utils";
import Image from "next/image";

export function CashMemoPrint({ memoData, products, grandTotal }) {
  return (
    <div className="print-container">
      <div className="header">
        <img src="/download.png" alt="Sky Fabric's" className="logo" />
        <h1 className="company-name">Sky Fabric's</h1>
        <p>Afroza Mini Market Seltex 11, Block C,</p>
        <p>Road 30, Line 9, House 34, Mirpur 11, Dhaka</p>
      </div>

      <div className="memo-info">
        <div className="customer-details">
          <h3>Customer Details</h3>
          <p>{memoData.customerName}</p>
          <p>{memoData.customerPhone}</p>
          <p>{memoData.customerAddress}</p>
        </div>
        <div className="memo-details">
          <p>
            <strong>Memo No:</strong> {memoData.memoNumber}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {formatDate(new Date(memoData.date), "dd MMM yyyy")}
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th className="text-right">Quality</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td>{product.name}</td>
              <td className="text-right">{product.quality}</td>
              <td className="text-right">
                ৳{parseFloat(product.price).toLocaleString()}
              </td>
              <td className="text-right">৳{product.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grand-total space-y-2">
        <p>
          <span className="font-semibold">Grand Total:</span> ৳
          {grandTotal.toLocaleString()}
        </p>
        {memoData.deposit && Number(memoData.deposit) > 0 && (
          <>
            <p>
              <span className="font-semibold">Deposit:</span> ৳
              {Number(memoData.deposit).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold">Due:</span> ৳
              {(grandTotal - Number(memoData.deposit)).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
