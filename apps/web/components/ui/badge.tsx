const variants = {
  duration: "bg-blue-100 text-blue-700",
  price: "bg-green-100 text-green-700",
  available: "bg-emerald-100 text-emerald-700",
  unavailable: "bg-gray-100 text-gray-500",
} as const;

export function Badge({
  variant,
  children,
}: {
  variant: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
