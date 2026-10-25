import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Painel inferior acessível e reutilizável (foco preso, ESC, backdrop).
 * Mantém a navegação inferior livre; o conteúdo rola por dentro.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  eyebrow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl border-t-2 border-amber-700/50 bg-[#17110c] text-fg shadow-[0_-18px_60px_rgba(0,0,0,0.7)] focus:outline-none"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 pt-4 pb-3">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="font-display text-[0.62rem] uppercase tracking-[0.2em] text-amber-400/90">{eyebrow}</p>
              ) : null}
              <Dialog.Title className="mt-0.5 font-display text-lg font-bold text-amber-100">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-xs leading-relaxed text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted hover:text-amber-200"
            >
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
          {footer ? (
            <footer className="shrink-0 border-t border-border/70 px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
