"use client";
import { useEffect, useState } from "react";

export function usePageActive(){
 const [active,setActive]=useState(true);
 useEffect(()=>{
  const visibility=()=>setActive(!document.hidden);
  const blur=()=>setActive(false);
  const focus=()=>setActive(!document.hidden);
  document.addEventListener("visibilitychange",visibility);
  window.addEventListener("blur",blur);window.addEventListener("focus",focus);
  visibility();
  return ()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("blur",blur);window.removeEventListener("focus",focus)};
 },[]);
 return active;
}
