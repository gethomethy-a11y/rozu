import { RozuApp } from '@/components/RozuApp';

/* Server component. RozuApp is a client component, but Next.js server-renders
   client components on first request — the landing markup ships in the HTML
   payload, not as a blank div waiting on hydration. */
export default function Page() {
  return <RozuApp />;
}
