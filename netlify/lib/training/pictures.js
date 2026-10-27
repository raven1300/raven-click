// Exercise pictures in Blobs: `pictures/<ex>/full` and `pictures/<ex>/thumb`, both JPEG.
import { store } from './store.js';

const SIZES = ['full', 'thumb'];

export async function deletePicture(ex) {
  await Promise.all(SIZES.map(size => store().delete(`pictures/${ex}/${size}`)));
}

// For merging: the kept exercise takes over the other's picture.
export async function copyPicture(from, to) {
  for (const size of SIZES) {
    const data = await store().get(`pictures/${from}/${size}`, { type: 'arrayBuffer' });
    if (data) await store().set(`pictures/${to}/${size}`, data);
  }
}
