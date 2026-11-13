import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Aquaraa · Team',description:'A thoughtful workspace for the people behind Aquaraa.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
