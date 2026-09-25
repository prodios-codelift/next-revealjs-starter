// Checks every slide of the reveal.js deck on the current page for clipped text,
// content escaping the slide, and overlapping grid/flex panels.
//
//   agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
//
// Resolves to { slides, issues: [{ slide, type, element, detail }] }. `issues` must be empty.
// Exemptions: [data-bleed] allows intentional off-canvas decoration; [data-verify-ignore] skips a subtree.
(async () => {
  const TOLERANCE = 1;
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const describe = (el) => {
    let out = el.tagName.toLowerCase();
    if (el.id) out += `#${el.id}`;
    if (el.classList.length) out += `.${[...el.classList].join('.')}`;
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return text ? `${out} "${text}"` : out;
  };
  const isRendered = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const clipsContent = (style) =>
    [style.overflowX, style.overflowY].some((value) => ['hidden', 'clip', 'scroll', 'auto'].includes(value));
  const overlapArea = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  // Show every fragment and stop transitions so layout is final while measuring.
  const override = document.createElement('style');
  override.id = 'verify-slides-style';
  override.textContent = `
    .reveal .slides section { transition: none !important; }
    .reveal .fragment { visibility: visible !important; opacity: 1 !important; transform: none !important; }
  `;
  document.head.appendChild(override);

  const indices = [];
  document.querySelectorAll('.reveal .slides > section').forEach((section, h) => {
    const vertical = section.querySelectorAll(':scope > section');
    if (vertical.length) vertical.forEach((_, v) => indices.push([h, v, true]));
    else indices.push([h, 0, false]);
  });

  const startHash = location.hash;
  const issues = [];

  for (const [h, v, isStack] of indices) {
    const label = isStack ? `${h}/${v}` : `${h}`;
    location.hash = isStack ? `#/${h}/${v}` : `#/${h}`;
    await nextFrame();

    const slide = document.querySelector('.reveal .slides section.present:not(.stack)');
    if (!slide) {
      issues.push({ slide: label, type: 'missing', element: '', detail: 'no present slide after navigation' });
      continue;
    }
    const bounds = slide.getBoundingClientRect();

    for (const el of slide.querySelectorAll('*')) {
      if (el.closest('[data-verify-ignore]') || !isRendered(el)) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (
        clipsContent(style) &&
        (el.scrollHeight > el.clientHeight + TOLERANCE || el.scrollWidth > el.clientWidth + TOLERANCE)
      ) {
        issues.push({
          slide: label,
          type: 'clipped',
          element: describe(el),
          detail: `content ${el.scrollWidth}×${el.scrollHeight} in a ${el.clientWidth}×${el.clientHeight} box`,
        });
      }

      if (
        !el.closest('[data-bleed]') &&
        (rect.left < bounds.left - TOLERANCE ||
          rect.top < bounds.top - TOLERANCE ||
          rect.right > bounds.right + TOLERANCE ||
          rect.bottom > bounds.bottom + TOLERANCE)
      ) {
        issues.push({ slide: label, type: 'out-of-bounds', element: describe(el), detail: 'extends past the slide edge' });
      }

      if (['grid', 'inline-grid', 'flex', 'inline-flex'].includes(style.display)) {
        const panels = [...el.children].filter(
          (child) => isRendered(child) && !['absolute', 'fixed'].includes(getComputedStyle(child).position),
        );
        for (let i = 0; i < panels.length; i++) {
          for (let j = i + 1; j < panels.length; j++) {
            const area = overlapArea(panels[i].getBoundingClientRect(), panels[j].getBoundingClientRect());
            if (area > TOLERANCE) {
              issues.push({
                slide: label,
                type: 'overlap',
                element: `${describe(panels[i])} × ${describe(panels[j])}`,
                detail: `${Math.round(area)}px² overlap (screen px)`,
              });
            }
          }
        }
      }
    }
  }

  location.hash = startHash || '#/';
  await nextFrame();
  override.remove();
  return { slides: indices.length, issues };
})();
