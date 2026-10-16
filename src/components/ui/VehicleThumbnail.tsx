import type { VehicleKind } from "@/types/studio";

export function VehicleThumbnail({kind,color}:{kind:VehicleKind;color:string}){
 const van=kind==="ambulance",fire=kind==="fire",bike=kind==="motorcycle",suv=kind==="suv";
 return <svg width="68" height="42" viewBox="0 0 90 52" aria-hidden="true">
  <ellipse cx="45" cy="43" rx="35" ry="3" fill="#263b40" opacity=".08"/>
  {bike?<><path d="m25 37 18-17 13 17H25m17-17 18-5 8 22" fill="none" stroke="#44555e" strokeWidth="4"/><path d="M35 22q9-12 21-4l-4 10H37Z" fill={color}/><path d="m56 14 7-3 2 7" fill="none" stroke="#44555e" strokeWidth="3"/></>:<>
   <path d={van?"M10 35V12h44l11 10h12l5 7v10H10Z":fire?"M7 36V19h42V9h22l11 15v15H7Z":suv?"M8 36V23l9-9h43l12 12 9 4v10H8Z":"M7 35V27l16-4 11-11h25l13 15 10 3v10H7Z"} fill={color} stroke="#24353f" strokeOpacity=".12"/>
   {van?<path d="M57 16h5l10 11H57Z" fill="#506c79"/>:fire?<><path d="M53 13h15l8 13H53Z" fill="#506c79"/><path d="M12 22h30v11H12Z" fill="#b6c5cb"/><path d="M11 14h37" stroke="#a7b8c2" strokeWidth="3"/></>:<path d={suv?"M22 17h35l9 10H14Z":"M35 16h21l10 11H25Z"} fill="#506c79"/>}
   {kind==="police"&&<><path d="M10 30h69v6H10Z" fill="#28485c"/><path d="M38 10h12" stroke="#4e90c1" strokeWidth="4"/></>}
   {van&&<><path d="M13 31h39" stroke="#e7ac46" strokeWidth="4"/><path d="M30 17v10m-5-5h10" stroke="#bd4d3b" strokeWidth="3"/></>}
   <rect x="76" y="29" width="5" height="4" rx="1" fill="#fff1bc"/>
  </>}
  {(bike?[23,67]:[23,68]).map(x=><g key={x}><circle cx={x} cy="38" r={bike?9:7.5} fill="#25353d"/><circle cx={x} cy="38" r="4" fill="#b5c4cc"/><circle cx={x} cy="38" r="1.7" fill="#627884"/></g>)}
 </svg>;
}
