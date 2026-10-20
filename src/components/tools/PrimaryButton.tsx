import { buttonPrimary } from "@/components/ui/styles";

export default function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`self-start ${buttonPrimary}`}
    />
  );
}
