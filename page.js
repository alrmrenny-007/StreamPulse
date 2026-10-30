'use client';
import { useEffect, useState } from 'react';

const IA = 'https://archive.org';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [id, setId] = useState(null);
  const [info, setInfo] = useState(null);
  const [src, setSrc] = useState(null);
  const [embed, setEmbed] = useState(false);

  async function search(query) {
    setLoading(true);
    setError('');
    try {
      let qs = 'collection:feature_films AND mediatype:movies';
      if (query.trim()) qs += ` AND title:(${query.trim()})`;
      const url =
        `${IA}/advancedsearch.php?q=${encodeURIComponent(qs)}` +
        `&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=40&output=json`;
      const res = await fetch(url);
      const data = await res.json();
      setMovies(data.response.docs || []);
    } catch (e) {
      setError('Could not load films. Try again.');
    }
    setLoading(false);
  }

  function open(newId) {
    window.history.pushState({}, '', `?id=${encodeURIComponent(newId)}`);
    setId(newId);
    window.scrollTo(0, 0);
  }

  function home() {
    window.history.pushState({}, '', window.location.pathname);
    setId(null);
  }

  useEffect(() => {
    const read = () => setId(new URLSearchParams(window.location.search).get('id'));
    read();
    window.addEventListener('popstate', read);
    search('');
    return () => window.removeEventListener('popstate', read);
  }, []);

  useEffect(() => {
    if (!id) return;
    setInfo(null);
    setSrc(null);
    setEmbed(false);
    setError('');
    fetch(`${IA}/metadata/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        setInfo(d.metadata || {});
        const files = (d.files || []).filter((f) => f.name.toLowerCase().endsWith('.mp4'));
        const good = files.find((f) => f.format === 'h.264') || files[0];
        if (good) {
          setSrc(`${IA}/download/${encodeURIComponent(id)}/${encodeURIComponent(good.name)}`);
        } else {
          setEmbed(true);
        }
      })
      .catch(() => setError('Could not load this film.'));
  }, [id]);

  const strip = (s) =>
    String(Array.isArray(s) ? s[0] : s || '').replace(/<[^>]*>/g, ' ');

  return (
    <>
      <header>
        <h1 onClick={home}>FILM ARCHIVE</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (id) home();
            search(q);
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

      {id ? (
        <div className="watch">
          {error && <p className="msg">{error}</p>}
          {embed ? (
            <iframe
              src={`${IA}/embed/${encodeURIComponent(id)}`}
              allowFullScreen
            />
          ) : src ? (
            <video
              src={src}
              controls
              playsInline
              poster={`${IA}/services/img/${id}`}
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
          <div className="row">
            <button className="alt" onClick={home}>Back</button>
            {!embed && src && (
              <button className="alt" onClick={() => setEmbed(true)}>
                Use backup player
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {loading && <p className="msg">Loading...</p>}
          {error && <p className="msg">{error}</p>}
          {!loading && !error && movies.length === 0 && (
            <p className="msg">No films found.</p>
          )}
          <div className="grid">
            {movies.map((m) => (
              <div className="card" key={m.identifier} onClick={() => open(m.identifier)}>
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
