export function RatingField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <p className="text-sm text-text-secondary mb-1.5">{label}</p>
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input type="radio" name={name} value={n} required className="text-primary focus:ring-primary" />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}
