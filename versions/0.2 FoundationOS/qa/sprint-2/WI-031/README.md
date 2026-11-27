# WI-031 · Active member and server in the header

Candidate `b8459c6`.

- Header keeps local time, connection chip, username and Settings together.
- Username menu marks `alice (active)`, opens Profile settings and offers Disconnect. Escape returned focus to the username button.
- Connection panel shows the address `http://127.0.0.1:54544`, expected v0.1, found v0.1, schema 2 and the last check time.
- **Expired session versus unavailable server.** Revoking a session produced `Reconnect` with “Your session expired. Connect again to continue.” at the unchanged route. Stopping the server produced `Server offline` with “Start the v0.1 FoundationOS Server, then check again.”
- **Long username at 320 px.** `alexandra-montgomery` truncates to `alexandr…` in a 62 px label, keeps the full value in `title`, and the menu shows the full name. There is no horizontal overflow. Evidence: `320-long-username-final.jpg` (the earlier `320-long-username.jpg` showed a pre-fix wrap and was replaced after the QA finding).
