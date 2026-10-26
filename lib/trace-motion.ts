/** Native decorative drawing, controlled by ScrollCraftMotion's existing pause lifecycle. */
export const TRAIL_MS = 4000;
type Vector = { x:number; y:number; z:number };
type Point = { x:number; y:number; z?:number };
export function trailOpacity(age:number) { return Math.max(0, Math.min(1, 1 - age / TRAIL_MS)); }
export function globeVector(longitude:number, latitude:number):Vector {
  const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
  return { x:Math.cos(lat) * Math.sin(lon), y:Math.sin(lat), z:Math.cos(lat) * Math.cos(lon) };
}
export function projectGlobe(point:Vector, rotation:number):Point & { z:number } {
  const angle = rotation * Math.PI / 180, tilt = .16;
  const x = point.x * Math.cos(angle) + point.z * Math.sin(angle);
  const z = point.z * Math.cos(angle) - point.x * Math.sin(angle);
  return { x:300 + 245 * x, y:300 - 245 * (point.y * Math.cos(tilt) - z * Math.sin(tilt)), z:point.y * Math.sin(tilt) + z * Math.cos(tilt) };
}
function geographyPath(coordinates:number[][]) {
  const points = coordinates.map(([lon, lat]) => globeVector(lon, lat));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x-points[i-1].x, points[i].y-points[i-1].y, points[i].z-points[i-1].z));
  return { sample(progress:number) {
    const distance = progress * lengths[lengths.length - 1];
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const a = points[i-1], b = points[i], fraction = (distance-lengths[i-1]) / (lengths[i]-lengths[i-1] || 1);
    const x=a.x+(b.x-a.x)*fraction, y=a.y+(b.y-a.y)*fraction, z=a.z+(b.z-a.z)*fraction;
    const magnitude = Math.hypot(x,y,z) || 1;
    return { x:x/magnitude, y:y/magnitude, z:z/magnitude };
  } };
}
type Geography = ReturnType<typeof geographyPath>[];

function drawTrace(context:CanvasRenderingContext2D, now:number, elapsed:number, offset:number, duration:number, color:string, sample:(progress:number)=>Point) {
  let previous:Point|undefined, previousProgress = 2;
  // A point's brightness depends on its actual age, not the whole path's animation phase.
  for (let age = 0; age <= Math.min(TRAIL_MS, elapsed); age += 80) {
    const progress = (((now - age + offset) % duration) + duration) % duration / duration;
    const point = sample(progress);
    if (previous && progress <= previousProgress && (point.z ?? 1) > 0 && (previous.z ?? 1) > 0) {
      context.globalAlpha = trailOpacity(age);
      context.strokeStyle = color; context.lineWidth = 2;
      context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(point.x, point.y); context.stroke();
    }
    previous = point; previousProgress = progress;
  }
  const head = sample((((now + offset) % duration) + duration) % duration / duration);
  if ((head.z ?? 1) > 0) {
    context.globalAlpha = 1; context.fillStyle = color; context.shadowColor = color; context.shadowBlur = 12;
    context.beginPath(); context.arc(head.x,head.y,3.2,0,Math.PI*2); context.fill();
    context.shadowBlur = 0; context.fillStyle = '#fff7df'; context.beginPath(); context.arc(head.x,head.y,1.2,0,Math.PI*2); context.fill();
  }
  context.globalAlpha = 1;
}

export function mountTraceMotion(root:Element) {
  const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('[data-light-trace]'));
  const visible = new Set<HTMLCanvasElement>(), started = new Map<HTMLCanvasElement,number>();
  const surfaces = canvases.flatMap(canvas => {
    const context = canvas.getContext('2d');
    if (!context) return [];
    const globe = canvas.dataset.lightTrace === 'globe', width = globe ? 600 : 360, height = globe ? 600 : 240;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio,0,0,ratio,0,0);
    const paths = Array.from(canvas.parentElement!.querySelectorAll<SVGGeometryElement>('.identity-context path, .identity-context circle, .identity-context rect'));
    return [{ canvas, context, globe, width, height, paths:paths.map(path => ({ path, length:path.getTotalLength() })) }];
  });
  let geography:Geography = [], stopped = false, frame = 0, last = -Infinity, globeEpoch = 0;
  const controller = new AbortController();
  if (surfaces.some(surface => surface.globe)) {
    fetch('/data/continent-traces.json', { signal:controller.signal, cache:'force-cache' })
      .then(response => response.ok ? response.json() : [])
      .then((data:number[][][]) => { if (!stopped) { geography = data.filter(path => path.length > 1).map(geographyPath); globeEpoch = performance.now(); } })
      .catch(() => { /* The server-rendered globe remains visible if geography cannot load. */ });
  }
  const draw = (time:number) => {
    frame = 0;
    if (stopped || document.hidden || !visible.size) return;
    frame = requestAnimationFrame(draw);
    if (time - last < 1000/30) return;
    last = Number.isFinite(last) ? time - ((time - last) % (1000/30)) : time;
    for (const surface of surfaces) {
      if (!visible.has(surface.canvas)) continue;
      const { canvas, context, width, height } = surface;
      context.clearRect(0,0,width,height);
      const elapsed = Math.max(0, time - (started.get(canvas) ?? time));
      if (surface.globe) {
        if (!geography.length) continue;
        const worldTime = Math.max(0, time - globeEpoch), rotation = 25 + worldTime / 180;
        geography.slice(0,6).forEach((path,index) => {
          const color = ['#ffe28a','#ff9a80','#bbff91'][index%3];
          const heads = index < 3 ? 2 : 1;
          for (let head = 0; head < heads; head++) drawTrace(context,worldTime,worldTime,index*1900 + head*5000,10000,color,progress => projectGlobe(path.sample(progress),rotation));
        });
      } else {
        surface.paths.forEach(({path,length},index) => drawTrace(context,elapsed,elapsed,index*1700,10000,canvas.dataset.traceColor ?? '#ffe28a',progress => path.getPointAtLength(progress*length)));
      }
      if (canvas.dataset.rendered !== 'true') canvas.dataset.rendered = 'true';
    }
  };
  const start = () => { if (!stopped && !frame && visible.size && !document.hidden) frame = requestAnimationFrame(draw); };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      if (entry.isIntersecting) { visible.add(canvas); if (!started.has(canvas)) started.set(canvas,performance.now()); }
      else visible.delete(canvas);
    }
    start();
  });
  surfaces.forEach(surface => observer.observe(surface.canvas));
  document.addEventListener('visibilitychange',start);
  return { destroy() {
    stopped = true; cancelAnimationFrame(frame); controller.abort(); observer.disconnect(); document.removeEventListener('visibilitychange',start);
    surfaces.forEach(({canvas,context,width,height}) => { context.clearRect(0,0,width,height); delete canvas.dataset.rendered; });
  } };
}
