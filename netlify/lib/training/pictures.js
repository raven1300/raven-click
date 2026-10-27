// Exercise pictures in Blobs: `pictures/<ex>/full` (JPEG, an animated GIF or WebP, or an MP4 or WebM) and
// `pictures/<ex>/thumb` (JPEG). Each file's metadata holds its type.
import { store } from './store.js';

const SIZES = ['full', 'thumb'];

export async function deletePicture(ex) {
  await Promise.all(SIZES.map(size => store().delete(`pictures/${ex}/${size}`)));
}

// For merging: the kept exercise takes over the other's picture.
export async function copyPicture(from, to) {
  for (const size of SIZES) {
    const found = await store().getWithMetadata(`pictures/${from}/${size}`, { type: 'arrayBuffer' });
    if (found) await store().set(`pictures/${to}/${size}`, found.data, { metadata: found.metadata });
  }
}
