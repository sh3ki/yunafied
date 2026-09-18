import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Power = 'skip' | 'double';
type Props = {
  level: 1 | 2;
  lane: number;
  paused: boolean;
  powerUp: { power: Power; lane: number } | null;
  treasureVisible: boolean;
  finishLine: boolean;
  onCoin: () => void;
  onPower: () => void;
  onPowerMiss: () => void;
  onRock: () => void;
};

export function CyclingRunnerScene({ level, lane, paused, powerUp, treasureVisible, finishLine, onCoin, onPower, onPowerMiss, onRock }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef(lane), pausedRef = useRef(paused), powerRef = useRef(powerUp), treasureRef = useRef(treasureVisible), finishRef = useRef(finishLine), callbacks = useRef({ onCoin, onPower, onPowerMiss, onRock });
  useEffect(() => { laneRef.current = lane; }, [lane]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { powerRef.current = powerUp; }, [powerUp]);
  useEffect(() => { treasureRef.current = treasureVisible; }, [treasureVisible]);
  useEffect(() => { finishRef.current = finishLine; }, [finishLine]);
  useEffect(() => { callbacks.current = { onCoin, onPower, onPowerMiss, onRock }; }, [onCoin, onPower, onPowerMiss, onRock]);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(level === 2 ? '#b9a8df' : '#8bc6de');
    scene.fog = new THREE.Fog(level === 2 ? '#c5b8e2' : '#9ecbd7', 18, 115);
    const camera = new THREE.PerspectiveCamera(57, 1, .1, 180);
    camera.position.set(0, 3.45, 8.3); camera.lookAt(0, .25, -26);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(level === 2 ? '#f0eaff' : '#eaf8ff', level === 2 ? '#30355f' : '#254c30', 2.25));
    const sun = new THREE.DirectionalLight('#ffe2a1', 2.8); sun.position.set(-9, 14, 4); scene.add(sun);
    const world = new THREE.Group(); scene.add(world);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 180), new THREE.MeshLambertMaterial({ color: level === 2 ? '#506a71' : '#476f46' })); ground.rotation.x = -Math.PI / 2; ground.position.z = -70; world.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 180), new THREE.MeshLambertMaterial({ color: level === 2 ? '#66708e' : '#b77b42' })); road.rotation.x = -Math.PI / 2; road.position.set(0, .012, -70); world.add(road);
    const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 180), new THREE.MeshLambertMaterial({ color: '#d4a25f' })); shoulder.rotation.x = -Math.PI / 2; shoulder.position.set(0, .004, -70); world.add(shoulder);
    const markers: THREE.Mesh[] = [];
    const markerGeometry = new THREE.BoxGeometry(.09, .025, 2.25), markerMaterial = new THREE.MeshBasicMaterial({ color: '#fff6cf' });
    for (let row = 0; row < 19; row += 1) for (const x of [-1.08, 1.08]) { const marker = new THREE.Mesh(markerGeometry, markerMaterial); marker.position.set(x, .035, -row * 6); markers.push(marker); world.add(marker); }
    const scenery: THREE.Group[] = [];
    const createTree = () => { const group = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .7, 6), new THREE.MeshLambertMaterial({ color: '#70452e' })); trunk.position.y = .35; const crownA = new THREE.Mesh(new THREE.ConeGeometry(.62, 1.45, 7), new THREE.MeshLambertMaterial({ color: '#1f633f' })); crownA.position.y = 1.15; const crownB = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.18, 7), new THREE.MeshLambertMaterial({ color: '#2f8a4d' })); crownB.position.y = 1.72; group.add(trunk, crownA, crownB); return group; };
    const createRock = () => new THREE.Mesh(new THREE.DodecahedronGeometry(.46, 0), new THREE.MeshLambertMaterial({ color: '#7f8d84' }));
    const resetScenery = (item: THREE.Object3D, near = false) => { const side = Math.random() > .5 ? 1 : -1; item.position.set(side * (4.2 + Math.random() * 6), 0, -(near ? 15 : 45 + Math.random() * 70)); const scale = .35 + Math.random() * .85; item.scale.setScalar(scale); };
    for (let i = 0; i < 46; i += 1) { const item = Math.random() > .23 ? createTree() : createRock(); resetScenery(item); scenery.push(item as THREE.Group); world.add(item); }
    const hazards: THREE.Mesh[] = []; for (let index = 0; index < 4; index += 1) { const rock = createRock(); rock.scale.setScalar(.7); rock.userData.lane = Math.floor(Math.random() * 3); rock.userData.hit = false; rock.position.set((rock.userData.lane - 1) * 1.18, .34, -42 - index * 30); hazards.push(rock); world.add(rock); } const coins: THREE.Group[] = [];
    const coinMaterial = new THREE.MeshStandardMaterial({ color: '#ffc533', emissive: '#8c4e00', emissiveIntensity: .35, metalness: .75, roughness: .22 });
    const coinGeometry = new THREE.CylinderGeometry(.25, .25, .075, 18), starGeometry = new THREE.OctahedronGeometry(.1, 0), starMaterial = new THREE.MeshBasicMaterial({ color: '#fff7be' });
    // Keep one deterministic, evenly spaced coin stream for the entire ride. Recycled
    // coins always join the end of the stream instead of respawning at random gaps.
    let nextCoinZ = -12 - 24 * 10.5;
    const resetCoin = (coin: THREE.Group, z?: number) => { const coinZ = z ?? nextCoinZ; if (z === undefined) nextCoinZ -= 10.5; let nextLane = Math.floor(Math.random() * 3); for (let attempt = 0; attempt < 6; attempt += 1) { const blocked = hazards.some((rock) => rock.userData.lane === nextLane && Math.abs(rock.position.z - coinZ) < 9) || powerRef.current?.lane === nextLane; if (!blocked) break; nextLane = Math.floor(Math.random() * 3); } coin.userData.lane = nextLane; coin.position.set((nextLane - 1) * 1.18, .46, coinZ); coin.rotation.set(0, 0, 0); coin.visible = true; };
    for (let index = 0; index < 24; index += 1) { const group = new THREE.Group(); const disc = new THREE.Mesh(coinGeometry, coinMaterial); disc.rotation.x = Math.PI / 2; const star = new THREE.Mesh(starGeometry, starMaterial); star.position.z = .05; group.add(disc, star); resetCoin(group, -12 - index * 10.5); coins.push(group); world.add(group); }
    const powerGroup = new THREE.Group(); const core = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), new THREE.MeshStandardMaterial({ color: '#8b5cf6', emissive: '#4719af', emissiveIntensity: .7, metalness: .4 })); const ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .075, 8, 20), new THREE.MeshStandardMaterial({ color: '#ffd34d', emissive: '#754700', emissiveIntensity: .45 })); ring.rotation.x = Math.PI / 2; powerGroup.add(core, ring); powerGroup.visible = false; world.add(powerGroup);
    const treasureGroup = new THREE.Group(); const treasureChests: THREE.Group[] = []; [-1.18, 0, 1.18].forEach((x, index) => { const chest = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(.62, .42, .44), new THREE.MeshStandardMaterial({ color: '#145b78', metalness: .35, roughness: .42 })); base.position.y = .42; const lid = new THREE.Mesh(new THREE.BoxGeometry(.68, .2, .48), new THREE.MeshStandardMaterial({ color: '#18b6a4', emissive: '#075e62', emissiveIntensity: .45, metalness: .45 })); lid.position.y = .71; const lock = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .05), new THREE.MeshBasicMaterial({ color: '#ffe36e' })); lock.position.set(0, .48, .25); chest.add(base, lid, lock); chest.position.set(x, 0, 0); chest.userData.phase = index * 1.8; treasureChests.push(chest); treasureGroup.add(chest); }); treasureGroup.visible = false; world.add(treasureGroup);
    // Keep hazards away from the treasure approach and exit so a rock cannot
    // appear immediately behind a chest or overlap the treasure formation.
    const treasureRockClearance = 18;
    let nextHazardZ = -150;
    const clearHazardsAroundTreasure = () => {
      if (!treasureGroup.visible) return;
      const treasureZ = treasureGroup.position.z + (treasureChests[1]?.position.z ?? 0);
      hazards.forEach((rock) => {
        if (Math.abs(rock.position.z - treasureZ) < treasureRockClearance) {
          rock.position.z = nextHazardZ;
          nextHazardZ -= 30;
          rock.userData.hit = false;
        }
      });
    };
    const finishGroup = new THREE.Group(); const postMaterial = new THREE.MeshLambertMaterial({ color: '#f2f2e8' }); for (const x of [-2.35, 2.35]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 2.5, 8), postMaterial); post.position.set(x, 1.25, 0); finishGroup.add(post); } for (let row = 0; row < 2; row += 1) for (let column = 0; column < 10; column += 1) { const square = new THREE.Mesh(new THREE.PlaneGeometry(.46, .28), new THREE.MeshBasicMaterial({ color: (row + column) % 2 ? '#fbfbef' : '#1d2430' })); square.position.set(-2.07 + column * .46, 2.26 - row * .28, .03); finishGroup.add(square); } finishGroup.visible = false; world.add(finishGroup);
    const resize = () => { const { width, height } = mount.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    let frame = 0, last = performance.now(), elapsed = 0, activePower: Power | null = null, treasureActive = false, finishActive = false;
    const animate = (now: number) => { frame = requestAnimationFrame(animate); const delta = Math.min(.05, (now - last) / 1000); last = now; elapsed += delta;
      if (!pausedRef.current) {
        const speed = delta * 18;
        markers.forEach((marker) => { marker.position.z += speed; if (marker.position.z > 8) marker.position.z -= 114; });
        scenery.forEach((item) => { item.position.z += speed; if (item.position.z > 9) resetScenery(item); });
        hazards.forEach((rock) => { rock.position.z += speed; if (rock.position.z > 2 && rock.position.z < 3.5 && !rock.userData.hit && rock.userData.lane === laneRef.current) { rock.userData.hit = true; callbacks.current.onRock(); } if (rock.position.z > 7) { rock.position.z = -120; rock.userData.hit = false; } });
        coins.forEach((coin) => { if (finishRef.current) { coin.visible = false; return; } if (!coin.visible) { resetCoin(coin); return; } coin.position.z += speed; coin.rotation.y += delta * 5; if (coin.position.z > 2) { if (coin.userData.lane === laneRef.current) { callbacks.current.onCoin(); coin.visible = false; coin.position.z = 9; } else if (coin.position.z > 7) resetCoin(coin); } });
        const wanted = powerRef.current;
        if (wanted && !powerGroup.visible) { activePower = wanted.power; powerGroup.userData.lane = wanted.lane; powerGroup.position.set((wanted.lane - 1) * 1.18, .62, -48); powerGroup.visible = true; }
        if (!wanted && powerGroup.visible) powerGroup.visible = false;
        if (powerGroup.visible) { powerGroup.position.z += speed; powerGroup.rotation.y += delta * 3; powerGroup.position.y = .62 + Math.sin(elapsed * 5) * .12; if (powerGroup.position.z > 2) { powerGroup.visible = false; if (powerGroup.userData.lane === laneRef.current && activePower) callbacks.current.onPower(); else callbacks.current.onPowerMiss(); activePower = null; } }
        if (treasureRef.current && !treasureActive) { treasureGroup.visible = true; treasureGroup.position.set(0, 0, -52); treasureChests.forEach((chest) => { chest.position.z = 0; chest.position.y = 0; }); treasureActive = true; clearHazardsAroundTreasure(); }
        if (!treasureRef.current && treasureActive) { treasureGroup.visible = false; treasureActive = false; }
        if (treasureGroup.visible) { treasureChests.forEach((chest) => { chest.position.z += speed; chest.rotation.y += delta * .45; chest.position.y = Math.sin(elapsed * 4 + chest.userData.phase) * .12; }); }
        clearHazardsAroundTreasure();
        if (finishRef.current && !finishActive) { finishGroup.visible = true; finishGroup.position.set(0, 0, -55); finishActive = true; }
        if (!finishRef.current && finishActive) { finishGroup.visible = false; finishActive = false; }
        if (finishGroup.visible) finishGroup.position.z += speed;
      }
      renderer.render(scene, camera);
    };
    animate(performance.now());
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); scene.traverse((object) => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose()); else mesh.material?.dispose(); }); mount.removeChild(renderer.domElement); };
  }, [level]);
  return <div ref={host} className="three-runner-canvas absolute inset-0 z-0" aria-hidden="true" />;
}
