import { Flame, Hammer, Home, LibraryBig, Store, type LucideIcon } from "lucide-react";
import type { WorkshopSection } from "../types";

/** As cinco seções aprovadas. A ordem é canônica. */
export const WORKSHOP_SECTIONS: Array<{
  id: WorkshopSection;
  label: string;
  title: string;
  Icon: LucideIcon;
}> = [
  { id: "home", label: "Início", title: "Início", Icon: Home },
  { id: "collection", label: "Coleção", title: "Coleção", Icon: LibraryBig },
  { id: "forgePrep", label: "Forja", title: "Forja", Icon: Hammer },
  { id: "shop", label: "Loja", title: "Loja", Icon: Store },
  { id: "craft", label: "Craft", title: "Craft", Icon: Flame },
];
