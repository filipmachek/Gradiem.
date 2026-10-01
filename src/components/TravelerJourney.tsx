import React, { useEffect, useRef, useState } from 'react';
import { Mountain, Flag, Coffee, Pause, Compass } from 'lucide-react';

interface TravelerJourneyProps {
  progressPercent: number; // 0 to 100
  isRunning: boolean;
  isPaused: boolean;
  isBreak: boolean;
  isFinished: boolean;
  isDark?: boolean;
  totalDurationSeconds?: number;
}

interface TrailSceneryObject {
  id: number;
  z: number; // 0 (near viewer) to 1 (at mountain horizon)
  side: -1 | 1; // -1 = left of path, 1 = right of path
  lateralOffset: number; // distance from path edge (0.1 to 1.0)
  type: 'pine' | 'alpine_fir' | 'rock' | 'wildflower' | 'cairn';
  height: number;
  hueVariant: number;
}

export const TravelerJourney: React.FC<TravelerJourneyProps> = ({
  progressPercent,
  isRunning,
  isPaused,
  isBreak,
  isFinished,
  isDark: propIsDark,
  totalDurationSeconds = 1500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Animation phase & continuous progress tracking
  const walkPhaseRef = useRef<number>(0);
  const distanceTraveledRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(progressPercent);
  const lastTimeRef = useRef<number>(performance.now());

  // Particles
  const dustParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; alpha: number; r: number }[]>([]);
  const smokeParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; alpha: number; r: number }[]>([]);
  const sparksRef = useRef<{ x: number; y: number; vx: number; vy: number; alpha: number; color: string }[]>([]);

  // Theme detection
  const [isThemeDark, setIsThemeDark] = useState<boolean>(() => {
    if (typeof propIsDark === 'boolean') return propIsDark;
    return (
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'night'
    );
  });

  useEffect(() => {
    if (typeof propIsDark === 'boolean') {
      setIsThemeDark(propIsDark);
      return;
    }
    const updateTheme = () => {
      const dark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'night';
      setIsThemeDark(dark);
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, [propIsDark]);

  // Synchronize dynamic prop references
  const progressRef = useRef(progressPercent);
  progressRef.current = progressPercent;

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isBreakRef = useRef(isBreak);
  isBreakRef.current = isBreak;

  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;

  const isDarkRef = useRef(isThemeDark);
  isDarkRef.current = isThemeDark;

  const totalDurationRef = useRef(totalDurationSeconds);
  totalDurationRef.current = totalDurationSeconds;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling with ResizeObserver
    let width = 420;
    let height = 280;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.floor(rect.width) || 420;
      height = Math.floor(rect.height) || 280;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Initialize 3D scenery objects along the winding trail
    const sceneryObjects: TrailSceneryObject[] = [];
    const OBJECT_COUNT = 38;

    for (let i = 0; i < OBJECT_COUNT; i++) {
      const z = i / OBJECT_COUNT;
      const side = Math.random() > 0.5 ? 1 : -1;
      const roll = Math.random();
      let type: TrailSceneryObject['type'] = 'pine';
      let h = 45 + Math.random() * 30;

      if (roll < 0.50) {
        type = 'pine';
      } else if (roll < 0.70) {
        type = 'alpine_fir';
        h = 32 + Math.random() * 20;
      } else if (roll < 0.85) {
        type = 'rock';
        h = 16 + Math.random() * 14;
      } else if (roll < 0.95) {
        type = 'wildflower';
        h = 10 + Math.random() * 8;
      } else {
        type = 'cairn';
        h = 18 + Math.random() * 10;
      }

      sceneryObjects.push({
        id: i,
        z,
        side,
        lateralOffset: 0.12 + Math.random() * 0.88,
        type,
        height: h,
        hueVariant: (Math.random() - 0.5) * 15,
      });
    }

    // Sky clouds
    const clouds = [
      { x: width * 0.15, y: height * 0.16, scale: 0.9, speed: 0.08 },
      { x: width * 0.68, y: height * 0.12, scale: 1.25, speed: 0.12 },
      { x: width * 0.88, y: height * 0.22, scale: 0.75, speed: 0.06 },
    ];

    // Night stars
    const stars: { x: number; y: number; r: number; alpha: number; pulseSpeed: number }[] = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.44),
        r: Math.random() * 1.3 + 0.4,
        alpha: Math.random() * 0.6 + 0.35,
        pulseSpeed: 1 + Math.random() * 2,
      });
    }

    lastTimeRef.current = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      const dark = isDarkRef.current;
      const running = isRunningRef.current;
      const paused = isPausedRef.current;
      const breaking = isBreakRef.current;
      const finished = isFinishedRef.current;
      const targetProg = Math.max(0, Math.min(100, progressRef.current));

      // Smooth progress interpolation
      smoothProgressRef.current += (targetProg - smoothProgressRef.current) * (dt * 3.5);
      const curProg = smoothProgressRef.current; // 0 to 100
      const climbFactor = curProg / 100; // 0 to 1

      // Physical walking speed: natural human pace
      let isActuallyWalking = false;
      if (running && !paused && !breaking && !finished && curProg < 99.8) {
        isActuallyWalking = true;
        // Walking cadence: ~1.8 steps per second (standard hiking tempo)
        const walkCadence = 4.2;
        walkPhaseRef.current += dt * walkCadence;

        // Ground scroll speed
        const scrollSpeed = 0.085 * (1 + climbFactor * 0.3);
        distanceTraveledRef.current += dt * scrollSpeed;

        // Advance scenery objects towards camera (z: 1 -> 0)
        sceneryObjects.forEach((obj) => {
          obj.z -= dt * scrollSpeed;
          if (obj.z <= 0.02) {
            // Respawn at far horizon
            obj.z += 0.98;
            obj.side = Math.random() > 0.5 ? 1 : -1;
            obj.lateralOffset = 0.12 + Math.random() * 0.88;
          }
        });
      }

      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // 1. SKY & HORIZON (Day / Night Atmospheric Lighting)
      // =========================================================================
      // Horizon line in perspective:
      const horizonY = height * 0.44 - climbFactor * (height * 0.06);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 25);
      if (!dark) {
        // DAY SKY: Crisp alpine azure with warm ambient horizon glow
        if (climbFactor < 0.7) {
          skyGrad.addColorStop(0, '#3A82D8'); // Deep alpine blue
          skyGrad.addColorStop(0.5, '#72B0EE');
          skyGrad.addColorStop(0.85, '#C6E2FD');
          skyGrad.addColorStop(1, '#EDF6FE');
        } else {
          // Near summit: Golden high-altitude radiance
          skyGrad.addColorStop(0, '#3173C7');
          skyGrad.addColorStop(0.45, '#68A7EB');
          skyGrad.addColorStop(0.80, '#FEE3A2');
          skyGrad.addColorStop(1, '#FFF5D6');
        }
      } else {
        // NIGHT SKY: Majestic mountain twilight & starfield
        skyGrad.addColorStop(0, '#060E16');
        skyGrad.addColorStop(0.45, '#0E1C27');
        skyGrad.addColorStop(0.85, '#18302B');
        skyGrad.addColorStop(1, '#223E37');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Celestial Orb (Sun / Moon):
      if (!dark) {
        // Radiant Alpine Sun over the peaks
        const sunX = width * 0.75;
        const sunY = horizonY * (0.42 - climbFactor * 0.12);
        const sunR = 24 + climbFactor * 8;

        const sunCorona = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, sunR * 3.5);
        sunCorona.addColorStop(0, 'rgba(255, 250, 215, 0.75)');
        sunCorona.addColorStop(0.4, 'rgba(255, 235, 175, 0.28)');
        sunCorona.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sunCorona;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFDF0';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Drifting cumulus clouds
        clouds.forEach((c) => {
          c.x += c.speed * dt * 25;
          if (c.x > width + 100) c.x = -100;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 38 * c.scale, 13 * c.scale, 0, 0, Math.PI * 2);
          ctx.ellipse(c.x + 14 * c.scale, c.y - 5 * c.scale, 24 * c.scale, 15 * c.scale, 0, 0, Math.PI * 2);
          ctx.ellipse(c.x - 14 * c.scale, c.y - 3 * c.scale, 20 * c.scale, 11 * c.scale, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // Twinkling stars & gentle crescent moon
        stars.forEach((s) => {
          const pulse = Math.sin(now * 0.002 * s.pulseSpeed) * 0.25;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.2, s.alpha + pulse)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Glowing Moon
        const moonX = width * 0.78;
        const moonY = horizonY * 0.38;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 40);
        moonGlow.addColorStop(0, 'rgba(240, 246, 255, 0.45)');
        moonGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF8E7';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
        ctx.fill();
        // Moon crescent cutout
        ctx.fillStyle = '#0E1C27';
        ctx.beginPath();
        ctx.arc(moonX - 4, moonY - 3, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================================
      // 2. THE GOAL: THE MAJESTIC SUMMIT MOUNTAIN IN THE DISTANCE
      // =========================================================================
      // As time/progress increases, the mountain grows steadily closer and grander!
      // At 0%: far distant peak on the horizon.
      // At 100%: traveler reaches the pinnacle peak summit with fluttering flag!
      const mountainCenter = width * 0.50;
      // Growth scale: starts at 1.0, expands to 2.45 at summit!
      const mountainScale = 0.95 + climbFactor * 1.55;
      const peakY = horizonY - 48 * mountainScale;
      const mountainBaseWidth = (width * 0.65) * mountainScale;

      // Distant backing mountain ridges (atmospheric depth layers)
      const drawBackRidge = (offsetX: number, scaleFactor: number, colorSun: string, colorShadow: string) => {
        const ridgePeakX = mountainCenter + offsetX;
        const ridgePeakY = horizonY - 30 * scaleFactor;
        const ridgeSpan = 140 * scaleFactor;

        // Shadow side
        ctx.fillStyle = dark ? '#132822' : colorShadow;
        ctx.beginPath();
        ctx.moveTo(ridgePeakX - ridgeSpan, horizonY + 15);
        ctx.lineTo(ridgePeakX, ridgePeakY);
        ctx.lineTo(ridgePeakX + 15, horizonY + 15);
        ctx.closePath();
        ctx.fill();

        // Sunlight side
        ctx.fillStyle = dark ? '#1C3830' : colorSun;
        ctx.beginPath();
        ctx.moveTo(ridgePeakX, ridgePeakY);
        ctx.lineTo(ridgePeakX + ridgeSpan, horizonY + 15);
        ctx.lineTo(ridgePeakX + 15, horizonY + 15);
        ctx.closePath();
        ctx.fill();
      };

      // Background mountain ranges left & right
      drawBackRidge(-width * 0.28, mountainScale * 0.72, '#7FA4BD', '#5B7E98');
      drawBackRidge(width * 0.28, mountainScale * 0.78, '#85AAC3', '#62859F');

      // --- THE HERO DESTINATION MOUNTAIN (Matterhorn/Alpine Peak) ---
      // Left Flank (Shadow Face)
      ctx.fillStyle = dark ? '#142C26' : '#3F6158';
      ctx.beginPath();
      ctx.moveTo(mountainCenter - mountainBaseWidth * 0.5, horizonY + 20);
      ctx.lineTo(mountainCenter - mountainBaseWidth * 0.22, horizonY - 14 * mountainScale);
      ctx.lineTo(mountainCenter - 4, peakY + 8 * mountainScale);
      ctx.lineTo(mountainCenter, peakY); // The Pinnacle Peak!
      ctx.lineTo(mountainCenter, horizonY + 20);
      ctx.closePath();
      ctx.fill();

      // Right Flank (Sunlit Face - warm rock & snow highlights)
      ctx.fillStyle = dark ? '#1E4137' : '#6A9284';
      ctx.beginPath();
      ctx.moveTo(mountainCenter, peakY);
      ctx.lineTo(mountainCenter + 6, peakY + 10 * mountainScale);
      ctx.lineTo(mountainCenter + mountainBaseWidth * 0.24, horizonY - 12 * mountainScale);
      ctx.lineTo(mountainCenter + mountainBaseWidth * 0.5, horizonY + 20);
      ctx.lineTo(mountainCenter, horizonY + 20);
      ctx.closePath();
      ctx.fill();

      // Snow Cap / Glacial Crest at the Summit
      ctx.fillStyle = dark ? 'rgba(200, 225, 220, 0.75)' : '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(mountainCenter, peakY);
      ctx.lineTo(mountainCenter - 14 * mountainScale, peakY + 18 * mountainScale);
      ctx.lineTo(mountainCenter - 5 * mountainScale, peakY + 14 * mountainScale);
      ctx.lineTo(mountainCenter + 4 * mountainScale, peakY + 20 * mountainScale);
      ctx.lineTo(mountainCenter + 16 * mountainScale, peakY + 16 * mountainScale);
      ctx.closePath();
      ctx.fill();

      // THE GOAL MARKER AT THE SUMMIT:
      // A shining flagpole / beacon beaconing the climber to the summit!
      const flagPoleHeight = 22 * mountainScale;
      const flagPoleTopY = peakY - flagPoleHeight;

      // Pole
      ctx.strokeStyle = dark ? '#E5B15D' : '#D9822B';
      ctx.lineWidth = Math.max(1.8, 2.5 * mountainScale * 0.6);
      ctx.beginPath();
      ctx.moveTo(mountainCenter, peakY + 2);
      ctx.lineTo(mountainCenter, flagPoleTopY);
      ctx.stroke();

      // Golden Beacon orb on top of flag
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.arc(mountainCenter, flagPoleTopY, Math.max(2.5, 4 * mountainScale * 0.6), 0, Math.PI * 2);
      ctx.fill();

      // Fluttering Summit Goal Banner
      const flagWave = Math.sin(now * 0.006) * 3.5;
      const flagColor = finished || curProg >= 99.5 ? '#10B981' : '#E5933A';
      const flagLen = Math.max(12, 18 * mountainScale * 0.6);
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(mountainCenter, flagPoleTopY + 2);
      ctx.lineTo(mountainCenter + flagLen + flagWave, flagPoleTopY + 7);
      ctx.lineTo(mountainCenter, flagPoleTopY + 13);
      ctx.closePath();
      ctx.fill();

      // =========================================================================
      // 3. ALPINE MEADOW & FOREGROUND TERRAIN (Perspectival Ground Plane)
      // =========================================================================
      // Green alpine mountain ground extending down from horizon
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      if (!dark) {
        groundGrad.addColorStop(0, '#387353');
        groundGrad.addColorStop(0.35, '#2D6648');
        groundGrad.addColorStop(0.85, '#205138');
        groundGrad.addColorStop(1, '#18442D');
      } else {
        groundGrad.addColorStop(0, '#102620');
        groundGrad.addColorStop(0.4, '#0D1F1A');
        groundGrad.addColorStop(1, '#091512');
      }
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // =========================================================================
      // 4. THE WINDING PATH TOWARD THE MOUNTAIN (3D PERSPECTIVE)
      // =========================================================================
      // The trail winds from bottom-center directly up toward the mountain vanishing point
      const pathBottomWidth = width * 0.44; // Wide at feet
      const pathTopWidth = 6; // Narrows to mountain base
      const vpX = mountainCenter;
      const vpY = horizonY + 2;

      // S-curve sway of the mountain trail
      const trailSway = Math.sin(distanceTraveledRef.current * 2) * 14;

      ctx.save();
      // Draw Dirt Trail
      ctx.fillStyle = dark ? '#273832' : '#C4A177';
      ctx.beginPath();
      ctx.moveTo(width * 0.5 - pathBottomWidth * 0.5, height);
      ctx.bezierCurveTo(
        width * 0.5 - pathBottomWidth * 0.35 + trailSway, height * 0.78,
        vpX - 18, horizonY + 22,
        vpX - pathTopWidth * 0.5, vpY
      );
      ctx.lineTo(vpX + pathTopWidth * 0.5, vpY);
      ctx.bezierCurveTo(
        vpX + 18, horizonY + 22,
        width * 0.5 + pathBottomWidth * 0.35 + trailSway, height * 0.78,
        width * 0.5 + pathBottomWidth * 0.5, height
      );
      ctx.closePath();
      ctx.fill();

      // Inner beaten earthen footpath center
      ctx.fillStyle = dark ? '#1D2A25' : '#AF895E';
      ctx.beginPath();
      ctx.moveTo(width * 0.5 - pathBottomWidth * 0.28, height);
      ctx.bezierCurveTo(
        width * 0.5 - pathBottomWidth * 0.20 + trailSway, height * 0.78,
        vpX - 8, horizonY + 22,
        vpX - 2, vpY
      );
      ctx.lineTo(vpX + 2, vpY);
      ctx.bezierCurveTo(
        vpX + 8, horizonY + 22,
        width * 0.5 + pathBottomWidth * 0.20 + trailSway, height * 0.78,
        width * 0.5 + pathBottomWidth * 0.28, height
      );
      ctx.closePath();
      ctx.fill();

      // Trail edge stones / pebbles for crisp hiking trail texture
      ctx.fillStyle = dark ? '#3A4E46' : '#E2D3B8';
      for (let i = 0; i < 9; i++) {
        const stepZ = ((i * 0.11 + distanceTraveledRef.current * 0.4) % 1);
        const pY = horizonY + (height - horizonY) * (stepZ * stepZ);
        const pW = pathBottomWidth * (stepZ * stepZ);
        const stoneLeftX = width * 0.5 - pW * 0.48;
        const stoneRightX = width * 0.5 + pW * 0.48;
        const stoneR = 1.2 + stepZ * 2.8;

        ctx.beginPath();
        ctx.arc(stoneLeftX, pY, stoneR, 0, Math.PI * 2);
        ctx.arc(stoneRightX, pY, stoneR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // =========================================================================
      // 5. PASSING ROADSIDE SCENERY (Trees, Rocks, Flowers sweeping past)
      // =========================================================================
      // Sort scenery objects back to front (largest z first) so foreground covers background
      const sortedScenery = [...sceneryObjects].sort((a, b) => b.z - a.z);

      sortedScenery.forEach((obj) => {
        // Perspective projection:
        // z = 1 (far at horizon), z = 0 (passing camera)
        const depth = Math.max(0.04, Math.min(1, obj.z));
        // Perspective scale factor: objects grow exponentially as they approach
        const scale = Math.pow(1 - depth, 1.8);
        const screenY = horizonY + (height - horizonY) * Math.pow(1 - depth, 1.4);

        // Path width at this depth
        const currentPathHalfWidth = (pathBottomWidth * 0.5) * Math.pow(1 - depth, 1.3);
        const lateralDist = currentPathHalfWidth + 12 + obj.lateralOffset * (width * 0.38 * scale);
        const screenX = width * 0.5 + obj.side * lateralDist;

        if (scale < 0.05 || screenY > height + 40) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        if (obj.type === 'pine' || obj.type === 'alpine_fir') {
          // Lush 3D Pine Tree beside the trail
          const treeH = obj.height * scale * 1.3;
          const treeW = (obj.height * 0.45) * scale * 1.3;

          // Trunk
          ctx.fillStyle = dark ? '#241A13' : '#4E3629';
          ctx.fillRect(-treeW * 0.12, -treeH * 0.22, treeW * 0.24, treeH * 0.22);

          // Tiered pine foliage (darker shadow side, lighter sun side)
          const foliageBaseColor = dark ? '#132E25' : '#1D6147';
          const foliageHighlightColor = dark ? '#1B4034' : '#2A8260';

          const tiers = obj.type === 'pine' ? 3 : 4;
          for (let t = 0; t < tiers; t++) {
            const tierY = -treeH * 0.2 - (t / tiers) * (treeH * 0.75);
            const tierW = treeW * (1 - t * 0.22);
            const tierH = (treeH / tiers) * 1.3;

            // Foliage triangle
            ctx.fillStyle = obj.side > 0 ? foliageHighlightColor : foliageBaseColor;
            ctx.beginPath();
            ctx.moveTo(-tierW * 0.5, tierY);
            ctx.lineTo(0, tierY - tierH);
            ctx.lineTo(tierW * 0.5, tierY);
            ctx.closePath();
            ctx.fill();
          }
        } else if (obj.type === 'rock') {
          // Alpine boulder
          const rH = obj.height * scale * 1.1;
          const rW = rH * 1.4;
          ctx.fillStyle = dark ? '#273B35' : '#6A877B';
          ctx.beginPath();
          ctx.moveTo(-rW * 0.5, 0);
          ctx.lineTo(-rW * 0.3, -rH * 0.9);
          ctx.lineTo(rW * 0.2, -rH);
          ctx.lineTo(rW * 0.55, 0);
          ctx.closePath();
          ctx.fill();
        } else if (obj.type === 'wildflower') {
          // Colorful mountain blossom clump
          const fH = obj.height * scale * 1.2;
          ctx.fillStyle = !dark ? '#FFD54F' : '#E5A95A';
          ctx.fillRect(-2 * scale, -fH, 4 * scale, 4 * scale);
          ctx.fillStyle = !dark ? '#FF6B6B' : '#F87171';
          ctx.fillRect(2 * scale, -fH * 0.8, 3 * scale, 3 * scale);
        } else if (obj.type === 'cairn') {
          // Stone trail marker cairn
          const cH = obj.height * scale;
          ctx.fillStyle = dark ? '#344942' : '#8A9E96';
          ctx.fillRect(-cH * 0.4, -cH * 0.35, cH * 0.8, cH * 0.35);
          ctx.fillRect(-cH * 0.28, -cH * 0.65, cH * 0.56, cH * 0.3);
          ctx.fillRect(-cH * 0.16, -cH * 0.95, cH * 0.32, cH * 0.3);
        }

        ctx.restore();
      });

      // =========================================================================
      // 6. THE TRAVELER (PROUD THIRD-PERSON BACK VIEW - SMOOTH MARCH)
      // =========================================================================
      // The traveler is positioned in the lower-middle of the screen, walking into depth
      // In the final summit stage (100%), the traveler climbs onto the summit pinnacle rock!
      let travelerScreenX = width * 0.50 + trailSway * 0.25;
      let travelerScreenY = height * 0.82;
      let characterScale = 1.35;

      // If at summit peak (100% / finished), traveler ascends right onto the mountain peak!
      if (finished || curProg >= 99.5) {
        travelerScreenX = mountainCenter;
        travelerScreenY = peakY + 2;
        characterScale = 0.85 * mountainScale;
      }

      ctx.save();
      ctx.translate(travelerScreenX, travelerScreenY);
      ctx.scale(characterScale, characterScale);

      if (finished || curProg >= 99.5) {
        // -----------------------------------------------------------------------
        // --- AT THE SUMMIT: TRIUMPHANT PEAK CELEBRATION! ---
        // -----------------------------------------------------------------------
        // Traveler stands proud at the summit next to the beacon!
        // Dual poles raised high in the sky!
        // Coat
        ctx.fillStyle = dark ? '#2F6F5E' : '#225B49';
        ctx.beginPath();
        ctx.roundRect(-7, -30, 14, 18, 3);
        ctx.fill();

        // Leather backpack
        ctx.fillStyle = dark ? '#C98A3B' : '#8B5024';
        ctx.beginPath();
        ctx.roundRect(-6, -28, 12, 12, 2.5);
        ctx.fill();

        // Head & Hat from behind
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.arc(0, -35, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = dark ? '#1E3B33' : '#C5A376';
        ctx.beginPath();
        ctx.ellipse(0, -38, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-5, -44, 10, 6);

        // Legs planted firmly on summit rock
        ctx.strokeStyle = dark ? '#1E293B' : '#33271E';
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-3, -12);
        ctx.lineTo(-6, 0);
        ctx.moveTo(3, -12);
        ctx.lineTo(6, 0);
        ctx.stroke();

        // Both arms raised high in triumphant victory "V"
        ctx.strokeStyle = dark ? '#2F6F5E' : '#225B49';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-6, -26);
        ctx.lineTo(-14, -46);
        ctx.moveTo(6, -26);
        ctx.lineTo(14, -46);
        ctx.stroke();

        // Trekking poles raised in triumph
        ctx.strokeStyle = dark ? '#E5B15D' : '#8D6E63';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-14, -46);
        ctx.lineTo(-18, -60);
        ctx.moveTo(14, -46);
        ctx.lineTo(18, -60);
        ctx.stroke();

        // Celebratory summit victory spark particles
        if (Math.random() > 0.45) {
          sparksRef.current.push({
            x: travelerScreenX + (Math.random() - 0.5) * 50,
            y: travelerScreenY - 45 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -Math.random() * 2.5 - 0.8,
            alpha: 1,
            color: ['#FFE082', '#6EE7B7', '#93C5FD', '#FBBF24', '#FFFFFF'][Math.floor(Math.random() * 5)],
          });
        }
      } else if (breaking) {
        // -----------------------------------------------------------------------
        // --- RESTING BY CAMPFIRE (Break mode) ---
        // -----------------------------------------------------------------------
        // Traveler sits on a trail bench facing forward toward the glowing mountain
        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trail log / boulder
        ctx.fillStyle = dark ? '#30241B' : '#5C4033';
        ctx.beginPath();
        ctx.roundRect(-16, -10, 32, 10, 3);
        ctx.fill();

        // Sitting traveler from behind
        ctx.fillStyle = dark ? '#2F6F5E' : '#225B49';
        ctx.beginPath();
        ctx.roundRect(-7, -26, 14, 16, 3);
        ctx.fill();

        // Backpack leaning against log
        ctx.fillStyle = dark ? '#C98A3B' : '#8B5024';
        ctx.beginPath();
        ctx.roundRect(9, -20, 10, 16, 2.5);
        ctx.fill();

        // Head and Hat
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.arc(0, -32, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark ? '#1E3B33' : '#C5A376';
        ctx.beginPath();
        ctx.ellipse(0, -35, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-5, -41, 10, 6);

        // Crackling campfire to the left
        const fireX = -24;
        const fireY = -2;
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(fireX - 6, fireY, 12, 3);

        const flicker = Math.sin(now * 0.02) * 2;
        ctx.fillStyle = '#FF6E40';
        ctx.beginPath();
        ctx.moveTo(fireX - 5, fireY);
        ctx.lineTo(fireX, fireY - 14 + flicker);
        ctx.lineTo(fireX + 5, fireY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.moveTo(fireX - 3, fireY);
        ctx.lineTo(fireX, fireY - 9 + flicker * 0.6);
        ctx.lineTo(fireX + 3, fireY);
        ctx.closePath();
        ctx.fill();

        // Smoke curling up
        if (Math.random() > 0.65) {
          smokeParticlesRef.current.push({
            x: travelerScreenX + fireX + (Math.random() - 0.5) * 3,
            y: travelerScreenY + fireY - 12,
            vx: (Math.random() - 0.4) * 0.6,
            vy: -0.85,
            alpha: 0.55,
            r: 2,
          });
        }
      } else {
        // -----------------------------------------------------------------------
        // --- REALISTIC SMOOTH MARCH (Viewed directly from Behind) ---
        // -----------------------------------------------------------------------
        // The natural walking gait kinematics:
        const phase = walkPhaseRef.current;

        // Subtle lateral weight sway: hips shift smoothly onto whichever foot is grounded
        const lateralSway = isActuallyWalking ? Math.sin(phase) * 2.2 : 0;

        // Vertical harmonic bob: two dips per full walk cycle (one for each step)
        const verticalBob = isActuallyWalking ? Math.abs(Math.sin(phase)) * 2.6 : Math.sin(now * 0.003) * 0.8;

        // Ground shadow beneath feet (pulsing slightly with step cadence)
        ctx.fillStyle = dark ? 'rgba(0, 0, 0, 0.48)' : 'rgba(40, 30, 20, 0.32)';
        ctx.beginPath();
        ctx.ellipse(lateralSway * 0.5, 0, 14, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- LEGS & STRIDE FROM BEHIND ---
        // Left leg cycle: sin(phase)
        // Right leg cycle: sin(phase + PI)
        const leftLegCycle = Math.sin(phase);
        const rightLegCycle = Math.sin(phase + Math.PI);

        // Foot lift: when swinging forward into perspective, the boot raises off the ground
        const leftLift = isActuallyWalking ? Math.max(0, -leftLegCycle) * 7.5 : 0;
        const rightLift = isActuallyWalking ? Math.max(0, -rightLegCycle) * 7.5 : 0;

        // Foot forward/back displacement
        const leftForward = isActuallyWalking ? leftLegCycle * 6.5 : 0;
        const rightForward = isActuallyWalking ? rightLegCycle * 6.5 : 0;

        // Leg stroke style (hiking trousers)
        ctx.strokeStyle = dark ? '#1E293B' : '#2D231C';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';

        // Left Leg
        ctx.beginPath();
        ctx.moveTo(-5 + lateralSway, -14 - verticalBob);
        ctx.lineTo(-6 + lateralSway * 0.5, -4 - leftLift);
        ctx.lineTo(-6, -leftLift);
        ctx.stroke();

        // Left Boot Sole (angled view from behind)
        ctx.fillStyle = dark ? '#111827' : '#3E2723';
        ctx.beginPath();
        ctx.ellipse(-6, -leftLift, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(5 + lateralSway, -14 - verticalBob);
        ctx.lineTo(6 + lateralSway * 0.5, -4 - rightLift);
        ctx.lineTo(6, -rightLift);
        ctx.stroke();

        // Right Boot Sole
        ctx.fillStyle = dark ? '#111827' : '#3E2723';
        ctx.beginPath();
        ctx.ellipse(6, -rightLift, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kick dust when foot plants on ground
        if (isActuallyWalking && Math.random() > 0.72) {
          const footX = leftLift < 0.5 ? -6 : 6;
          dustParticlesRef.current.push({
            x: travelerScreenX + footX,
            y: travelerScreenY,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -Math.random() * 0.8 - 0.2,
            alpha: 0.45,
            r: 1.5,
          });
        }

        // --- TORSO / ADVENTURER'S COAT (Back View) ---
        ctx.fillStyle = dark ? '#24594B' : '#225B49';
        ctx.beginPath();
        ctx.roundRect(-8 + lateralSway, -32 - verticalBob, 16, 20, 3.5);
        ctx.fill();

        // Coat back center seam & belt
        ctx.strokeStyle = dark ? '#183D33' : '#173F33';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lateralSway, -30 - verticalBob);
        ctx.lineTo(lateralSway, -14 - verticalBob);
        ctx.stroke();

        // --- THE HIKING BACKPACK (Dominant Feature in Back View) ---
        // Rugged leather/canvas explorer backpack
        ctx.fillStyle = dark ? '#9A5B20' : '#8B5024';
        ctx.beginPath();
        ctx.roundRect(-7 + lateralSway * 1.1, -30 - verticalBob, 14, 15, 3);
        ctx.fill();

        // Pack pocket flaps & leather buckled straps
        ctx.fillStyle = dark ? '#7D4717' : '#6E3E1A';
        ctx.fillRect(-5 + lateralSway * 1.1, -22 - verticalBob, 10, 6);

        // Bedroll strapped across the top of backpack
        ctx.fillStyle = dark ? '#3D5A80' : '#456990';
        ctx.beginPath();
        ctx.roundRect(-9 + lateralSway * 1.1, -35 - verticalBob, 18, 5, 2.5);
        ctx.fill();

        // Bedroll strapping bands
        ctx.fillStyle = '#2A1B0E';
        ctx.fillRect(-5 + lateralSway * 1.1, -35 - verticalBob, 1.8, 5);
        ctx.fillRect(3 + lateralSway * 1.1, -35 - verticalBob, 1.8, 5);

        // Canteen / Flask swinging on side of pack
        const flaskSwing = Math.sin(phase - 0.4) * 2;
        ctx.fillStyle = dark ? '#D4AF37' : '#C0C0C0';
        ctx.beginPath();
        ctx.arc(8 + lateralSway + flaskSwing * 0.4, -22 - verticalBob, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Warm trail lantern (shines at night)
        if (dark) {
          ctx.fillStyle = '#FFE082';
          ctx.beginPath();
          ctx.arc(-8 + lateralSway, -21 - verticalBob, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Lantern glow
          const lanternGlow = ctx.createRadialGradient(
            -8 + lateralSway, -21 - verticalBob, 1,
            -8 + lateralSway, -21 - verticalBob, 18
          );
          lanternGlow.addColorStop(0, 'rgba(255, 230, 140, 0.45)');
          lanternGlow.addColorStop(1, 'rgba(255, 230, 140, 0)');
          ctx.fillStyle = lanternGlow;
          ctx.beginPath();
          ctx.arc(-8 + lateralSway, -21 - verticalBob, 18, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- HEAD & ADVENTURER HAT (Viewed from Behind) ---
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.arc(lateralSway * 0.8, -37 - verticalBob, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Hiker Wide-Brim Hat from Behind
        ctx.fillStyle = dark ? '#1D3B33' : '#C5A376';
        // Brim curving naturally in back
        ctx.beginPath();
        ctx.ellipse(lateralSway * 0.8, -40 - verticalBob, 11, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hat Crown
        ctx.beginPath();
        ctx.roundRect(-5.5 + lateralSway * 0.8, -47 - verticalBob, 11, 7.5, 2);
        ctx.fill();
        // Hat band
        ctx.fillStyle = '#422817';
        ctx.fillRect(-5.5 + lateralSway * 0.8, -42 - verticalBob, 11, 2);

        // --- TREKKING POLES IN BOTH HANDS (Alternating Swing Rhythm) ---
        // Left Pole swings opposite to left leg (swings with right leg)
        const leftPolePhase = phase + Math.PI;
        const leftPoleReach = isActuallyWalking ? Math.sin(leftPolePhase) * 6 : 0;
        const leftPoleTipY = isActuallyWalking ? Math.max(0, -Math.sin(leftPolePhase)) * 4 : 0;

        // Right Pole swings opposite to right leg (swings with left leg)
        const rightPolePhase = phase;
        const rightPoleReach = isActuallyWalking ? Math.sin(rightPolePhase) * 6 : 0;
        const rightPoleTipY = isActuallyWalking ? Math.max(0, -Math.sin(rightPolePhase)) * 4 : 0;

        ctx.strokeStyle = dark ? '#94A3B8' : '#8D6E63';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';

        // Left Trekking Pole (shaft & handle)
        ctx.beginPath();
        ctx.moveTo(-11 + lateralSway, -24 - verticalBob);
        ctx.lineTo(-14 + leftPoleReach, 2 - leftPoleTipY);
        ctx.stroke();

        // Left Hand gripping handle
        ctx.fillStyle = dark ? '#1F2937' : '#8D6E63';
        ctx.beginPath();
        ctx.arc(-11 + lateralSway, -24 - verticalBob, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Right Trekking Pole (shaft & handle)
        ctx.beginPath();
        ctx.moveTo(11 + lateralSway, -24 - verticalBob);
        ctx.lineTo(14 + rightPoleReach, 2 - rightPoleTipY);
        ctx.stroke();

        // Right Hand gripping handle
        ctx.fillStyle = dark ? '#1F2937' : '#8D6E63';
        ctx.beginPath();
        ctx.arc(11 + lateralSway, -24 - verticalBob, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // =========================================================================
      // 7. PARTICLES RENDERING (Dust, Campfire Smoke, Victory Sparks)
      // =========================================================================
      // Dust puffs from walking boots
      dustParticlesRef.current.forEach((d, idx) => {
        ctx.fillStyle = dark ? `rgba(180, 200, 190, ${d.alpha})` : `rgba(175, 140, 100, ${d.alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        d.x += d.vx;
        d.y += d.vy;
        d.alpha -= dt * 1.2;
        d.r += dt * 1.5;
        if (d.alpha <= 0) {
          dustParticlesRef.current.splice(idx, 1);
        }
      });

      // Campfire smoke during breaks
      smokeParticlesRef.current.forEach((sm, idx) => {
        ctx.fillStyle = `rgba(220, 220, 220, ${sm.alpha})`;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
        ctx.fill();
        sm.x += sm.vx + (Math.random() - 0.5) * 0.3;
        sm.y += sm.vy;
        sm.alpha -= dt * 0.45;
        sm.r += dt * 1.8;
        if (sm.alpha <= 0) {
          smokeParticlesRef.current.splice(idx, 1);
        }
      });

      // Celebration sparks at summit
      sparksRef.current.forEach((sp, idx) => {
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= dt * 0.75;
        if (sp.alpha <= 0) {
          sparksRef.current.splice(idx, 1);
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center select-none relative">
      <div
        className={`w-full rounded-2xl overflow-hidden border theme-line shadow-inner relative transition-colors duration-500 ${
          isThemeDark ? 'bg-[#060E16]' : 'bg-[#EBF5FE]'
        }`}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '280px' }}
          className="block"
        />

        {/* Elevation / Progress Indicator overlay at bottom-left */}
        <div className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs text-[11px] font-mono text-white/95 border border-white/10 flex items-center gap-1.5 shadow-sm">
          <Mountain className="w-3.5 h-3.5 text-emerald-400" />
          <span>{Math.round(progressPercent)}% to summit</span>
        </div>

        {/* Live Status indicator at bottom-right */}
        <div className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs text-[11px] font-medium text-white/95 border border-white/10 flex items-center gap-1.5 shadow-sm">
          {isFinished ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Flag className="w-3 h-3 text-emerald-400" />
              <span>Summit Reached!</span>
            </span>
          ) : isBreak ? (
            <span className="text-amber-300 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-300" />
              <span>Campfire Rest</span>
            </span>
          ) : isPaused ? (
            <span className="text-white/70 flex items-center gap-1">
              <Pause className="w-3 h-3" />
              <span>Paused</span>
            </span>
          ) : (
            <span className="text-emerald-300 flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Marching Ahead</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
