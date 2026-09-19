import { FooterBrand } from "./footer-brand";
import { FooterLinks } from "./footer-links";
import { SupportStrip } from "./support-strip";
import { FooterBottom } from "./footer-bottom";

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">      
      <div className="relative z-10 max-w-350 mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          {/*
            Five columns: the brand block spans two, leaving one each for
            Product, Resources and Legal. It was four, which pushed Legal onto
            a second row on its own once that column was added.
          */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 lg:gap-8">
            <FooterBrand />
            <FooterLinks />
          </div>
        </div>

        <SupportStrip />
        <FooterBottom />
      </div>
    </footer>
  );
}