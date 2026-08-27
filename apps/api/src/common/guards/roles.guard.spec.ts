import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator';

const makeContext = (user?: unknown): ExecutionContext => {
  const req = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => TestHandler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
function TestHandler() {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
function TestController() {}

describe('RolesGuard (autorização)', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it('deve permitir acesso quando não há roles exigidas', () => {
    const context = makeContext({ role: 'CUSTOMER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve permitir acesso quando o usuário tem a role exigida', () => {
    Roles('ADMIN')(TestHandler);
    const context = makeContext({ role: 'ADMIN' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve negar acesso quando o usuário não tem a role exigida', () => {
    Roles('ADMIN')(TestHandler);
    const context = makeContext({ role: 'CUSTOMER' });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('deve negar acesso quando não há usuário autenticado', () => {
    Roles('ADMIN')(TestHandler);
    const context = makeContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('deve usar as roles exigidas via ROLES_KEY', () => {
    const reflector = new Reflector();
    Roles('ADMIN', 'MANAGER')(TestHandler);
    const guardSpy = jest.spyOn(reflector, 'getAllAndOverride');
    const g = new RolesGuard(reflector);

    g.canActivate(makeContext({ role: 'MANAGER' }));

    expect(guardSpy).toHaveBeenCalledWith(ROLES_KEY, [TestHandler, TestController]);
  });
});
