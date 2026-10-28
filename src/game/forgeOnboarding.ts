import { STEELS } from './catalog.ts';
import type { ForgeOnboarding, HudSnapshot, SimState, SteelId } from './types.ts';

export type ForgeInputMode = 'touch' | 'mouse' | 'keyboard';
export function normalizeOnboarding(value: unknown): ForgeOnboarding {
  const v = value && typeof value === 'object' ? value as Partial<ForgeOnboarding> : {};
  return { heat: v.heat === true, hammer: v.hammer === true, completed: v.completed === true, dismissed: v.dismissed === true };
}
/** Only observe physical milestones; reuse the existing checkpoint write. */
export function observeOnboarding(previous: ForgeOnboarding, state: Pick<SimState,'phase'|'strikes'|'done'|'broken'>): ForgeOnboarding {
  if (previous.dismissed || previous.completed) return previous;
  const heat = previous.heat || state.phase !== 'heat';
  const hammer = previous.hammer || state.strikes > 0;
  const completed = heat && hammer && state.phase === 'quench' && state.done && !state.broken;
  if (heat === previous.heat && hammer === previous.hammer && completed === previous.completed) return previous;
  return { ...previous, heat, hammer, completed };
}
/** One instruction. Never infer a successful strike or a failure cause. */
export function forgeGuidance(hud: HudSnapshot, steelId: SteelId, progress: ForgeOnboarding, mode: ForgeInputMode, reheating: boolean): string {
  const steel = STEELS[steelId];
  const guided = !progress.dismissed && !progress.completed;
  if (hud.broken) return hud.message || 'Lâmina quebrada. Encerre esta tentativa e prepare outra peça.';
  if (hud.phase === 'heat') {
    if (hud.heat < steel.heatMin) return 'Aqueça a peça até a faixa adequada.';
    if (hud.heat <= steel.heatMax) return 'Metal pronto. Retire do fogo.';
    return 'Metal acima da faixa. Retire para a bigorna.';
  }
  if (hud.phase === 'forge') {
    if (reheating) return 'Reaquecendo. Aguarde o metal voltar à faixa.';
    if (hud.heat < steel.heatMin - .04) return hud.heat < .58 ? 'Metal frio. Reaqueça antes de golpear.' : 'Metal frio para este aço. Aguarde o controle Reaquecer.';
    if (guided && !progress.hammer && hud.strikes === 0) return mode === 'keyboard' ? 'Segure Espaço para carregar. Solte na faixa iluminada.' : 'Segure na bigorna para carregar. Solte na faixa iluminada.';
    return hud.message;
  }
  if (guided && !hud.charging && hud.quenchFill === 0) return mode === 'keyboard' ? 'Segure Espaço para mergulhar. Solte na faixa indicada.' : 'Segure para mergulhar. Solte na faixa indicada.';
  return hud.message;
}
