# RS26 Speaker Kit

A standalone page that walks a speaker through posting about their talk, one
decision per screen: their session, where they're posting (LinkedIn, X,
Facebook, WhatsApp or a story), which of seven banner designs, and then the
numbered steps for that platform, with the banner and an editable post side by
side. The platform decides the banner size: landscape 1200×630 for
LinkedIn/X/Facebook, square 1080×1080 for WhatsApp, 1080×1920 for stories.

```sh
yarn speaker-kit        # -> speaker-kit/dist/index.html
```

The output is one self-contained HTML file: session data from
`src/helpers/data/data.json` and the logo are inlined. Fonts come from Google
Fonts and speaker photos from Sessionize, so it needs a network connection. Host
it anywhere, or open it straight from disk.

The wizard's state lives in the URL, so Back works and any step can be linked
to: `index.html?session=<slug>` starts a speaker on the platform step (`<slug>`
is the same as the site's `/session/<slug>` page). Optional extra parameters:
`as=<speaker index>`, `platform=<linkedin|x|facebook|whatsapp|story>`,
`design=<constellation|spotlight|terminal|ticket|bigtype|minimal|titlecard>`.

- `index.template.html`: the page, the banner templates (canvas), the post
  texts and the per-platform steps.
- `build.mjs`: inlines the data, the logo and the site's social icons into the
  template.
