# Plan de migration FitQuest → Capacitor 8 (sans tout casser)

Objectif : passer de **Capacitor 6** à **Capacitor 8** en limitant les régressions (web, iOS, Android), avec des points de contrôle et une stratégie de retour arrière.

Références officielles : [Updating to 8.0](https://capacitorjs.com/docs/updating/8-0), annonces Ionic / changelog.

---

## 0. Contexte actuel (repo `fitquest/`)

- Paquets : `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli` en **^8.x** (migration depuis Capacitor 6 effectuée).
- L’ancien correctif `postinstall` + patch `tar` (CLI 6) a été **retiré** : inutile avec le CLI 8.
- Config : [`capacitor.config.json`](../fitquest/capacitor.config.json) (`webDir: dist`, `androidScheme: https`).
- Code applicatif : pas d’import direct de `@capacitor/core` obligatoire pour le build Vite ; détection native via `window.Capacitor` dans [`src/native/steps.js`](../fitquest/src/native/steps.js).

**Gradle** : si `npx cap migrate` signale *gradle wrapper files were not updated*, aligner manuellement `android/gradle/wrapper/gradle-wrapper.properties` sur **Gradle 8.13** (minimum requis pour AGP 8.13).

---

## 1. Prérequis outillage (à valider avant de commencer)

Selon la doc Capacitor 8 :

| Exigence | Détail |
|----------|--------|
| **Node.js** | **22+** (LTS recommandé) |
| **Xcode** | **26.0+** (macOS, pour iOS) |
| **Android Studio** | **Otter 2025.2.1+** |
| **iOS deployment target** | **15.0** minimum |
| **Android** | `minSdkVersion` **24**, `compileSdk` / `targetSdk` **36** (et variables Gradle alignées avec le guide officiel) |

Si votre environnement est en dessous (ex. Node 20, ancien Android Studio), **ne lancez pas la migration** tant que les outils ne sont pas à jour : vous obtiendrez des échecs Gradle/Xcode difficiles à distinguer d’un problème de code.

---

## 2. Principes pour ne pas tout casser

1. **Branche Git dédiée** : `chore/capacitor-8` (ou équivalent), jamais directement sur `main`.
2. **Une étape = un commit** (bump npm → migrate → sync web → fix natif) pour faciliter `git bisect`.
3. **Toujours valider le web en premier** : `npm run build` + smoke test navigateur (`npm run preview` ou `npm run dev`). Le natif ne remplace pas ce test.
4. **Sauvegarde des dossiers natifs** : avant toute régénération agressive, copier `ios/` et `android/` (archive ou branche) pour comparer les diffs.
5. **Ne pas mélanger** refonte UI / grosse feature et migration Capacitor sur le même lot de commits.
6. **`npx cap migrate`** : c’est l’outil prévu ; lire la sortie terminal en entier si une étape échoue (souvent Gradle ou Podfile).

---

## 3. Phases recommandées

### Phase A — Préparation (lecture seule + environnement)

- [ ] Vérifier versions : `node -v` (≥ 22), Android Studio, Xcode sur la machine iOS.
- [ ] Lire [Updating to 8.0](https://capacitorjs.com/docs/updating/8-0) (sections config, CLI, Android, iOS).
- [ ] Noter les plugins Capacitor **tiers** éventuels (santé, etc.) : prévoir leur compatibilité **v8** avant la montée.

### Phase B — Web et dépendances npm

- [ ] Sur la branche dédiée, mettre à jour **en bloc** et **même version mineure** :
  - `@capacitor/core@^8`
  - `@capacitor/ios@^8`
  - `@capacitor/android@^8`
  - `@capacitor/cli@^8` (devDependency)
- [ ] `npm install`
- [x] Patch `tar` Cap 6 : **retiré** (`postinstall` + script supprimés).
- [ ] `npm run build` → doit rester **vert**.
- [ ] `npm audit` : traiter ce qui est raisonnable sans `--force` aveugle.

### Phase C — Migration native automatisée

- [ ] `npx cap migrate` (avec CLI 8 installé).  
  Corriger les erreurs signalées une par une (souvent Gradle wrapper, `variables.gradle`, `AndroidManifest`, Podfile).
- [ ] Si la doc indique des changements **manuel** non couverts, les appliquer (voir section 4).

### Phase D — Sync et tests natifs

- [ ] `npm run build && npx cap sync`
- [ ] **Android** : ouvrir le projet dans Android Studio, sync Gradle, lancer sur émulateur ou appareil ; vérifier chargement de `dist` (WebView), pas de crash au démarrage.
- [ ] **iOS** : ouvrir le workspace/projet dans Xcode (selon template **SPM par défaut** en Cap 8 pour *nouveaux* `ios` ; projets existants CocoaPods peuvent continuer — voir doc). `pod install` si CocoaPods. Build simulateur.
- [ ] Retester les flux critiques : démarrage app, navigation FitQuest, audio (déblocage au geste), pas / `window.Capacitor` si utilisé.

### Phase E — Config Capacitor et régressions connues v8

À vérifier **si** vous utilisez ces options (sinon rien à faire) :

- **`appendUserAgent` (iOS)** : comportement des espaces corrigé — ajuster si vous comptiez sur l’ancien bug.
- **Edge-to-edge Android** : `android.adjustMarginsForEdgeToEdge` supprimé → voir plugin [System Bars](https://capacitorjs.com/docs/apis/system-bars) et `env()` CSS si besoin.
- **Référence `bridge_layout_main.xml`** : remplacer par `capacitor_bridge_layout_main.xml` si du code custom ou un plugin l’utilisait.
- **Nouveau projet iOS** : si vous **recréez** `ios` avec `cap add ios`, le défaut peut être **SPM** ; pour CocoaPods : `npx cap add ios --packagemanager CocoaPods` (doc officielle).

### Phase F — Finalisation

- [ ] Mettre à jour la doc interne / README équipe : versions Node, Android Studio, Xcode minimales.
- [ ] PR avec résumé des changements + captures ou notes de test Android/iOS.
- [ ] Tag ou release « Capacitor 8 » pour retrouver facilement le point de bascule.

---

## 4. Chemin « tout cassé » → retour arrière

1. **Annuler la branche** : `git checkout main` et supprimer la branche de migration si non mergée.
2. **Restaurer `package-lock.json` + `package.json`** depuis `main`.
3. **`rm -rf node_modules && npm install`**
4. Restaurer **`ios/`** et **`android/`** depuis la sauvegarde ou `git checkout -- ios android` si non régénérés.
5. Si besoin, réactiver le **postinstall** patch (état actuel Cap 6).

---

## 5. Points d’attention spécifiques FitQuest

- **Build Vite** : `base: './'` dans [`vite.config.js`](../fitquest/vite.config.js) — conserver ; vérifier après sync que les chemins d’assets (`/audio/`, `/sprites/`) se chargent bien en WebView (chemins relatifs).
- **Pas de plugin santé encore** : la migration reste simple ; quand vous ajouterez des plugins, pinnez-les en **v8** dès le départ.
- **CI/CD** : si vous buildez en CI, mettre à jour l’image (Node 22+, Android SDK 36, etc.) **avant** de merger la PR Cap 8.

---

## 6. Ordre minimal des commandes (mémo)

```bash
git checkout -b chore/capacitor-8
# Éditer package.json : @capacitor/* et cli → ^8
npm install
# Optionnel : retirer postinstall si plus nécessaire
npm run build
npx cap migrate
npm run build && npx cap sync
# Puis tests manuels Android Studio + Xcode
```

---

*Document de travail — à cocher au fil de la migration. Dernière mise à jour : alignée sur la documentation Capacitor v8 « Updating to 8.0 ».*
