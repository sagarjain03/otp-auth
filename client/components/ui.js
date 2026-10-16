// Small shared UI pieces so every page looks the same.

export function Card({ title, subtitle, children }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function Input({ label, id, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2.5 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
        {...props}
      />
    </div>
  );
}

const variants = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
  secondary:
    "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
};

// Disabled while loading, so a double click can't send two requests.
export function Button({ loading, loadingText, variant = "primary", disabled, children, ...props }) {
  return (
    <button
      disabled={loading || disabled}
      className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  );
}

export function FullPageMessage({ children }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 text-sm text-zinc-500">
      {children}
    </main>
  );
}
