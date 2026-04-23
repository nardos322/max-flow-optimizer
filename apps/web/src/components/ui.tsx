import { forwardRef, type PropsWithChildren, type ReactNode } from 'react';

export function PageSection({
  title,
  description,
  actions,
  children
}: PropsWithChildren<{ title: string; description?: string; actions?: ReactNode }>) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children
}: PropsWithChildren<{ title: string; subtitle?: string; actions?: ReactNode }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  error,
  children
}: PropsWithChildren<{ label: string; error?: string | null }>) {
  return (
    <label className="block space-y-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  props,
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 ${
        props.className ?? ''
      }`}
    />
  );
});

export const SelectInput = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput(
  props,
  ref
) {
  return (
    <select
      ref={ref}
      {...props}
      className={`h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 ${
        props.className ?? ''
      }`}
    />
  );
});

export const NumberInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function NumberInput(
  props,
  ref
) {
  return <TextInput ref={ref} {...props} type="number" inputMode="numeric" />;
});

export function PrimaryButton({
  tone = 'primary',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'neutral' | 'danger' }) {
  const tones = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-cyan-300',
    neutral: 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
  };

  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed ${tones[tone]} ${
        props.className ?? ''
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({ tone, children }: PropsWithChildren<{ tone: 'draft' | 'feasible' | 'infeasible' | 'error' }>) {
  const tones = {
    draft: 'bg-slate-100 text-slate-700',
    feasible: 'bg-emerald-100 text-emerald-700',
    infeasible: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700'
  };

  return <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2">{message}</p>
    </div>
  );
}
