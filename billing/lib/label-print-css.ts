/** Shared label grid CSS for screen preview and QZ HTML print */
export const LABEL_CSS = `
  .label-grid {
    display: grid;
    grid-template-columns: repeat(3, 3.4cm);
    grid-auto-rows: 2.5cm;
    column-gap: 0;
    row-gap: 0.3cm;
    margin: 0;
    padding: 0;
    width: auto;
    align-content: start;
    height: fit-content;
    overflow: visible;
  }

  .barcode-label {
    width: 100%;
    height: 2.4cm;
    box-sizing: border-box;
    padding: 0.08cm 0.1cm;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
    position: relative;
  }

  .barcode-label-empty {
    visibility: hidden;
  }

  .label-name {
    font-family: "Courier New", monospace;
    font-size: 5pt;
    font-weight: 800;
    color: #000;
    text-align: left;
    margin-bottom: 0.01cm;
    text-transform: uppercase;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .label-size {
    font-family: "Courier New", monospace;
    font-size: 6pt;
    font-weight: 600;
    color: #000;
    margin-bottom: 0.01cm;
    text-align: left;
  }

  .label-notes {
    font-family: "Courier New", monospace;
    font-size: 5pt;
    font-weight: 600;
    color: #000;
    margin-bottom: 0.01cm;
    text-align: left;
    text-transform: uppercase;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .label-barcode {
    width: 100%;
    height: 1.2cm;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    overflow: hidden;
  }

  .label-barcode svg,
  .label-barcode canvas {
    width: auto !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    display: block;
  }

  .label-barcode svg {
    shape-rendering: crispEdges;
  }

  .label-barcode-number {
    font-family: "Courier New", monospace;
    font-size: 5pt;
    font-weight: 600;
    color: #000;
    letter-spacing: 0.01cm;
    margin-top: 0.02cm;
    text-align: left;
    line-height: 1;
    width: 100%;
  }

  .label-price {
    font-family: "Courier New", monospace;
    font-size: 6pt;
    font-weight: 900;
    color: #000;
    margin-top: 0.01cm;
    line-height: 1;
    text-align: left;
    width: 100%;
  }

  .label-shop-name {
    position: absolute;
    right: 0.08cm;
    bottom: 0.06cm;
    font-family: "Courier New", monospace;
    font-size: 5pt;
    font-weight: 700;
    color: #000;
    text-align: right;
  }
`;

export const LABEL_SCREEN_CSS = `
  .barcode-label-screen {
    border: 1px solid #2E3347;
    border-radius: 4px;
    padding: 8px;
    background: #1A1D27;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .label-grid-screen {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    row-gap: 16px;
  }
`;
