import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import './styles.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

function Stickman({color='#f8fafc',moving=false,attack=0,hit=0,boss=false}){
 const body=useRef(),armL=useRef(),armR=useRef(),legL=useRef(),legR=useRef();
 useFrame(({clock})=>{
  const t=clock.elapsedTime,walk=moving?Math.sin(t*13)*.55:0;
  if(body.current){body.current.position.y=1+Math.abs(Math.sin(t*13))*(moving?.07:0);body.current.rotation.z=hit>0?Math.sin(t*45)*.12*hit:0}
  if(armL.current)armL.current.rotation.z=-.55+(moving?-walk*.7:0);
  if(armR.current)armR.current.rotation.z=attack>0?.55-attack*2.2:.55+(moving?walk*.7:0);
  if(legL.current)legL.current.rotation.z=-.08+(moving?walk*.55:0);
  if(legR.current)legR.current.rotation.z=.08-(moving?walk*.55:0);
 });
 const k=boss?1.18:1;
 return <group ref={body} scale={k}>
  <mesh position={[0,1.65,0]}><sphereGeometry args={[.32,20,20]}/><meshStandardMaterial color={color}/></mesh>
  <mesh position={[0,.95,0]}><cylinderGeometry args={[.11,.14,1.2,12]}/><meshStandardMaterial color={color}/></mesh>
  <group ref={armL} position={[-.38,1.25,0]}><mesh position={[0,-.42,0]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={armR} position={[.38,1.25,0]}><mesh position={[0,-.42,0]}><cylinderGeometry args={[.065,.065,.85,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={legL} position={[-.2,.55,0]}><mesh position={[0,-.48,0]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh></group>
  <group ref={legR} position={[.2,.55,0]}><mesh position={[0,-.48,0]}><cylinderGeometry args={[.08,.08,1.1,10]}/><meshStandardMaterial color={color}/></mesh></group>
 </group>
}

function Arena({level}){
 return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color={level>=3?'#24151c':'#172033'}/></mesh><gridHelper args={[30,30,level>=3?'#7f1d1d':'#334155',level>=3?'#451a1a':'#1e293b']}/><mesh position={[0,2,-8]}><boxGeometry args={[16,4,.4]}/><meshStandardMaterial color="#111827"/></mesh></>
}

function CameraRig({player,level}){
 useFrame(({camera})=>{const t=new THREE.Vector3(player.current.x,1,player.current.z),d=new THREE.Vector3(player.current.x,4.4,player.current.z+7.1);camera.position.lerp(d,.08);camera.lookAt(t)});
 return null
}

function Fighter({fighter,player,enemy,attack,hit,enemyHp,boss}){
 const ref=useRef();
 useFrame(()=>{ref.current?.position.set(fighter.current.x,0,fighter.current.z);ref.current?.rotation.set(0,fighter.current.angle,0)});
 return <group ref={ref}><Stickman color={boss?'#a855f7':'#ef4444'} moving={fighter.current.speed>.01} attack={attack} hit={hit} boss={boss}/>
 {fighter!==player&&<group position={[0,boss?2.75:2.35,.03]}><mesh><planeGeometry args={[boss?1.55:1.25,.09]}/><meshBasicMaterial color="#111827" depthTest={false} depthWrite={false}/></mesh><mesh scale={[Math.max(enemyHp,0)/100,1,1]} position={[-(1-Math.max(enemyHp,0)/100)*(boss?.775:.625),0,.01]}><planeGeometry args={[boss?1.55:1.25,.065]}/><meshBasicMaterial color={boss?'#a855f7':'#ef4444'} depthTest={false} depthWrite={false}/></mesh></group>}</group>
}

function Game(){
 const player=useRef({x:0,z:2,angle:0,speed:0}),enemies=useRef([]);
 const keys=useRef({}),joy=useRef({x:0,y:0}),joyActive=useRef(false),attackTimer=useRef(0),dodgeTimer=useRef(0),invuln=useRef(0),hitFlash=useRef(0),transitioning=useRef(false);
 const [hp,setHp]=useState(100),[stamina,setStamina]=useState(100),[score,setScore]=useState(0),[level,setLevel]=useState(1),[wave,setWave]=useState(1),[combo,setCombo]=useState(0),[enemyTick,setEnemyTick]=useState(0),[paused,setPaused]=useState(false),[gameOver,setGameOver]=useState(false),[victory,setVictory]=useState(false),[message,setMessage]=useState(''),[attackMode,setAttackMode]=useState('punch'),[specialReady,setSpecialReady]=useState(true);
 const spawn=lv=>{const boss=lv>=3, count=boss?1:lv+1;enemies.current=Array.from({length:count},(_,i)=>{const a=(i/count)*Math.PI*2;return{x:Math.cos(a)*(3.1+.6*i),z:Math.sin(a)*(2.2+.4*i),angle:0,speed:0,hp:boss?100:50,maxHp:boss?100:50,attack:0,boss}});setWave(1);setMessage(boss?'BOSS !':'Vague '+lv);setTimeout(()=>setMessage(''),900)};
 useEffect(()=>{spawn(1)},[]);
 const attack=()=>{if(paused||gameOver||victory||attackTimer.current>0||hp<=0)return;const heavy=attackMode==='heavy';attackTimer.current=heavy?.55:.34;let target=null,best=3.4;for(const e of enemies.current){const d=dist(player.current,e);if(e.hp>0&&d<best){best=d;target=e}}if(target){const dx=target.x-player.current.x,dz=target.z-player.current.z;const damage=heavy?40:25;target.hp=Math.max(0,target.hp-damage);target.x+=dx/(dist(player.current,target)||1)*.45;target.z+=dz/(dist(player.current,target)||1)*.45;target.attack=0;hitFlash.current=.18;setCombo(c=>c+1);setScore(s=>s+25);setEnemyTick(t=>t+1);if(target.hp<=0)setScore(s=>s+(target.boss?250:75))}else setCombo(0)};
 const special=()=>{if(!specialReady||paused||gameOver||victory||hp<=0)return;setSpecialReady(false);setTimeout(()=>setSpecialReady(true),5000);const radius=3.2;let hits=0;for(const e of enemies.current){if(e.hp>0&&dist(player.current,e)<radius){e.hp=Math.max(0,e.hp-35);e.attack=0;hits++;}}if(hits){setScore(s=>s+hits*50);setCombo(c=>c+hits);setEnemyTick(t=>t+1)}hitFlash.current=.3};
 const dodge=()=>{if(stamina<25||dodgeTimer.current>0||gameOver||victory)return;let x=joy.current.x,y=joy.current.y;if(Math.hypot(x,y)<.1){x=Math.sin(player.current.angle);y=Math.cos(player.current.angle)}const l=Math.hypot(x,y)||1;player.current.x=clamp(player.current.x+x/l*1.15,-7,7);player.current.z=clamp(player.current.z+y/l*1.15,-6,7);staminaRef.current=Math.max(0,staminaRef.current-25);setStamina(Math.round(staminaRef.current));dodgeTimer.current=.5;invuln.current=.5};
 const staminaRef=useRef(100);
 useEffect(()=>{const down=e=>{keys.current[e.code]=true;if(e.code==='Space')attack();if(e.code==='ShiftLeft'||e.code==='ShiftRight')dodge()};const up=e=>keys.current[e.code]=false;addEventListener('keydown',down);addEventListener('keyup',up);const id=setInterval(()=>{if(!paused&&!gameOver&&!victory){staminaRef.current=Math.min(100,staminaRef.current+.35);setStamina(Math.round(staminaRef.current));attackTimer.current=Math.max(0,attackTimer.current-.016);dodgeTimer.current=Math.max(0,dodgeTimer.current-.016);invuln.current=Math.max(0,invuln.current-.016);hitFlash.current=Math.max(0,hitFlash.current-.016);}},16);return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);clearInterval(id)}},[paused,gameOver,victory,hp]);
 useEffect(()=>{const step=()=>{if(paused||gameOver||victory)return;let x=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0)+joy.current.x,z=(keys.current.KeyS?1:0)-(keys.current.KeyW?1:0)+joy.current.y,l=Math.hypot(x,z);player.current.speed=0;if(l>.08){x/=Math.max(1,l);z/=Math.max(1,l);player.current.x=clamp(player.current.x+x*.105,-7,7);player.current.z=clamp(player.current.z+z*.105,-6,7);player.current.angle=Math.atan2(x,z);player.current.speed=.105}
 for(const e of enemies.current){if(e.hp<=0)continue;const dx=player.current.x-e.x,dz=player.current.z-e.z,d=Math.hypot(dx,dz);e.speed=0;e.attack=Math.max(0,e.attack-.016);if(d>.95){e.x+=dx/d*.035;e.z+=dz/d*.035;e.angle=Math.atan2(dx,dz);e.speed=.035}else if(e.attack<=0&&invuln.current<=0){e.attack=.9;setHp(v=>{const n=Math.max(0,v-(e.boss?15:7));if(n<=0)setGameOver(true);return n});setCombo(0)}}
 const alive=enemies.current.filter(e=>e.hp>0).length;
 if(alive===0&&!transitioning.current){transitioning.current=true;if(level<3){const nl=level+1;setLevel(nl);setScore(s=>s+100);setTimeout(()=>{transitioning.current=false;spawn(nl)},650)}else{setVictory(true);setScore(s=>s+500)}}
 };const id=setInterval(step,16);return()=>clearInterval(id)},[paused,gameOver,victory,level,enemyTick]);
 const updateJoy=e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect(),x=clamp((e.clientX-(r.left+r.width/2))/(r.width*.42),-1,1),y=clamp((e.clientY-(r.top+r.height/2))/(r.height*.42),-1,1);joy.current.x=x;joy.current.y=y};
 const endJoy=e=>{e?.preventDefault();joyActive.current=false;joy.current.x=joy.current.y=0};
 const startJoy=e=>{e.preventDefault();joyActive.current=true;e.currentTarget.setPointerCapture(e.pointerId);updateJoy(e)};
 const moving=Math.hypot(joy.current.x,joy.current.y)>.08||keys.current.KeyW||keys.current.KeyA||keys.current.KeyS||keys.current.KeyD;
 const alive=enemies.current.filter(e=>e.hp>0);
 return <div className="game">
 <Canvas shadows camera={{position:[0,4.4,7.1],fov:55}}><color attach="background" args={['#080d18']}/><ambientLight intensity={1.45}/><directionalLight position={[5,8,5]} intensity={3} castShadow/><Arena level={level}/><Fighter fighter={player} player enemy attack={attackTimer.current/.34} hit={hitFlash.current} enemyHp={0}/>{alive.map((e,i)=><Fighter key={i} fighter={{current:e}} player={player} enemy={e} attack={e.attack>0?1-e.attack/.9:0} hit={0} enemyHp={e.hp/e.maxHp*100} boss={e.boss}/>)}<CameraRig player={player} level={level}/></Canvas>
 <div className="hud"><div className="top"><b>STICKMAN 3D</b><span>NIVEAU {level} • SCORE {score}</span></div><div className="label">VIE {hp}%</div><div className="bar"><i style={{width:hp+'%'}}/></div><div className="label">ENDURANCE {stamina}%</div><div className="bar stamina"><i style={{width:stamina+'%'}}/></div><div className="stage">{level<3?'VAGUE '+level+'/2':'⚠ BOSS'}</div>{combo>1&&<div className="combo">COMBO ×{combo}</div>}</div>
 <div className="controls"><div className="joystick" onPointerDown={startJoy} onPointerMove={e=>joyActive.current&&updateJoy(e)} onPointerUp={endJoy} onPointerCancel={endJoy}><div className="knob"/></div><button className="dodge" onPointerDown={e=>{e.preventDefault();e.stopPropagation();dodge()}}>↪</button><button className={'attack '+(attackTimer.current>0?'active':'')} onPointerDown={e=>{e.preventDefault();e.stopPropagation();attack()}}>{attackMode==='heavy'?'💥':'👊'}</button><button className={'mode '+(attackMode==='heavy'?'selected':'')} onPointerDown={e=>{e.preventDefault();e.stopPropagation();setAttackMode(m=>m==='punch'?'heavy':'punch')}}>{attackMode==='heavy'?'⚡':'👊'}</button><button className={'special '+(!specialReady?'cooldown':'')} onPointerDown={e=>{e.preventDefault();e.stopPropagation();special()}}>✦</button></div>
 <div className="hint">🕹️ déplacer • 👊 attaque • ↪ esquive • ✦ spécial • ⚡ puissant</div><button className="pause" onPointerDown={()=>setPaused(v=>!v)}>{paused?'▶':'Ⅱ'}</button>
 {message&&<div className="message">{message}</div>}
 {(gameOver||victory)&&<div className="win">{victory?'🏆 VICTOIRE !':'💀 KO'}<div>{victory?'Les 3 niveaux sont terminés.':'Le combat est terminé.'}</div><button onClick={()=>location.reload()}>Rejouer</button></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<Game/>);