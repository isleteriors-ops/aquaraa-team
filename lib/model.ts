export type Employee = {id:string; name:string; role:string; department:string; email:string; phone:string; startDate:string; endDate:string; status:'Active'|'Inactive'; salaryMvr:number; salaryUsd:number; allowanceMvr:number; allowanceUsd:number; serviceEligible:boolean};
export type Shift = {id:string; employeeId:string; date:string; start:string; end:string; label:string};
export type Attendance = {id:string; employeeId:string; date:string; status:'Present'|'Late'|'Absent'|'Day off'; checkIn:string; checkOut:string; notes:string};
export type Leave = {id:string; employeeId:string; type:string; startDate:string; endDate:string; reason:string; status:'Pending'|'Approved'|'Declined'};
export type Adjustment = {id:string; employeeId:string; period:string; extraMvr:number; extraUsd:number; deductionMvr:number; deductionUsd:number; note:string};
export type ServicePool = {id:string; period:string; mvr:number; usd:number};
export type PayrollRow = {id:string; name:string; department:string; baseMvr:number; baseUsd:number; allowanceMvr:number; allowanceUsd:number; extraMvr:number; extraUsd:number; serviceMvr:number; serviceUsd:number; deductionMvr:number; deductionUsd:number; netMvr:number; netUsd:number};
export type PayrollRun = {id:string; period:string; savedAt:string; rows:PayrollRow[]; totalMvr:number; totalUsd:number};
export type Activity = {id:string; text:string; at:string};
export type Workspace = {employees:Employee[]; shifts:Shift[]; attendance:Attendance[]; leave:Leave[]; adjustments:Adjustment[]; pools:ServicePool[]; payroll:PayrollRun[]; activity:Activity[]};
export const departments=['Front Office','Housekeeping','Food & Beverage','Kitchen','Maintenance','Administration','Security'];
export const blankWorkspace=():Workspace=>({employees:[],shifts:[],attendance:[],leave:[],adjustments:[],pools:[],payroll:[],activity:[]});
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Indian/Maldives',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const uid=()=>crypto.randomUUID();
export const money=(value:number,currency='MVR')=>`${currency} ${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const cents=(value:number)=>Math.round(value*100);
export const round=(value:number)=>cents(value)/100;
export function payrollRows(data:Workspace,period:string):PayrollRow[]{
  const first=period+'-01'; const end=new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7)),0)).toISOString().slice(0,10);
  const staff=data.employees.filter(e=>e.startDate<=end&&(!e.endDate||e.endDate>=first)&&(e.status==='Active'||!!e.endDate)).sort((a,b)=>a.id.localeCompare(b.id));
  const eligible=staff.filter(e=>e.serviceEligible); const pool=data.pools.find(p=>p.period===period);
  const share=(value:number,id:string)=>{const i=eligible.findIndex(e=>e.id===id);if(i<0||!eligible.length)return 0;const total=cents(value);return (Math.floor(total/eligible.length)+(i<total%eligible.length?1:0))/100;};
  return staff.map(e=>{const a=data.adjustments.find(a=>a.employeeId===e.id&&a.period===period);const serviceMvr=share(pool?.mvr||0,e.id),serviceUsd=share(pool?.usd||0,e.id);return {id:e.id,name:e.name,department:e.department,baseMvr:e.salaryMvr,baseUsd:e.salaryUsd,allowanceMvr:e.allowanceMvr,allowanceUsd:e.allowanceUsd,extraMvr:a?.extraMvr||0,extraUsd:a?.extraUsd||0,serviceMvr,serviceUsd,deductionMvr:a?.deductionMvr||0,deductionUsd:a?.deductionUsd||0,netMvr:round(e.salaryMvr+e.allowanceMvr+(a?.extraMvr||0)+serviceMvr-(a?.deductionMvr||0)),netUsd:round(e.salaryUsd+e.allowanceUsd+(a?.extraUsd||0)+serviceUsd-(a?.deductionUsd||0))};});
}
export const total=(rows:PayrollRow[],currency:'Mvr'|'Usd')=>round(rows.reduce((sum,r)=>sum+r[`net${currency}`],0));
export const dateLabel=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export function daySpan(start:string,end:string){return Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;}
export function demoWorkspace():Workspace{
 const d=blankWorkspace(), date=today(), period=date.slice(0,7);
 const people=[['Aisha Hassan','Front Office Manager','Front Office'],['Ibrahim Ali','Guest Relations Officer','Front Office'],['Maryam Ahmed','Housekeeping Supervisor','Housekeeping'],['Mohamed Rasheed','Room Attendant','Housekeeping'],['Sara Ibrahim','Restaurant Supervisor','Food & Beverage'],['Ahmed Nazeer','Executive Chef','Kitchen'],['Fatima Adam','HR Coordinator','Administration'],['Hassan Waheed','Maintenance Technician','Maintenance']];
 d.employees=people.map((p,i)=>({id:'demo-'+i,name:p[0],role:p[1],department:p[2],email:'',phone:'',startDate:'2026-01-01',endDate:'',status:'Active',salaryMvr:6500+i*500,salaryUsd:0,allowanceMvr:750,allowanceUsd:0,serviceEligible:true}));
 d.shifts=d.employees.slice(0,6).map((e,i)=>({id:uid(),employeeId:e.id,date,start:i<4?'07:00':'15:00',end:i<4?'15:00':'23:00',label:i<4?'Morning':'Evening'}));
 d.attendance=d.employees.slice(0,4).map((e,i)=>({id:uid(),employeeId:e.id,date,status:i===2?'Late':'Present',checkIn:i===2?'07:12':'06:58',checkOut:'',notes:''}));
 d.leave=[{id:uid(),employeeId:'demo-3',type:'Annual leave',startDate:date,endDate:date,reason:'Personal appointment',status:'Pending'},{id:uid(),employeeId:'demo-6',type:'Annual leave',startDate:date,endDate:date,reason:'Family commitment',status:'Pending'}];
 d.pools=[{id:uid(),period,mvr:24000,usd:800}];d.activity=[{id:uid(),text:'Sample workspace ready to explore',at:new Date().toISOString()}];return d;
}
