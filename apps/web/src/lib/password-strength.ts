export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  label: string;
  color: string;
  aria: string;
  requirements: Array<{ met: boolean; text: string }>;
}

const LABELS: Record<Exclude<PasswordStrength, 'empty'>, string> = {
  weak: 'Fraca',
  medium: 'Média',
  strong: 'Forte',
};

const COLORS: Record<Exclude<PasswordStrength, 'empty'>, string> = {
  weak: '#dc2626',
  medium: '#e8862e',
  strong: '#4c8c3f',
};

/**
 * Heurística leve (client-side, UX only — a regra oficial é só min 8):
 * comprimento >=8/12, maiúscula+minúscula, dígito, símbolo.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = [
    { met: password.length >= 8, text: 'Pelo menos 8 caracteres' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), text: 'Letras maiúsculas e minúsculas' },
    { met: /\d/.test(password), text: 'Ao menos um número' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Um símbolo (ex.: ! @ #)' },
  ];

  if (password.length === 0) {
    return { strength: 'empty', score: 0, label: '', color: '', aria: '', requirements };
  }

  let score = requirements.filter((r) => r.met).length;
  if (password.length >= 12) score += 1;

  let strength: Exclude<PasswordStrength, 'empty'>;
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';

  return {
    strength,
    score,
    label: LABELS[strength],
    color: COLORS[strength],
    aria: `Força da senha: ${LABELS[strength]}`,
    requirements,
  };
}
