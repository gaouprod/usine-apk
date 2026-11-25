# Usine à APK

Construit les APK Android de mes apps à partir de leurs dépôts (privés compris).
Ce dépôt est **public** : les minutes GitHub Actions y sont gratuites et
illimitées. Le code des apps n'y est jamais copié : il est lu le temps de la
construction avec un jeton en lecture seule.

## Comment ça marche

- `apps.json` liste les apps à construire.
- Toutes les 15 minutes, l'usine regarde si la branche de chaque app a avancé et
  si un fichier surveillé (`watch`) a changé ; si oui, elle construit l'APK.
- On peut aussi lancer une construction à la main : onglet **Actions** →
  **Usine à APK** → **Run workflow** (choisir l'app, « force » coché).
- L'APK est publié dans la Release de l'app (`release`), sous le nom
  `<apkName>-b<build>.apk`. Le numéro de build ne fait que monter : chaque
  version s'installe par-dessus la précédente.
- `state/<id>.json` garde la dernière construction (commit, numéro de build).

## Ajouter une app

Ajouter un bloc dans `apps.json` :

```json
{
  "id": "monapp",
  "name": "Mon app",
  "repo": "gaouprod/mon-app",
  "ref": "main",
  "dir": "mobile",
  "type": "expo",
  "watch": ["mobile/"],
  "apkName": "monapp",
  "release": "monapp-android",
  "firstBuild": 1,
  "env": {}
}
```

- `type` : `expo` (Expo / React Native : prebuild puis Gradle) ou `gradle`
  (projet Android natif dont `dir` contient `gradlew`).
- `env` : variables publiques passées à la construction (jamais de secret ici :
  ce fichier est public).
- Le jeton `APP_REPO_TOKEN` doit pouvoir lire le dépôt de l'app (Settings →
  Developer settings → Fine-grained tokens → modifier le jeton → ajouter le
  dépôt, « Contents : Read-only »).

## Secrets

| Secret | Rôle |
|---|---|
| `APP_REPO_TOKEN` | Jeton fine-grained, « Contents : Read-only » sur les dépôts des apps (expire : le renouveler avant la date choisie). |

## Bon à savoir

- Signature : clé de debug du gabarit React Native, identique à chaque build
  (mises à jour par-dessus l'ancienne version). Pas pour le Play Store.
- GitHub met en pause les tâches programmées d'un dépôt public sans activité
  pendant 60 jours : chaque construction écrit `state/`, ce qui compte comme une
  activité. Si l'usine s'endort, **Actions → Usine à APK → Enable workflow**.
- Les journaux sont publics : l'usine n'y écrit aucun secret.
