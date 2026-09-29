import { useState } from 'react';
import {
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
  Undo2,
} from 'lucide-react';
import { FONTS, PARAM_LIMITS } from './model/types';
import { usePairStudio } from './workspace/usePairStudio';
import { exportPairCss } from './export/css';

const COLLECTION_COLORS: Record<string, string> = {
  Editorial: '#e8b7a0',
  Portfolio: '#9fc9be',
  Brand: '#b4add8',
};
const FALLBACK_COLORS = ['#c7b37e', '#8fb0c4', '#c98f9b', '#97b98f'];

const collectionColor = (name: string) =>
  COLLECTION_COLORS[name] ??
  FALLBACK_COLORS[
    [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % FALLBACK_COLORS.length
  ];

export default function App() {
  const studio = usePairStudio();
  const {
    pairs,
    current,
    filter,
    setFilter,
    visiblePairs,
    favoriteCount,
    collections,
    selectedId,
    setSelectedId,
    updateParams,
    resetCurrentParams,
    createPair,
    removePair,
    toggleFavorite,
    deletedBatches,
    activeBatch,
    undoLastDelete,
  } = studio;

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const submitCreate = () => {
    if (!newTitle.trim()) return;
    createPair(newTitle);
    setNewTitle('');
    setShowAdd(false);
  };

  const ordinal = (id: number) =>
    String(Math.max(1, pairs.findIndex((p) => p.id === id) + 1)).padStart(2, '0');

  const galleryLabel =
    filter.kind === 'favorites'
      ? `${visiblePairs.length} favorite${visiblePairs.length === 1 ? '' : 's'}`
      : filter.kind === 'category'
        ? `${visiblePairs.length} in ${filter.category}`
        : `${visiblePairs.length} composition${visiblePairs.length === 1 ? '' : 's'}`;

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-mark">
            <Type size={18} />
          </div>
          <div>
            <b>Type Pairer</b>
            <small>FIND YOUR VOICE</small>
          </div>
        </div>

        <div className="nav-section">
          <span>LIBRARY</span>
          <button
            className={filter.kind === 'all' ? 'nav active' : 'nav'}
            onClick={() => setFilter({ kind: 'all' })}
          >
            <Grid3X3 size={16} />
            All pairings <b>{pairs.length}</b>
          </button>
          <button
            className={filter.kind === 'favorites' ? 'nav active' : 'nav'}
            onClick={() => setFilter({ kind: 'favorites' })}
          >
            <Heart size={16} />
            Favorites <b>{favoriteCount}</b>
          </button>
        </div>

        <div className="saved">
          <div className="saved-head">
            <span>COLLECTIONS</span>
            <button onClick={() => setShowAdd(true)} title="New pairing">
              <Plus size={14} />
            </button>
          </div>
          {collections.length === 0 && <div className="side-empty">No collections yet</div>}
          {collections.map(({ category, count }) => (
            <button
              key={category}
              className={
                filter.kind === 'category' && filter.category === category
                  ? 'collection active'
                  : 'collection'
              }
              onClick={() => setFilter({ kind: 'category', category })}
            >
              <i style={{ background: collectionColor(category) }} />
              {category} <b>{count}</b>
            </button>
          ))}
        </div>

        <div className="aside-foot">
          <button className="nav">
            <Settings2 size={16} />
            Preferences
          </button>
          <div className="profile">
            <div className="avatar">YL</div>
            <div>
              <b>Yuki Lin</b>
              <small>Design workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">
              TYPE LIBRARY / <b>PAIRING STUDIO</b>
            </div>
            <h1>Find the right conversation.</h1>
            <p>Explore combinations, tune the details, and save what feels like you.</p>
          </div>
          <div className="actions">
            <button
              className="outline"
              onClick={() => current && exportPairCss(current)}
              disabled={!current}
            >
              <Download size={15} />
              Copy CSS
            </button>
            <button className="primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              New pairing
            </button>
          </div>
        </header>

        <div className="layout">
          <section className="gallery">
            <div className="gallery-head">
              <div>
                <h2>Saved pairings</h2>
                <span>{galleryLabel}</span>
              </div>
              <div className="view-toggle">
                <button className="on">
                  <Grid3X3 size={14} />
                </button>
                <button>
                  <BookOpen size={14} />
                </button>
              </div>
            </div>
            <div className="pair-list">
              {visiblePairs.map((p) => (
                <article
                  key={p.id}
                  className={selectedId === p.id ? 'pair selected' : 'pair'}
                  onClick={() => setSelectedId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(p.id);
                    }
                  }}
                >
                  <div className="pair-top">
                    <span>{p.category}</span>
                    <button
                      className="fav-mini"
                      title={p.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(p.id);
                      }}
                    >
                      <Heart
                        size={15}
                        fill={p.favorite ? '#e88769' : 'none'}
                        color={p.favorite ? '#e88769' : '#aeb5b7'}
                      />
                    </button>
                  </div>
                  <strong
                    style={{
                      fontFamily: p.params.headingFont,
                      fontWeight: p.params.weight,
                      letterSpacing: `${p.params.tracking}px`,
                    }}
                  >
                    {p.heading}
                  </strong>
                  <p style={{ fontFamily: p.params.bodyFont }}>{p.body}</p>
                  <div className="pair-foot">
                    <span>{p.title}</span>
                    <small>Open canvas →</small>
                  </div>
                </article>
              ))}
              {visiblePairs.length === 0 && (
                <div className="empty">
                  <Heart size={18} />
                  <p>
                    {filter.kind === 'category'
                      ? `Nothing in “${filter.category}” yet.`
                      : 'No favorite pairings yet.'}
                  </p>
                  <button className="outline" onClick={() => setFilter({ kind: 'all' })}>
                    Show all pairings
                  </button>
                </div>
              )}
            </div>
          </section>

          {current ? (
            <section className="studio">
              <div className="studio-head">
                <div>
                  <span>PAIRING CANVAS</span>
                  <h2>{current.title}</h2>
                </div>
                <button
                  className="favorite"
                  onClick={() => toggleFavorite(current.id)}
                  title={current.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    size={16}
                    fill={current.favorite ? '#e5a35e' : 'none'}
                    color={current.favorite ? '#e5a35e' : '#98a4a7'}
                  />
                </button>
              </div>

              <div className="canvas">
                <div className="canvas-bar">
                  <span>PREVIEW</span>
                  <div>
                    <button>Desktop</button>
                    <button>Tablet</button>
                    <button>Mobile</button>
                  </div>
                </div>
                <div className="preview">
                  <span className="preview-kicker">A NOTE ON TYPE</span>
                  <h3
                    style={{
                      fontFamily: current.params.headingFont,
                      fontSize: `${current.params.size}px`,
                      fontWeight: current.params.weight,
                      letterSpacing: `${current.params.tracking}px`,
                      lineHeight: 1.05,
                    }}
                  >
                    {current.heading}
                  </h3>
                  <p
                    style={{
                      fontFamily: current.params.bodyFont,
                      lineHeight: current.params.leading,
                      letterSpacing: `${current.params.tracking / 2}px`,
                    }}
                  >
                    {current.body}
                  </p>
                  <div className="preview-rule" />
                  <span className="preview-meta">
                    PAIRING {ordinal(current.id)} · {current.category.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="controls">
                <div className="control-head">
                  <div>
                    <span>TYPE CONTROLS</span>
                    <h3>Fine tune your pairing</h3>
                  </div>
                  <div className="control-head-tools">
                    <button className="reset-btn" onClick={resetCurrentParams} title="Reset this pairing">
                      <RotateCcw size={12} />
                      Reset
                    </button>
                    <SlidersHorizontal size={17} />
                  </div>
                </div>
                <div className="font-row">
                  <label>
                    Heading font
                    <select
                      value={current.params.headingFont}
                      onChange={(e) => updateParams({ headingFont: e.target.value as (typeof FONTS)[number] })}
                    >
                      {FONTS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Body font
                    <select
                      value={current.params.bodyFont}
                      onChange={(e) => updateParams({ bodyFont: e.target.value as (typeof FONTS)[number] })}
                    >
                      {FONTS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="range-row">
                  <label>
                    Size <b>{current.params.size}px</b>
                    <input
                      type="range"
                      min={PARAM_LIMITS.size.min}
                      max={PARAM_LIMITS.size.max}
                      step={PARAM_LIMITS.size.step}
                      value={current.params.size}
                      onChange={(e) => updateParams({ size: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Weight <b>{current.params.weight}</b>
                    <input
                      type="range"
                      min={PARAM_LIMITS.weight.min}
                      max={PARAM_LIMITS.weight.max}
                      step={PARAM_LIMITS.weight.step}
                      value={current.params.weight}
                      onChange={(e) => updateParams({ weight: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="range-row">
                  <label>
                    Line height <b>{current.params.leading.toFixed(2)}</b>
                    <input
                      type="range"
                      min={PARAM_LIMITS.leading.min}
                      max={PARAM_LIMITS.leading.max}
                      step={PARAM_LIMITS.leading.step}
                      value={current.params.leading}
                      onChange={(e) => updateParams({ leading: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Letter spacing <b>{current.params.tracking}px</b>
                    <input
                      type="range"
                      min={PARAM_LIMITS.tracking.min}
                      max={PARAM_LIMITS.tracking.max}
                      step={PARAM_LIMITS.tracking.step}
                      value={current.params.tracking}
                      onChange={(e) => updateParams({ tracking: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>

              <div className="studio-foot">
                <button className="delete" onClick={() => removePair(current.id)}>
                  <Trash2 size={15} />
                  Delete pairing
                </button>
                {deletedBatches.length > 0 && (
                  <button className="undo-foot" onClick={undoLastDelete}>
                    <Undo2 size={14} />
                    Undo delete · {deletedBatches[deletedBatches.length - 1].entries.length}
                  </button>
                )}
                <span className="save">
                  <CheckIcon />
                  Saved locally
                </span>
              </div>
            </section>
          ) : (
            <section className="studio studio-empty">
              <Type size={22} />
              <h2>No pairing on the canvas</h2>
              <p>Create a new pairing to start tuning type.</p>
              <button className="primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} />
                New pairing
              </button>
            </section>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="backdrop" onClick={() => setShowAdd(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              submitCreate();
            }}
          >
            <h2>New pairing</h2>
            <label>
              Pairing name
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Quiet confidence"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={!newTitle.trim()}>
                Create pairing
              </button>
            </div>
          </form>
        </div>
      )}

      {activeBatch && (
        <div className="toast">
          <span>
            Removed {activeBatch.entries.length} pairing
            {activeBatch.entries.length === 1 ? '' : 's'}
          </span>
          <button onClick={undoLastDelete}>
            <Undo2 size={13} />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return <span className="check">✓</span>;
}
