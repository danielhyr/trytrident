interface PlaceholderProps {
  title: string;
  description?: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-text-main-muted">{description}</p>
      )}
    </div>
  );
}
