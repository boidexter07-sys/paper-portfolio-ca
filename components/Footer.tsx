import Link from 'next/link';

export function Footer() {
  return (
    <footer className="d3-footer" id="d3-footer">
      <div className="d3-footer-inner">
        <div className="d3-footer-grid">
          {/* Brand-led identity column */}
          <div className="d3-footer-col">
            <div className="d3-footer-brand-mark">altier edge</div>
            <p className="d3-footer-brand-body">
              A Canadian-built practice field for investors. PRISM scores every stock 0 to 100. ARENA runs
              paper-trading competitions on top. No real money. Credits are earned inside the app.
            </p>
          </div>

          {/* Methodology + risks */}
          <div className="d3-footer-col">
            <p className="d3-footer-col-title">Methodology + Risks</p>
            <ul>
              <li><Link href="/learn">Methodology</Link></li>
              <li><Link href="/learn">Risk disclosure</Link></li>
              <li><Link href="/learn">Bands + weights</Link></li>
            </ul>
          </div>

          {/* Links */}
          <div className="d3-footer-col">
            <p className="d3-footer-col-title">Legal</p>
            <ul>
              <li><Link href="/learn">Privacy</Link></li>
              <li><Link href="/learn">Terms</Link></li>
              <li><a href="mailto:hello@altieredge.ca">Contact</a></li>
            </ul>
          </div>

          {/* Product */}
          <div className="d3-footer-col">
            <p className="d3-footer-col-title">Product</p>
            <ul>
              <li><Link href="/discover">Discover</Link></li>
              <li><Link href="/arena">ARENA</Link></li>
              <li><Link href="/learn">Learn</Link></li>
              <li><Link href="/account">Account</Link></li>
            </ul>
          </div>
        </div>

        <div className="d3-footer-bottom">
          <span>© 2026 Altier Edge · Built in Canada</span>
          <span>Toronto, ON · operated under Canadian securities notice</span>
        </div>

        <p className="d3-footer-disclosure">
          PRISM scores are paper-trading signals, not investment advice. ARENA uses credits earned inside the
          app — never purchased. Nothing on this page is an offer to buy or sell securities. Nothing here is
          investment advice. Merch rewards at the top of every leaderboard are not transferable for cash.
        </p>
      </div>
    </footer>
  );
}
