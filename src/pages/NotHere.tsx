import { onLink } from "@tinymachines/kit/lib/router";

export default function NotHere({ path }: { path: string }) {
  return (
    <article>
      <p className="kicker">hotbits · <b>not here</b></p>
      <h1>Not here</h1>
      <p className="lede">There is no page at {path}.</p>
      <p className="controls"><a className="btn" href="/" onClick={onLink}>Home</a><a className="btn quiet" href="/instrument" onClick={onLink}>The instrument</a><a className="btn quiet" href="/play" onClick={onLink}>Play</a></p>
    </article>
  );
}
