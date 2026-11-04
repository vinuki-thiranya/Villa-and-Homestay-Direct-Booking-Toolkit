import { StayDates } from './StayDates';

/**
 * Date + guests search: a plain GET form to the book page, so it works without JavaScript. Only the
 * date fields hydrate (to open the availability calendar).
 */
export function SearchForm({
  action,
  site,
  from,
  to,
  guests = 2,
  maxGuests = 6,
  roomId,
  stacked = false,
}: {
  action: string;
  site: string;
  from?: string;
  to?: string;
  guests?: number;
  maxGuests?: number;
  /** Pre-select this room on the book page. */
  roomId?: string;
  /** Two columns at every width (narrow sidebars). */
  stacked?: boolean;
}) {
  return (
    <form action={action} method="get" className={`grid grid-cols-2 items-end gap-3 ${stacked ? '' : 'lg:grid-cols-[1fr_1fr_8.5rem_auto]'}`}>
      {roomId && <input type="hidden" name="room" value={roomId} />}
      <StayDates site={site} idPrefix="search" defaultValue={{ from, to }} />
      <div>
        <label htmlFor="search-guests" className="label">
          Guests
        </label>
        <select id="search-guests" name="guests" defaultValue={guests} className="field">
          {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={`g-cta h-11 w-full ${stacked ? '' : 'lg:w-auto'}`}>
        See prices
      </button>
    </form>
  );
}
