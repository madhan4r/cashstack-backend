import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const FETCH_TIMEOUT_MS = 10_000;

interface RatesResponse {
  result: string;
  rates: Record<string, number>;
}

/**
 * USD-pivoted exchange rates from a free, keyless API (open.er-api.com —
 * updates once a day). Fetched once at startup and refreshed daily; every
 * `convert` call reads the in-memory cache, never blocks on a live HTTP
 * call. If a scheduled refresh fails, the previous day's rates keep being
 * served (logged, not thrown) rather than breaking every dashboard/report
 * load over a transient network blip.
 */
@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);
  private ratesByCurrency: Record<string, number> | null = null;

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async refresh(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(RATES_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as RatesResponse;
      if (body.result !== 'success' || !body.rates) {
        throw new Error(`Unexpected response shape: ${JSON.stringify(body)}`);
      }

      this.ratesByCurrency = body.rates;
      this.logger.log(
        `Refreshed exchange rates (${Object.keys(body.rates).length} currencies)`,
      );
    } catch (error) {
      this.logger.error(
        this.ratesByCurrency
          ? 'Exchange rate refresh failed — serving stale rates'
          : 'Exchange rate refresh failed and no cached rates exist yet — conversion will pass amounts through unconverted',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /** `1` for same-currency (including when rates aren't available at all,
   * so callers never divide by zero / propagate `NaN`). */
  getRate(from: string, to: string): number {
    if (from === to) return 1;
    const rates = this.ratesByCurrency;
    if (!rates || !(from in rates) || !(to in rates)) return 1;
    // Rates are USD-pivoted: rates[X] = units of X per 1 USD.
    return rates[to] / rates[from];
  }

  convert(amount: number, from: string, to: string): number {
    return amount * this.getRate(from, to);
  }
}
