function convertToMarkdown(text) {
  // Unicode ranges for every common "fancy alphabet" block social apps use
  const RANGES = [
    { from: 0x1D400, base: 65, style: 'bold' },        // Serif Bold A-Z
    { from: 0x1D41A, base: 97, style: 'bold' },        // Serif Bold a-z
    { from: 0x1D7CE, base: 48, style: 'bold' },        // Serif Bold 0-9
    { from: 0x1D434, base: 65, style: 'italic' },      // Serif Italic A-Z
    { from: 0x1D44E, base: 97, style: 'italic' },      // Serif Italic a-z
    { from: 0x1D468, base: 65, style: 'bolditalic' },  // Serif Bold Italic A-Z
    { from: 0x1D482, base: 97, style: 'bolditalic' },  // Serif Bold Italic a-z
    { from: 0x1D5D4, base: 65, style: 'bold' },        // Sans Bold A-Z
    { from: 0x1D5EE, base: 97, style: 'bold' },        // Sans Bold a-z
    { from: 0x1D7EC, base: 48, style: 'bold' },        // Sans Bold 0-9
    { from: 0x1D608, base: 65, style: 'italic' },      // Sans Italic A-Z
    { from: 0x1D622, base: 97, style: 'italic' },      // Sans Italic a-z
    { from: 0x1D63C, base: 65, style: 'bolditalic' },  // Sans Bold Italic A-Z
    { from: 0x1D656, base: 97, style: 'bolditalic' },  // Sans Bold Italic a-z
    { from: 0x1D670, base: 65, style: 'mono' },        // Monospace A-Z
    { from: 0x1D68A, base: 97, style: 'mono' },        // Monospace a-z
    { from: 0x1D7F6, base: 48, style: 'mono' },        // Monospace 0-9
  ];
  for (const r of RANGES) {
    r.to = r.from + (r.base === 48 ? 10 : 26) - 1;
  }

  function classifyChar(ch) {
    const code = ch.codePointAt(0);
    for (const r of RANGES) {
      if (code >= r.from && code <= r.to) {
        return { normalChar: String.fromCharCode(r.base + (code - r.from)), style: r.style };
      }
    }
    return null;
  }

  function tokenize(str) {
    const tokens = [];
    let current = '';
    let currentStyle = null;
    for (const ch of str) {
      const info = classifyChar(ch);
      if (!info && ch === ' ' && currentStyle !== null) {
        current += ch;
        continue;
      }
      const style = info ? info.style : null;
      const outChar = info ? info.normalChar : ch;
      if (style === currentStyle) {
        current += outChar;
      } else {
        if (current) tokens.push({ text: current, style: currentStyle });
        current = outChar;
        currentStyle = style;
      }
    }
    if (current) tokens.push({ text: current, style: currentStyle });
    return tokens;
  }

  function wrapToken(token) {
    if (token.style === null || token.style === undefined) return token.text;
    const leading = token.text.match(/^ +/)?.[0] ?? '';
    const trailing = token.text.match(/ +$/)?.[0] ?? '';
    const core = token.text.slice(leading.length, token.text.length - trailing.length);
    if (!core) return token.text;
    let wrapped;
    if (token.style === 'bold') wrapped = `**${core}**`;
    else if (token.style === 'italic') wrapped = `*${core}*`;
    else if (token.style === 'bolditalic') wrapped = `***${core}***`;
    else if (token.style === 'mono') wrapped = `\`${core}\``;
    else wrapped = core;
    return leading + wrapped + trailing;
  }

  const BULLETS = ['•', '◦', '▪', '▸', '‣'];

  function isPunctuationOnlyLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return ![...trimmed].some(ch => /[A-Za-z0-9]/.test(ch) && !classifyChar(ch));
  }

  function isWholeLineMono(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    let hasMono = false;
    for (const ch of trimmed) {
      const info = classifyChar(ch);
      if (info) {
        if (info.style !== 'mono') return false;
        hasMono = true;
        continue;
      }
      if (/[A-Za-z0-9]/.test(ch)) return false;
    }
    return hasMono;
  }

  function plainFromMonoLine(line) {
    return tokenize(line).map(t => t.text).join('');
  }

  const lines = text.split('\n');
  const outputLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isWholeLineMono(line)) {
      let j = i;
      const monoLines = [];
      while (j < lines.length && (isWholeLineMono(lines[j]) || isPunctuationOnlyLine(lines[j]))) {
        monoLines.push(plainFromMonoLine(lines[j]));
        j++;
      }
      if (monoLines.length >= 3) {
        outputLines.push('```', ...monoLines, '```');
      } else {
        for (const ml of monoLines) outputLines.push(`\`${ml}\``);
      }
      i = j;
      continue;
    }

    let processedLine = line;
    const trimmedStart = line.trimStart();
    const leadingSpace = line.slice(0, line.length - trimmedStart.length);
    const firstChar = trimmedStart.charAt(0);

    if (BULLETS.includes(firstChar)) {
      processedLine = `${leadingSpace}- ${trimmedStart.slice(1).trimStart()}`;
    }

    outputLines.push(tokenize(processedLine).map(wrapToken).join(''));
    i++;
  }

  return outputLines.join('\n');
}