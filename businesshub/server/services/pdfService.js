const PDFDocument = require('pdfkit');

// Streams a clean, branded invoice/receipt PDF directly to the HTTP response.
function renderDocumentPdf(res, { docType, docNumber, business, customer, items, subtotal, discount, tax, total, dueDate, notes, status }) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${docNumber}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).fillColor('#4F46E5').text('BusinessHub', { continued: false });
  doc.fontSize(10).fillColor('#6B7280').text(docType.toUpperCase());
  doc.moveDown();

  doc.fillColor('#111827').fontSize(14).text(business?.name || 'Business', { continued: false });
  doc.fontSize(9).fillColor('#6B7280');
  if (business?.address) doc.text(business.address);
  if (business?.phone) doc.text(business.phone);
  if (business?.email) doc.text(business.email);
  doc.moveDown();

  doc.fontSize(11).fillColor('#111827').text(`${docType} #: ${docNumber}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  if (dueDate) doc.text(`Due: ${new Date(dueDate).toLocaleDateString()}`);
  if (status) doc.text(`Status: ${status.toUpperCase()}`);
  doc.moveDown();

  doc.fontSize(11).text(`Bill to: ${customer?.name || 'Customer'}`);
  if (customer?.phone) doc.fontSize(9).fillColor('#6B7280').text(customer.phone);
  doc.moveDown();

  // Items table
  doc.fillColor('#111827').fontSize(10);
  const tableTop = doc.y;
  doc.text('Description', 50, tableTop, { width: 220 });
  doc.text('Qty', 280, tableTop, { width: 60 });
  doc.text('Price', 350, tableTop, { width: 80 });
  doc.text('Amount', 440, tableTop, { width: 80 });
  doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).strokeColor('#E5E7EB').stroke();

  let y = tableTop + 22;
  items.forEach((item) => {
    doc.text(item.description || item.name, 50, y, { width: 220 });
    doc.text(String(item.quantity), 280, y, { width: 60 });
    doc.text(`\u20a6${item.price.toLocaleString()}`, 350, y, { width: 80 });
    doc.text(`\u20a6${(item.price * item.quantity).toLocaleString()}`, 440, y, { width: 80 });
    y += 20;
  });

  doc.moveTo(50, y + 5).lineTo(520, y + 5).strokeColor('#E5E7EB').stroke();
  y += 15;
  doc.text(`Subtotal: \u20a6${subtotal.toLocaleString()}`, 350, y, { width: 170, align: 'right' });
  y += 15;
  if (discount) {
    doc.text(`Discount: -\u20a6${discount.toLocaleString()}`, 350, y, { width: 170, align: 'right' });
    y += 15;
  }
  if (tax) {
    doc.text(`Tax: \u20a6${tax.toLocaleString()}`, 350, y, { width: 170, align: 'right' });
    y += 15;
  }
  doc.fontSize(12).fillColor('#4F46E5').text(`Total: \u20a6${total.toLocaleString()}`, 350, y, { width: 170, align: 'right' });

  if (notes) {
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#6B7280').text(`Notes: ${notes}`);
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#9CA3AF').text('Generated with BusinessHub', { align: 'center' });

  doc.end();
}

module.exports = { renderDocumentPdf };
