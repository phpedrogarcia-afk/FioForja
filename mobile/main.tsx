import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { GameApp } from "../src/game/GameApp";
import "./mobile.css";

if (Capacitor.isNativePlatform()) {
  void App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void App.minimizeApp().catch((error: unknown) => {
      console.error("[FioForja] Nao foi possivel minimizar o aplicativo:", error);
    });
  }).catch((error: unknown) => {
    console.error("[FioForja] Nao foi possivel registrar o botao Voltar:", error);
  });
}

const root = document.getElementById("app");
if (!root) throw new Error("O elemento #app nao existe no documento mobile.");
createRoot(root).render(<GameApp />);
