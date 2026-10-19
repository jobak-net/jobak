/**
 * Corner rules on the CTA card.
 *
 * Sized to stay inside the card's own padding. At a flat 8rem the bottom-left
 * rule reached well past the padding on a phone and drew two lines straight
 * through the disclaimer text.
 */
export function CornerDecorations() {
  return (
    <>
      <div className="absolute top-0 right-0 w-12 h-12 lg:w-32 lg:h-32 border-b border-l border-foreground/10" />
      <div className="absolute bottom-0 left-0 w-12 h-12 lg:w-32 lg:h-32 border-t border-r border-foreground/10" />
    </>
  );
}
