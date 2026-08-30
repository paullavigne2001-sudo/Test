import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

function Stickman({color='#f8fafc',attacking=false}){const ref=useRef();useFrame(s=>{if(ref.current)ref.current.rotation.y=Math.sin(s.clock.elapsedTime*2)*.03});return <group ref={ref}>
<mesh position={[0,1.65,0]}><sphereGeometry args={[.32,20,20]}/><meshStandardMaterial color={color}/></mesh>
<mesh position={[0,.95,0]}><cylinderGeometry args={[.11,.14,1.2,12]}/><meshStandardMaterial color={color}/></mesh>
<mesh position={[-.38,1.02,0]} rotation={[0,0,-.55]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh>
<mesh position={[attacking?.58:.38,1.02,attacking?-.55:0]} rotation={[0,0,attacking?1.25:.55]}><cylinderGeometry args={[.065,.065,attacking?1.15:.85,10]}/><meshStandardMaterial color={color}/></mesh>
<mesh position={[-.2,.1,0]} rotation={[0,0,-.08]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh>
<mesh position={[.2,.1,0]} rotation={[0,0,.08]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh>
</group>}

function Arena(){return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#172033"/></mesh><gridHelper args={[30,30,"#334155","#1e293b"]}/></>}

function World({player,enemy,enemyHp,attacking}){const p=useRef(),e=useRef();useFrame(()=>{p.current?.position.set(player.current.x,1,player.current.z);e.current?.position.set(enemy.current.x,1,enemy.current.z)});return <><group ref={p}><Stickman attacking={attacking}/></group><group ref={e}><Stickman color="#ef4444"/><mesh position={[0,2.35,.01]}><planeGeometry args={[1.2,.1]}/><meshBasicMaterial color="#111827"/></mesh><mesh position={[-.6+(Math.max(enemyHp,0)/100)*.6,2.35,.02]}><planeGeometry args={[(Math.max(enemyHp,0)/100)*1.2,.08]}/><meshBasicMaterial color="#ef4444"/></mesh></group></>}

function Game(){
 const player=useRef(new THREE.Vector3(0,1,0)),enemy=useRef(new THREE.Vector3(3,1,0));
 const keys=useRef({}),joy=useRef({x:0,y:0}),joyActive=useRef(false);
 const [hp,setHp]=useState(100),[enemyHp,setEnemyHp]=useState(100),[score,setScore]=useState(0),[attacking,setAttacking]=useState(false),[moving,setMoving]=useState(false);
 const attack=()=>{if(attacking||enemyHp<=0||hp<=0)return;const d=player.current.distanceTo(enemy.current);setAttacking(true);if(d<2.15){setEnemyHp(v=>Math.max(0,v-25));setScore(v=>v+25)}setTimeout(()=>setAttacking(false),280)};
 useEffect(()=>{const down=e=>{keys.current[e.code]=true;if(e.code==='Space')attack()};const up=e=>keys.current[e.code]=false;addEventListener('keydown',down);addEventListener('keyup',up);return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up)}},[attacking,enemyHp,hp]);
 useEffect(()=>{const step=()=>{let x=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0)+joy.current.x,z=(keys.current.KeyS?1:0)-(keys.current.KeyW?1:0)+joy.current.y;const len=Math.hypot(x,z);if(len>.08){x/=Math.max(1,len);z/=Math.max(1,len);player.current.x=THREE.MathUtils.clamp(player.current.x+x*.11,-7,7);player.current.z=THREE.MathUtils.clamp(player.current.z+z*.11,-6,7);setMoving(true)}else setMoving(false);
 if(enemyHp>0&&hp>0){const dx=player.current.x-enemy.current.x,dz=player.current.z-enemy.current.z,d=Math.hypot(dx,dz);if(d>.95){enemy.current.x+=dx/d*.045;enemy.current.z+=dz/d*.045}else if(Math.random()<.02)setHp(v=>Math.max(0,v-5))}};const id=setInterval(step,16);return()=>clearInterval(id)},[enemyHp,hp]);
 const updateJoy=e=>{const el=document.querySelector('.joystick');if(!el)return;const r=el.getBoundingClientRect(),x=(e.clientX-(r.left+r.width/2))/(r.width*.42),y=(e.clientY-(r.top+r.height/2))/(r.height*.42);joy.current.x=THREE.MathUtils.clamp(x,-1,1);joy.current.y=THREE.MathUtils.clamp(y,-1,1)};
 const startJoy=e=>{joyActive.current=true;e.currentTarget.setPointerCapture(e.pointerId);updateJoy(e)};
 const moveJoy=e=>{if(joyActive.current)updateJoy(e)};
 const endJoy=()=>{joyActive.current=false;joy.current.x=0;joy.current.y=0};
 return <div className="game" onPointerMove={moveJoy} onPointerUp={endJoy} onPointerCancel={endJoy}>
 <Canvas camera={{position:[0,4.5,7],fov:55}}><color attach="background" args={['#080d18']}/><ambientLight intensity={1.6}/><directionalLight position={[5,8,5]} intensity={3} castShadow/><Arena/><World player={player} enemy={enemy} enemyHp={enemyHp} attacking={attacking}/><OrbitControls enablePan={false} minDistance={4} maxDistance={10} target={[0,1,0]}/></Canvas>
 <div className="hud"><div><b>STICKMAN 3D</b><span>Score {score}</span></div><div className="label">JOUEUR</div><div className="bar"><i style={{width:hp+'%'}}/></div><div className="label">ENNEMI</div><div className="bar enemybar"><i style={{width:enemyHp+'%'}}/></div><small>{moving?'DÉPLACEMENT':'Joystick / WASD pour bouger'} • 👊 pour frapper</small></div>
 <div className="joystick" onPointerDown={startJoy}><div className="knob" style={{transform:`translate(${joy.current.x*28}px,${joy.current.y*28}px)`}}/></div>
 <button className={'attack '+(attacking?'active':'')} onPointerDown={e=>{e.stopPropagation();attack()}}>👊</button>
 {enemyHp<=0&&<div className="win">ENNEMI VAINCU !<button onClick={()=>location.reload()}>Rejouer</button></div>}
 {hp<=0&&<div className="win">KO !<button onClick={()=>location.reload()}>Rejouer</button></div>}
 </div>}
createRoot(document.getElementById('root')).render(<Game/>);