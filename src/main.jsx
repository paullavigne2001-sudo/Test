import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import './styles.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function Stickman({color='#f8fafc',moving=false,attack=0,hit=0}) {
 const body=useRef(),armL=useRef(),armR=useRef(),legL=useRef(),legR=useRef();
 useFrame(({clock})=>{
  const t=clock.elapsedTime, walk=moving?Math.sin(t*12)*.55:0;
  if(body.current) body.current.position.y=1+Math.abs(Math.sin(t*12))*(moving?.07:0);
  if(armL.current) armL.current.rotation.z=-.55+(moving?-walk*.7:0);
  if(armR.current) armR.current.rotation.z=.55+(moving?walk*.7:0);
  if(legL.current) legL.current.rotation.z=-.08+(moving?walk*.55:0);
  if(legR.current) legR.current.rotation.z=.08-(moving?walk*.55:0);
  if(attack>0&&armR.current) armR.current.rotation.z=.55-attack*1.8;
  if(hit>0&&body.current) body.current.rotation.z=Math.sin(t*40)*.12*hit;
 });
 return <group ref={body}>
  <mesh position={[0,1.65,0]}><sphereGeometry args={[.32,20,20]}/><meshStandardMaterial color={color}/></mesh>
  <mesh position={[0,.95,0]}><cylinderGeometry args={[.11,.14,1.2,12]}/><meshStandardMaterial color={color}/></mesh>
  <group ref={armL} position={[-.38,1.25,0]}><mesh position={[0,-.42,0]} rotation={[0,0,-.02]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={armR} position={[.38,1.25,0]}><mesh position={[0,-.42,0]} rotation={[0,0,.02]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={legL} position={[-.2,.55,0]}><mesh position={[0,-.48,0]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={legR} position={[.2,.55,0]}><mesh position={[0,-.48,0]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh></group>
 </group>
}

function Arena(){return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#172033"/></mesh><gridHelper args={[30,30,"#334155","#1e293b"]}/><mesh position={[0,2,-8]}><boxGeometry args={[16,4,.4]}/><meshStandardMaterial color="#111827"/></mesh></>}

function CameraRig({player}){useFrame(({camera})=>{const target=new THREE.Vector3(player.current.x,1,player.current.z);const desired=new THREE.Vector3(player.current.x,4.2,player.current.z+6.8);camera.position.lerp(desired,.08);camera.lookAt(target)});return null}

function World({player,enemy,playerMoving,playerAttack,enemyAttack,playerHit,enemyHit,enemyHp,flash}){const p=useRef(),e=useRef(),fx=useRef();useFrame(({clock})=>{p.current?.position.set(player.current.x,0,player.current.z);p.current?.rotation.set(0,player.current.angle,0);e.current?.position.set(enemy.current.x,0,enemy.current.z);e.current?.rotation.set(0,enemy.current.angle,0);if(fx.current)fx.current.scale.setScalar(flash>0?1+Math.sin(clock.elapsedTime*30)*.15:0.001)});return <>
 <group ref={p}><Stickman moving={playerMoving} attack={playerAttack} hit={playerHit}/></group>
 <group ref={e}><Stickman color="#ef4444" moving={enemyAttack<=0&&enemy.current.speed>0} attack={enemyAttack} hit={enemyHit}/><group position={[0,2.35,.03]}><mesh><planeGeometry args={[1.25,.08]}/><meshBasicMaterial color="#111827"/></mesh><mesh scale={[Math.max(enemyHp,0)/100,1,1]} position={[-(1-Math.max(enemyHp,0)/100)*.625,0,.01]}><planeGeometry args={[1.25,.06]}/><meshBasicMaterial color="#ef4444"/></mesh></group></group>
 <mesh ref={fx} position={[player.current.x,1.2,player.current.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.35,.45,24]}/><meshBasicMaterial color="#fbbf24" transparent opacity={.8}/></mesh>
 </>}

function Game(){
 const player=useRef({x:0,z:1,angle:0}),enemy=useRef({x:3,z:0,angle:0,speed:0});
 const keys=useRef({}),joy=useRef({x:0,y:0}),joyActive=useRef(false),attackTimer=useRef(0),enemyAttackTimer=useRef(0),playerHitTimer=useRef(0),enemyHitTimer=useRef(0),lastHit=useRef(0);
 const [hp,setHp]=useState(100),[enemyHp,setEnemyHp]=useState(100),[score,setScore]=useState(0),[ui,setUi]=useState(0);
 const [paused,setPaused]=useState(false);
 const attack=()=>{if(attackTimer.current>0||enemyAttackTimer.current>0||hp<=0||enemyHp<=0)return;attackTimer.current=.32;const dx=enemy.current.x-player.current.x,dz=enemy.current.z-player.current.z,d=Math.hypot(dx,dz);if(d<2.05){enemyHitTimer.current=.25;setEnemyHp(v=>{const n=Math.max(0,v-25);if(n===0)setScore(s=>s+100);else setScore(s=>s+25);return n});enemy.current.x+=dx/(d||1)*.35;enemy.current.z+=dz/(d||1)*.35;lastHit.current=Date.now()}}};
 const dodge=()=>{if(hp<=0||enemyHp<=0)return;const dx=joy.current.x||Math.sin(player.current.angle),dz=joy.current.y||Math.cos(player.current.angle);player.current.x=clamp(player.current.x+dx*.9,-7,7);player.current.z=clamp(player.current.z+dz*.9,-6,7)};
 useEffect(()=>{const down=e=>{keys.current[e.code]=true;if(e.code==='Space')attack();if(e.code==='ShiftLeft'||e.code==='ShiftRight')dodge()};const up=e=>keys.current[e.code]=false;addEventListener('keydown',down);addEventListener('keyup',up);const id=setInterval(()=>setUi(u=>u+1),50);return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);clearInterval(id)}},[hp,enemyHp]);
 useEffect(()=>{const step=()=>{if(paused||hp<=0||enemyHp<=0)return;attackTimer.current=Math.max(0,attackTimer.current-.016);enemyAttackTimer.current=Math.max(0,enemyAttackTimer.current-.016);playerHitTimer.current=Math.max(0,playerHitTimer.current-.016);enemyHitTimer.current=Math.max(0,enemyHitTimer.current-.016);
 let x=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0)+joy.current.x,z=(keys.current.KeyS?1:0)-(keys.current.KeyW?1:0)+joy.current.y,len=Math.hypot(x,z);
 if(len>.08){x/=Math.max(1,len);z/=Math.max(1,len);player.current.x=clamp(player.current.x+x*.11,-7,7);player.current.z=clamp(player.current.z+z*.11,-6,7);player.current.angle=Math.atan2(x,z)}
 const dx=player.current.x-enemy.current.x,dz=player.current.z-enemy.current.z,d=Math.hypot(dx,dz);enemy.current.speed=0;
 if(d>.95){enemy.current.x+=dx/d*.045;enemy.current.z+=dz/d*.045;enemy.current.angle=Math.atan2(dx,dz);enemy.current.speed=.045}
 else if(enemyAttackTimer.current<=0){enemyAttackTimer.current=.9;playerHitTimer.current=.3;setHp(v=>Math.max(0,v-8))}
 };const id=setInterval(step,16);return()=>clearInterval(id)},[paused,hp,enemyHp]);
 const updateJoy=e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-(r.left+r.width/2))/(r.width*.42),y=(e.clientY-(r.top+r.height/2))/(r.height*.42);joy.current.x=clamp(x,-1,1);joy.current.y=clamp(y,-1,1)};
 const startJoy=e=>{joyActive.current=true;e.currentTarget.setPointerCapture(e.pointerId);updateJoy(e)};const moveJoy=e=>{if(joyActive.current)updateJoy(e)};const endJoy=()=>{joyActive.current=false;joy.current.x=joy.current.y=0};
 const moving=Math.hypot(joy.current.x,joy.current.y)>.08||keys.current.KeyW||keys.current.KeyA||keys.current.KeyS||keys.current.KeyD;
 return <div className="game" onPointerMove={moveJoy} onPointerUp={endJoy} onPointerCancel={endJoy}>
 <Canvas shadows camera={{position:[0,4.2,7],fov:55}}><color attach="background" args={['#080d18']}/><ambientLight intensity={1.5}/><directionalLight position={[5,8,5]} intensity={3} castShadow/><Arena/><World player={player} enemy={enemy} playerMoving={moving} playerAttack={attackTimer.current/.32} enemyAttack={enemyAttackTimer.current>0?1-enemyAttackTimer.current/.9:0} playerHit={playerHitTimer.current} enemyHit={enemyHitTimer.current} enemyHp={enemyHp} flash={Date.now()-lastHit.current<180?1:0}/><CameraRig player={player}/></Canvas>
 <div className="hud"><div><b>STICKMAN 3D</b><span>Score {score}</span></div><div className="label">JOUEUR {hp}%</div><div className="bar"><i style={{width:hp+'%'}}/></div><div className="label">ENNEMI {enemyHp}%</div><div className="bar enemybar"><i style={{width:enemyHp+'%'}}/></div></div>
 <div className="controls"><div className="joystick" onPointerDown={startJoy}><div className="knob"/></div><button className="dodge" onPointerDown={e=>{e.stopPropagation();dodge()}}>↪</button><button className={'attack '+(attackTimer.current>0?'active':'')} onPointerDown={e=>{e.stopPropagation();attack()}}>👊</button></div>
 <div className="hint">Joystick = bouger • 👊 = frapper • ↪ = esquiver</div>
 {(enemyHp<=0||hp<=0)&&<div className="win">{enemyHp<=0?'🏆 VICTOIRE':'💀 KO'}<div>{enemyHp<=0?'Ennemi vaincu !':'Tu as été battu.'}</div><button onClick={()=>location.reload()}>Rejouer</button></div>}
 <button className="pause" onPointerDown={()=>setPaused(v=>!v)}>{paused?'▶':'Ⅱ'}</button>
 </div>
}
createRoot(document.getElementById('root')).render(<Game/>);