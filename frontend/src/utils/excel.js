import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions [{ key, header, width }]
 * @param {string} filename - Output filename
 */
export const exportToExcel = (data, columns, filename) => {
  // Kiểm tra đầu vào
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Columns must be a non-empty array');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  try {
    const worksheetData = data.map(item =>
      columns.reduce((acc, col) => {
        acc[col.header] =
          item[col.key] !== undefined && item[col.key] !== null
            ? item[col.key].toString()
            : '';
        return acc;
      }, {})
    );

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 10 }));
    worksheet['!cols'] = colWidths;

    // Chuẩn hóa tên file
    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    // Tạo blob và tải xuống trong trình duyệt
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to export Excel: ${error.message}`);
  }
};