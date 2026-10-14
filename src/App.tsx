import { useEffect } from "react";
import { usePath, navigate } from "@tinymachines/kit/lib/router";
import { useAccount } from "@tinymachines/kit/lib/account";
import { describe } from "@tinymachines/kit/lib/seo";
import { applyHead } from "@tinymachines/kit/lib/head";
import { SiteHeader } from "@tinymachines/kit/components/SiteHeader";
import { SiteFooter } from "@tinymachines/kit/components/SiteFooter";
import { UpdateBar } from "@tinymachines/kit/components/UpdateBar";
import { SharePanel } from "@tinymachines/kit/components/SharePanel";
import ThemePage from "@tinymachines/kit/pages/ThemePage";
import SharePage from "@tinymachines/kit/pages/SharePage";
import AppPage from "@tinymachines/kit/pages/AppPage";
import Account from "@tinymachines/kit/pages/Account";
import Home from "./pages/Home";
import Instrument from "./pages/Instrument";
import Space from "./pages/Space";
import Play from "./pages/Play";
import Dice from "./pages/play/Dice";
import Coins from "./pages/play/Coins";
import Cards from "./pages/play/Cards";
import Pick from "./pages/play/Pick";
import Lottery from "./pages/play/Lottery";
import Password from "./pages/play/Password";
import Reference from "./pages/Reference";
import NotHere from "./pages/NotHere";

export function App() {
  const path = usePath();
  const load = useAccount((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (path === "/open") navigate("/", { replace: true }); }, [path]);
  useEffect(() => { applyHead(describe(location.pathname, location.search)); }, [path]);
  let page: React.ReactNode;
  if (path === "/") page = <Home />;
  else if (path === "/instrument") page = <Instrument />;
  else if (path === "/space") page = <Space />;
  else if (path === "/play") page = <Play />;
  else if (path === "/play/dice") page = <Dice />;
  else if (path === "/play/coins") page = <Coins />;
  else if (path === "/play/cards") page = <Cards />;
  else if (path === "/play/pick") page = <Pick />;
  else if (path === "/play/lottery") page = <Lottery />;
  else if (path === "/play/password") page = <Password />;
  else if (path === "/api") page = <Reference />;
  else if (path === "/theme") page = <ThemePage />;
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
