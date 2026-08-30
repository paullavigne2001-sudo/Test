import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './styles.css';

// ---------------------------------------------------------------------------
// Tuning constants (kept as "per 16ms tick" values, then scaled by delta time
// so the game runs at the same speed regardless of actual frame rate).
// ---------------------------------------------------------------------------
const TICK_MS = 16.6667; // reference frame duration (~60fps)
const ARENA_BOUNDS = { xMin: -7, xMax: 7, zMin: -6, zMax: 7 };

const PLAYER = {
  moveSpeed: 0.105,
  dodgeDistance: 1.15,
  dodgeCost: 25,
  dodgeDuration: 0.5,
  invulnDuration: 0.5,
  staminaRegenPerTick: 0.35,
};

const ATTACK = {
  punch: { cooldown: 0.34, damage: 25 },
  heavy: { cooldown: 0.55, damage: 40 },
  knockback: 0.45,
  scoreOnHit: 25,
  scoreOnKillNormal: 75,
  scoreOnKillBoss: 250,
};

const SPECIAL = {
  cooldownMs: 5000,
  radius: 3.2,
  damage: 35,
  scorePerHit: 50,
};

const ENEMY = {
  approachSpeed: 0.035,
  attackRange: 0.95,
  attackWindup: 0.9,
  damageNormal: 7,
  damageBoss: 15,
};

const LEVEL_COUNT = 3;
const LEVEL_TRANSITION_DELAY_MS = 650;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------------------------------------------------------------------
// Visual components
// ---------------------------------------------------------------------------

function Stickman({ color = '#f8fafc', moving = false, attack = 0, hit = 0, boss = false }) {
  const body = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const walk = moving ? Math.sin(t * 13) * 0.55 : 0;

    if (body.current) {
      body.current.position.y = 1 + Math.abs(Math.sin(t * 13)) * (moving ? 0.07 : 0);
      body.current.rotation.z = hit > 0 ? Math.sin(t * 45) * 0.12 * hit : 0;
    }
    if (armL.current) armL.current.rotation.z = -0.55 + (moving ? -walk * 0.7 : 0);
    if (armR.current) {
      armR.current.rotation.z = attack > 0 ? 0.55 - attack * 2.2 : 0.55 + (moving ? walk * 0.7 : 0);
    }
    if (legL.current) legL.current.rotation.z = -0.08 + (moving ? walk * 0.55 : 0);
    if (legR.current) legR.current.rotation.z = 0.08 - (moving ? walk * 0.55 : 0);
  });

  const scale = boss ? 1.18 : 1;

  return (
    <group ref={body} scale={scale}>
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.11, 0.14, 1.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <group ref={armL} position={[-0.38, 1.25, 0]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.85, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <group ref={armR} position={[0.38, 1.25, 0]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.85, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <group ref={legL} position={[-0.2, 0.55, 0]}>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.1, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <group ref={legR} position={[0.2, 0.55, 0]}>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.1, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
}

function Arena({ level }) {
  const isBossLevel = level >= 3;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={isBossLevel ? '#24151c' : '#172033'} />
      </mesh>
      <gridHelper
        args={[30, 30, isBossLevel ? '#7f1d1d' : '#334155', isBossLevel ? '#451a1a' : '#1e293b']}
      />
      <mesh position={[0, 2, -8]}>
        <boxGeometry args={[16, 4, 0.4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-8, 2, 0]}>
        <boxGeometry args={[0.35, 4, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[8, 2, 0]}>
        <boxGeometry args={[0.35, 4, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0, 0.05, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8, 48]} />
        <meshStandardMaterial
          color={isBossLevel ? '#4c1d95' : '#1e3a5f'}
          emissive={isBossLevel ? '#7c3aed' : '#0ea5e9'}
          emissiveIntensity={0.35}
        />
      </mesh>
    </>
  );
}

function CameraRig({ player }) {
  useFrame(({ camera }) => {
    const lookTarget = new THREE.Vector3(player.current.x, 1, player.current.z);
    const desiredPos = new THREE.Vector3(player.current.x, 4.4, player.current.z + 7.1);
    camera.position.lerp(desiredPos, 0.08);
    camera.lookAt(lookTarget);
  });
  return null;
}

function HealthBar({ ratio, boss }) {
  const width = boss ? 1.55 : 1.25;
  const height = 0.065;
  const clamped = Math.max(ratio, 0);
  return (
    <group position={[0, boss ? 2.75 : 2.35, 0.03]}>
      <mesh>
        <planeGeometry args={[width, 0.09]} />
        <meshBasicMaterial color="#111827" depthTest={false} depthWrite={false} />
      </mesh>
      <mesh scale={[clamped, 1, 1]} position={[-(1 - clamped) * (width / 2), 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={boss ? '#a855f7' : '#ef4444'}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Fighter({ fighter, isPlayer, attack, hit, enemyHpRatio, boss }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(fighter.current.x, 0, fighter.current.z);
    ref.current.rotation.set(0, fighter.current.angle, 0);
  });

  return (
    <group ref={ref}>
      <Stickman
        color={boss ? '#a855f7' : isPlayer ? '#f8fafc' : '#ef4444'}
        moving={fighter.current.speed > 0.01}
        attack={attack}
        hit={hit}
        boss={boss}
      />
      {!isPlayer && <HealthBar ratio={enemyHpRatio} boss={boss} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// HUD (extracted so the render function stays readable)
// ---------------------------------------------------------------------------

function Hud({ level, score, hp, stamina, combo }) {
  return (
    <div className="hud">
      <div className="top">
        <b>STICKMAN 3D</b>
        <span>NIVEAU {level} • SCORE {score}</span>
      </div>
      <div className="label">VIE {hp}%</div>
      <div className="bar">
        <i style={{ width: hp + '%' }} />
      </div>
      <div className="label">ENDURANCE {stamina}%</div>
      <div className="bar stamina">
        <i style={{ width: stamina + '%' }} />
      </div>
      <div className="stage">{level < 3 ? `VAGUE ${level}/2` : '⚠ BOSS'}</div>
      {combo > 1 && <div className="combo">COMBO ×{combo}</div>}
    </div>
  );
}

function Controls({
  attackMode,
  attackActive,
  specialReady,
  onJoyStart,
  onJoyMove,
  onJoyEnd,
  onAttack,
  onDodge,
  onToggleMode,
  onSpecial,
}) {
  const stop = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div className="controls">
      <div
        className="joystick"
        onPointerDown={onJoyStart}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyEnd}
        onPointerCancel={onJoyEnd}
      >
        <div className="knob" />
      </div>
      <button className="dodge" onPointerDown={stop(onDodge)}>↪</button>
      <button className={'attack ' + (attackActive ? 'active' : '')} onPointerDown={stop(onAttack)}>
        {attackMode === 'heavy' ? '💥' : '👊'}
      </button>
      <button className={'mode ' + (attackMode === 'heavy' ? 'selected' : '')} onPointerDown={stop(onToggleMode)}>
        {attackMode === 'heavy' ? '⚡' : '👊'}
      </button>
      <button className={'special ' + (!specialReady ? 'cooldown' : '')} onPointerDown={stop(onSpecial)}>✦</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

let nextEnemyId = 0;

function spawnWave(level) {
  const isBoss = level >= 3;
  const count = isBoss ? 1 : level + 1;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const hp = isBoss ? 100 : 50;
    return {
      id: `e${level}-${i}-${nextEnemyId++}`,
      x: Math.cos(angle) * (3.1 + 0.6 * i),
      z: Math.sin(angle) * (2.2 + 0.4 * i),
      angle: 0,
      speed: 0,
      hp,
      maxHp: hp,
      attack: 0,
      boss: isBoss,
    };
  });
}

function Game() {
  const player = useRef({ x: 0, z: 2, angle: 0, speed: 0 });
  const enemies = useRef([]);
  const keys = useRef({});
  const joy = useRef({ x: 0, y: 0 });
  const joyActive = useRef(false);
  const attackTimer = useRef(0);
  const dodgeTimer = useRef(0);
  const invuln = useRef(0);
  const hitFlash = useRef(0);
  const transitioning = useRef(false);
  const staminaRef = useRef(100);
  const lastTickTime = useRef(null);

  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [enemyTick, setEnemyTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [message, setMessage] = useState('');
  const [attackMode, setAttackMode] = useState('punch');
  const [specialReady, setSpecialReady] = useState(true);

  const spawn = (lv) => {
    enemies.current = spawnWave(lv);
    setMessage(lv >= 3 ? 'BOSS !' : 'Vague ' + lv);
    setTimeout(() => setMessage(''), 900);
  };

  useEffect(() => {
    spawn(1);
  }, []);

  const nearestEnemy = () => {
    let target = null;
    let best = 3.4;
    for (const e of enemies.current) {
      if (e.hp <= 0) continue;
      const d = dist(player.current, e);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    return target;
  };

  const attack = () => {
    if (paused || gameOver || victory || attackTimer.current > 0 || hp <= 0) return;
    const isHeavy = attackMode === 'heavy';
    const cfg = isHeavy ? ATTACK.heavy : ATTACK.punch;
    attackTimer.current = cfg.cooldown;

    const target = nearestEnemy();
    if (!target) {
      setCombo(0);
      return;
    }

    const dx = target.x - player.current.x;
    const dz = target.z - player.current.z;
    const d = dist(player.current, target) || 1;

    target.hp = Math.max(0, target.hp - cfg.damage);
    target.x += (dx / d) * ATTACK.knockback;
    target.z += (dz / d) * ATTACK.knockback;
    target.attack = 0;

    hitFlash.current = 0.18;
    setCombo((c) => c + 1);
    setScore((s) => s + ATTACK.scoreOnHit);
    setEnemyTick((t) => t + 1);

    if (target.hp <= 0) {
      setScore((s) => s + (target.boss ? ATTACK.scoreOnKillBoss : ATTACK.scoreOnKillNormal));
    }
  };

  const special = () => {
    if (!specialReady || paused || gameOver || victory || hp <= 0) return;
    setSpecialReady(false);
    setTimeout(() => setSpecialReady(true), SPECIAL.cooldownMs);

    let hits = 0;
    for (const e of enemies.current) {
      if (e.hp > 0 && dist(player.current, e) < SPECIAL.radius) {
        e.hp = Math.max(0, e.hp - SPECIAL.damage);
        e.attack = 0;
        hits++;
      }
    }
    if (hits) {
      setScore((s) => s + hits * SPECIAL.scorePerHit);
      setCombo((c) => c + hits);
      setEnemyTick((t) => t + 1);
    }
    hitFlash.current = 0.3;
  };

  const dodge = () => {
    if (staminaRef.current < PLAYER.dodgeCost || dodgeTimer.current > 0 || gameOver || victory) return;

    let x = joy.current.x;
    let y = joy.current.y;
    if (Math.hypot(x, y) < 0.1) {
      x = Math.sin(player.current.angle);
      y = Math.cos(player.current.angle);
    }
    const len = Math.hypot(x, y) || 1;
    player.current.x = clamp(player.current.x + (x / len) * PLAYER.dodgeDistance, ARENA_BOUNDS.xMin, ARENA_BOUNDS.xMax);
    player.current.z = clamp(player.current.z + (y / len) * PLAYER.dodgeDistance, ARENA_BOUNDS.zMin, ARENA_BOUNDS.zMax);

    staminaRef.current = Math.max(0, staminaRef.current - PLAYER.dodgeCost);
    setStamina(Math.round(staminaRef.current));
    dodgeTimer.current = PLAYER.dodgeDuration;
    invuln.current = PLAYER.invulnDuration;
  };

  // Keyboard input + per-tick timers/regen (delta-time based).
  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') attack();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dodge();
    };
    const onKeyUp = (e) => {
      keys.current[e.code] = false;
    };
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);

    const id = setInterval(() => {
      if (paused || gameOver || victory) return;
      const now = performance.now();
      const dtScale = lastTickTime.current ? (now - lastTickTime.current) / TICK_MS : 1;
      lastTickTime.current = now;

      staminaRef.current = Math.min(100, staminaRef.current + PLAYER.staminaRegenPerTick * dtScale);
      setStamina(Math.round(staminaRef.current));
      attackTimer.current = Math.max(0, attackTimer.current - 0.016 * dtScale);
      dodgeTimer.current = Math.max(0, dodgeTimer.current - 0.016 * dtScale);
      invuln.current = Math.max(0, invuln.current - 0.016 * dtScale);
      hitFlash.current = Math.max(0, hitFlash.current - 0.016 * dtScale);
    }, 16);

    return () => {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, gameOver, victory, hp]);

  // Movement + enemy AI loop.
  useEffect(() => {
    const step = () => {
      if (paused || gameOver || victory) return;

      let x = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0) + joy.current.x;
      let z = (keys.current.KeyS ? 1 : 0) - (keys.current.KeyW ? 1 : 0) + joy.current.y;
      const len = Math.hypot(x, z);
      player.current.speed = 0;

      if (len > 0.08) {
        x /= Math.max(1, len);
        z /= Math.max(1, len);
        player.current.x = clamp(player.current.x + x * PLAYER.moveSpeed, ARENA_BOUNDS.xMin, ARENA_BOUNDS.xMax);
        player.current.z = clamp(player.current.z + z * PLAYER.moveSpeed, ARENA_BOUNDS.zMin, ARENA_BOUNDS.zMax);
        player.current.angle = Math.atan2(x, z);
        player.current.speed = PLAYER.moveSpeed;
      }

      for (const e of enemies.current) {
        if (e.hp <= 0) continue;
        const dx = player.current.x - e.x;
        const dz = player.current.z - e.z;
        const d = Math.hypot(dx, dz);
        e.speed = 0;
        e.attack = Math.max(0, e.attack - 0.016);

        if (d > ENEMY.attackRange) {
          e.x += (dx / d) * ENEMY.approachSpeed;
          e.z += (dz / d) * ENEMY.approachSpeed;
          e.angle = Math.atan2(dx, dz);
          e.speed = ENEMY.approachSpeed;
        } else if (e.attack <= 0 && invuln.current <= 0) {
          e.attack = ENEMY.attackWindup;
          const damage = e.boss ? ENEMY.damageBoss : ENEMY.damageNormal;
          setHp((v) => {
            const n = Math.max(0, v - damage);
            if (n <= 0) setGameOver(true);
            return n;
          });
          setCombo(0);
        }
      }

      const aliveCount = enemies.current.filter((e) => e.hp > 0).length;
      if (aliveCount === 0 && !transitioning.current) {
        transitioning.current = true;
        if (level < LEVEL_COUNT) {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setScore((s) => s + 100);
          setTimeout(() => {
            transitioning.current = false;
            spawn(nextLevel);
          }, LEVEL_TRANSITION_DELAY_MS);
        } else {
          setVictory(true);
          setScore((s) => s + 500);
        }
      }
    };

    const id = setInterval(step, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, gameOver, victory, level, enemyTick]);

  const updateJoy = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp((e.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.42), -1, 1);
    const y = clamp((e.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.42), -1, 1);
    joy.current.x = x;
    joy.current.y = y;
  };

  const endJoy = (e) => {
    e?.preventDefault();
    joyActive.current = false;
    joy.current.x = 0;
    joy.current.y = 0;
  };

  const startJoy = (e) => {
    e.preventDefault();
    joyActive.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoy(e);
  };

  const aliveEnemies = enemies.current.filter((e) => e.hp > 0);

  return (
    <div className="game">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 4.4, 7.1], fov: 55 }}>
        <color attach="background" args={['#080d18']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 9, 4]} intensity={3.2} castShadow />
        <pointLight position={[-5, 3, 1]} intensity={18} distance={12} />
        <pointLight position={[5, 2, -4]} intensity={14} distance={10} color="#7c3aed" />
        <Arena level={level} />
        <Fighter
          fighter={player}
          isPlayer
          attack={attackTimer.current / ATTACK.punch.cooldown}
          hit={hitFlash.current}
          enemyHpRatio={0}
        />
        {aliveEnemies.map((e) => (
          <Fighter
            key={e.id}
            fighter={{ current: e }}
            isPlayer={false}
            attack={e.attack > 0 ? 1 - e.attack / ENEMY.attackWindup : 0}
            hit={0}
            enemyHpRatio={e.hp / e.maxHp}
            boss={e.boss}
          />
        ))}
        <CameraRig player={player} />
      </Canvas>

      <Hud level={level} score={score} hp={hp} stamina={stamina} combo={combo} />

      <Controls
        attackMode={attackMode}
        attackActive={attackTimer.current > 0}
        specialReady={specialReady}
        onJoyStart={startJoy}
        onJoyMove={(e) => joyActive.current && updateJoy(e)}
        onJoyEnd={endJoy}
        onAttack={attack}
        onDodge={dodge}
        onToggleMode={() => setAttackMode((m) => (m === 'punch' ? 'heavy' : 'punch'))}
        onSpecial={special}
      />

      <div className="hint">🕹️ déplacer • 👊 attaque • ↪ esquive • ✦ spécial • ⚡ puissant</div>
      <button className="pause" onPointerDown={() => setPaused((v) => !v)}>
        {paused ? '▶' : 'Ⅱ'}
      </button>

      {message && <div className="message">{message}</div>}

      {(gameOver || victory) && (
        <div className="win">
          {victory ? '🏆 VICTOIRE !' : '💀 KO'}
          <div>{victory ? 'Les 3 niveaux sont terminés.' : 'Le combat est terminé.'}</div>
          <button onClick={() => location.reload()}>Rejouer</button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Game />);
