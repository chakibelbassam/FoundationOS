# WI-033 · App overview and text reader

Candidate `b8459c6`.

- `/app/Weather` is a direct route: it loaded after a full reconnect and showed name, path, brief, **Open README** and **Browse files**.
- `/file/Weather/README.md` is a direct route and showed the private text.
- Back from the reader focused **Open README**; Back from the overview returned to the revealed card with **Open** focused.
- An app without a README (`Bulk-01`) shows only **Browse files** as the primary action — `overview-without-readme.jpg`.
- A missing file (`/file/Projects/alpha/notes.txt` after deletion) shows “This file is not available” with Go Home.
- A removed return target: after deleting `notes.txt` while reading it, Back landed on the empty `alpha` folder with the **alpha heading focused** and a reachable Home.
