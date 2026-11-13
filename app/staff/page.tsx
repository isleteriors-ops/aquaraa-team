import {WorkspaceScreen} from '../access-screen';
import {requireUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Staff(){await requireUser('/staff');return <WorkspaceScreen/>;}
