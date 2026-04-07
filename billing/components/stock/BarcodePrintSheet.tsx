"use client";

import React, { forwardRef } from "react";
import Barcode from "react-barcode";

interface BarcodePrintSheetProps {
  barcodes: string[];
  productName: string;
  size: string;
  price: number;
}

const BarcodePrintSheet = forwardRef<HTMLDivElement, BarcodePrintSheetProps>(
  ({ barcodes, productName, size, price }, ref) => {
    return (
      <div
        id="barcode-label-sheet"
        ref={ref}
        className="label-grid label-grid-screen"
      >
        {barcodes.map((code, index) => (
          <div
            key={code}
            className={`barcode-label barcode-label-screen ${
              (index + 1) % 3 === 0 ? "last-in-row" : ""
            }`}
          >
            <div className="label-name">{productName}</div>
            <div className="label-size">Size: {size}</div>
            <div className="label-barcode">
              <Barcode
                value={code}
                format="CODE128"
                width={1}
                height={24}
                displayValue={false}
                margin={0}
              />
            </div>
            <div className="label-barcode-number">{code}</div>
            <div className="label-price">₹{price}</div>
          </div>
        ))}
      </div>
    );
  }
);

export default BarcodePrintSheet;

