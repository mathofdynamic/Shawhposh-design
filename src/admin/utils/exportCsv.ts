/**
 * Honest CSV Exporter with UTF-8 BOM for Persian (Farsi) Excel compatibility
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
