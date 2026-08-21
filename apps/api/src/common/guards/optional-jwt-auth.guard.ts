import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Autenticação opcional: este guard SEMPRE roda o passport para popular
  // req.user quando houver token válido. Rotas @Public() passam pelo guard
  // global, mas ainda precisam da identidade resolvida aqui.

  // Segue como anônimo (null) quando não há token ou ele é inválido.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user ?? null) as TUser;
  }
}
