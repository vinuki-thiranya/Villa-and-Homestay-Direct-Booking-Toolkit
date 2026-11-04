/**
 * Date + guests search. A plain GET form to the book page: works without JavaScript and adds
 * nothing to the guest bundle.
 */
export function SearchForm({
  action,
  from,
  to,
  guests = 2,
  maxGuests = 6,
  compact = false,
}: {
  action: string;
  from?: string;
  to?: string;
  guests?: number;
  maxGuests?: number;
  compact?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      action={action}
      method="get"
      className={`grid grid-cols-2 gap-3 ${compact ? 'sm:grid-cols-[1fr_1fr_7rem_auto]' : 'sm:grid-cols-[1fr_1fr_8rem_auto]'} items-end`}
    >
      <div>
        <label htmlFor="from" className="label">
          Check-in
        </label>
        <input id="from" name="from" type="date" required min={today} defaultValue={from} className="field" />
      </div>
      <div>
        <label htmlFor="to" className="label">
          Check-out
        </label>
        <input id="to" name="to" type="date" required min={today} defaultValue={to} className="field" />
      </div>
      <div>
        <label htmlFor="guests" className="label">
          Guests
        </label>
        <select id="guests" name="guests" defaultValue={guests} className="field">
          {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary h-11">
        Check availability
      </button>
    </form>
  );
}
