import { Volume2, VolumeX, X, Flame, Hammer, Droplets } from "lucide-react";
import { STEELS } from "../catalog";
import type { HudSnapshot, SwordDesign } from "../types";
interface Props {
  hud: HudSnapshot;
  design: SwordDesign;
  muted: boolean;
  onMute: () => void;
  onPull: () => void;
  onReheat: () => void;
  onQuit: () => void;
}
export function ForgeHud({ hud, design, muted, onMute, onPull, onReheat, onQuit }: Props) {
  const steel = STEELS[design.steel];
  const phase = hud.phase === "heat" ? "O fogo" : hud.phase === "forge" ? "A bigorna" : "A têmpera";
  const Icon = hud.phase === "heat" ? Flame : hud.phase === "forge" ? Hammer : Droplets;
  const meter =
    hud.phase === "heat" ? hud.heat : hud.phase === "forge" ? hud.force : hud.quenchFill;
  const center =
    hud.phase === "heat"
      ? (steel.heatMin + steel.heatMax) / 2
      : hud.phase === "forge"
        ? hud.sweetCenter
        : 0.52;
  const width =
    hud.phase === "heat"
      ? steel.heatMax - steel.heatMin
      : hud.phase === "forge"
        ? hud.sweetWidth
        : 0.2;
  const inHeat = hud.heat >= steel.heatMin && hud.heat <= steel.heatMax;
  return (
    <div className="forge-hud">
      <div className="hud-top">
        <div className="hud-heading">
          <span className="eyebrow">
            <Icon size={15} />
            {phase}
          </span>
          <span>
            {STEELS[design.steel].name} ·{" "}
            {hud.phase === "forge" ? `${hud.strikes}/${hud.maxStrikes} golpes` : "Forja manual"}
          </span>
        </div>
        <div className="hud-buttons">
          <button aria-label={muted ? "Ativar som" : "Silenciar"} onClick={onMute}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button aria-label="Sair da forja" onClick={onQuit}>
            <X size={18} />
          </button>
        </div>
        <div className="hud-vitals">
          <div>
            <span>
              Calor <b className={inHeat ? "thermal-good" : ""}>{Math.round(hud.heat * 100)}%</b>
            </span>
            <div className="heat-track">
              <i
                style={{
                  left: `${steel.heatMin * 100}%`,
                  width: `${(steel.heatMax - steel.heatMin) * 100}%`,
                }}
              />
              <b style={{ width: `${hud.heat * 100}%` }} />
            </div>
          </div>
          <div>
            <span>
              Integridade <b>{Math.round(hud.integrity * 100)}%</b>
            </span>
            <div className="integrity-track">
              <b style={{ width: `${hud.integrity * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="hud-bottom">
        <p className={hud.missStreak > 1 ? "hud-message danger" : "hud-message"} aria-live="polite">
          {hud.message}
        </p>
        <div
          className="timing-track"
          role="meter"
          aria-label={
            hud.phase === "forge"
              ? "Força do martelo"
              : hud.phase === "heat"
                ? "Temperatura"
                : "Têmpera"
          }
          aria-valuenow={Math.round(meter * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="sweet-zone"
            style={{ left: `${(center - width / 2) * 100}%`, width: `${width * 100}%` }}
          />
          <div className="sweet-center" style={{ left: `${center * 100}%` }} />
          <div className="meter-fill" style={{ width: `${meter * 100}%` }} />
          <div className="meter-cursor" style={{ left: `${meter * 100}%` }} />
        </div>
        <div className="meter-labels">
          <span>{hud.phase === "forge" ? "Força" : "Tempo"}</span>
          <span>{hud.phase === "forge" ? "Solte na luz" : "Mantenha na faixa"}</span>
        </div>
        <div className="hud-action-row">
          {hud.phase === "heat" ? (
            <button className="forge-primary" onClick={onPull}>
              Retirar do fogo
            </button>
          ) : hud.phase === "forge" ? (
            <>
              <span>Segure na cena · solte para bater</span>
              <button
                className="reheat-button"
                disabled={hud.heat >= steel.heatMin || hud.broken}
                onClick={onReheat}
              >
                Reaquecer <small>R</small>
              </button>
            </>
          ) : (
            <span>Segure para mergulhar · solte na faixa</span>
          )}
        </div>
      </div>
    </div>
  );
}
