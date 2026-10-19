export default function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="self-start rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
    />
  );
}
