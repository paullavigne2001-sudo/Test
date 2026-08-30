import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

function Stickman({position,color='#f8fafc',enemy=false,attacking=false}) {
  const ref=useRef();
  useFrame((s)=>{if(ref.current) ref.current.position.y=position[1]+Math.sin(s.clock.elapsedTime*5)*0.025});
  return <group ref={ref} position={position}>
    <mesh position={[0,1.65,0]}><sphereGeometry args={[.32,20,20]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[0,.95,0]}><cylinderGeometry args={[.11,.14,1.2,12]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[-.38,1.02,attacking?-.18:0]} rotation={[0,0,-.55]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[attacking?.58:.38,1.02,attacking?-.55:0]} rotation={[0,0,attacking?1.25:.55]}><cylinderGeometry args={[.065,.065,attacking?1.15:.85,10]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[-.2,.1,0]} rotation={[0,0,-.08]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[.2,.1,0]} rotation={[0,0,.08]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh>
  </group>
}

function Arena(){return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#172033"/></mesh><gridHelper args={[30,30,"#334155","#1e293b"]}/><mesh position={[0,2,-7]}><boxGeometry args={[14,4,.4]}/><meshStandardMaterial color="#111827"/></mesh></>}

function Player({pos,move,attacking}){const ref=useRef();useFrame(()=>{if(ref.current)ref.current.position.set(pos.current.x,1,pos.current.z)});return <group ref={ref}><Stickman position={[0,0,0]} attacking={attacking}/></group>}
function Enemy({pos,hp}){const ref=useRef();useFrame(()=>{if(ref.current)ref.current.position.set(pos.x,1,pos.z)});return <group ref={ref}><Stickman position={[0,0,0]} color="#ef4444" enemy/><group position={[0,2.35,0]}><mesh scale={[Math.max(hp,0)/100,.08,.08]}><planeGeometry args={[1.2,1]}/><meshBasicMaterial color="#22c55e"/></mesh></group></group>}

function Game(){
 const player=useRef(new THREE.Vector3(0,1,0)); const enemy=useRef(new THREE.Vector3(3,1,0));
 const keys=useRef({}); const joy=useRef({x:0,y:0}); const [hp,setHp]=useState(100); const [enemyHp,setEnemyHp]=useState(100); const [score,setScore]=useState(0); const [attacking,setAttacking]=useState(false);
 const [tick,setTick]=useState(0);
 useEffect(()=>{const down=e=>{keys.current[e.code]=true;if(e.code==='Space')doAttack()};const up=e=>keys.current[e.code]=false;addEventListener('keydown',down);addEventListener('keyup',up);const id=setInterval(()=>setTick(t=>t+1),50);return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);clearInterval(id)}},[attacking,enemyHp]);
 const doAttack=()=>{if(attacking||enemyHp<=0)return;const d=player.current.distanceTo(enemy.current);if(d<2.1){setEnemyHp(v=>Math.max(0,v-25));setScore(v=>v+25)}setAttacking(true);setTimeout(()=>setAttacking(false),300)};
 useEffect(()=>{const step=()=>{let x=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0)+joy.current.x;let z=(keys.current.KeyS?1:0)-(keys.current.KeyW?1:0)+joy.current.y;const l=Math.hypot(x,z)||1;x/=l;z/=l;if(x||z){player.current.x=THREE.MathUtils.clamp(player.current.x+x*.13,-7,7);player.current.z=THREE.MathUtils.clamp(player.current.z+z*.13,-5,7)}
 if(enemyHp>0){const dx=player.current.x-enemy.current.x,dz=player.current.z-enemy.current.z,d=Math.hypot(dx,dz);if(d>.95){enemy.current.x+=dx/d*.045;enemy.current.z+=dz/d*.045}else if(Math.random()<.018)setHp(v=>Math.max(0,v-5))}
 };const id=setInterval(step,16);return()=>clearInterval(id)},[enemyHp]);
 const joystickStart=e=>{e.currentTarget.setPointerCapture(e.pointerId);const move=ev=>{const r=e.currentTarget.getBoundingClientRect();joy.current.x=THREE.MathUtils.clamp((ev.clientX-(r.left+r.width/2))/(r.width/2),-1,1);joy.current.y=THREE.MathUtils.clamp((ev.clientY-(r.top+r.height/2))/(r.height/2),-1,1)};const end=()=>{joy.current.x=joy.current.y=0;e.currentTarget.releasePointerCapture(e.pointerId);e.currentTarget.removeEventListener('pointermove',move);e.currentTarget.removeEventListener('pointerup',end)};e.currentTarget.addEventListener('pointermove',move);e.currentTarget.addEventListener('pointerup',end)};
 return <div className="game"><Canvas camera={{position:[0,4.5,7],fov:55}}><color attach="background" args={['#080d18']}/><ambientLight intensity={1.6}/><directionalLight position={[5,8,5]} intensity={3} castShadow/><Arena/><Player pos={player} attacking={attacking}/><Enemy pos={enemy.current} hp={enemyHp}/><OrbitControls enablePan={false} minDistance={4} maxDistance={10} target={[0,1,0]}/></Canvas>
 <div className="hud"><div><b>STICKMAN 3D</b><span>Score {score}</span></div><div className="label">JOUEUR</div><div className="bar"><i style={{width:hp+'%'}}/></div><div className="label">ENNEMI</div><div className="bar enemybar"><i style={{width:enemyHp+'%'}}/></div><small>WASD • joystick pour bouger • 👊 pour frapper</small></div>
 <div className="joystick" onPointerDown={joystickStart}><div/></div><button className={'attack '+(attacking?'active':'')} onPointerDown={doAttack}>👊</button>
 {enemyHp<=0&&<div className="win">ENNEMI VAINCU !<button onClick={()=>location.reload()}>Rejouer</button></div>}{hp<=0&&<div className="win">KO !<button onClick={()=>location.reload()}>Rejouer</button></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<Game/>);