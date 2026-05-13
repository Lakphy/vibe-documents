import { describe, it, expect } from 'vitest';
import { parseCsv, normalizeRows, serializeCsv, parseAndSplit } from '../csv/parser';

describe('parseCsv', () => {
  it('解析简单 CSV 文本', () => {
    const result = parseCsv('a,b,c\n1,2,3');
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('处理空字符串返回空数组', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('处理单行无换行', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  it('处理引号字段', () => {
    const result = parseCsv('"hello, world",b,c');
    expect(result).toEqual([['hello, world', 'b', 'c']]);
  });

  it('处理引号中的转义引号', () => {
    const result = parseCsv('"say ""hi""",b');
    expect(result).toEqual([['say "hi"', 'b']]);
  });

  it('处理字段内换行（引号包裹）', () => {
    const result = parseCsv('"line1\nline2",b');
    expect(result).toEqual([['line1\nline2', 'b']]);
  });

  it('处理 CRLF 换行', () => {
    const result = parseCsv('a,b\r\n1,2');
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('处理末尾换行（不生成额外空行）', () => {
    const result = parseCsv('a,b\n1,2\n');
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('处理空字段', () => {
    const result = parseCsv('a,,c\n,2,');
    expect(result).toEqual([['a', '', 'c'], ['', '2', '']]);
  });

  it('处理大量数据不崩溃', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => `${i},value${i},data${i}`).join('\n');
    const result = parseCsv(rows);
    expect(result.length).toBe(1000);
    expect(result[999]).toEqual(['999', 'value999', 'data999']);
  });
});

describe('normalizeRows', () => {
  it('补齐不等长行', () => {
    const input = [['a', 'b', 'c'], ['1', '2']];
    const result = normalizeRows(input);
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '']]);
  });

  it('空数组返回空数组', () => {
    expect(normalizeRows([])).toEqual([]);
  });

  it('等长行不修改', () => {
    const input = [['a', 'b'], ['1', '2']];
    const result = normalizeRows(input);
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('serializeCsv', () => {
  it('序列化简单数据', () => {
    const result = serializeCsv(['a', 'b'], [['1', '2'], ['3', '4']]);
    expect(result).toBe('a,b\n1,2\n3,4');
  });

  it('包含逗号的字段自动加引号', () => {
    const result = serializeCsv(['name', 'value'], [['hello, world', 'test']]);
    expect(result).toBe('name,value\n"hello, world",test');
  });

  it('包含引号的字段正确转义', () => {
    const result = serializeCsv(['a'], [['say "hi"']]);
    expect(result).toBe('a\n"say ""hi"""');
  });

  it('包含换行的字段正确转义', () => {
    const result = serializeCsv(['a'], [['line1\nline2']]);
    expect(result).toBe('a\n"line1\nline2"');
  });

  it('空行数据序列化为仅表头', () => {
    const result = serializeCsv(['a', 'b', 'c'], []);
    expect(result).toBe('a,b,c');
  });
});

describe('parseAndSplit', () => {
  it('将第一行作为表头、其余作为数据行', () => {
    const result = parseAndSplit('name,age\nAlice,30\nBob,25');
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toEqual([['Alice', '30'], ['Bob', '25']]);
  });

  it('空字符串返回空 headers 和 rows', () => {
    const result = parseAndSplit('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('仅表头行返回空 rows', () => {
    const result = parseAndSplit('a,b,c');
    expect(result.headers).toEqual(['a', 'b', 'c']);
    expect(result.rows).toEqual([]);
  });

  it('不等长行被补齐', () => {
    const result = parseAndSplit('a,b,c\n1,2');
    expect(result.headers).toEqual(['a', 'b', 'c']);
    expect(result.rows).toEqual([['1', '2', '']]);
  });

  it('解析-序列化往返一致性', () => {
    const original = 'name,score,note\nAlice,95,"good job"\nBob,88,ok';
    const { headers, rows } = parseAndSplit(original);
    const serialized = serializeCsv(headers, rows);
    const reparsed = parseAndSplit(serialized);
    expect(reparsed.headers).toEqual(headers);
    expect(reparsed.rows).toEqual(rows);
  });

  it('单独 CR 换行（无 LF）也作为换行处理', () => {
    const result = parseAndSplit('a,b\r1,2');
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toEqual([['1', '2']]);
  });

  it('仅含空白（空格/换行）的输入返回空结果', () => {
    expect(parseAndSplit('   \n   \n')).toEqual({ headers: [], rows: [] });
  });
});
