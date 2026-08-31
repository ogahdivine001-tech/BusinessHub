const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;
const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;
const generateReceiptNumber = () => `RCP-${Date.now().toString(36).toUpperCase()}`;

module.exports = { generateOrderNumber, generateInvoiceNumber, generateReceiptNumber };
