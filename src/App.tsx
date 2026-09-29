import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Archive,
  BookOpen,
  ChevronDown,
  Download,
  Grid3X3,
  Heart,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Star,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {
  CollectionFilter,
  collectionColor,
  collectionList,
  DEFAULT_TYPOGRAPHY,
  FONT_OPTIONS,
  Pair,
  Typography,
  TrashBatch,
} from './model';
import {loadPairs, loadTrash, savePairs, saveTrash} from './storage/archive';
import {loadWorkspace, saveWorkspace} from './storage/workspace';
import {downloadPairCss} from './exporter';

export default function App() {
  // --- Local archive (library + trash), its own localStorage keys ---
  const [pairs, setPairs] = useState<Pair[]>(() => loadPairs());
  const [trash, setTrash] = useState<TrashBatch[]>(() => loadTrash());

  // --- Workspace prefs (selection + sidebar filter), a separate key ---
  const [workspace] = useState(() => loadWorkspace(0));
  const [selectedId, setSelectedId] = useState<number>(workspace.selectedId);
  const [filter, setFilter] = useState<CollectionFilter>(workspace.filter);

  const [showAdd, setShowAdd] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [toastBatchId, setToastBatchId] = useState<number | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // The chosen pair may be gone after deletion/restore; fall back gracefully.
  const current = pairs.find((p) => p.id === selectedId) ?? pairs[0] ?? null;
  const currentId = current?.id ?? 0;

  const collections = useMemo(() => collectionList(pairs), [pairs]);
  const favoriteCount = pairs.filter((p) => p.favorite).length;
  const trashCount = trash.reduce((n, b) => n + b.pairs.length, 0);

  const visiblePairs = useMemo(() => {
    if (filter.kind === 'favorites') return pairs.filter((p) => p.favorite);
    if (filter.kind === 'category') return pairs.filter((p) => p.category === filter.category);
    return pairs;
  }, [pairs, filter]);

  // --- Persistence: archive, trash and workspace are stored separately ---
  useEffect(() => savePairs(pairs), [pairs]);
  useEffect(() => saveTrash(trash), [trash]);
  useEffect(() => saveWorkspace({selectedId: currentId, filter}), [currentId, filter]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // Each pairing carries its own typography; edits write into that record,
  // so switching tabs or reopening the page restores its own canvas.
  const updateTypography = (patch: Partial<Typography>) => {
    if (!current) return;
    setPairs((ps) =>
      ps.map((p) =>
        p.id === current.id ? {...p, typography: {...p.typography, ...patch}} : p,
      ),
    );
  };

  // Reset touches the current pair only.
  const resetTypography = () => {
    if (!current) return;
    setPairs((ps) =>
      ps.map((p) => (p.id === current.id ? {...p, typography: {...DEFAULT_TYPOGRAPHY}} : p)),
    );
  };

  // New pairings inherit the canvas currently on screen.
  const create = () => {
    if (!newTitle.trim()) return;
    const id = Date.now();
    const inherited = current ? {...current.typography} : {...DEFAULT_TYPOGRAPHY};
    setPairs((ps) => [
      ...ps,
      {
        id,
        title: newTitle.trim(),
        heading: 'Your new headline',
        body: 'Start with a sentence that lets your type pairing show its character.',
        category: 'Untitled',
        favorite: false,
        typography: inherited,
      },
    ]);
    setSelectedId(id);
    setFilter({kind: 'all'});
    setNewTitle('');
    setShowAdd(false);
  };

  const toggleFav = (id: number) =>
    setPairs((ps) => ps.map((p) => (p.id === id ? {...p, favorite: !p.favorite} : p)));

  // Deletion goes into a timestamped batch; any batch can be restored later.
  const deleteCurrent = () => {
    if (!current) return;
    const batchId = Date.now() + 1;
    const removed = current;
    setTrash((t) => [...t, {id: batchId, deletedAt: Date.now(), pairs: [removed]}]);
    const remaining = pairs.filter((p) => p.id !== removed.id);
    setPairs(remaining);
    setSelectedId(remaining[0]?.id ?? 0);
    setToastBatchId(batchId);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastBatchId(null), 6000);
  };

  const restoreBatch = (batchId: number) => {
    const batch = trash.find((b) => b.id === batchId);
    if (!batch) return;
    const taken = new Set(pairs.map((p) => p.id));
    let freshId = Date.now();
    // If an id was reused since deletion, remap to a free id on restore.
    const restored = batch.pairs.map((p) => {
      if (!taken.has(p.id)) {
        taken.add(p.id);
        return p;
      }
      const remapped = {...p, id: freshId++};
      return remapped;
    });
    setPairs((ps) => [...ps, ...restored]);
    setTrash((t) => t.filter((b) => b.id !== batchId));
    setSelectedId(restored[0]?.id ?? currentId);
    setFilter({kind: 'all'});
    setToastBatchId(null);
  };

  const emptyTrash = () => {
    setTrash([]);
    setShowTrash(false);
  };

  const galleryTitle =
    filter.kind === 'favorites' ? 'Favorites' : filter.kind === 'category' ? filter.category : 'Saved pairings';

  const t = current?.typography;
  const toastBatch = toastBatchId !== null ? trash.find((b) => b.id === toastBatchId) : undefined;

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-mark"><Type size={18} /></div>
          <div><b>Type Pairer</b><small>FIND YOUR VOICE</small></div>
        </div>

        <div className="nav-section">
          <span>LIBRARY</span>
          <button
            className={`nav ${filter.kind === 'all' ? 'active' : ''}`}
            onClick={() => setFilter({kind: 'all'})}
          >
            <Grid3X3 size={16} />All pairings <b>{pairs.length}</b>
          </button>
          <button
            className={`nav ${filter.kind === 'favorites' ? 'active' : ''}`}
            onClick={() => setFilter({kind: 'favorites'})}
          >
            <Heart size={16} />Favorites <b>{favoriteCount}</b>
          </button>
          <button
            className={`nav ${showTrash ? 'active' : ''}`}
            onClick={() => setShowTrash(true)}
          >
            <Archive size={16} />Trash <b>{trashCount}</b>
          </button>
        </div>

        <div className="saved">
          <div className="saved-head">
            <span>COLLECTIONS</span>
            <button onClick={() => setShowAdd(true)} aria-label="New pairing"><Plus size={14} /></button>
          </div>
          {collections.length === 0 && <div className="side-empty">No collections yet</div>}
          {collections.map((c) => (
            <button
              key={c.name}
              className={`collection ${filter.kind === 'category' && filter.category === c.name ? 'active' : ''}`}
              onClick={() => setFilter({kind: 'category', category: c.name})}
            >
              <i style={{background: collectionColor(c.name)}} />
              {c.name} <b>{c.count}</b>
            </button>
          ))}
        </div>

        <div className="aside-foot">
          <button className="nav"><Settings2 size={16} />Preferences</button>
          <div className="profile">
            <div className="avatar">YL</div>
            <div><b>Yuki Lin</b><small>Design workspace</small></div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">TYPE LIBRARY / <b>PAIRING STUDIO</b></div>
            <h1>Find the right conversation.</h1>
            <p>Explore combinations, tune the details, and save what feels like you.</p>
          </div>
          <div className="actions">
            <button className="outline" onClick={() => current && downloadPairCss(current)} disabled={!current}>
              <Download size={15} />Copy CSS
            </button>
            <button className="primary" onClick={() => setShowAdd(true)}><Plus size={16} />New pairing</button>
          </div>
        </header>

        <div className="layout">
          <section className="gallery">
            <div className="gallery-head">
              <div>
                <h2>{galleryTitle}</h2>
                <span>{visiblePairs.length} {visiblePairs.length === 1 ? 'composition' : 'compositions'}</span>
              </div>
              <div className="view-toggle">
                <button className="on"><Grid3X3 size={14} /></button>
                <button><BookOpen size={14} /></button>
              </div>
            </div>
            <div className="pair-list">
              {visiblePairs.length === 0 && (
                <div className="empty-state">
                  {filter.kind === 'favorites'
                    ? 'No favorites yet — tap the heart on a pairing.'
                    : filter.kind === 'category'
                      ? `Nothing in the “${filter.category}” collection.`
                      : 'No pairings here yet.'}
                </div>
              )}
              {visiblePairs.map((p) => (
                <button
                  key={p.id}
                  className={currentId === p.id ? 'pair selected' : 'pair'}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="pair-top">
                    <span>{p.category}</span>
                    <span
                      className="heart-toggle"
                      role="button"
                      aria-label={p.favorite ? 'Unfavorite' : 'Favorite'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(p.id);
                      }}
                    >
                      <Heart size={15} fill={p.favorite ? '#e88769' : 'none'} color={p.favorite ? '#e88769' : '#aeb5b7'} />
                    </span>
                  </div>
                  <strong
                    style={{
                      fontFamily: p.typography.headingFont,
                      fontWeight: p.typography.weight,
                      letterSpacing: `${p.typography.tracking / 2}px`,
                    }}
                  >
                    {p.heading}
                  </strong>
                  <p style={{fontFamily: p.typography.bodyFont, lineHeight: p.typography.leading}}>{p.body}</p>
                  <div className="pair-foot">
                    <span>{p.title}</span>
                    <small>Open canvas →</small>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="studio">
            {current && t ? (
              <>
                <div className="studio-head">
                  <div><span>PAIRING CANVAS</span><h2>{current.title}</h2></div>
                  <button className="favorite" onClick={() => toggleFav(current.id)}>
                    <Star size={16} fill={current.favorite ? '#e5a35e' : 'none'} color={current.favorite ? '#e5a35e' : '#98a4a7'} />
                  </button>
                </div>
                <div className="canvas">
                  <div className="canvas-bar">
                    <span>PREVIEW</span>
                    <div><button>Desktop</button><button>Tablet</button><button>Mobile</button></div>
                  </div>
                  <div className="preview">
                    <span className="preview-kicker">A NOTE ON TYPE</span>
                    <h3
                      style={{
                        fontFamily: t.headingFont,
                        fontSize: `${t.size}px`,
                        fontWeight: t.weight,
                        letterSpacing: `${t.tracking}px`,
                        lineHeight: 1.05,
                      }}
                    >
                      {current.heading}
                    </h3>
                    <p
                      style={{
                        fontFamily: t.bodyFont,
                        lineHeight: t.leading,
                        letterSpacing: `${t.tracking / 2}px`,
                      }}
                    >
                      {current.body}
                    </p>
                    <div className="preview-rule" />
                    <span className="preview-meta">
                      N° {String(pairs.findIndex((p) => p.id === current.id) + 1).padStart(2, '0')} · {current.category.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="controls">
                  <div className="control-head">
                    <div><span>TYPE CONTROLS</span><h3>Fine tune this pairing</h3></div>
                    <div className="control-actions">
                      <SlidersHorizontal size={17} />
                      <button className="reset-btn" onClick={resetTypography} title="Reset this pairing to defaults">
                        <RotateCcw size={12} />Reset
                      </button>
                    </div>
                  </div>
                  <div className="font-row">
                    <label>
                      Heading font
                      <select value={t.headingFont} onChange={(e) => updateTypography({headingFont: e.target.value})}>
                        {FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </label>
                    <label>
                      Body font
                      <select value={t.bodyFont} onChange={(e) => updateTypography({bodyFont: e.target.value})}>
                        {FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="range-row">
                    <label>Size <b>{t.size}px</b>
                      <input type="range" min="28" max="76" value={t.size}
                        onChange={(e) => updateTypography({size: Number(e.target.value)})} />
                    </label>
                    <label>Weight <b>{t.weight}</b>
                      <input type="range" min="300" max="800" step="100" value={t.weight}
                        onChange={(e) => updateTypography({weight: Number(e.target.value)})} />
                    </label>
                  </div>
                  <div className="range-row">
                    <label>Line height <b>{t.leading.toFixed(2)}</b>
                      <input type="range" min="1" max="1.8" step=".05" value={t.leading}
                        onChange={(e) => updateTypography({leading: Number(e.target.value)})} />
                    </label>
                    <label>Letter spacing <b>{t.tracking}px</b>
                      <input type="range" min="-1" max="3" step=".5" value={t.tracking}
                        onChange={(e) => updateTypography({tracking: Number(e.target.value)})} />
                    </label>
                  </div>
                </div>
                <div className="studio-foot">
                  <button className="delete" onClick={deleteCurrent}><Trash2 size={15} />Delete pairing</button>
                  <span className="save"><span className="check">✓</span>Saved locally</span>
                </div>
              </>
            ) : (
              <div className="studio-empty">
                <Type size={26} />
                <h2>No pairing selected</h2>
                <p>Create a new pairing to start tuning type.</p>
                <button className="primary" onClick={() => setShowAdd(true)}><Plus size={16} />New pairing</button>
              </div>
            )}
          </section>
        </div>
      </main>

      {showAdd && (
        <div className="backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New pairing</h2>
            <label>
              Pairing name
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Quiet confidence"
                onKeyDown={(e) => e.key === 'Enter' && create()} />
            </label>
            <p className="modal-hint">Starts with the fonts and spacing currently on the canvas.</p>
            <div className="modal-actions">
              <button className="outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="primary" onClick={create}>Create pairing</button>
            </div>
          </div>
        </div>
      )}

      {showTrash && (
        <div className="backdrop" onClick={() => setShowTrash(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h2>Trash</h2>
              <button className="icon-btn" onClick={() => setShowTrash(false)} aria-label="Close"><X size={16} /></button>
            </div>
            {trash.length === 0 ? (
              <p className="modal-hint">Deleted pairings land here and can be restored batch by batch.</p>
            ) : (
              <>
                <div className="trash-list">
                  {trash
                    .slice()
                    .sort((a, b) => b.deletedAt - a.deletedAt)
                    .map((b) => (
                      <div key={b.id} className="trash-row">
                        <div>
                          <b>{b.pairs.length === 1 ? b.pairs[0].title : `${b.pairs.length} pairings`}</b>
                          <small>
                            Deleted {new Date(b.deletedAt).toLocaleString()} ·{' '}
                            {b.pairs.map((p) => p.title).join(', ')}
                          </small>
                        </div>
                        <button className="outline" onClick={() => restoreBatch(b.id)}>
                          <RotateCcw size={13} />Restore
                        </button>
                      </div>
                    ))}
                </div>
                <div className="modal-actions">
                  <button className="delete" onClick={emptyTrash}><Trash2 size={15} />Empty trash</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toastBatch && (
        <div className="toast">
          <span>{toastBatch.pairs.length === 1 ? '“' + toastBatch.pairs[0].title + '” moved to trash' : 'Pairing moved to trash'}</span>
          <button onClick={() => restoreBatch(toastBatch.id)}><RotateCcw size={13} />Undo</button>
        </div>
      )}
    </div>
  );
}
