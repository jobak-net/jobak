import { Fragment } from "react";
import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { ArrowRight } from "lucide-react";
import { resolveCta } from "@/frontend/lib/configs/cta";
import { ctaContent } from "./data";

export function CtaContent() {
  return (
    <div className="flex-1">
      <Heading />
      <Description />
      <ActionButtons />
      <Disclaimer />
    </div>
  );
}

function Heading() {
  return (
    <h2 className="text-4xl lg:text-7xl font-display tracking-tight mb-8 leading-[0.95]">
      {ctaContent.heading.line1}
      <br />
      {ctaContent.heading.line2}
    </h2>
  );
}

function Description() {
  return (
    <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
      {ctaContent.description}
    </p>
  );
}

function ActionButtons() {
  const { text, href } = resolveCta(ctaContent.primaryButton.text);

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <Button
        size="lg"
        className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 text-base rounded-full group font-medium"
        asChild
      >
        <Link href={href}>
          {text}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
        asChild
      >
        <Link href={ctaContent.secondaryButton.href}>
          {ctaContent.secondaryButton.text}
        </Link>
      </Button>
    </div>
  );
}

/** Signup reassurance ("no credit card required") means nothing once you have an account. */
function Disclaimer() {

  return (
    <p className="text-sm text-muted-foreground mt-8 font-mono">
      {/* The separating space sits between the clauses, not inside them — a
          leading space inside a nowrap inline-block is trimmed at line start. */}
      {ctaContent.disclaimer.map((clause, i) => (
        <Fragment key={clause}>
          {i > 0 && " "}
          <span className="inline-block whitespace-nowrap">{clause}</span>
        </Fragment>
      ))}
    </p>
  );
}
