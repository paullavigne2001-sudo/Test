# Stickman 3D

Prototype de jeu de combat 3D en React + Three.js / React Three Fiber. Combats un
à plusieurs stickmen sur 3 niveaux, avec un boss final.

## Structure du projet

```
stickman-3d/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx      # logique du jeu + rendu 3D
    └── styles.css     # HUD et contrôles (CSS, hors Canvas 3D)
```

## Installation et lancement (Termux / local)

```bash
npm install
npm run dev             # serveur local, http://localhost:5173
npm run dev:host        # accessible depuis un autre appareil sur le réseau
```

## Build de production

```bash
npm run build
npm run preview         # prévisualiser le build
```

## Contrôles

| Action          | Clavier         | Tactile              |
|------------------|-----------------|------------------------|
| Se déplacer      | W A S D         | Joystick (bas gauche)  |
| Attaque          | Espace          | Bouton 👊              |
| Basculer léger/lourd | —          | Bouton mode            |
| Esquive          | Maj (Shift)     | Bouton ↪               |
| Capacité spéciale | —              | Bouton ✦               |
| Pause            | —               | Bouton en haut à droite|

## Gameplay

- **Niveaux 1–2** : vagues d'ennemis normaux (50 PV), leur nombre augmente avec le niveau.
- **Niveau 3** : un boss unique (100 PV, plus résistant, plus puissant).
- **Combo** : les coups qui touchent enchaînent un compteur de combo, remis à zéro
  si un ennemi vous touche ou si une attaque manque sa cible.
- **Endurance** : nécessaire pour esquiver (coûte 25%, se régénère automatiquement).
- **Esquive** : accorde une brève invulnérabilité, utile pour éviter les dégâts ennemis.
- **Capacité spéciale** : dégâts de zone autour du joueur, sur un temps de recharge de 5s.

## Notes techniques

- Le déplacement et les timers de jeu sont calculés en delta-time (basé sur
  `performance.now()`), pas sur un pas fixe : le jeu reste cohérent même si le
  taux de rafraîchissement varie selon l'appareil.
- Chaque ennemi reçoit un identifiant unique à sa création, utilisé comme `key`
  React — évite les bugs de rendu qui peuvent survenir en utilisant l'index du
  tableau comme clé sur une liste qui change (ennemis qui apparaissent/meurent).
- Le rendu 3D (position, rotation, animation) passe par des `ref` mutables et
  `useFrame`, séparé de la logique de jeu (`setInterval`), pour éviter des
  re-renders React inutiles à chaque frame.

## Pistes d'amélioration possibles

- Ajouter des tests unitaires sur la logique de combat (dégâts, PV, transitions de niveau).
- Extraire la logique de jeu (`Game`) dans un hook personnalisé pour la tester indépendamment du rendu.
- Ajouter ESLint/Prettier pour maintenir un style de code cohérent.
- Sons et retour haptique sur mobile pour les coups/esquives.
