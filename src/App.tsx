import { useEffect } from "react";
import { usePath, navigate, onLink } from "@tinymachines/kit/lib/router";
import { useAccount } from "@tinymachines/kit/lib/account";
import { describe } from "@tinymachines/kit/lib/seo";
import { applyHead } from "@tinymachines/kit/lib/head";
import { SiteHeader } from "@tinymachines/kit/components/SiteHeader";
import { SiteFooter } from "@tinymachines/kit/components/SiteFooter";
import { UpdateBar } from "@tinymachines/kit/components/UpdateBar";
import { SharePanel } from "@tinymachines/kit/components/SharePanel";
import ThemePage from "@tinymachines/kit/pages/ThemePage";
import SensorsPage from "@tinymachines/kit/pages/SensorsPage";
import SharePage from "@tinymachines/kit/pages/SharePage";
import AppPage from "@tinymachines/kit/pages/AppPage";
import Account from "@tinymachines/kit/pages/Account";
import { app } from "@tinymachines/kit/app";

function Home() {
  return (
    <article>
      <p className="kicker">{app().name} · <b>home</b></p>
      <h1>{app().name}</h1>
      <p className="lede">{app().tagline}</p>
      <p className="controls">
        <a className="btn" href="/theme" onClick={onLink}>Themes</a>
        <a className="btn quiet" href="/sensors" onClick={onLink}>Sensors</a>
        <a className="btn quiet" href="/app" onClick={onLink}>This app</a>
      </p>
    </article>
  );
}

function NotHere({ path }: { path: string }) {
  return <article><h1>Not here</h1><p>There is no page at {path}.</p><p><a href="/" onClick={onLink}>Home</a></p></article>;
}

export function App() {
  const path = usePath();
  const load = useAccount((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (path === "/open") navigate("/", { replace: true }); }, [path]);
  useEffect(() => { applyHead(describe(location.pathname, location.search)); }, [path]);
  let page: React.ReactNode;
  if (path === "/") page = <Home />;
  else if (path === "/theme") page = <ThemePage />;
  else if (path === "/sensors") page = <SensorsPage />;
  else if (path === "/share") page = <SharePage />;
  else if (path === "/app") page = <AppPage />;
  else if (path === "/account") page = <Account />;
  else page = <NotHere path={path} />;
  return (
    <>
      <SiteHeader path={path} />
      <UpdateBar />
      <main>{page}</main>
      <SiteFooter path={path} />
      <SharePanel />
    </>
  );
}
