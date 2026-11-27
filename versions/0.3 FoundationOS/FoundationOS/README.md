# 0.3 FoundationOS — Accounts and connection

Status: in development for PI-3. This folder is the v0.3 copy of the accepted v0.2 client.

The supported pair is **client 0.3 with server 0.3**. Start the v0.3 server first; its console opens this client. The server refuses older stores.

## Library sources

- **MUI v6** for application controls, forms, dialogs, navigation and layout.
- **React Bits** for distinctive visual and motion components, vendored under `src/vendor/reactbits/`.
- **Tailwind v4** styles the React Bits components. It is imported in `src/tailwind.css` without preflight so it cannot reset MUI or `styles.css`.

`CodeSlots` (six-digit code entry) is the first v0.3 React Bits control.

## Development

```powershell
npm ci
npm test
npm run build
```

The client host serves `dist/` and proxies `/api/*` to the v0.3 server. Account, session, invitation, recovery and profile screens are being added in Sprints 2 to 5.
