import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon: the homepage J, in accent green, on the canvas.
 *
 * The same picture as `brand/logo/app-icon.svg`, drawn here rather than read
 * from it so the route has no file I/O — keep the two in step.
 *
 * **Full bleed, and deliberately not rounded.** iOS applies its own squircle
 * mask to a home-screen icon. Shipping a rounded shape inside theirs would
 * leave dark slivers where the two radii disagree, so the ground runs edge to
 * edge and iOS cuts the shape.
 *
 * The J is the same geometry as the logo everywhere else. This used to draw a
 * thicker J knocked out of a green tile, so the home-screen icon showed a
 * letter the homepage never did.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ACCENT = "#58e68c";
const CANVAS = "#08090a";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: CANVAS,
                }}
            >
                <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
                    {/* Scaled to 68% and centred, as in app-icon.svg. */}
                    <g transform="translate(32 32) scale(0.68) translate(-32 -30)">
                        <path
                            d="M42 12 V38 A10 10 0 0 1 22 38"
                            stroke={ACCENT}
                            strokeWidth="7"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <circle cx="25" cy="22" r="5.5" fill={ACCENT} />
                    </g>
                </svg>
            </div>
        ),
        { ...size }
    );
}
