import { stats } from "./data";

/**
 * The looping stats strip under the hero.
 *
 * Two things the markup has to get right, both of which were wrong and both of
 * which only showed up on a phone:
 *
 *  - **`w-max` on the track.** The keyframes translate by -50%, which is 50% of
 *    *the animated element's own width*. Without `w-max` the flex track is only
 *    as wide as the viewport, so the loop travelled half a screen and snapped
 *    back — on a narrow screen that meant a single stat sliding back and forth
 *    and the other three never appearing.
 *  - **The gap lives inside each copy, not between them.** A gap on the track
 *    would sit between the two halves only, so -50% would land half a gap off
 *    and the seam would visibly jump once per cycle.
 */
export function StatsMarquee() {
  return (
    <div className="absolute bottom-16 lg:bottom-24 left-0 right-0 opacity-100 transition-all duration-700 delay-500">
      <div className="flex w-max marquee whitespace-nowrap [--marquee-duration:16s] lg:[--marquee-duration:30s]">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="flex gap-8 lg:gap-16 pr-8 lg:pr-16"
            aria-hidden={i === 1 ? true : undefined}
          >
            {stats.map((stat) => (
              <div key={`${stat.company}-${i}`} className="flex items-baseline gap-3 lg:gap-4">
                <span className="text-3xl lg:text-5xl font-display">{stat.value}</span>
                <span className="text-xs lg:text-sm text-muted-foreground">
                  {stat.label}
                  <span className="block font-mono text-[10px] lg:text-xs mt-1">{stat.company}</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
