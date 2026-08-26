import { z } from 'zod';

export const optionalNum = z.coerce.number().optional().or(z.literal('')).transform((v) => {
  if (v === '' || v === 0) return undefined;
  return v;
});

export const optionalPositiveNum = z.coerce.number().positive().optional().or(z.literal('')).transform((v) => {
  if (v === '' || v === 0) return undefined;
  return v;
});

export const optionalNonNegNum = z.coerce.number().min(0).optional().or(z.literal('')).transform((v) => {
  if (v === '' || v === 0) return undefined;
  return v;
});
