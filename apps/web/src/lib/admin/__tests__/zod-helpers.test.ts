import { describe, expect, it } from 'vitest';
import { optionalNonNegNum, optionalNum, optionalPositiveNum } from '../zod-helpers';

describe('optionalNum', () => {
  it('mantém números', () => {
    const schema = optionalNum;
    expect(schema.parse(5)).toBe(5);
    expect(schema.parse('3.5')).toBe(3.5);
  });

  it('normaliza vazio e zero para undefined', () => {
    expect(optionalNum.parse('')).toBeUndefined();
    expect(optionalNum.parse(0)).toBeUndefined();
  });
});

describe('optionalPositiveNum', () => {
  it('rejeita zero e negativos', () => {
    expect(() => optionalPositiveNum.parse(-1)).toThrow();
    expect(() => optionalPositiveNum.parse(0)).toThrow();
  });

  it('aceita positivos e normaliza vazio', () => {
    expect(optionalPositiveNum.parse(10)).toBe(10);
    expect(optionalPositiveNum.parse('')).toBeUndefined();
  });
});

describe('optionalNonNegNum', () => {
  it('aceita zero como undefined', () => {
    expect(optionalNonNegNum.parse(0)).toBeUndefined();
  });

  it('aceita positivos e rejeita negativos', () => {
    expect(optionalNonNegNum.parse(7)).toBe(7);
    expect(() => optionalNonNegNum.parse(-2)).toThrow();
  });
});