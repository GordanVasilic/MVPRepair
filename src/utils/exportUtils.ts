import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export const exportToPDF = (title: string, data: any[], columns: string[], filename: string) => {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(16)
  doc.text(title, 20, 20)
  
  // Add date
  doc.setFontSize(10)
  doc.text(`Datum izvještaja: ${new Date().toLocaleDateString('hr-HR')}`, 20, 30)
  
  // Create table
  const tableData = data.map(item => 
    columns.map(col => {
      const value = item[col]
      if (value === null || value === undefined) return 'N/A'
      if (typeof value === 'object' && value.name) return value.name
      if (typeof value === 'boolean') return value ? 'Da' : 'Ne'
      if (typeof value === 'number') return value.toString()
      return value.toString()
    })
  )
  
  doc.autoTable({
    head: [columns.map(col => col.charAt(0).toUpperCase() + col.slice(1))],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255
    }
  })
  
  doc.save(`${filename}.pdf`)
}

export const exportToExcel = (title: string, data: any[], filename: string) => {
  // Create workbook
  const wb = XLSX.utils.book_new()
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, title)
  
  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export const exportChartToPDF = (title: string, chartElement: HTMLElement, filename: string) => {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(16)
  doc.text(title, 20, 20)
  
  // Add date
  doc.setFontSize(10)
  doc.text(`Datum izvještaja: ${new Date().toLocaleDateString('hr-HR')}`, 20, 30)
  
  // Convert chart to image and add to PDF
  // This would require html2canvas or similar library for proper implementation
  // For now, we'll just add a placeholder
  doc.setFontSize(12)
  doc.text('Grafik će biti dodan u budućoj verziji', 20, 50)
  
  doc.save(`${filename}.pdf`)
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('hr-HR')
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('hr-HR')
}