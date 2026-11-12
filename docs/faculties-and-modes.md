# Faculty categories and account modes

The listing and request forms require a faculty selection. The 20 faculties and
Other are shared with the catalog filter and have Thai and English labels.
Names were checked on 12 November 2026 against Chulalongkorn University's registrar
course directory and its announcement renaming the School of Agricultural
Resources to the Faculty of Integrated Agriculture (effective 24 January 2026).

- https://www.reg.chula.ac.th/th/staff/courselist/
- https://www.chula.ac.th/news/284578/
- https://cuagri.chula.ac.th/

For backwards compatibility, new faculty selections are stored as their Thai
names in the existing `course` payload field. Both the live backend and local
pilot already preserve that field; no database migration is needed. Old course
codes and records are retained. Known legacy course codes 2301117 and 2110101 are
grouped under Science and Engineering respectively. General skills and institute
courses without a known faculty are grouped under Other. The tutor's profile
faculty is not used to infer a course's affiliation.

The normal homepage/login destination opens in user mode. The mode switch opens
the provider/seller studio or returns to the user homepage. Provider navigation
contains the studio, requests and messages, and user navigation contains discovery,
classes, resources, learning and saved items. Shared pages preserve the chosen mode
through the `mode=provider` URL parameter; existing studio links remain compatible.
An explicit sign-in return path to the studio resumes that requested view.

Both modes use the same authenticated identity. The switch is navigation, not an
authorization grant. Existing server ownership checks protect listings, private
messages and orders. Live conversations are filtered by the account's role in each
conversation. The studio manages classes, digital notes and physical items.

Verification: `node --test scripts/portal.test.mjs`, TypeScript, production build,
and browser checks for switching modes, faculty selection and catalog filtering.
The browser preview has no production login session; it does not verify a real
Google consent round trip or submit real marketplace records.


## Buyer checkout with demo QR

Buyer cards and listing details offer Order now. Checkout reviews the quantity and authoritative item price, shows a QR encoding plain demo text (not PromptPay/bank/payment data), and requires an explicit demo confirmation. The existing sign-in system is required to save a demo purchase. My purchases is available in the buyer menu and mobile navigation.

Demo purchases use existing D1 `events` records with kind `demo_purchase`, scoped to the authenticated actor. They remain separate from Supabase reservations, inventory and file entitlements. No schema changes are needed. Duplicate request IDs are idempotent; price changes, self-purchases, bad quantities and unavailable class slots are rejected on the server. Cancelling only updates the actor's demo record. Nothing charges money, notifies sellers, reserves inventory or grants access to a paid file.

The normal booking and free-resource flows remain available. A successful demo checkout is not a receipt for a real payment. `node --test scripts/checkout.test.mjs` covers quote validation and the demo-only boundary.
