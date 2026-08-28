import { Injectable } from '@nestjs/common';

export type MetricLabels = Record<string, string>;

interface HistogramSeries {
  buckets: number[];
  cumulative: number[];
  sum: number;
  count: number;
}

/**
 * Buckets (em segundos) compatíveis com o default do Prometheus para
 * `http_request_duration_seconds`.
 */
const DEFAULT_BUCKETS: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function serializeLabels(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return keys.map((key) => `${key}="${escapeLabelValue(labels[key] ?? '')}"`).join(',');
}

/**
 * Registry de métricas no formato de exposição do Prometheus (text format
 * 0.0.4), sem dependências externas. Suporta counters, gauges e histograms
 * básicos com labels — suficiente para o scraping do painel de monitoramento.
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, Map<string, number>>();
  private readonly gauges = new Map<string, Map<string, number>>();
  private readonly histograms = new Map<string, Map<string, HistogramSeries>>();
  private readonly helps = new Map<string, string>();

  describe(name: string, help: string): void {
    this.helps.set(name, help);
  }

  increment(name: string, labels: MetricLabels = {}, by = 1): void {
    if (by === 0) return;
    const key = serializeLabels(labels);
    const family = this.counters.get(name) ?? new Map<string, number>();
    family.set(key, (family.get(key) ?? 0) + by);
    this.counters.set(name, family);
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = serializeLabels(labels);
    const family = this.gauges.get(name) ?? new Map<string, number>();
    family.set(key, value);
    this.gauges.set(name, family);
  }

  observe(name: string, value: number, labels: MetricLabels = {}): void {
    if (!Number.isFinite(value)) return;
    const key = serializeLabels(labels);
    const family = this.histograms.get(name) ?? new Map<string, HistogramSeries>();
    const series = family.get(key) ?? {
      buckets: DEFAULT_BUCKETS,
      cumulative: DEFAULT_BUCKETS.map(() => 0),
      sum: 0,
      count: 0,
    };
    DEFAULT_BUCKETS.forEach((bucket, index) => {
      if (value <= bucket) series.cumulative[index] = (series.cumulative[index] ?? 0) + 1;
    });
    series.sum += value;
    series.count += 1;
    family.set(key, series);
    this.histograms.set(name, family);
  }

  getMetricsText(): string {
    const lines: string[] = [];
    for (const [name, family] of this.counters) lines.push(...this.textCounter(name, family));
    for (const [name, family] of this.gauges) lines.push(...this.textGauge(name, family));
    for (const [name, family] of this.histograms) lines.push(...this.textHistogram(name, family));
    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  private header(name: string): string {
    const help = this.helps.get(name);
    return help ? `# HELP ${name} ${help}\n` : '';
  }

  private textCounter(name: string, family: Map<string, number>): string[] {
    const rows = [...family.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([labels, value]) => (labels ? `${name}{${labels}} ${value}` : `${name} ${value}`));
    return [`${this.header(name)}# TYPE ${name} counter`, ...rows];
  }

  private textGauge(name: string, family: Map<string, number>): string[] {
    const rows = [...family.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([labels, value]) => (labels ? `${name}{${labels}} ${value}` : `${name} ${value}`));
    return [`${this.header(name)}# TYPE ${name} gauge`, ...rows];
  }

  private textHistogram(name: string, family: Map<string, HistogramSeries>): string[] {
    const lines: string[] = [`${this.header(name)}# TYPE ${name} histogram`];
    for (const [labels, series] of [...family.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const suffix = labels ? `,${labels}` : '';
      series.buckets.forEach((bucket, index) => {
        lines.push(`${name}_bucket{le="${bucket}"${suffix}} ${series.cumulative[index] ?? 0}`);
      });
      lines.push(`${name}_bucket{le="+Inf"${suffix}} ${series.count}`);
      lines.push(`${name}_sum${labels ? `{${labels}}` : ''} ${series.sum}`);
      lines.push(`${name}_count${labels ? `{${labels}}` : ''} ${series.count}`);
    }
    return lines;
  }
}
