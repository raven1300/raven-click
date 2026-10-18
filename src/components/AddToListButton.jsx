import { useState } from 'preact/hooks';
import { LIST_KEY as STORAGE_KEY } from '../data/storageKeys.js';

function readList() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function writeList(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list]));
  } catch {}
}

export default function AddToListButton({ recipeId }) {
  const [inList, setInList] = useState(() => readList().has(recipeId));

  const toggle = () => {
    const list = readList();
    list.has(recipeId) ? list.delete(recipeId) : list.add(recipeId);
    writeList(list);
    setInList(list.has(recipeId));
  };

  return (
    <button onClick={toggle} class={`add-to-list-btn${inList ? ' in-list' : ''}`}>
      {inList ? 'Remove from my list' : 'Add this recipe to my list'}
    </button>
  );
}
