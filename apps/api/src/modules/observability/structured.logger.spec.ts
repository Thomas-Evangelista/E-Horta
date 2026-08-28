import { StructuredLogger } from './structured.logger';
import { runWithRequestContext } from './request-context';

describe('StructuredLogger', () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('emite JSON em produção com requestId do contexto', () => {
    const logger = new StructuredLogger({ pretty: false });

    runWithRequestContext({ requestId: 'req-abc', method: 'GET', url: '/x' }, () => {
      logger.log('olá', 'AuthService');
    });

    const line = stdoutSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(line);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('olá');
    expect(entry.context).toBe('AuthService');
    expect(entry.requestId).toBe('req-abc');
    expect(entry.timestamp).toBeTruthy();
    expect(entry.pid).toBeGreaterThan(0);
  });

  it('serializa objetos e erros sem estourar', () => {
    const logger = new StructuredLogger({ pretty: false });
    logger.error(new Error('boom'));

    const entry = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
    expect(entry.level).toBe('error');
    expect(entry.message.message).toBe('boom');
    expect(entry.message.stack).toBeTruthy();
  });

  it('emite texto legível no modo pretty', () => {
    const logger = new StructuredLogger({ pretty: true });
    logger.warn('cuidado', 'Health');

    const line = stdoutSpy.mock.calls[0]?.[0] as string;
    expect(line).toContain('[WARN] [Health]: cuidado');
  });

  it('usa o último argumento string como contexto', () => {
    const logger = new StructuredLogger({ pretty: false });
    logger.debug('mensagem', undefined, 'MeuContexto');

    const entry = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
    expect(entry.context).toBe('MeuContexto');
  });
});
