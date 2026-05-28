const ESTIMATED_ROW = 88;
const WINDOW_SIZE = 45;
const BUFFER = 8;

export function createVirtualList({ scrollEl, mountEl, spacerTopEl, spacerBottomEl }) {
  const state = { items: [], start: -1, end: -1 };

  function visibleRange() {
    const scrollTop = scrollEl.scrollTop;
    const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW) - BUFFER);
    const end = Math.min(state.items.length, start + WINDOW_SIZE + BUFFER * 2);
    return { start, end };
  }

  function render() {
    const { start, end } = visibleRange();
    if (start === state.start && end === state.end) return;

    state.start = start;
    state.end = end;

    spacerTopEl.style.height = `${start * ESTIMATED_ROW}px`;
    spacerBottomEl.style.height = `${Math.max(0, (state.items.length - end) * ESTIMATED_ROW)}px`;

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const node = state.items[i];
      if (node) frag.appendChild(node);
    }
    mountEl.replaceChildren(frag);
  }

  function setItems(nodes) {
    state.items = nodes.filter(Boolean);
    state.start = -1;
    render();
  }

  function append(node) {
    state.items.push(node);
    render();
  }

  function clear() {
    state.items = [];
    state.start = state.end = -1;
    spacerTopEl.style.height = '0';
    spacerBottomEl.style.height = '0';
    mountEl.replaceChildren();
  }

  function remove(node) {
    state.items = state.items.filter((n) => n !== node);
    state.start = -1;
    render();
  }

  const onScroll = () => requestAnimationFrame(render);
  scrollEl.addEventListener('scroll', onScroll, { passive: true });

  return {
    setItems,
    append,
    remove,
    clear,
    render,
    destroy() {
      scrollEl.removeEventListener('scroll', onScroll);
    },
    get items() {
      return state.items;
    },
  };
}
