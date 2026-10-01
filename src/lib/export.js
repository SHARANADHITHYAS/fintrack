/*
 * Excel (.xlsx) and PDF export. Libraries load on demand so the main bundle stays small.
 * report = { title, subtitle, fileName, summary: [[label, value]], columns: [{ header, key, width, money }], rows: [{...}] }
 */

const safeName = (s) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')

export async function exportExcel(report) {
  const XLSX = await import('xlsx')
  const aoa = [[report.title], [report.subtitle || ''], []]
  if (report.summary?.length) {
    aoa.push(['Summary'])
    report.summary.forEach(([k, v]) => aoa.push([k, v]))
    aoa.push([])
  }
  aoa.push(report.columns.map((c) => c.header))
  report.rows.forEach((r) => aoa.push(report.columns.map((c) => r[c.key] ?? '')))
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = report.columns.map((c) => ({ wch: c.width || 16 }))
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(3, report.columns.length - 1) } }]
  // Number format for money columns
  const headerRow = aoa.length - report.rows.length - 1
  report.columns.forEach((c, ci) => {
    if (!c.money) return
    for (let ri = headerRow + 1; ri < aoa.length; ri++) {
      const ref = XLSX.utils.encode_cell({ r: ri, c: ci })
      if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '"₹"#,##,##0.00'
    }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, (report.sheetName || 'FinTrack').slice(0, 31))
  XLSX.writeFile(wb, `${safeName(report.fileName || report.title)}.xlsx`)
}

// jsPDF's built-in fonts have no ₹ glyph, so PDFs use "Rs."
const pdfText = (v) => String(v ?? '').replace(/₹/g, 'Rs. ').replace(/−/g, '-').replace(/[’]/g, "'").replace(/[^\x20-\x7E]/g, '')

export async function exportPdf(report) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: report.columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  // Header band
  doc.setFillColor(10, 15, 28)
  doc.rect(0, 0, W, 78, 'F')
  doc.setFillColor(45, 212, 191)
  doc.rect(0, 78, W, 3, 'F')
  doc.setTextColor(230, 237, 247)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('FinTrack', 40, 36)
  doc.setFontSize(12)
  doc.text(pdfText(report.title), 40, 58)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(131, 145, 171)
  doc.text(pdfText(report.subtitle || ''), W - 40, 58, { align: 'right' })
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, W - 40, 36, { align: 'right' })

  let y = 104
  if (report.summary?.length) {
    const colW = (W - 80) / Math.min(4, report.summary.length)
    report.summary.slice(0, 8).forEach(([k, v], i) => {
      const col = i % 4, row = Math.floor(i / 4)
      const x = 40 + col * colW, yy = y + row * 50
      doc.setFillColor(243, 246, 251)
      doc.roundedRect(x, yy, colW - 10, 40, 6, 6, 'F')
      doc.setFontSize(8.5)
      doc.setTextColor(91, 103, 130)
      doc.text(pdfText(k), x + 10, yy + 15)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11.5)
      doc.setTextColor(11, 19, 36)
      doc.text(pdfText(v), x + 10, yy + 31)
      doc.setFont('helvetica', 'normal')
    })
    y += Math.ceil(Math.min(8, report.summary.length) / 4) * 50 + 8
  }

  autoTable(doc, {
    startY: y,
    head: [report.columns.map((c) => pdfText(c.header))],
    body: report.rows.map((r) => report.columns.map((c) => pdfText(c.money && typeof r[c.key] === 'number' ? `Rs. ${r[c.key].toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : r[c.key]))),
    styles: { fontSize: 8.5, cellPadding: 5, textColor: [11, 19, 36], lineColor: [219, 227, 240], lineWidth: 0.4 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: Object.fromEntries(report.columns.map((c, i) => [i, c.money ? { halign: 'right' } : {}])),
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      doc.setFontSize(8)
      doc.setTextColor(138, 149, 173)
      doc.text(`Page ${doc.getNumberOfPages()}`, W - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
      doc.text('Every rupee tracked is a rupee understood.', 40, doc.internal.pageSize.getHeight() - 20)
    },
  })
  if (!report.rows.length) {
    doc.setFontSize(10)
    doc.setTextColor(91, 103, 130)
    doc.text('No records in this period.', 40, y + 40)
  }
  doc.save(`${safeName(report.fileName || report.title)}.pdf`)
}
