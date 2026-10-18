import { useState, useEffect, useRef } from 'preact/hooks';
import { buildShoppingList } from '../data/categories.js';
import { tagEmojis } from '../data/tagConfig.js';
import { LIST_KEY, TAGS_KEY } from '../data/storageKeys.js';

function CopyButton({ getText }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button onClick={copy} class={`copy-btn${copied ? ' copied' : ''}`}>
      {copied ? 'Copied!' : 'Copy to clipboard'}
    </button>
  );
}

const LIST_MAX = 6;

function readSet(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

function tagLabel(tag) {
  return tagEmojis[tag] ? `${tagEmojis[tag]}\u2002${tag}` : tag;
}

export default function RecipeBrowser({ recipes }) {
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [myList, setMyList] = useState(new Set());
  const [view, setView] = useState('browse'); // 'browse' | 'list' | 'shopping'
  const [hydrated, setHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sharedRecipes, setSharedRecipes] = useState(null); // null = normal mode, array = shared view
  const [shareCopied, setShareCopied] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSelectedTags(readSet(TAGS_KEY));
    setMyList(readSet(LIST_KEY));
    setHydrated(true);

    // Check for shared list in URL hash — read-only, never touches localStorage
    const hash = window.location.hash.slice(1);
    if (hash) {
      const slugs = hash.split('+');
      const found = slugs.map(slug => recipes.find(r => r.id === slug)).filter(Boolean);
      if (found.length > 0) {
        setSharedRecipes(found);
        setView('list');
      }
    }
  }, []);

  useEffect(() => { if (hydrated) writeSet(LIST_KEY, myList); }, [myList, hydrated]);
  useEffect(() => { if (hydrated) writeSet(TAGS_KEY, selectedTags); }, [selectedTags, hydrated]);

  const allTags = [...new Set(recipes.flatMap(r => r.tags))].sort();
  const myListRecipes = [...myList].map(id => recipes.find(r => r.id === id)).filter(Boolean);

  // Which recipes to show in the list view
  const listViewRecipes = sharedRecipes ?? myListRecipes;

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleMyList = (id) => {
    setMyList(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    setMyList(new Set());
    setSelectedTags(new Set());
    localStorage.removeItem(LIST_KEY);
    localStorage.removeItem(TAGS_KEY);
  };

  const backToBrowse = () => {
    setSharedRecipes(null);
    setView('browse');
    // Clear the hash without triggering a navigation
    history.replaceState(null, '', window.location.pathname);
  };

  const shareList = () => {
    const hash = [...myList].join('+');
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const visibleRecipes = selectedTags.size === 0
    ? recipes
    : recipes.filter(r => [...selectedTags].every(t => r.tags.includes(t)));

  const searchResults = searchQuery.trim().length === 0
    ? []
    : recipes.filter(r => {
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q)
          || r.ingredients.some(i => i.toLowerCase().includes(q));
      });

  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);

  const openSearch = () => { setSearchOpen(true); setSearchQuery(''); };
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

  const extractMethod = (recipeId) => {
    const source = document.getElementById(`recipe-content-${recipeId}`);
    if (!source) return '';
    const lists = source.querySelectorAll('ol');
    return [...lists].map(ol =>
      [...ol.querySelectorAll('li')].map((li, i) => `${i + 1}. ${li.textContent.trim()}`).join('\n')
    ).join('\n');
  };

  const generateCookingPlan = () => {
    const jobId = crypto.randomUUID();
    const recipeData = myListRecipes.map(r => ({
      title: r.title,
      method: extractMethod(r.id),
    }));
    setMobileDrawerOpen(false);

    window.open(`/cooking-plan?id=${jobId}`, '_blank');

    fetch('/api/cooking-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipes: recipeData, jobId }),
    });
  };

  const shoppingList = view === 'shopping' ? buildShoppingList(myListRecipes) : '';

  return (
    <div class="rb-layout">

      {/* Mobile backdrop */}
      {(mobileFilterOpen || mobileDrawerOpen) && (
        <div class="rb-mobile-backdrop" onClick={() => { setMobileFilterOpen(false); setMobileDrawerOpen(false); }} />
      )}

      {/* Left sidebar — tag filters */}
      <aside class={`rb-sidebar${mobileFilterOpen ? ' mobile-open' : ''}`}>
        <div class="rb-sidebar-title">Filters</div>
        {(() => {
          const sections = [
            { label: 'Protein',  tags: ['chicken', 'beef', 'pork', 'sausage', 'turkey', 'eggs'] },
            { label: 'Method',   tags: ['baked', 'slow cooker', 'one pot', 'stir fry', 'stovetop', 'air fryer'] },
            { label: 'Cuisine',  tags: ['Asian', 'Indian', 'Italian', 'Japanese', 'Mediterranean', 'Mexican', 'Thai'] },
            { label: 'Dish',     tags: ['pasta', 'rice', 'salad', 'soup', 'curry', 'chili', 'casserole', 'wraps', 'breakfast', 'side dish', 'dinner party', 'comfort'] },
            { label: 'Diet',     tags: ['vegetarian', 'low carb', 'add more veg'] },
            { label: 'Source',   tags: ['Instagram', 'Youtube'] },
          ];
          const knownTags = new Set(sections.flatMap(s => s.tags));
          const otherTags = allTags.filter(t => !knownTags.has(t));
          const allSections = otherTags.length > 0
            ? [...sections, { label: 'Other', tags: otherTags }]
            : sections;
          return allSections.map(section => {
            const sectionTags = section.tags.filter(t => allTags.includes(t));
            if (sectionTags.length === 0) return null;
            return (
              <div key={section.label} class="rb-tag-section">
                <div class="rb-tag-section-label">{section.label}</div>
                <div class="rb-tag-list">
                  {sectionTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      class={`rb-tag${selectedTags.has(tag) ? ' selected' : ''}`}
                    >
                      {tagLabel(tag)}
                    </button>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </aside>

      {/* Main content */}
      <main class="rb-main">

        {/* Active filter chips */}
        {selectedTags.size > 0 && (
          <div class="rb-topbar">
            <span class="rb-filters-label">Filtering by:</span>
            {[...selectedTags].map(tag => (
              <button key={tag} class="rb-filter-chip" onClick={() => toggleTag(tag)} aria-label={`Remove ${tag} filter`}>
                {tagLabel(tag)}
                <span class="rb-filter-chip-x">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Results count + search button */}
        <div class="rb-results-count">
          <span>
            <strong>{visibleRecipes.length}</strong>{' '}
            {visibleRecipes.length === 1 ? 'recipe' : 'recipes'}
            {selectedTags.size > 0 ? (visibleRecipes.length === 1 ? ' matches your filters' : ' match your filters') : ' available'}
          </span>
          <button class="rb-search-btn" onClick={openSearch} aria-label="Search recipes">
            🔍
          </button>
        </div>

        {/* Recipe grid */}
        {visibleRecipes.length > 0 && <div class="rb-recipe-grid">
              {visibleRecipes.map(recipe => {
                const inList = myList.has(recipe.id);
                const canAdd = inList || myList.size < LIST_MAX;
                return (
                  <div key={recipe.id} class={`rb-recipe-card${inList ? ' in-list' : ''}`}>
                    <a href={`/recipes/${recipe.id}/`} class="rb-card-link">
                      {recipe.image?.url
                        ? <img src={recipe.image.url} alt={recipe.image.alt} class="rb-card-img" />
                        : <div class="rb-card-placeholder">{recipe.shortName}</div>
                      }
                    </a>
                    <div class="rb-card-body">
                      <div class="rb-card-name">{recipe.title}</div>
                      <div class="rb-card-tags">
                        {[...recipe.tags].sort((a, b) => selectedTags.has(b) - selectedTags.has(a)).map(tag => {
                          const hasEmoji = !!tagEmojis[tag];
                          return (
                            <span key={tag} class={`rb-card-tag${selectedTags.has(tag) ? ' matched' : ''}${hasEmoji ? ' emoji-only' : ''}`} title={hasEmoji ? tag : undefined}>
                              {hasEmoji ? tagEmojis[tag] : tagLabel(tag)}
                            </span>
                          );
                        })}
                      </div>
                      <div class="rb-card-footer">
                        <button
                          onClick={() => toggleMyList(recipe.id)}
                          class={`rb-add-btn${inList ? ' added' : ''}`}
                          disabled={!canAdd}
                        >
                          {inList ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </main>

      {/* Right panel — always visible */}
      <div class={`rb-drawer${mobileDrawerOpen ? ' mobile-open' : ''}`}>
        <div class="rb-drawer-header">
          <h2>My List</h2>
          {(myList.size > 0 || selectedTags.size > 0) && (
            <button onClick={clearAll} class="rb-clear-btn">✕ Clear</button>
          )}
        </div>
        <div class="rb-drawer-body">
          {myListRecipes.length === 0
            ? <p class="rb-drawer-empty">No recipes added yet.<br />Click + Add to save a recipe to your list.</p>
            : myListRecipes.map(recipe => (
                <div key={recipe.id} class="rb-list-item">
                  <a href={`/recipes/${recipe.id}/`} class="rb-list-item-link">
                    {recipe.image?.url
                      ? <img src={recipe.image.url} alt="" class="rb-list-item-thumb" />
                      : <div class="rb-list-item-thumb rb-list-thumb-placeholder" />
                    }
                    <span class="rb-list-item-name">{recipe.title}</span>
                  </a>
                  <button
                    class="rb-list-remove"
                    onClick={() => toggleMyList(recipe.id)}
                    aria-label={`Remove ${recipe.title}`}
                  >×</button>
                </div>
              ))
          }
        </div>
        {myListRecipes.length > 0 && (
          <div class="rb-drawer-actions">
            <button
              class="rb-drawer-action-btn"
              onClick={() => { setView('list'); setMobileDrawerOpen(false); }}
            >
              View full recipes
            </button>
            <button
              class="rb-drawer-action-btn"
              onClick={() => { setView('shopping'); setMobileDrawerOpen(false); }}
            >
              Shopping list
            </button>
            <button
              class={`rb-drawer-action-btn rb-share-btn${shareCopied ? ' copied' : ''}`}
              onClick={shareList}
            >
              {shareCopied ? '✓ Link copied!' : '🔗 Share list'}
            </button>
            {myListRecipes.length >= 2 && (
              <button
                class="rb-drawer-action-btn"
                onClick={generateCookingPlan}
              >
                🍳 Cooking plan
              </button>
            )}
          </div>
        )}
        <div class="rb-drawer-footer">{myList.size} / {LIST_MAX} recipes saved</div>
      </div>

      {/* Full recipe list overlay */}
      {view === 'list' && (
        <div class="rb-fullview">
          <div class="rb-fullview-header">
            <button class="rb-back-btn" onClick={backToBrowse}>← Back to Browse</button>
            <h2>{sharedRecipes ? 'Shared Recipe List' : 'My Recipe List'}</h2>
          </div>
          <div class="rb-fullview-body">
            {listViewRecipes.length === 0
              ? <p>No recipes in your list. Go back and add some.</p>
              : listViewRecipes.map(recipe => (
                  <div key={recipe.id} class="recipe-full">
                    <div class="recipe-full-header">
                      <h2>{recipe.title}</h2>
                      <div class="recipe-full-header-actions">
                        {recipe.video && (
                          <a href={`https://www.youtube.com/watch?v=${recipe.video}`} target="_blank" rel="noopener noreferrer" class="recipe-video-link">▶ Watch video</a>
                        )}
                        {!sharedRecipes && (
                          <button onClick={() => toggleMyList(recipe.id)} class="list-toggle">Remove</button>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const ings = recipe.ingredients ?? [];
                      const split = ings.length > 8;
                      const half = Math.ceil(ings.length / 2);
                      const col1 = split ? ings.slice(0, half) : ings;
                      const col2 = split ? ings.slice(half) : [];
                      return (
                        <div class={`recipe-full-columns${split ? ' three-col' : ''}`}>
                          {col1.length > 0 && (
                            <ul class="ingredients-list">
                              {col1.map(ing => <li key={ing}>{ing}</li>)}
                            </ul>
                          )}
                          {split && col2.length > 0 && (
                            <ul class="ingredients-list">
                              {col2.map(ing => <li key={ing}>{ing}</li>)}
                            </ul>
                          )}
                          {recipe.image?.url && (
                            <div class="recipe-full-img-wrap">
                              <img src={recipe.image.url} alt={recipe.image.alt} class="recipe-full-img" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div
                      class="recipe-body"
                      ref={(el) => {
                        if (el) {
                          const source = document.getElementById(`recipe-content-${recipe.id}`);
                          if (source) el.innerHTML = source.innerHTML;
                        }
                      }}
                    />
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* Mobile bottom bar — only shown in browse view */}
      <div class={`rb-mobile-bar${view !== 'browse' ? ' hidden' : ''}`}>
        <button class="rb-mobile-bar-btn" onClick={() => setMobileFilterOpen(true)}>
          🎯 Filters{selectedTags.size > 0 ? ` (${selectedTags.size})` : ''}
        </button>
        <button class="rb-mobile-bar-btn" onClick={() => setMobileDrawerOpen(true)}>
          📋 My List ({myList.size}/{LIST_MAX})
        </button>
      </div>

      {/* Search modal */}
      {searchOpen && (
        <div class="rb-search-backdrop" onClick={closeSearch}>
          <div class="rb-search-modal" onClick={e => e.stopPropagation()}>
            <input
              ref={searchInputRef}
              class="rb-search-input"
              type="text"
              placeholder="Search recipes…"
              value={searchQuery}
              onInput={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && closeSearch()}
            />
            <div class="rb-search-results">
              {searchQuery.trim().length === 0
                ? <p class="rb-search-hint">Start typing to search…</p>
                : searchResults.length === 0
                  ? <p class="rb-search-hint">No recipes found.</p>
                  : searchResults.map(r => (
                      <a key={r.id} href={`/recipes/${r.id}/`} class="rb-search-result-item">
                        {r.image?.url
                          ? <img src={r.image.url} alt="" class="rb-search-result-thumb" />
                          : <div class="rb-search-result-thumb rb-search-thumb-placeholder" />
                        }
                        <span>{r.title}</span>
                      </a>
                    ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Shopping list overlay */}
      {view === 'shopping' && (
        <div class="rb-fullview">
          <div class="rb-fullview-header">
            <button class="rb-back-btn" onClick={() => setView('browse')}>← Back to Browse</button>
            <h2>Shopping List</h2>
          </div>
          <div class="rb-fullview-body">
            {myListRecipes.length === 0
              ? <p>No recipes in your list. Go back and add some.</p>
              : <div class="shopping-list-wrapper">
                  <CopyButton getText={() => shoppingList} />
                  <textarea
                    class="shopping-list-textarea"
                    value={shoppingList}
                    readOnly
                  />
                </div>
            }
          </div>
        </div>
      )}

    </div>
  );
}
