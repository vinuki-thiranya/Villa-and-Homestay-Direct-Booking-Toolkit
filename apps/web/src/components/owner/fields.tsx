/** Small server-rendered form field helpers for the owner app. */
export function Field({
  label,
  name,
  hint,
  className = '',
  ...input
}: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = input.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input name={name} className="field" {...input} id={id} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  hint,
  className = '',
  ...rest
}: { label: string; name: string; hint?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea name={name} className="field py-2" rows={3} {...rest} id={id} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  className = '',
  hint,
  ...rest
}: {
  label: string;
  name: string;
  options: [string, string][];
  className?: string;
  hint?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select name={name} className="field" {...rest} id={id}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Check({ label, name, defaultChecked, value }: { label: string; name: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{children}</p>;
}
