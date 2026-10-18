# Especificação Técnica — Persistência v5 e Migração
## FioForja — Estrutura de Save Seguro e Prevenção de Perdas

**Versão Ativa do Schema:** `VERSION = 5`  
**Chave de Armazenamento:** `a-forja-save`

---

## 1. Schema do Save v5

```ts
export interface SaveData {
  version: 5;
  gallery: FinishedSword[];
  lastDesign: SwordDesign;
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  career: CareerStats;
  muted: boolean;
  shake: boolean;
  claimedForgeRewardIds: string[]; // Idempotência de transações de recompensas
}

export interface PlayerInventory {
  unlockedProfiles: ProfileId[];
  unlockedSteels: SteelId[];
  unlockedGuards: GuardId[];
  unlockedPommels: PommelId[];
  unlockedWraps: WrapId[];
  unlockedRunes: string[];
  unlockedTools: string[];
  materials: Record<string, number>; // Materiais empilháveis
  fusionCores: FusionCore[];         // Núcleos especiais obtidos na fusão de espadas
  components: InventoryComponent[];  // Componentes únicos/raros em estoque
  equipped?: EquippedWorkshopGear;
}
```

---

## 2. Regras de Migração e Integridade

1. **Retrocompatibilidade Total:** Ao carregar um save de versão 1, 2, 3 ou 4:
   - Preserva todas as armas já existentes na galeria.
   - Migra identificadores numéricos antigos para IDs universais (`sword_${id}_${hash}`) para eliminar qualquer possibilidade de colisão.
   - Inicializa as coleções `claimedForgeRewardIds`, `fusionCores` e `components` vazias caso inexistentes.
   - Preserva saldos de ouro, rubis e diamantes.
2. **Capacidade do Arsenal:** A galeria passa a suportar até 120 armas salvas sem descarte silencioso, com ordenação por data ou raridade.
