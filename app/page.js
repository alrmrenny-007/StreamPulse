'use client';
import { useEffect, useState } from 'react';

const IA = 'https://archive.org';
const TM = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w342';
const KEY = process.env.NEXT_PUBLIC_TMDB_KEY;

const strip = (s) =>
  String(Array.isArray(s) ? s[0] : s || '').replace(/<[^>]*>/g, ' ');

export default function Home() {
  const [tab, setTab] = useState('new');
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(null);

  const [movie, setMovie] = useState(null);
  const [freeMatch, setFreeMatch] = useState(null);
  const [info, setInfo] = useState(null);
  const [src, setSrc] = useState(null);
  const [embed, setEmbed] = useState(false);

  async function load(t, query) {
    setLoading(true);
    setError('');
    setList([]);
    try {
      if (t === 'new') {
        if (!KEY) {
          setError('Add NEXT_PUBLIC_TMDB_KEY in Vercel, then redeploy.');
          setLoading(false);
          return;
        }
        const url = query.trim()
          ? `${TM}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query.trim())}`
          : `${TM}/trending/movie/week?api_key=${KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        setList(data.results || []);
      } else {
        let qs = 'collection:feature_films AND mediatype:movies';
        if (query.trim()) qs += ` AND title:(${query.trim()})`;
        const url =
          `${IA}/advancedsearch.php?q=${encodeURIComponent(qs)}` +
          `&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=40&output=json`;
        const res = await fetch(url);
        const data = await res.json();
        setList(data.response.docs || []);
      }
    } catch (e) {
      setError('Could not load films. Try again.');
    }
    setLoading(false);
  }

  function readRoute() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tmdb')) setRoute({ type: 'tmdb', id: p.get('tmdb') });
    else if (p.get('id')) setRoute({ type: 'ia', id: p.get('id') });
    else setRoute(null);
  }

  function go(type, id) {
    const key = type === 'tmdb' ? 'tmdb' : 'id';
    window.history.pushState({}, '', `?${key}=${encodeURIComponent(id)}`);
    setRoute({ type, id: String(id) });
    window.scrollTo(0, 0);
  }

  function home() {
    window.history.pushState({}, '', window.location.pathname);
    setRoute(null);
  }

  function switchTab(t) {
    setTab(t);
    setQ('');
    if (route) home();
    load(t, '');
  }

  useEffect(() => {
    readRoute();
    window.addEventListener('popstate', readRoute);
    load('new', '');
    return () => window.removeEventListener('popstate', readRoute);
  }, []);

  useEffect(() => {
    if (!route) return;
    setMovie(null);
    setFreeMatch(null);
    setInfo(null);
    setSrc(null);
    setEmbed(false);
    setError('');

    if (route.type === 'tmdb') {
      fetch(
        `${TM}/movie/${route.id}?api_key=${KEY}&append_to_response=videos,watch/providers`
      )
        .then((r) => r.json())
        .then((d) => {
          setMovie(d);
          const title = String(d.title || '').replace(/["()]/g, ' ').trim();
          if (!title) return;
          const qs = `title:(${title}) AND mediatype:movies AND collection:feature_films`;
          fetch(
            `${IA}/advancedsearch.php?q=${encodeURIComponent(qs)}&fl[]=identifier&fl[]=title&rows=1&output=json`
          )
            .then((r) => r.json())
            .then((x) => setFreeMatch((x.response.docs || [])[0] || null))
            .catch(() => {});
        })
        .catch(() => setError('Could not load this film.'));
    } else {
      fetch(`${IA}/metadata/${encodeURIComponent(route.id)}`)
        .then((r) => r.json())
        .then((d) => {
          setInfo(d.metadata || {});
          const files = (d.files || []).filter((f) =>
            f.name.toLowerCase().endsWith('.mp4')
          );
          const good = files.find((f) => f.format === 'h.264') || files[0];
          if (good) {
            setSrc(
              `${IA}/download/${encodeURIComponent(route.id)}/${encodeURIComponent(good.name)}`
            );
          } else {
            setEmbed(true);
          }
        })
        .catch(() => setError('Could not load this film.'));
    }
  }, [route]);

  function region() {
    try {
      const r = (navigator.language || '').split('-')[1];
      return (r || 'US').toUpperCase();
    } catch (e) {
      return 'US';
    }
  }

  function renderTmdb() {
    if (error) return <p className="msg">{error}</p>;
    if (!movie) return <p className="msg">Loading...</p>;
    const trailer = (movie.videos?.results || []).find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );
    const prov = movie['watch/providers']?.results || {};
    const reg = prov[region()] || prov.US || null;
    const names = (arr) => (arr || []).map((p) => p.provider_name).join(', ');
    return (
      <>
        {trailer ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}`}
            allowFullScreen
          />
        ) : movie.poster_path ? (
          <img className="poster" src={IMG + movie.poster_path} alt={movie.title} />
        ) : null}
        <h2>{movie.title}</h2>
        <small>
          {(movie.release_date || '').slice(0, 4)}
          {movie.vote_average ? ` · ★ ${movie.vote_average.toFixed(1)}` : ''}
          {movie.runtime ? ` · ${movie.runtime} min` : ''}
        </small>
        <p className="desc">{movie.overview}</p>

        {freeMatch && (
          <div className="row">
            <button onClick={() => go('ia', freeMatch.identifier)}>
              Watch free on Archive
            </button>
          </div>
        )}

        <div className="providers">
          <h3>Where to watch</h3>
          {reg ? (
            <>
              {reg.flatrate && <p>Stream: {names(reg.flatrate)}</p>}
              {reg.rent && <p>Rent: {names(reg.rent)}</p>}
              {reg.buy && <p>Buy: {names(reg.buy)}</p>}
              {reg.link && (
                <div className="row">
                  <a href={reg.link} target="_blank" rel="noreferrer">
                    <button className="alt">See all options</button>
                  </a>
                </div>
              )}
            </>
          ) : (
            <p>No streaming info for your region yet.</p>
          )}
        </div>
      </>
    );
  }

  function renderIa() {
    return (
      <>
        {error && <p className="msg">{error}</p>}
        {embed ? (
          <iframe
            src={`${IA}/embed/${encodeURIComponent(route.id)}`}
            allowFullScreen
          />
        ) : src ? (
          <video
            src={src}
            controls
            playsInline
            poster={`${IA}/services/img/${route.id}`}
            onError={() => setEmbed(true)}
          />
        ) : (
          !error && <p className="msg">Loading...</p>
        )}
        {info && (
          <>
            <h2>{strip(info.title)}</h2>
            <small>{strip(info.year || info.date)}</small>
            <p className="desc">{strip(info.description).slice(0, 800)}</p>
          </>
        )}
        {!embed && src && (
          <div className="row">
            <button className="alt" onClick={() => setEmbed(true)}>
              Use backup player
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <header>
        <h1 onClick={() => switchTab('new')}>STREAMPULSE</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (route) home();
            load(tab, q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search films..."
          />
          <button type="submit">Go</button>
        </form>
      </header>

      <div className="tabs">
        <button
          className={tab === 'new' ? 'tab on' : 'tab'}
          onClick={() => switchTab('new')}
        >
          New &amp; Trending
        </button>
        <button
          className={tab === 'free' ? 'tab on' : 'tab'}
          onClick={() => switchTab('free')}
        >
          Free to Watch
        </button>
      </div>

      {route ? (
        <div className="watch">
          {route.type === 'tmdb' ? renderTmdb() : renderIa()}
          <div className="row">
            <button className="alt" onClick={home}>Back</button>
          </div>
        </div>
      ) : (
        <>
          {loading && <p className="msg">Loading...</p>}
          {error && <p className="msg">{error}</p>}
          {!loading && !error && list.length === 0 && (
            <p className="msg">No films found.</p>
          )}
          <div className="grid">
            {tab === 'new'
              ? list.map((m) => (
                  <div className="card" key={m.id} onClick={() => go('tmdb', m.id)}>
                    {m.poster_path ? (
                      <img src={IMG + m.poster_path} alt={m.title} loading="lazy" />
                    ) : (
                      <div className="noimg" />
                    )}
                    <p>
                      {m.title}
                      <small>{(m.release_date || '').slice(0, 4)}</small>
                    </p>
                  </div>
                ))
              : list.map((m) => (
                  <div
                    className="card"
                    key={m.identifier}
                    onClick={() => go('ia', m.identifier)}
                  >
                    <img
                      src={`${IA}/services/img/${m.identifier}`}
                      alt={m.title}
                      loading="lazy"
                    />
                    <p>
                      {m.title}
                      {m.year && <small>{m.year}</small>}
                    </p>
                  </div>
                ))}
          </div>
        </>
      )}
    </>
  );
}
