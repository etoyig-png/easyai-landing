export type GaryPose = 'seated' | 'jump' | 'wave' | 'point' | 'wait' | 'frustrated' | 'idea' | 'sign' | 'signPoint' | 'signWave' | 'lowering';
type GaryCharacterProps = { pose: GaryPose; idleGlanceActive: boolean };
const CELLS: Record<GaryPose, number> = {seated:0,jump:1,wave:2,point:3,wait:4,frustrated:5,idea:6,sign:7,signPoint:8,signWave:9,lowering:10};
/** Approved illustrated Gary; one cached sprite sheet, existing routine remains the controller. */
export default function GaryCharacter({pose,idleGlanceActive}:GaryCharacterProps) {
 const cell=CELLS[pose], col=cell%4,row=Math.floor(cell/4);
 const sign = ['sign','signPoint','signWave','lowering'].includes(pose);
 const positions:Record<string,{x:number;y:number}>={sign:{x:80,y:104},signPoint:{x:100,y:105},signWave:{x:98,y:108},lowering:{x:84,y:129}};
 const label=positions[pose];
 return <svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden="true" className="gary-character gary-illustrated" data-gary-pose={pose} data-gary-idle={idleGlanceActive?'true':'false'}>
  <svg x="0" y="0" width="160" height="160" viewBox={col*360+' '+row*360+' 360 360'} overflow="hidden">
   <image href="/gary-poses.webp" x="0" y="0" width="1440" height="1080" />
  </svg>
  {sign && <text x={label.x} y={label.y} textAnchor="middle" fill="#172b48" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700"><tspan x={label.x}>The button.</tspan><tspan x={label.x} dy="14">Up there.</tspan></text>}
 </svg>;
}
