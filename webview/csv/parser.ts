/**
 * 高性能 CSV 解析器/序列化器
 * 支持 RFC 4180 标准：引号转义、字段内换行、逗号处理
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const len = text.length;
  let i = 0;
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
        if (i < len && text[i] === '\n') i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function normalizeRows(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;
  let maxCols = 0;
  for (const row of rows) {
    if (row.length > maxCols) maxCols = row.length;
  }
  return rows.map(r => {
    if (r.length < maxCols) {
      const padded = [...r];
      while (padded.length < maxCols) padded.push('');
      return padded;
    }
    return r;
  });
}

function escapeField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

export function serializeCsv(headers: string[], rows: string[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeField).join(','));
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return lines.join('\n');
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseAndSplit(text: string): ParsedCsv {
  if (!text.trim()) return { headers: [], rows: [] };
  const allRows = normalizeRows(parseCsv(text));
  if (allRows.length === 0) return { headers: [], rows: [] };
  return { headers: allRows[0], rows: allRows.slice(1) };
}
