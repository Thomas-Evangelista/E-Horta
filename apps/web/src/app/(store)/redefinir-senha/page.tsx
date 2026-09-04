import { Suspense } from 'react';
import { RedefinirSenhaContent } from './redefinir-senha-content';

export const metadata = { title: 'Redefinir senha' };

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
