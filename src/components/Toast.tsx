import { CheckIcon } from './Icons.tsx';

interface ToastProps {
  readonly message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="toast-banner" role="status" aria-live="polite">
      <CheckIcon />
      <span>{message}</span>
    </div>
  );
}
