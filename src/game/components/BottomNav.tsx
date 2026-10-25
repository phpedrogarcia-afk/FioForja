import type { WorkshopSection } from "../types";
import { WORKSHOP_SECTIONS } from "./workshopSections";

export function BottomNav({
  active,
  onNavigate,
}: {
  active: WorkshopSection;
  onNavigate: (section: WorkshopSection) => void;
}) {
  return (
    <nav
      aria-label="Seções principais"
      className="z-20 grid shrink-0 grid-cols-5 gap-1 border-t border-[#4b3923] bg-[#19150f] px-1.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      {WORKSHOP_SECTIONS.map(({ id, label, Icon }) => {
        const current = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={current ? "page" : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
            className={
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[0.68rem] transition-colors " +
              (current
                ? "bg-[#332516] font-semibold text-[#f5cc80]"
                : "text-[#b0a48f] hover:text-amber-200")
            }
          >
            {current ? <span aria-hidden className="absolute -top-1.5 h-0.5 w-6 bg-[#e8bb6a]" /> : null}
            <Icon size={21} strokeWidth={1.6} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
