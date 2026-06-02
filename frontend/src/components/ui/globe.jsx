import React from "react";
import { cn } from "./utils";

export default function Globe({ className }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <style>
        {`
          @keyframes earthRotate {
            0% { background-position: 0 0; }
            100% { background-position: 400px 0; }
          }
          @keyframes twinkling { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-slow { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-long { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-fast { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
        `}
      </style>
      <div
        className="relative w-[250px] h-[250px] rounded-full overflow-hidden"
        style={{
          backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "left",
          animation: "earthRotate 30s linear infinite",
          boxShadow: "0 0 20px rgba(255,255,255,0.2), -5px 0 8px #c3f4ff inset, 15px 2px 25px #000 inset, -24px -2px 34px #c3f4ff99 inset, 250px 0 44px #00000066 inset, 150px 0 38px #000000aa inset",
        }}
      >
        <div className="absolute left-[-20px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling 3s infinite" }} />
        <div className="absolute left-[-40px] top-[30px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-slow 2s infinite" }} />
        <div className="absolute left-[350px] top-[90px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-long 4s infinite" }} />
        <div className="absolute left-[200px] top-[290px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling 3s infinite" }} />
        <div className="absolute left-[50px] top-[270px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-fast 1.5s infinite" }} />
        <div className="absolute left-[250px] top-[-50px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-long 4s infinite" }} />
        <div className="absolute left-[290px] top-[60px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-slow 2s infinite" }} />
      </div>
    </div>
  );
}
