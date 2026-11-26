# WI-040 · Release-journey QA evidence

Independent report: `../../../agents/qa/WI-040/report.md` (GLM 5.3 Flash, candidate `b8459c6`, retested on `d4a59f3`).

| Image | Scenario | Expected | Observed |
| --- | --- | --- | --- |
| `revoked-session.jpg` | Member `frank` session revoked by an admin, then the `Visible` folder opened | Server still reachable, session rejected, Connect shown at the unchanged route | Chip `Reconnect`, “Your session expired. Connect again to continue.”, requested location `/folder/Visible` |
| `server-offline.jpg` | v0.1 server stopped, client re-checks on focus | Server state distinct from an expired session, recovery instruction | Chip `Server offline`, “Start the v0.1 FoundationOS Server, then check again.”, route preserved |

Environment: Windows 11, OpenCode built-in Chromium, desktop viewport, built client on the port printed by the launcher. No token is visible in either image.
