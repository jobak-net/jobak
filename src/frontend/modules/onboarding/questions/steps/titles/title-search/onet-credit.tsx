/** Required by the O*NET licence (CC BY 4.0) wherever its titles are used. */
export function OnetCredit() {
    return (
        <p className="mt-2 text-[11px] text-fg-quaternary">
            Job titles include information from{" "}
            <a
                href="https://www.onetcenter.org/database.html"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-2 hover:text-fg-tertiary"
            >
                O*NET
            </a>{" "}
            by the U.S. Department of Labor, used under CC BY 4.0.
        </p>
    );
}
