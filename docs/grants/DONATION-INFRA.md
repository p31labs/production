<!-- P31-HEADER
id: p31_grant_donation_infra_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Donation Infrastructure — P31 Labs

**Layer 2 of the funding model:** donations / pay-what-you-want. This is the
**values signal**, not the revenue engine. Grants (layer 1) fund the salary;
donations show demand and credibility. Tax-deductible because P31 Labs is a
501(c)(3) (EIN 42-1888158; exemption effective **2026-04-03**, IRS Letter 947
dated **2026-05-13**; Public Charity, IRC 170(b)(1)(A)(vi); listed on IRS
Publication 78, deductibility code PC). Canonical source:
`apps/p31ca/ground-truth/content/nonprofit.json`.

**Verified:** 2026-10-11

---

## Channels

| Channel | Purpose | Tax receipt | Status |
|---|---|---|---|
| **Open Collective** | Transparent fiscal hosting; public budget; recurring | via fiscal host / P31 | [ ] to open (manual) |
| **GitHub Sponsors** | Recurring dev sponsorship on `p31labs` org | 501(c)(3) receipt | [ ] to enable (manual) |
| **BTCPay Server** | Self-hosted, no-processor crypto donations (Tor-model) | n/a (crypto) | [ ] to deploy (self-hosted) |
| **`/donate` page** | Single landing page linking all channels + 501(c)(3) language | — | [ ] to build |

## Required language (verbatim on the `/donate` page)

> P31 Labs, Inc. is a 501(c)(3) tax-exempt public charity (EIN 42-1888158).
> Contributions are tax-deductible to the extent allowed by law. Your gift funds
> free, privacy-preserving software for neurodivergent people and family
> caregivers. **The software stays free — grants and donations fund the work, we
> do not sell the software.**

## Principles

1. **Donations ≠ paywall.** No feature is ever gated on donating. If a donation
   tier implies access to software, it is out of spec.
2. **Transparency.** Open Collective's public ledger is the default for fiat;
   publish where money goes (salary, participation stipends, audit).
3. **Privacy.** The donation surface must not expose donors' identities to
   third parties beyond what the channel requires; prefer BTCPay for
   privacy-sensitive donors.
4. **No processor dependence.** BTCPay (self-hosted) insures against a fiat
   processor de-platforming the org.

## Manual steps (cannot be executed by the build agent)

- Open the Open Collective, apply for GitHub Sponsors (needs org verification),
  and deploy BTCPay. These are external-account actions for the operator.
- The `/donate` page can be built in the portal once the channel URLs exist;
  file it as portal work, not grant work.

## Build step (when channel URLs are known)

Create `/donate` route in the portal with: the verbatim language above, channel
links, and the privacy note. No payment logic in-repo — link out only.

---

`Owner: will` · `Last verified: 2026-10-11`
