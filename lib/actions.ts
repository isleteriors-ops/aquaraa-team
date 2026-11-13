import {blankWorkspace,payrollRows,total,uid,type Workspace,type Shift} from './model';
import {commandSchema,schemas,type Collection} from './validation';
export class InputError extends Error{}
function interval(s:Shift){const start=Date.parse(`${s.date}T${s.start}:00Z`);let end=Date.parse(`${s.date}T${s.end}:00Z`);if(end<start)end+=86400000;return [start,end];}
function overlapsLeave(s:Shift,l:{startDate:string;endDate:string}){const [start,end]=interval(s);return start<Date.parse(l.endDate+'T00:00:00Z')+86400000&&end>Date.parse(l.startDate+'T00:00:00Z');}
export function applyCommand(current:Workspace,raw:unknown):Workspace{
 const cmd=commandSchema.parse(raw),d:Workspace=structuredClone(current||blankWorkspace());let label='Workspace updated';
 if(cmd.action==='save'){
  if(!cmd.collection)throw new InputError('Choose a record type');const collection=cmd.collection as Collection;
  const item=schemas[collection].parse(cmd.item) as any;
  if('employeeId' in item){const employee=d.employees.find(e=>e.id===item.employeeId);if(!employee)throw new InputError('Employee no longer exists');}
  const list=d[collection] as any[];const existing=list.find(e=>e.id===item.id);if(collection==='leave')item.status=existing?.status||'Pending';if(list.length>=3000&&!list.some(e=>e.id===item.id))throw new InputError('Record limit reached. Export your records before adding more.');
  if(collection==='shifts'){
    const [start,end]=interval(item);if(d.shifts.some(s=>s.id!==item.id&&s.employeeId===item.employeeId&&interval(s)[0]<end&&interval(s)[1]>start))throw new InputError('This employee already has an overlapping shift');
    if(d.leave.some(l=>l.employeeId===item.employeeId&&l.status==='Approved'&&overlapsLeave(item,l)))throw new InputError('This employee has approved leave on this date');
  }
  if(collection==='attendance'&&d.attendance.some(a=>a.id!==item.id&&a.employeeId===item.employeeId&&a.date===item.date))throw new InputError('An attendance record already exists for this employee and date. Edit it instead.');
  if(collection==='leave'&&item.status!=='Declined'&&d.leave.some(l=>l.id!==item.id&&l.employeeId===item.employeeId&&l.status!=='Declined'&&l.startDate<=item.endDate&&l.endDate>=item.startDate))throw new InputError('This employee has an overlapping leave request');
  if(collection==='leave'&&item.status==='Approved'&&d.shifts.some(s=>s.employeeId===item.employeeId&&overlapsLeave(s,item)))throw new InputError('Approved leave overlaps an assigned shift. Remove or reassign that shift first.');
  if(collection==='pools'&&d.pools.some(p=>p.id!==item.id&&p.period===item.period))throw new InputError('A pool already exists for this month. Refresh and edit it.');
  if(collection==='adjustments'&&d.adjustments.some(a=>a.id!==item.id&&a.employeeId===item.employeeId&&a.period===item.period))throw new InputError('An adjustment already exists for this employee this month. Edit it instead.');
  const i=list.findIndex(e=>e.id===item.id);if(collection==='leave')item.status=i<0?'Pending':list[i].status;
  if(i<0)list.push(item);else list[i]=item;label=collection==='employees'?`${i<0?'Added':'Updated'} ${item.name}`:`${i<0?'Added':'Updated'} ${({shifts:'shift',attendance:'attendance record',leave:'leave request',adjustments:'payroll adjustment',pools:'service-charge pool'} as any)[collection]}`;
 }else if(cmd.action==='delete'){
  if(!cmd.collection||!cmd.id||!['shifts','attendance','leave','adjustments'].includes(cmd.collection))throw new InputError('This record cannot be deleted');
  const list=d[cmd.collection] as any[];const index=list.findIndex(e=>e.id===cmd.id);if(index<0)throw new InputError('Record not found');list.splice(index,1);label='Removed '+cmd.collection+' record';
 }else if(cmd.action==='leave-status'){
  const item=d.leave.find(l=>l.id===cmd.id);if(!item||!cmd.status)throw new InputError('Leave request not found');
  if(item.status!=='Pending')throw new InputError('This leave request has already been reviewed');
  if(cmd.status==='Approved'&&d.shifts.some(s=>s.employeeId===item.employeeId&&overlapsLeave(s,item)))throw new InputError('Remove or reassign this employee’s shifts during the leave dates before approving.');
  item.status=cmd.status;label=cmd.status+' leave request';
 }else if(cmd.action==='payroll'){
  if(!cmd.period)throw new InputError('Choose a payroll month');const rows=payrollRows(d,cmd.period);
  const pool=d.pools.find(p=>p.period===cmd.period);if((pool?.mvr||pool?.usd)&&!rows.some(r=>d.employees.find(e=>e.id===r.id)?.serviceEligible))throw new InputError('The service-charge pool has no eligible employees. Update eligibility or clear the pool first.');
  if(!rows.length)throw new InputError('Add an employee employed during this month first');
  if(rows.some(r=>r.netMvr<0||r.netUsd<0))throw new InputError('Deductions exceed earnings. Correct negative net pay before saving.');
  if(d.payroll.length>=120)throw new InputError('Payroll snapshot limit reached');
  d.payroll.unshift({id:uid(),period:cmd.period,savedAt:new Date().toISOString(),rows,totalMvr:total(rows,'Mvr'),totalUsd:total(rows,'Usd')});label='Saved payroll snapshot for '+cmd.period;
 }
 d.activity.unshift({id:uid(),text:label,at:new Date().toISOString()});d.activity=d.activity.slice(0,100);return d;
}
