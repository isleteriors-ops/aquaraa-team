import {type Workspace,round} from './model';
export type Access={role:'owner'|'manager'|'staff';ownerId:string;employeeId:string|null};
export class AccessError extends Error{status:number;constructor(message='Your account is not registered for Aquaraa. Please contact your administrator.',status=403){super(message);this.status=status;}}
export function visibleWorkspace(data:Workspace,access:Access):Workspace{
 if(access.role!=='staff')return data;const id=access.employeeId;
 return {employees:data.employees.filter(e=>e.id===id),shifts:data.shifts.filter(e=>e.employeeId===id),attendance:data.attendance.filter(e=>e.employeeId===id),leave:data.leave.filter(e=>e.employeeId===id),adjustments:[],pools:[],activity:[],payroll:data.payroll.filter(run=>run.rows.some(row=>row.id===id)).map(run=>{const rows=run.rows.filter(row=>row.id===id);return {...run,rows,totalMvr:round(rows.reduce((n,r)=>n+r.netMvr,0)),totalUsd:round(rows.reduce((n,r)=>n+r.netUsd,0))};})};
}
export function authorizeCommand(access:Access,cmd:any,data:Workspace){
 if(access.role!=='staff')return;
 if(cmd.collection!=='leave'||!['save','delete'].includes(cmd.action))throw new AccessError('Staff accounts can only create, edit or cancel their own pending leave requests.');
 const id=cmd.action==='save'?cmd.item?.id:cmd.id,existing=data.leave.find(l=>l.id===id);
 if(existing&&(existing.employeeId!==access.employeeId||existing.status!=='Pending'))throw new AccessError('Only your own pending leave requests can be changed.');
 if(cmd.action==='save'&&cmd.item?.employeeId!==access.employeeId)throw new AccessError('You can only request leave for yourself.');
 if(cmd.action==='delete'&&!existing)throw new AccessError('Leave request not found.');
}
