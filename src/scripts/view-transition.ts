type Doc = Document & {
  startViewTransition?: (arg: unknown) => { finished: Promise<void> };
};

const supportsTypes =
  typeof window !== 'undefined' &&
  'ViewTransition' in window &&
  'types' in (window as any).ViewTransition.prototype;

/** Runs `update` inside a same-document view transition when supported, otherwise immediately. */
export function withViewTransition(update: () => void, types: string[] = []): Promise<void> {
  const doc = document as Doc;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || reduceMotion) {
    update();
    return Promise.resolve();
  }

  const transition =
    types.length && supportsTypes
      ? doc.startViewTransition({ update, types })
      : doc.startViewTransition(update);
  return transition.finished.catch(() => {});
}
