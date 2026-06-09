import last1 from "../assets/sponsors-call/last-1.jpg";
import last2 from "../assets/sponsors-call/last-2.jpg";
import last3 from "../assets/sponsors-call/last-3.jpg";
import last4 from "../assets/sponsors-call/last-4.jpg";
import last5 from "../assets/sponsors-call/last-5.jpg";

export const sponsorsCall = {
  hero: {
    headlineLead: "Call for Sponsors ",
    headlineAccent: "Reversim Summit 2026",
    why: "Reversim Summit 2026 is a community driven event in Israel for software developers, product managers, data scientists and everyone else in the software industry. With an enthusiastic team of volunteers we've been creating a content-first software conferences since 2013 and successfully leading the market. Reversim Summit is not for profit and its sole purpose is to enrich the community with content and networking.",
    contactLabel: "Become a sponsor",
  },
  gallery: {
    eyebrow: "Last year's Reversim Summit",
    heading: "This is what you'd be part of",
    ariaLabel: "Photos from last year's summit",
    slides: [
      {
        src: last1,
        alt: "A sponsor booth with branded merchandise and product display",
        caption:
          "A sponsor booth turned destination — swag, demos, and the brand front-and-center.",
      },
      {
        src: last2,
        alt: "Attendees networking in a busy corridor lined with sponsor branding",
        caption:
          "Two days of corridor conversations — sponsor walls right where they happen.",
      },
      {
        src: last3,
        alt: "Packed main stage audience under stage lighting with the sponsor thank-you wall to the right",
        caption:
          "Packed main stage audience — and your logo on the big-thanks wall.",
      },
      {
        src: last4,
        alt: "Sponsor team engaging attendees at their booth",
        caption:
          "Real conversations at the booth — the people who decide the stack, in front of yours.",
      },
      {
        src: last5,
        alt: "Wide view of the expo floor lined with sponsor booths and attendees carrying tote bags",
        caption:
          "The expo floor between sessions — your booth in the line of sight.",
      },
    ],
  },
  teamCta: {
    heading: "Want to join our sponsors?",
    subline: "Reach out to our sponsors team and become part of the event.",
  },
  contacts: {
    sponsors: {
      email: {
        display: "rivka@reversim.com",
        href: "mailto:rivka@reversim.com?subject=Sponsorship Reversim Summit 2026 🤘&body=Hi Rivka, I'm interested in sponsoring Reversim Summit 2026. Can you please provide me with more information?",
      },
      phone: {
        display: "+972 052-551-6097",
        href: "tel:+972525516097",
      },
    },
  },
} as const;
