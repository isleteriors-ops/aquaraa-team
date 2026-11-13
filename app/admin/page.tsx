import {WorkspaceScreen} from '../access-screen';
import {requireUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Admin(){await requireUser('/admin');return <WorkspaceScreen/>;}
