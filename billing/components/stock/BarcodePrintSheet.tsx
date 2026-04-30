"use client";

import React, { forwardRef } from "react";
import Barcode from "react-barcode";

interface BarcodePrintSheetProps {
  barcodes: string[];
  productName: string;
  size: string;
  price: number;
  notes?: string;
}

const BarcodePrintSheet = forwardRef<HTMLDivElement, BarcodePrintSheetProps>(
  ({ barcodes, productName, size, price, notes }, ref) => {
    return (
      <div id="barcode-label-sheet" ref={ref} className="label-grid label-grid-screen">
        {barcodes.map((code, index) => (
          <div key={`${code}-${index}`} className="barcode-label barcode-label-screen">
            <div className="label-barcode">
              <Barcode
                value={code}
                format="CODE128"
                renderer="svg"
                width={0.85}
                height={44}
                displayValue={false}
                margin={0}
                lineColor="#000000"
                background="#FFFFFF"
              />
            </div>
            <div className="label-barcode-number">{code}</div>
            <div className="label-name">{productName}</div>
            <div className="label-size">Size: {size}</div>
            {notes && <div className="label-notes">{notes}</div>}
            <div className="label-price">₹{price}</div>
            <div className="label-shop-name">SOWAAT</div>
          </div>
        ))}
      </div>
    );
  }
);

export default BarcodePrintSheet;

