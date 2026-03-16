"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DayStatus = "early"|"on_time"|"late"|"absent"|"none";
type BreakType = "short"|"lunch"|"personal";
type CStatus   = "checked_in"|"on_break"|"checked_out"|"absent";
type Tab = "heatmap"|"log"|"status"|"timeline"|"summary"|"geofence"|"coverage"|"clockin";

interface BreakLog { breakType:BreakType; start:string; end:string|null; durationMinutes:number; }
interface TLEvent  { time:string; event:string; type:string; }
interface CRMAct   { callsMade:number; leadsContacted:number; visitsScheduled:number; messagesSent:number; bookingsConfirmed:number; totalActions:number; }
interface DailyReport { employeeId:string; employeeName:string; role:string; zone:string; clockIn:string|null; clockOut:string|null; totalElapsedMinutes:number; breakMinutes:number; netWorkMinutes:number; netWorkFormatted:string; currentStatus:CStatus; dayStatus:DayStatus; sessionCount:number; breaks:BreakLog[]; timeline:TLEvent[]; crmActivity:CRMAct; }
interface Emp { _id:string; employeeName:string; role:string; zoneId?:{zoneName:string}; todayAttendance?:{currentStatus:CStatus;firstCheckIn:string|null;dayStatus:DayStatus;totalWorkMinutes:number;totalBreakMinutes:number;sessions:{checkInTime:string;checkOutTime:string|null;workMinutes:number}[];breaks:{breakType:string;breakStart:string;breakEnd:string|null;durationMinutes:number}[];isGeoValid?:boolean}|null; }
interface HRow { employeeId:string; employeeName:string; days:Record<string,DayStatus>; }
interface MyAtt { currentStatus:CStatus; firstCheckIn:string|null; totalWorkMinutes:number; totalBreakMinutes:number; sessions:{checkInTime:string;checkOutTime:string|null;workMinutes:number}[]; breaks:{breakType:string;breakStart:string;breakEnd:string|null;durationMinutes:number}[]; dayStatus:DayStatus; }

// ─── Constants ──────────────────────────────────────────────────────────────────
const SC:Record<DayStatus,string> = {early:"#1D9E75",on_time:"#5DCAA5",late:"#EF9F27",absent:"#FFBCBC",none:"#EDEDEA"};
const SL:Record<DayStatus,string> = {early:"Early",on_time:"On Time",late:"Late",absent:"Absent",none:"—"};
const AC = ["#B5D4F4","#9FE1CB","#F5C4B3","#CECBF6","#FAC775","#C0DD97","#D3D1C7","#F4C0D1"];
const ATC:Record<string,string> = {"#B5D4F4":"#0C447C","#9FE1CB":"#085041","#F5C4B3":"#712B13","#CECBF6":"#3C3489","#FAC775":"#633806","#C0DD97":"#27500A","#D3D1C7":"#444441","#F4C0D1":"#72243E"};
const TL_COLORS:Record<string,{bg:string;dot:string}> = {
  checkin:    {bg:"#EAF3DE",dot:"#1D9E75"},
  checkout:   {bg:"#F1EFE8",dot:"#5F5E5A"},
  break_start:{bg:"#FAEEDA",dot:"#EF9F27"},
  break_end:  {bg:"#EAF3DE",dot:"#5DCAA5"},
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const ini=(n:string)=>n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
const abg=(n:string)=>{let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%8;return AC[h];};
const ft=(iso:string|null)=>{if(!iso)return"--:--";return new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});};
const fm=(m:number)=>{if(!m)return"0m";const h=Math.floor(m/60),min=m%60;return h>0?`${h}h ${min}m`:`${min}m`;};
const WD=()=>{const now=new Date(),mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));return["Mon","Tue","Wed","Thu","Fri","Sat"].map((l,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return{label:l,date:d.toLocaleDateString("en-CA")};});};
const IW=()=>{const now=new Date(),s=new Date(now.getFullYear(),0,1),w=Math.ceil(((now.getTime()-s.getTime())/86400000+s.getDay()+1)/7);return`${now.getFullYear()}-${String(w).padStart(2,"0")}`;};

// ─── Mock data ──────────────────────────────────────────────────────────────────
const TODAY=new Date().toLocaleDateString("en-CA");
const WDS=WD();
const MEMP:Emp[]=[
  {_id:"1",employeeName:"Priya Sharma",  role:"alpha",zoneId:{zoneName:"Indiranagar"},   todayAttendance:{currentStatus:"checked_in", firstCheckIn:new Date(Date.now()-7*3600000).toISOString(),dayStatus:"on_time",totalWorkMinutes:420,totalBreakMinutes:32,sessions:[{checkInTime:new Date(Date.now()-7*3600000).toISOString(),checkOutTime:null,workMinutes:0}],breaks:[{breakType:"lunch",breakStart:new Date(Date.now()-3*3600000).toISOString(),breakEnd:new Date(Date.now()-2.5*3600000).toISOString(),durationMinutes:32}],isGeoValid:true}},
  {_id:"2",employeeName:"Rahul Verma",   role:"beta", zoneId:{zoneName:"Domlur"},        todayAttendance:{currentStatus:"on_break",   firstCheckIn:new Date(Date.now()-6*3600000).toISOString(),dayStatus:"late",   totalWorkMinutes:310,totalBreakMinutes:10,sessions:[{checkInTime:new Date(Date.now()-6*3600000).toISOString(),checkOutTime:null,workMinutes:0}],breaks:[{breakType:"short",breakStart:new Date(Date.now()-1800000).toISOString(),breakEnd:null,durationMinutes:0}],isGeoValid:true}},
  {_id:"3",employeeName:"Neha Gupta",    role:"gamma",zoneId:{zoneName:"EGL"},           todayAttendance:{currentStatus:"checked_in", firstCheckIn:new Date(Date.now()-8*3600000).toISOString(),dayStatus:"early",  totalWorkMinutes:480,totalBreakMinutes:45,sessions:[{checkInTime:new Date(Date.now()-8*3600000).toISOString(),checkOutTime:null,workMinutes:0}],breaks:[{breakType:"lunch",breakStart:new Date(Date.now()-4*3600000).toISOString(),breakEnd:new Date(Date.now()-3.25*3600000).toISOString(),durationMinutes:45}],isGeoValid:false}},
  {_id:"4",employeeName:"Ankit Kumar",   role:"fire", zoneId:{zoneName:"Murugeshpalya"}, todayAttendance:{currentStatus:"checked_out",firstCheckIn:new Date(Date.now()-5*3600000).toISOString(),dayStatus:"on_time", totalWorkMinutes:270,totalBreakMinutes:15,sessions:[{checkInTime:new Date(Date.now()-5*3600000).toISOString(),checkOutTime:new Date(Date.now()-1800000).toISOString(),workMinutes:270}],breaks:[{breakType:"personal",breakStart:new Date(Date.now()-3*3600000).toISOString(),breakEnd:new Date(Date.now()-2.75*3600000).toISOString(),durationMinutes:15}],isGeoValid:true}},
  {_id:"5",employeeName:"Meera Joshi",   role:"water",zoneId:{zoneName:"Electronic City"},todayAttendance:null},
];
const MHM:HRow[]=[
  {employeeId:"1",employeeName:"Priya Sharma", days:{[WDS[0].date]:"on_time",[WDS[1].date]:"on_time",[WDS[2].date]:"early",  [WDS[3].date]:"on_time",[WDS[4].date]:"on_time",[WDS[5].date]:"on_time"}},
  {employeeId:"2",employeeName:"Rahul Verma",  days:{[WDS[0].date]:"on_time",[WDS[1].date]:"late",   [WDS[2].date]:"on_time",[WDS[3].date]:"late",   [WDS[4].date]:"on_time",[WDS[5].date]:"on_time"}},
  {employeeId:"3",employeeName:"Neha Gupta",   days:{[WDS[0].date]:"early",  [WDS[1].date]:"early",  [WDS[2].date]:"on_time",[WDS[3].date]:"early",  [WDS[4].date]:"early",  [WDS[5].date]:"on_time"}},
  {employeeId:"4",employeeName:"Ankit Kumar",  days:{[WDS[0].date]:"on_time",[WDS[1].date]:"on_time",[WDS[2].date]:"absent", [WDS[3].date]:"on_time",[WDS[4].date]:"on_time",[WDS[5].date]:"on_time"}},
  {employeeId:"5",employeeName:"Meera Joshi",  days:{[WDS[0].date]:"on_time",[WDS[1].date]:"on_time",[WDS[2].date]:"on_time",[WDS[3].date]:"absent", [WDS[4].date]:"absent", [WDS[5].date]:"none"}},
];
const MOCK_REPORTS:DailyReport[]=[
  {employeeId:"1",employeeName:"Priya Sharma", role:"alpha",zone:"Indiranagar",   clockIn:"10:02 AM",clockOut:null,           totalElapsedMinutes:420,breakMinutes:32,netWorkMinutes:388,netWorkFormatted:"6h 28m",currentStatus:"checked_in", dayStatus:"on_time",sessionCount:1,breaks:[{breakType:"lunch",start:"01:14 PM",end:"01:46 PM",durationMinutes:32}],timeline:[{time:"10:02 AM",event:"Clock-in",type:"checkin"},{time:"01:14 PM",event:"Lunch Break started",type:"break_start"},{time:"01:46 PM",event:"Back from lunch break (32m)",type:"break_end"}],crmActivity:{callsMade:14,leadsContacted:18,visitsScheduled:2,messagesSent:8,bookingsConfirmed:1,totalActions:31}},
  {employeeId:"2",employeeName:"Rahul Verma",  role:"beta", zone:"Domlur",        clockIn:"10:32 AM",clockOut:null,           totalElapsedMinutes:310,breakMinutes:10,netWorkMinutes:300,netWorkFormatted:"5h 0m", currentStatus:"on_break",    dayStatus:"late",   sessionCount:1,breaks:[{breakType:"short",start:"04:22 PM",end:null,durationMinutes:0}],timeline:[{time:"10:32 AM",event:"Clock-in",type:"checkin"},{time:"04:22 PM",event:"Short Break started",type:"break_start"}],crmActivity:{callsMade:9,leadsContacted:12,visitsScheduled:1,messagesSent:5,bookingsConfirmed:0,totalActions:19}},
  {employeeId:"3",employeeName:"Neha Gupta",   role:"gamma",zone:"EGL",           clockIn:"09:55 AM",clockOut:null,           totalElapsedMinutes:480,breakMinutes:45,netWorkMinutes:435,netWorkFormatted:"7h 15m",currentStatus:"checked_in", dayStatus:"early",  sessionCount:1,breaks:[{breakType:"lunch",start:"01:00 PM",end:"01:45 PM",durationMinutes:45}],timeline:[{time:"09:55 AM",event:"Clock-in",type:"checkin"},{time:"01:00 PM",event:"Lunch Break started",type:"break_start"},{time:"01:45 PM",event:"Back from lunch break (45m)",type:"break_end"}],crmActivity:{callsMade:18,leadsContacted:22,visitsScheduled:3,messagesSent:12,bookingsConfirmed:2,totalActions:42}},
  {employeeId:"4",employeeName:"Ankit Kumar",  role:"fire", zone:"Murugeshpalya", clockIn:"10:05 AM",clockOut:"04:30 PM",    totalElapsedMinutes:270,breakMinutes:15,netWorkMinutes:255,netWorkFormatted:"4h 15m",currentStatus:"checked_out", dayStatus:"on_time",sessionCount:1,breaks:[{breakType:"personal",start:"12:30 PM",end:"12:45 PM",durationMinutes:15}],timeline:[{time:"10:05 AM",event:"Clock-in",type:"checkin"},{time:"12:30 PM",event:"Personal Break started",type:"break_start"},{time:"12:45 PM",event:"Back from personal break (15m)",type:"break_end"},{time:"04:30 PM",event:"Clock-out",type:"checkout"}],crmActivity:{callsMade:6,leadsContacted:8,visitsScheduled:4,messagesSent:3,bookingsConfirmed:1,totalActions:17}},
  {employeeId:"5",employeeName:"Meera Joshi",  role:"water",zone:"Electronic City",clockIn:null,      clockOut:null,          totalElapsedMinutes:0,  breakMinutes:0, netWorkMinutes:0,  netWorkFormatted:"0m",   currentStatus:"absent",      dayStatus:"absent", sessionCount:0,breaks:[],timeline:[],crmActivity:{callsMade:0,leadsContacted:0,visitsScheduled:0,messagesSent:0,bookingsConfirmed:0,totalActions:0}},
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const weekDays = WD();
  const [tab,setTab]       = useState<Tab>("heatmap");
  const [emps,setEmps]     = useState<Emp[]>(MEMP);
  const [hm,setHm]         = useState<HRow[]>(MHM);
  const [reports,setRep]   = useState<DailyReport[]>(MOCK_REPORTS);
  const [myAtt,setMyAtt]   = useState<MyAtt|null>(null);
  const [selEmp,setSelEmp] = useState<string|null>(null);
  const [cl,setCl]         = useState(false);
  const [bl,setBl]         = useState(false);
  const [bt,setBt]         = useState<BreakType>("short");
  const [msg,setMsg]       = useState<{t:string;ok:boolean}|null>(null);
  const [now,setNow]       = useState(new Date());
  const tmr = useRef<ReturnType<typeof setInterval>>();

  useEffect(()=>{tmr.current=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(tmr.current);},[]);

  const fetchAll = useCallback(async()=>{
    try{
      const [e,h,s,r]=await Promise.all([
        fetch("/api/employees"),
        fetch(`/api/attendance?week=${IW()}`),
        fetch("/api/attendance/status"),
        fetch("/api/attendance/daily-report"),
      ]);
      // EMPLOYEES: try admin fetch first, fall back to building from status
      if(e.ok){const j=await e.json();if(j.success&&j.data.employees?.length>0){
        setEmps(prev=>{
          const mockIds = new Set(prev.map(m=>m._id));
          const realNew = j.data.employees.filter((r:{_id:string})=>!mockIds.has(r._id));
          const updated = prev.map(m=>{
            const real = j.data.employees.find((r:{_id:string})=>r._id===m._id);
            return real ? {...m, todayAttendance: real.todayAttendance} : m;
          });
          return [...updated, ...realNew];
        });
      }}
      // HEATMAP: merge real rows into mock — keep mock rows, add/update real ones
      if(h.ok){const j=await h.json();if(j.success&&j.data.heatmap?.length>0){
        setHm(prev=>{
          const mockIds = new Set(prev.map(m=>m.employeeId));
          const realNew = j.data.heatmap.filter((r:{employeeId:string})=>!mockIds.has(r.employeeId));
          const updated = prev.map(m=>{
            const real = j.data.heatmap.find((r:{employeeId:string})=>r.employeeId===m.employeeId);
            return real ? real : m;
          });
          return [...updated, ...realNew];
        });
      }}
      if(s.ok){const j=await s.json();if(j.success&&j.data.attendance){
        const att = j.data.attendance;
        setMyAtt(att);
        // Build real employee entry from status and inject into emps
        const empFromStatus:Emp = {
          _id: att.employeeId?._id || att.employeeId || "real-user",
          employeeName: att.employeeId?.employeeName || "You",
          role: att.employeeId?.role || "employee",
          zoneId: att.employeeId?.zoneId ? {zoneName: att.employeeId.zoneId.zoneName || att.employeeId.zoneId} : undefined,
          todayAttendance: {
            currentStatus: att.currentStatus,
            firstCheckIn: att.firstCheckIn,
            dayStatus: att.dayStatus,
            totalWorkMinutes: att.totalWorkMinutes,
            totalBreakMinutes: att.totalBreakMinutes,
            sessions: att.sessions,
            breaks: att.breaks,
            isGeoValid: att.sessions?.some((s:{isGeoValid:boolean})=>s.isGeoValid) ?? false,
          }
        };
        setEmps(prev=>{
          const exists = prev.find(m=>m._id===empFromStatus._id);
          if(exists) return prev.map(m=>m._id===empFromStatus._id ? {...m, todayAttendance: empFromStatus.todayAttendance} : m);
          return [...prev, empFromStatus];
        });
        // Also inject into heatmap
        setHm(prev=>{
          const today = new Date().toLocaleDateString("en-CA");
          const id = empFromStatus._id;
          const exists = prev.find(m=>m.employeeId===id);
          if(exists) return prev.map(m=>m.employeeId===id ? {...m, days:{...m.days,[today]:att.dayStatus}} : m);
          const days:Record<string,string> = {};
          days[today] = att.dayStatus;
          return [...prev, {employeeId:id, employeeName:empFromStatus.employeeName, days}];
        });
        // Also inject into reports (powers Timeline + Daily Summary)
        const repFromStatus:DailyReport = {
          employeeId: empFromStatus._id,
          employeeName: empFromStatus.employeeName,
          role: empFromStatus.role,
          zone: empFromStatus.zoneId?.zoneName || "",
          clockIn: att.firstCheckIn ? new Date(att.firstCheckIn).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}) : null,
          clockOut: att.lastCheckOut ? new Date(att.lastCheckOut).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}) : null,
          totalElapsedMinutes: att.totalWorkMinutes + att.totalBreakMinutes,
          breakMinutes: att.totalBreakMinutes,
          netWorkMinutes: att.totalWorkMinutes,
          netWorkFormatted: att.totalWorkMinutes >= 60 ? `${Math.floor(att.totalWorkMinutes/60)}h ${att.totalWorkMinutes%60}m` : `${att.totalWorkMinutes}m`,
          currentStatus: att.currentStatus,
          dayStatus: att.dayStatus,
          sessionCount: att.sessions?.length || 0,
          breaks: (att.breaks||[]).map((b:{breakType:string;breakStart:string;breakEnd:string|null;durationMinutes:number})=>({
            breakType: b.breakType as "short"|"lunch"|"personal",
            start: new Date(b.breakStart).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),
            end: b.breakEnd ? new Date(b.breakEnd).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}) : null,
            durationMinutes: b.durationMinutes,
          })),
          timeline: (()=>{
            const events:{at:Date;label:string;type:string}[] = [];
            for(const sess of (att.sessions||[])){
              events.push({at:new Date(sess.checkInTime),label:"Clock-in",type:"checkin"});
              if(sess.checkOutTime) events.push({at:new Date(sess.checkOutTime),label:"Clock-out",type:"checkout"});
            }
            for(const brk of (att.breaks||[])){
              const bl = brk.breakType==="short"?"Short Break":brk.breakType==="lunch"?"Lunch Break":"Personal Break";
              events.push({at:new Date(brk.breakStart),label:`${bl} started`,type:"break_start"});
              if(brk.breakEnd&&brk.durationMinutes>0) events.push({at:new Date(brk.breakEnd),label:`Back from ${bl.toLowerCase()} (${brk.durationMinutes}m)`,type:"break_end"});
            }
            events.sort((a,b)=>a.at.getTime()-b.at.getTime());
            return events.map(ev=>({time:ev.at.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),event:ev.label,type:ev.type}));
          })(),
          crmActivity:{callsMade:0,leadsContacted:0,visitsScheduled:0,messagesSent:0,bookingsConfirmed:0,totalActions:0},
        };
        setRep(prev=>{
          const exists = prev.find(m=>m.employeeId===repFromStatus.employeeId);
          if(exists) return prev.map(m=>m.employeeId===repFromStatus.employeeId ? repFromStatus : m);
          return [...prev, repFromStatus];
        });
      }}
      if(r.ok){const j=await r.json();if(j.success&&j.data.reports?.length>0){
        setRep(prev=>{
          const mockIds = new Set(prev.map(m=>m.employeeId));
          const realNew = j.data.reports.filter((r:{employeeId:string})=>!mockIds.has(r.employeeId));
          const updated = prev.map(m=>{
            const real = j.data.reports.find((r:{employeeId:string})=>r.employeeId===m.employeeId);
            return real ? real : m;
          });
          return [...updated, ...realNew];
        });
      }}
    }catch{/* use mock */}
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const flash=(t:string,ok:boolean)=>{setMsg({t,ok});setTimeout(()=>setMsg(null),3500);};

  const doClock=(action:"checkin"|"checkout")=>{
    setCl(true);
    if(!navigator.geolocation){flash("GPS not available",false);setCl(false);return;}
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const r=await fetch(`/api/attendance/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude})});
        const j=await r.json();
        if(j.success){flash(action==="checkin"?"Clocked in successfully!":"Clocked out!",true);fetchAll();}
        else flash(j.error||"Error",false);
      }catch{flash("Network error",false);}
      setCl(false);
    },()=>{flash("Enable location and try again",false);setCl(false);},{enableHighAccuracy:true,timeout:8000});
  };

  const doBreak=async(action:"start"|"end")=>{
    setBl(true);
    try{
      const r=await fetch("/api/attendance/break",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,breakType:bt})});
      const j=await r.json();
      if(j.success){flash(action==="start"?"Break started":"Welcome back!",true);fetchAll();}
      else flash(j.error||"Error",false);
    }catch{flash("Network error",false);}
    setBl(false);
  };

  // Derived
  const present  = emps.filter(e=>e.todayAttendance?.currentStatus==="checked_in"||e.todayAttendance?.currentStatus==="on_break").length;
  const onBreak  = emps.filter(e=>e.todayAttendance?.currentStatus==="on_break").length;
  const offline  = emps.filter(e=>e.todayAttendance?.currentStatus==="checked_out").length;
  const absent   = emps.filter(e=>!e.todayAttendance||e.todayAttendance.currentStatus==="absent").length;
  const otPct    = emps.length?Math.round(emps.filter(e=>e.todayAttendance?.dayStatus==="on_time"||e.todayAttendance?.dayStatus==="early").length/emps.length*100):0;
  const avgMs    = emps.filter(e=>e.todayAttendance?.firstCheckIn).reduce((s,e,_,a)=>s+new Date(e.todayAttendance!.firstCheckIn!).getTime()/a.length,0);
  const avgStr   = avgMs?ft(new Date(avgMs).toISOString()):"--";
  const isIn     = myAtt?.currentStatus==="checked_in";
  const isOB     = myAtt?.currentStatus==="on_break";
  const zones    = [...new Set(emps.map(e=>e.zoneId?.zoneName||"Unknown"))];

  const TABS:{id:Tab;l:string}[]=[
    {id:"heatmap",  l:"Heatmap"},
    {id:"log",      l:"Today's Log"},
    {id:"status",   l:"Live Status"},
    {id:"timeline", l:"Timeline"},
    {id:"summary",  l:"Daily Summary"},
    {id:"geofence", l:"Geo-Fence"},
    {id:"coverage", l:"Coverage"},
    {id:"clockin",  l:"Clock In/Out"},
  ];

  const ROW=(props:{emp:Emp})=>{
    const {emp}=props;
    const att=emp.todayAttendance,ds=att?.dayStatus||"absent",cs=att?.currentStatus;
    const pill=cs==="on_break"?{bg:"#FAEEDA",c:"#854F0B",l:"On Break"}:ds==="early"||ds==="on_time"?{bg:"#EAF3DE",c:"#3B6D11",l:SL[ds]}:ds==="late"?{bg:"#FAEEDA",c:"#854F0B",l:"Late"}:{bg:"#FCEBEB",c:"#A32D2D",l:"Absent"};
    const bg=abg(emp.employeeName);
    return(
      <div style={{display:"flex",alignItems:"center",padding:"11px 0",borderBottom:"1px solid #F5F5F3",gap:12,cursor:"pointer"}} onClick={()=>{setSelEmp(emp._id===selEmp?null:emp._id);setTab("timeline");}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:ATC[bg]||"#333",flexShrink:0}}>{ini(emp.employeeName)}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#111"}}>{emp.employeeName}</div><div style={{fontSize:12,color:"#999"}}>{emp.zoneId?.zoneName||"—"} · {emp.role}</div></div>
        <span style={{fontSize:13,fontWeight:500,color:"#555",marginRight:10}}>{att?.firstCheckIn?ft(att.firstCheckIn):"--:--"}</span>
        <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:pill.bg,color:pill.c,whiteSpace:"nowrap"}}>{pill.l}</span>
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#F5F5F3",fontFamily:"'DM Sans',system-ui,sans-serif"}}>

      {/* Nav */}
      <div style={{background:"#fff",borderBottom:"1px solid #E8E8E4",padding:"0 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",alignItems:"center",height:52,gap:24}}>
          <span style={{fontWeight:700,fontSize:18,color:"#E8540A"}}>Gharpayy</span>
          {["Overview","Attendance","Employees"].map(t=>(
            <span key={t} style={{fontSize:14,cursor:"pointer",color:t==="Attendance"?"#E8540A":"#AAA",borderBottom:t==="Attendance"?"2px solid #E8540A":"none",paddingBottom:2,fontWeight:t==="Attendance"?600:400}}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"16px 16px 48px"}}>
        <div style={{background:"#fff",borderRadius:16,border:"1px solid #E8E8E4",overflow:"hidden"}}>

          {/* Header */}
          <div style={{padding:"16px 20px 0",borderBottom:"1px solid #F0F0EC"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:"50%",border:"2px solid #E8540A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8540A" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span style={{fontWeight:700,fontSize:16}}>Attendance</span>
              </div>
              <span style={{fontSize:13,color:"#999"}}>Today · <strong style={{color:"#111"}}>{present}/{emps.length} present</strong></span>
            </div>
            {/* Live pills */}
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[{l:`${present} Active`,bg:"#EAF3DE",c:"#3B6D11"},{l:`${onBreak} On Break`,bg:"#FAEEDA",c:"#854F0B"},{l:`${offline} Offline`,bg:"#F1EFE8",c:"#5F5E5A"},{l:`${absent} Absent`,bg:"#FCEBEB",c:"#A32D2D"}].map(p=>(
                <span key={p.l} style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:p.bg,color:p.c}}>{p.l}</span>
              ))}
            </div>
            {/* Sub-tabs — scrollable */}
            <div style={{display:"flex",overflowX:"auto",gap:0,WebkitOverflowScrolling:"touch" as React.CSSProperties["WebkitOverflowScrolling"]}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"none",padding:"8px 12px",fontSize:13,fontWeight:tab===t.id?600:400,color:tab===t.id?"#E8540A":"#AAA",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #E8540A":"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap"}}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* ── HEATMAP ── */}
          {tab==="heatmap"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:12}}>Your Weekly Attendance</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:300}}>
                <thead><tr><td style={{width:86,paddingBottom:8}}/>{weekDays.map(d=><td key={d.date} style={{textAlign:"center",fontSize:12,color:d.date===TODAY?"#E8540A":"#BBB",fontWeight:d.date===TODAY?700:400,paddingBottom:8,minWidth:44}}>{d.label}</td>)}</tr></thead>
                <tbody>{hm.map(emp=>(
                  <tr key={emp.employeeId}>
                    <td style={{fontSize:13,color:"#333",paddingRight:8,paddingTop:4,paddingBottom:4,whiteSpace:"nowrap"}}>{emp.employeeName.split(" ").map((n,i)=>i===0?n:n[0]+".").join(" ")}</td>
                    {weekDays.map(d=>{const s=(emp.days[d.date]||"none") as DayStatus;return<td key={d.date} style={{textAlign:"center",padding:"3px 2px"}}><div title={SL[s]} style={{width:34,height:34,borderRadius:8,background:SC[s],margin:"0 auto",border:d.date===TODAY?"2px solid #E8540A":"none"}}/></td>;})}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:16,marginTop:14,flexWrap:"wrap"}}>
              {(["early","on_time","late","absent"] as DayStatus[]).map(s=>(
                <div key={s} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:SC[s]}}/><span style={{fontSize:12,color:"#888"}}>{SL[s]}</span>
                </div>
              ))}
            </div>
          </div>}

          {/* ── TODAY'S LOG ── */}
          {tab==="log"&&<div style={{padding:"16px 20px 4px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:12}}>Today&apos;s Log</div>
{emps.map(emp=><ROW key={emp._id} emp={emp}/>)}
          </div>}

          {/* ── LIVE STATUS BOARD ── */}
          {tab==="status"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:14}}>Live Team Status</div>
            {/* Big stat row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
              {[{n:present,l:"Active",bg:"#EAF3DE",c:"#1D9E75"},{n:onBreak,l:"On Break",bg:"#FAEEDA",c:"#EF9F27"},{n:offline,l:"Offline",bg:"#F1EFE8",c:"#888780"},{n:absent,l:"Absent",bg:"#FCEBEB",c:"#E24B4A"}].map(s=>(
                <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:700,color:s.c,lineHeight:1}}>{s.n}</div>
                  <div style={{fontSize:11,color:s.c,marginTop:3,fontWeight:500}}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Employee list — clickable for drill-down */}
            <div style={{fontSize:12,color:"#BBB",marginBottom:8}}>Tap an employee to see their timeline →</div>
            {emps.map(emp=><ROW key={emp._id} emp={emp}/>)}
          </div>}

          {/* ── SESSION TIMELINE ── */}
          {tab==="timeline"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:12}}>
              Work Session Timeline — Your Day
            </div>
            {/* Timeline events — always show logged-in user's real data */}
            {(()=>{
              // Use real API report data (first entry = logged-in user)
              const rep = reports.find(r=>r.employeeId===(myAtt?.employeeId?._id||myAtt?.employeeId)) || (reports && reports.length > 0 ? reports[0] : null);
              // If no real data yet, build timeline from myAtt sessions + breaks
              const builtFromMyAtt: {time:string;event:string;type:string}[] = [];
              if (!rep && myAtt) {
                const events: {at:Date;label:string;type:string}[] = [];
                for (const sess of myAtt.sessions) {
                  events.push({at:new Date(sess.checkInTime),label:"Clock-in",type:"checkin"});
                  if (sess.checkOutTime) events.push({at:new Date(sess.checkOutTime),label:"Clock-out",type:"checkout"});
                }
                for (const brk of myAtt.breaks) {
                  const bl = brk.breakType==="short"?"Short Break":brk.breakType==="lunch"?"Lunch Break":"Personal Break";
                  events.push({at:new Date(brk.breakStart),label:`${bl} started`,type:"break_start"});
                  if (brk.breakEnd) events.push({at:new Date(brk.breakEnd),label:`Back from ${bl.toLowerCase()} (${brk.durationMinutes}m)`,type:"break_end"});
                }
                events.sort((a,b)=>a.at.getTime()-b.at.getTime());
                for (const ev of events) {
                  builtFromMyAtt.push({time:ev.at.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),event:ev.label,type:ev.type});
                }
              }
              const events = rep?.timeline || builtFromMyAtt;
              if (!myAtt && events.length === 0) return<div style={{textAlign:"center",padding:"32px 0",color:"#CCC",fontSize:13}}>Clock in to start tracking your day</div>;
              if (events.length === 0) return<div style={{textAlign:"center",padding:"32px 0",color:"#CCC",fontSize:13}}>No activity recorded yet today</div>;
              const summary = rep || (myAtt ? {netWorkFormatted:fm(myAtt.totalWorkMinutes),breakMinutes:myAtt.totalBreakMinutes,sessionCount:myAtt.sessions.length} : null);
              return<div style={{position:"relative",paddingLeft:28}}>
                <div style={{position:"absolute",left:9,top:12,bottom:12,width:2,background:"#F0F0EC",borderRadius:2}}/>
                {events.filter(ev=>!ev.event.includes("(0m)")).map((ev,i)=>{
                  const col=TL_COLORS[ev.type]||{bg:"#F1EFE8",dot:"#888"};
                  return<div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16,position:"relative"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:col.dot,flexShrink:0,zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:-28+9-10+1}}>
                      {ev.type==="checkin"&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {ev.type==="checkout"&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                      {(ev.type==="break_start"||ev.type==="break_end")&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="8"/><polyline points="12 8 12 12 15 14"/></svg>}
                    </div>
                    <div style={{background:col.bg,borderRadius:8,padding:"8px 12px",flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{ev.event}</div>
                      <div style={{fontSize:12,color:"#999",marginTop:2}}>{ev.time}</div>
                    </div>
                  </div>;
                })}
                {summary&&<div style={{background:"#F8F8F6",borderRadius:10,padding:"12px 14px",marginTop:4}}>
                  <div style={{fontSize:12,color:"#999",marginBottom:6}}>Day summary</div>
                  <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#111"}}>{summary.netWorkFormatted}</span><span style={{fontSize:12,color:"#999",marginLeft:4}}>net work</span></div>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#111"}}>{fm(summary.breakMinutes)}</span><span style={{fontSize:12,color:"#999",marginLeft:4}}>breaks</span></div>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#111"}}>{summary.sessionCount}</span><span style={{fontSize:12,color:"#999",marginLeft:4}}>sessions</span></div>
                  </div>
                </div>}
              </div>;
            })()}
          </div>}

          {/* ── DAILY SUMMARY ── */}
          {tab==="summary"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:14}}>Your Daily Summary — {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
            {reports.map(rep=>{
              const bg=abg(rep.employeeName);
              const isAbsent=rep.currentStatus==="absent";
              return<div key={rep.employeeId} style={{border:"1px solid #EDEDEA",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                {/* Employee header */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:ATC[bg]||"#333",flexShrink:0}}>{ini(rep.employeeName)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#111"}}>{rep.employeeName}</div>
                    <div style={{fontSize:12,color:"#999"}}>{rep.role} · {rep.zone}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:isAbsent?"#FCEBEB":rep.currentStatus==="on_break"?"#FAEEDA":"#EAF3DE",color:isAbsent?"#A32D2D":rep.currentStatus==="on_break"?"#854F0B":"#3B6D11"}}>
                    {isAbsent?"Absent":rep.currentStatus==="checked_in"?"Active":rep.currentStatus==="on_break"?"On Break":"Offline"}
                  </span>
                </div>
                {!isAbsent&&<>
                  {/* Time row */}
                  <div style={{display:"flex",gap:0,marginBottom:12,background:"#F8F8F6",borderRadius:8,overflow:"hidden"}}>
                    {[{l:"Clock-in",v:rep.clockIn||"--"},  {l:"Clock-out",v:rep.clockOut||"Active"},{l:"Net work",v:rep.netWorkFormatted},{l:"Breaks",v:fm(rep.breakMinutes)}].map((cell,i)=>(
                      <div key={i} style={{flex:1,padding:"8px 10px",borderRight:i<3?"1px solid #EDEDEA":"none",textAlign:"center"}}>
                        <div style={{fontSize:11,color:"#AAA",marginBottom:2}}>{cell.l}</div>
                        <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{cell.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Breaks detail */}
                  {rep.breaks.length>0&&<div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:"#AAA",marginBottom:6}}>Breaks</div>
                    {rep.breaks.map((b,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#666",marginBottom:3}}>
                        <span style={{background:b.breakType==="lunch"?"#FAEEDA":b.breakType==="short"?"#EAF3DE":"#F1EFE8",color:b.breakType==="lunch"?"#854F0B":b.breakType==="short"?"#3B6D11":"#5F5E5A",padding:"1px 7px",borderRadius:10,fontSize:11,fontWeight:500,textTransform:"capitalize"}}>{b.breakType}</span>
                        <span>{b.start} → {b.end||"ongoing"}</span>
                        <span style={{color:"#AAA"}}>({b.durationMinutes}m)</span>
                      </div>
                    ))}
                  </div>}
                  {/* CRM Activity */}
                  <div>
                    <div style={{fontSize:11,color:"#AAA",marginBottom:6}}>CRM Activity</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {l:"Calls",     v:rep.crmActivity.callsMade,       c:"#185FA5"},
                        {l:"Leads",     v:rep.crmActivity.leadsContacted,  c:"#0F6E56"},
                        {l:"Visits",    v:rep.crmActivity.visitsScheduled, c:"#854F0B"},
                        {l:"Messages",  v:rep.crmActivity.messagesSent,    c:"#534AB7"},
                        {l:"Bookings",  v:rep.crmActivity.bookingsConfirmed,c:"#993C1D"},
                      ].map(stat=>(
                        <div key={stat.l} style={{textAlign:"center",background:"#F8F8F6",borderRadius:8,padding:"6px 12px",minWidth:52}}>
                          <div style={{fontSize:16,fontWeight:700,color:stat.c}}>{stat.v}</div>
                          <div style={{fontSize:10,color:"#AAA",marginTop:1}}>{stat.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>}
                {isAbsent&&<div style={{fontSize:13,color:"#CCC",textAlign:"center",padding:"8px 0"}}>No attendance recorded today</div>}
              </div>;
            })}
          </div>}

          {/* ── GEO-FENCE ── */}
          {tab==="geofence"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:12}}>Geo-Fence Verification</div>
            <div style={{border:"1px solid #E8E8E4",borderRadius:12,overflow:"hidden",marginBottom:16}}>
              <div style={{background:"#E8EFF8",height:138,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {[...Array(7)].map((_,i)=><div key={i} style={{position:"absolute",left:`${i*16.6}%`,top:0,bottom:0,width:1,background:"rgba(255,255,255,0.6)"}}/>)}
                {[...Array(5)].map((_,i)=><div key={i} style={{position:"absolute",top:`${i*25}%`,left:0,right:0,height:1,background:"rgba(255,255,255,0.6)"}}/>)}
                <div style={{width:88,height:88,borderRadius:"50%",border:"2.5px solid #E8540A",background:"rgba(232,84,10,0.07)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#E8540A"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <span style={{position:"absolute",bottom:10,left:14,fontSize:12,fontWeight:600,color:"#555"}}>Bangalore Office</span>
              </div>
              <div style={{padding:"6px 16px 8px"}}>
                {emps.filter(e=>e.todayAttendance?.firstCheckIn).map(emp=>(
                  <div key={emp._id} style={{display:"flex",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #F5F5F3",gap:10}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:emp.todayAttendance?.isGeoValid?"#1D9E75":"#E24B4A",flexShrink:0}}/>
                    <span style={{flex:1,fontSize:14,color:"#222"}}>{emp.employeeName}</span>
                    <span style={{fontSize:13,color:"#AAA",marginRight:16}}>{emp.zoneId?.zoneName||"—"}</span>
                    <span style={{fontSize:13,fontWeight:600,color:emp.todayAttendance?.isGeoValid?"#1D9E75":"#E24B4A"}}>{emp.todayAttendance?.isGeoValid?"Inside":"Outside"}</span>
                  </div>
                ))}
                {!emps.some(e=>e.todayAttendance?.firstCheckIn)&&<div style={{padding:"20px 0",textAlign:"center",color:"#CCC",fontSize:13}}>No check-ins yet today</div>}
              </div>
            </div>
          </div>}

          {/* ── COVERAGE ── */}
          {tab==="coverage"&&<div style={{padding:"16px 20px 20px"}}>
            <div style={{fontSize:13,color:"#999",fontWeight:500,marginBottom:12}}>Coverage Summary</div>
            <div style={{border:"1px solid #E8E8E4",borderRadius:12,padding:"18px"}}>
              <div style={{display:"flex",justifyContent:"space-around",marginBottom:22,textAlign:"center"}}>
                <div><div style={{fontSize:24,fontWeight:700,color:"#5DCAA5"}}>{present}/{emps.length}</div><div style={{fontSize:12,color:"#999",marginTop:3}}>Present</div></div>
                <div><div style={{fontSize:24,fontWeight:700,color:"#378ADD"}}>{otPct}%</div><div style={{fontSize:12,color:"#999",marginTop:3}}>On Time %</div></div>
                <div><div style={{fontSize:24,fontWeight:700,color:"#7F77DD"}}>{avgStr}</div><div style={{fontSize:12,color:"#999",marginTop:3}}>Avg Clock-in</div></div>
              </div>
              <div style={{fontSize:13,color:"#888",fontWeight:500,marginBottom:10}}>Zone Coverage</div>
              {zones.map(zone=>{
                const tot=emps.filter(e=>e.zoneId?.zoneName===zone).length;
                const pre=emps.filter(e=>e.zoneId?.zoneName===zone&&(e.todayAttendance?.currentStatus==="checked_in"||e.todayAttendance?.currentStatus==="on_break")).length;
                const pct=tot?pre/tot:0;
                return<div key={zone} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{width:130,fontSize:13,color:"#444",flexShrink:0}}>{zone}</span>
                  <div style={{flex:1,height:6,background:"#EDEDEA",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${pct*100}%`,height:"100%",background:pct===1?"#1D9E75":pct>0?"#5DCAA5":"#EDEDEA",borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:12,color:pct>0?"#3B6D11":"#BBB",fontWeight:500,minWidth:28,textAlign:"right"}}>{pre}/{tot}</span>
                </div>;
              })}
              <div style={{marginTop:14,background:"#EAF3DE",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{fontSize:13,color:"#3B6D11",fontWeight:500}}>All geo-fences verified · {zones.length} zones covered</span>
              </div>
            </div>
          </div>}

          {/* ── CLOCK IN/OUT ── */}
          {tab==="clockin"&&<div style={{padding:"16px 20px 24px"}}>
            <div style={{border:"1px solid #E8E8E4",borderRadius:12,padding:"22px 20px",textAlign:"center"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"#B5D4F4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#0C447C",margin:"0 auto 6px"}}>AM</div>
              <div style={{fontSize:16,fontWeight:700,color:"#111"}}>Ammar Logade</div>
              <div style={{fontSize:13,color:"#999",marginBottom:22}}>Full Stack Developer · Intern</div>
              {/* Clock face */}
              <div style={{width:100,height:100,borderRadius:"50%",border:"3px solid #E8E8E4",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",background:"#FAFAF8"}}>
                <span style={{fontSize:22,fontWeight:700,color:"#111",lineHeight:1,letterSpacing:"-0.5px"}}>{now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false})}</span>
                <span style={{fontSize:11,color:"#BBB",marginTop:3}}>{now.getHours()<12?"AM":"PM"}</span>
              </div>
              {/* Session summary */}
              {myAtt&&<div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:18,flexWrap:"wrap"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:"#111"}}>{ft(myAtt.firstCheckIn)}</div><div style={{fontSize:11,color:"#999"}}>First in</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:"#111"}}>{myAtt.sessions.length}</div><div style={{fontSize:11,color:"#999"}}>Sessions</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:"#111"}}>{fm(myAtt.totalWorkMinutes)}</div><div style={{fontSize:11,color:"#999"}}>Worked</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:"#EF9F27"}}>{fm(myAtt.totalBreakMinutes)}</div><div style={{fontSize:11,color:"#999"}}>Breaks</div></div>
              </div>}
              {/* Main button */}
              <button onClick={()=>doClock(isIn||isOB?"checkout":"checkin")} disabled={cl} style={{width:"100%",padding:"13px 0",background:isIn||isOB?"#fff":"#E8540A",color:isIn||isOB?"#E8540A":"#fff",border:isIn||isOB?"1.5px solid #E8540A":"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:cl?"not-allowed":"pointer",opacity:cl?0.6:1,marginBottom:14}}>
                {cl?"Getting GPS...":(isIn?"Clock Out":isOB?"End Break & Clock Out":"Clock In")}
              </button>
              {/* Break controls */}
              {isIn&&<>
                <div style={{display:"flex",gap:6,marginBottom:8,justifyContent:"center",flexWrap:"wrap"}}>
                  {([["short","Short (10m)"],["lunch","Lunch (45m)"],["personal","Personal (15m)"]] as [BreakType,string][]).map(([b,l])=>(
                    <button key={b} onClick={()=>setBt(b)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:bt===b?"1.5px solid #E8540A":"1px solid #DDD",background:bt===b?"#FFF3EE":"#fff",color:bt===b?"#E8540A":"#888",cursor:"pointer",fontWeight:bt===b?600:400}}>{l}</button>
                  ))}
                </div>
                <button onClick={()=>doBreak("start")} disabled={bl} style={{width:"100%",padding:"10px 0",background:"#FAEEDA",color:"#854F0B",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",opacity:bl?0.6:1}}>
                  {bl?"...":"Start Break"}
                </button>
              </>}
              {isOB&&<button onClick={()=>doBreak("end")} disabled={bl} style={{width:"100%",padding:"10px 0",background:"#EAF3DE",color:"#3B6D11",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",opacity:bl?0.6:1,marginTop:8}}>{bl?"...":"End Break"}</button>}
              <p style={{fontSize:12,color:"#CCC",marginTop:14,lineHeight:1.5}}>GPS required · Multiple clock-ins per day supported</p>
            </div>
            {msg&&<div style={{marginTop:10,padding:"10px 14px",borderRadius:8,background:msg.ok?"#EAF3DE":"#FCEBEB",color:msg.ok?"#3B6D11":"#A32D2D",fontSize:13,fontWeight:500}}>{msg.t}</div>}
          </div>}

        </div>
      </div>
    </div>
  );
}