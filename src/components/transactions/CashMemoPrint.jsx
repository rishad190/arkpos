"use client";

import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { formatProductWithColor } from "@/lib/color-utils";
// --- REMOVED: React import and forwardRef ---

// --- CHANGED: This is now a regular functional component ---
export function CashMemoPrint({ memoData, products, grandTotal }) {
  return (
    // --- REMOVED: ref from this div ---
    <div className="print-container p-8">
      <style type="text/css" media="print">
        {`
            @media print {
              .print-container {
                padding: 20mm;
                font-family: sans-serif;
                font-size: 10pt;
                color: #000;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto;
              }
              .company-name {
                font-size: 24pt;
                font-weight: bold;
                margin: 0;
              }
              .header p {
                margin: 2px 0;
                font-size: 9pt;
              }
              .memo-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 10pt;
              }
              .customer-details, .memo-details {
                width: 48%;
              }
              .customer-details h3 {
                font-weight: bold;
                border-bottom: 1px solid #ccc;
                padding-bottom: 4px;
                margin-bottom: 4px;
              }
              .customer-details p, .memo-details p {
                margin: 2px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 6px;
                font-size: 9pt;
              }
              th {
                background-color: #f4f4f4;
                font-weight: bold;
                text-align: left;
              }
              .text-right {
                text-align: right;
              }
              .grand-total {
                margin-top: 20px;
                float: right;
                width: 40%;
                font-size: 11pt;
              }
              .grand-total p {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
                padding-top: 4px;
                border-top: 1px solid #eee;
              }
              .font-semibold {
                font-weight: 600;
              }
            }
          `}
      </style>
      <div className="header">
        <img src="/download.png" alt="ARK Enterprise Logo" className="logo" />
        <h1 className="company-name">ARK Enterprise</h1>
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
            <strong>Date:</strong> {formatDate(new Date(memoData.date))}
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th className="text-right">Quantity</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td>{formatProductWithColor(product)}</td>
              <td className="text-right">{product.quantity}</td>
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

// --- REMOVED: displayName and forwardRef wrapper ---
