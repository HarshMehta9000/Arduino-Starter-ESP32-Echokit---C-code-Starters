# web

The interactive teardown of `../firmware/smart_led.ino`. Next.js 16, React 19,
Tailwind 4, three.js. Requires Node 20.9 or newer.

```bash
npm install
npm run dev          # development server on :3000
npm run build        # production build
npm run verify:port  # 3080 assertions against the firmware port
npm run gen:source   # regenerate src/lib/source.ts from ../firmware
npm run media        # regenerate docs/media and public/media
```

See [AGENTS.md](AGENTS.md) for how this is put together and what not to break.
The project README is [one level up](../README.md).
