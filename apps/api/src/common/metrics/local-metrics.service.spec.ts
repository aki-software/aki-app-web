import { LocalMetricsService } from './local-metrics.service.js';

describe('LocalMetricsService', () => {
  it('records only fixed domain transitions and attempt outcomes without identifiers', async () => {
    const metrics = new LocalMetricsService();
    metrics.recordDomainTransition('evaluation_completed');
    metrics.recordDomainTransition('report_available');
    metrics.recordDomainAttempt('payment_settlement', 'failure');
    metrics.recordDomainAttempt('fulfillment', 'success');
    const body = await metrics.scrape();
    expect(body).toContain(
      'akit_domain_transitions_total{transition="evaluation_completed"} 1',
    );
    expect(body).toContain(
      'akit_domain_transitions_total{transition="report_available"} 1',
    );
    expect(body).toContain(
      'akit_domain_attempts_total{operation="payment_settlement",outcome="failure"} 1',
    );
    expect(body).toContain(
      'akit_domain_attempts_total{operation="fulfillment",outcome="success"} 1',
    );
    expect(body).not.toContain('session-1');
  });
  it('records HTTP totals and duration with a bounded route template', async () => {
    const metrics = new LocalMetricsService();
    metrics.recordHttpRequest(
      {
        method: 'GET',
        route: { path: '/api/v1/reports/:id' },
        baseUrl: '/private-email@example.com',
        originalUrl: '/api/v1/reports/private-email@example.com',
      } as never,
      503,
      250,
    );
    metrics.recordHttpRequest(
      { method: 'GET', originalUrl: '/secret/unknown' } as never,
      404,
      10,
    );
    const body = await metrics.scrape();
    expect(body).toContain(
      'akit_http_requests_total{method="GET",route="/api/v1/reports/:id",status="503"} 1',
    );
    expect(body).toContain(
      'akit_http_request_duration_seconds_count{method="GET",route="/api/v1/reports/:id",status="503"} 1',
    );
    expect(body).toContain('route="unmatched"');
    expect(body).not.toContain('private-email@example.com');
    expect(body).not.toContain('/secret/unknown');
  });
});
