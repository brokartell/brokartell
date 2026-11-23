'use strict';
/*
 * Kleiner, abhängigkeitsfreier GIF89a-Encoder für Pixel-Art.
 * frames: [{ indices: Uint8Array(w*h), delay: Hundertstelsekunden }]
 * palette: [[r,g,b], ...] (max. 256 Einträge)
 * transparentIndex: Index der transparenten Farbe oder -1
 */
(function (global) {
  function encodeGIF(width, height, frames, palette, transparentIndex, loop) {
    const out = [];
    const byte = (b) => out.push(b & 255);
    const word = (w) => { out.push(w & 255, (w >> 8) & 255); };
    const str = (s) => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };

    let bits = 1;
    while ((1 << bits) < palette.length) bits++;
    const tableSize = 1 << bits;

    // Header + Logical Screen Descriptor
    str('GIF89a');
    word(width); word(height);
    byte(0x80 | ((bits - 1) << 4) | (bits - 1)); // globale Farbtabelle
    byte(0); byte(0);
    for (let i = 0; i < tableSize; i++) {
      const c = palette[i] || [0, 0, 0];
      byte(c[0]); byte(c[1]); byte(c[2]);
    }

    // Endlosschleife (NETSCAPE2.0)
    if (loop !== false) {
      byte(0x21); byte(0xff); byte(11); str('NETSCAPE2.0');
      byte(3); byte(1); word(0); byte(0);
    }

    for (const frame of frames) {
      // Graphic Control Extension
      byte(0x21); byte(0xf9); byte(4);
      const hasT = transparentIndex >= 0;
      byte((2 << 2) | (hasT ? 1 : 0)); // Entsorgung: Hintergrund wiederherstellen
      word(Math.max(2, Math.round(frame.delay)));
      byte(hasT ? transparentIndex : 0);
      byte(0);

      // Image Descriptor
      byte(0x2c); word(0); word(0); word(width); word(height); byte(0);

      lzw(frame.indices, Math.max(2, bits), out);
    }
    byte(0x3b);
    return new Uint8Array(out);
  }

  function lzw(indices, minCodeSize, out) {
    out.push(minCodeSize);
    const clearCode = 1 << minCodeSize;
    const eoi = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let next = eoi + 1;
    let dict = new Map();

    const data = [];
    let cur = 0, curBits = 0;
    const emit = (code) => {
      cur |= code << curBits;
      curBits += codeSize;
      while (curBits >= 8) { data.push(cur & 255); cur >>>= 8; curBits -= 8; }
    };

    emit(clearCode);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clearCode);
        dict = new Map();
        codeSize = minCodeSize + 1;
        next = eoi + 1;
      } else {
        if (next >= (1 << codeSize)) codeSize++;
        dict.set(key, next++);
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (curBits > 0) data.push(cur & 255);

    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      out.push(n);
      for (let j = 0; j < n; j++) out.push(data[i + j]);
    }
    out.push(0);
  }

  global.encodeGIF = encodeGIF;
})(typeof window !== 'undefined' ? window : globalThis);
