/**
 * Step 5 and the outcome: fills the check step, sends one lead per page load
 * (button disabled while sending, same clientRef on every retry), shows the
 * success screen, or keeps everything on screen and offers the phone. The
 * success screen also says so when this browser couldn't keep a copy.
 */
import { showFailure } from '@/core/forms';
import { formatDay, formatMoney } from '@/core/format';
import { RateLimitError, type Lead, type LeadRepository } from '@/core/leads';
import { LocalLeadRepository } from '@/core/leads/local-repository';
import { isStoragePersistent, type KeyValueStorage } from '@/core/storage';
import type { BookingConfig } from '@/config/booking';
import type { Business } from '@/config/business';
import type { PricingConfig } from '@/config/pricing';
import type { RoomsConfig } from '@/config/rooms';
import { quote } from '@/domain/quote';
import type { Selection } from '@/domain/selection';
import { buildBookingInput, type BookingPayload } from './lead';
import { doneRows, stepRecap, summaryRows, type RecapContext } from './recap';
import { fillLines, fillRows } from './view';

export interface SentBooking {
  lead: Lead<BookingPayload>;
  /** "Tue 6 Oct" */
  dayLabel: string;
  /** "8–10am" */
  windowArrive: string;
  /** "$179" */
  priceLabel: string;
}

export interface BookingDeps {
  repo: LeadRepository;
  config: { business: Business; pricing: PricingConfig; booking: BookingConfig; rooms: Pick<RoomsConfig, 'max'> };
  /** Runs once the request is stored, e.g. to preview the confirmation SMS. */
  onSent?: (sent: SentBooking) => void;
  storage?: KeyValueStorage;
  now?: () => Date;
}

/**
 * True when the request just stored lives only in this page. The demo keeps
 * requests in this browser; when the browser refuses storage (cookies blocked,
 * a sandboxed frame) that copy is in memory, gone when the page closes and
 * never seen in the owner console. A server-backed repository keeps it
 * whatever the browser allows, so this is false there.
 */
export function keptOnlyInPage(repo: LeadRepository, storagePersistent: boolean): boolean {
  return repo instanceof LocalLeadRepository && !storagePersistent;
}

interface SendHooks {
  values: () => Record<string, string>;
  selection: () => Selection;
  clientRef: string;
  /** Moves to the first unfinished step and returns true when the request isn't ready. */
  blocked: () => boolean;
  onDone: () => void;
}

export function sendBooking(root: HTMLElement, form: HTMLFormElement, deps: BookingDeps, hooks: SendHooks) {
  const { business, pricing, booking } = deps.config;
  const button = form.querySelector<HTMLButtonElement>('[data-send]')!;
  const call = form.querySelector<HTMLElement>('[data-call-fallback]')!;
  const done = root.querySelector<HTMLElement>('[data-booking-done]')!;
  const tag = root.querySelector<HTMLElement>('[data-book-tag]');
  let sending = false;
  let sent: SentBooking | null = null;

  const setOutcome = (showingDone: boolean) => {
    form.hidden = showingDone;
    if (tag) tag.hidden = showingDone;
    done.hidden = !showingDone;
  };

  const showDone = () => {
    setOutcome(true);
    scrollTo({ top: 0 });
    done.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true });
  };

  const fail = (message: string) => {
    showFailure(form, message);
    call.hidden = false;
  };

  async function submit(): Promise<void> {
    if (sending) return;
    if (hooks.blocked()) return;
    sending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    showFailure(form, null);
    call.hidden = true;
    const values = hooks.values();
    const selection = hooks.selection();
    const q = quote(selection, pricing);
    try {
      const input = buildBookingInput(values, { selection, quote: q, consentAt: new Date().toISOString(), clientRef: hooks.clientRef });
      const lead = (await deps.repo.create(input)) as Lead<BookingPayload>;
      const window = booking.windows.find((w) => w.id === lead.payload.windowId) ?? booking.windows[0];
      sent = { lead, dayLabel: formatDay(lead.payload.day), windowArrive: window.arrive, priceLabel: formatMoney(lead.payload.quote.perVisit) };
      fillRows(done.querySelector('[data-done-rows]')!, doneRows(values, { selection, quote: q, pricing, booking }));
      done.querySelector('[data-done-ref]')!.textContent = lead.id;
      done.querySelector<HTMLElement>('[data-done-unkept]')!.hidden = !keptOnlyInPage(deps.repo, isStoragePersistent());
      deps.onSent?.(sent);
      hooks.onDone();
      showDone();
    } catch (e) {
      const phone = business.phone;
      fail(
        e instanceof RateLimitError
          ? `You've sent several requests from this device in the last hour. Call us on ${phone} and we'll book it now.`
          : `We couldn't save your request. Call us on ${phone} and we'll book it now.`,
      );
    } finally {
      sending = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  }

  return {
    submit,
    /** Writes the check step from the current answers. */
    fill(values: Record<string, string>, ctx: RecapContext) {
      form.querySelector('[data-check-tag]')!.textContent = stepRecap('home', values, ctx);
      fillRows(form.querySelector('[data-check-rows]')!, summaryRows(values, ctx));
      fillLines(form, ctx.quote);
    },
    /** Clears an earlier failure when the visitor moves between steps. */
    reset() {
      showFailure(form, null);
      call.hidden = true;
    },
    done: () => sent !== null,
    showDone,
    hideDone: () => setOutcome(false),
  };
}
