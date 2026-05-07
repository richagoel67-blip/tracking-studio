export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[1148px] p-6">
      <h1 className="text-lg font-semibold leading-7 text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-5 text-[color:var(--figma-gray-text-03)]">Content coming soon.</p>
    </div>
  );
}
