import { Suspense } from 'react';
import { EsqueciSenhaContent } from './esqueci-senha-content';

export const metadata = { title: 'Esqueci minha senha' };

export default function EsqueciSenhaPage() {
  return (
    <Suspense>
      <EsqueciSenhaContent />
    </Suspense>
  );
}
