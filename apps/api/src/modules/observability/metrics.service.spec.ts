import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('incrementa contadores com e sem labels', () => {
    metrics.increment('requests_total');
    metrics.increment('requests_total');
    metrics.increment('requests_total', { status: '500' });

    const text = metrics.getMetricsText();
    expect(text).toContain('requests_total 2');
    expect(text).toContain('requests_total{status="500"} 1');
  });

  it('serializa counters no formato do Prometheus com labels ordenadas', () => {
    metrics.describe('http_requests_total', 'Total de requisições HTTP');
    metrics.increment('http_requests_total', { method: 'GET', route: '/products', status: '200' });
    metrics.increment('http_requests_total', { method: 'GET', route: '/products', status: '200' });
    metrics.increment('http_requests_total', { method: 'GET', route: '/products', status: '500' });

    const text = metrics.getMetricsText();
    expect(text).toContain('# HELP http_requests_total Total de requisições HTTP');
    expect(text).toContain('# TYPE http_requests_total counter');
    expect(text).toContain('http_requests_total{method="GET",route="/products",status="200"} 2');
    expect(text).toContain('http_requests_total{method="GET",route="/products",status="500"} 1');
  });

  it('seta gauges com valor numérico', () => {
    metrics.setGauge('ehorta_database_up', 1);
    metrics.setGauge('nodejs_heap_bytes', 1024);

    const text = metrics.getMetricsText();
    expect(text).toContain('# TYPE ehorta_database_up gauge');
    expect(text).toContain('ehorta_database_up 1');
    expect(text).toContain('nodejs_heap_bytes 1024');
  });

  it('acumula buckets, sum e count em histogramas', () => {
    metrics.observe('http_request_duration_seconds', 0.02, { method: 'GET' });
    metrics.observe('http_request_duration_seconds', 0.2, { method: 'GET' });

    const text = metrics.getMetricsText();
    expect(text).toContain('# TYPE http_request_duration_seconds histogram');
    expect(text).toContain('http_request_duration_seconds_bucket{le="0.025",method="GET"} 1');
    expect(text).toContain('http_request_duration_seconds_bucket{le="0.25",method="GET"} 2');
    expect(text).toContain('http_request_duration_seconds_bucket{le="+Inf",method="GET"} 2');
    expect(text).toContain('http_request_duration_seconds_sum{method="GET"} 0.22');
    expect(text).toContain('http_request_duration_seconds_count{method="GET"} 2');
  });

  it('ignora valores não finitos no histograma', () => {
    metrics.observe('http_request_duration_seconds', NaN);
    metrics.observe('http_request_duration_seconds', Infinity);

    expect(metrics.getMetricsText()).toBe('');
  });

  it('escapa aspas em valores de labels', () => {
    metrics.increment('requests_total', { route: 'a"b' });

    expect(metrics.getMetricsText()).toContain('requests_total{route="a\\"b"} 1');
  });

  it('retorna texto vazio quando não há métricas', () => {
    expect(metrics.getMetricsText()).toBe('');
  });
});
