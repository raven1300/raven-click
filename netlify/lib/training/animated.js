// Tells an animated GIF or WebP apart from a still one, from the file's bytes. Used by the server
// to check uploads, and by the browser to decide whether to keep the original file.
// Returns 'image/gif' or 'image/webp' for an animation, or null for anything else.

const ascii = (bytes, at, text) => [...text].every((c, i) => bytes[at + i] === c.charCodeAt(0));

// Counts the frames in a GIF by walking its blocks, stopping at the second.
function gifFrames(bytes) {
  let at = 13;
  if (bytes[10] & 0x80) at += 3 * 2 ** ((bytes[10] & 7) + 1);
  let frames = 0;
  const skipSubBlocks = () => { while (at < bytes.length && bytes[at] !== 0) at += bytes[at] + 1; at++; };
  while (at < bytes.length && frames < 2) {
    const block = bytes[at];
    if (block === 0x21) { at += 2; skipSubBlocks(); }
    else if (block === 0x2c) {
      frames++;
      const flags = bytes[at + 9];
      at += 10;
      if (flags & 0x80) at += 3 * 2 ** ((flags & 7) + 1);
      at++;
      skipSubBlocks();
    } else break;
  }
  return frames;
}

export function animationType(bytes) {
  if (ascii(bytes, 0, 'GIF8') && bytes.length > 13) return gifFrames(bytes) > 1 ? 'image/gif' : null;
  // An animated WebP is "RIFF....WEBPVP8X" with the animation flag set.
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBPVP8X') && bytes[20] & 0x02) return 'image/webp';
  return null;
}

export const isJpeg = bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const MAX_ANIMATION = 4 * 1024 * 1024;
