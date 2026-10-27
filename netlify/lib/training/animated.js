// Tells an animation (an animated GIF or WebP, or an MP4 or WebM clip) apart from a still picture,
// from the file's bytes. Used by the server to check uploads, and by the browser to decide whether
// to keep the original file. animationType returns 'image/gif', 'image/webp', 'video/mp4' or
// 'video/webm' for an animation, or null for anything else.

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
  // MP4 (and iPhone .mov, which plays the same way) starts with an "ftyp" box; WebM with the EBML header.
  if (ascii(bytes, 4, 'ftyp')) return 'video/mp4';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'video/webm';
  return null;
}

export const isVideo = type => !!type && type.startsWith('video/');

// HEVC (H.265), the iPhone camera's default, doesn't play in every browser, so it's refused.
// Its codec name appears in the file's track description.
export function isHevc(bytes) {
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0x68 && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x63 && bytes[i + 3] === 0x31) return true; // hvc1
    if (bytes[i] === 0x68 && bytes[i + 1] === 0x65 && bytes[i + 2] === 0x76 && bytes[i + 3] === 0x31) return true; // hev1
  }
  return false;
}

export const HEVC_MESSAGE = 'This video is in HEVC (the iPhone camera\'s usual format), which some browsers can\'t play. Save it as an H.264 MP4 first. On an iPhone, Settings › Camera › Formats › Most Compatible records in H.264.';

export const isJpeg = bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const MAX_ANIMATION = 4 * 1024 * 1024;
