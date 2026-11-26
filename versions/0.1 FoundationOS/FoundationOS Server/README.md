# FoundationOS Server 0.1

Use Node 24 or later. Double-click Start.cmd in the version folder. Its console prints a loopback status URL with the assigned port. Leave it open while using the server. Ctrl+C ends it.

In a separate terminal in the version folder, run `.\Start.cmd create-user alice`. Keep the returned random profile key private. Each user gets a distinct UUID directory containing profile.json and files. API calls use the key in the Authorization header with the Bearer scheme. GET /profile returns the key owner's identity. GET /files lists the owner's files. PUT /files/example.txt accepts up to 64 KiB of text and GET on that route returns the text as JSON. These first operations support flat file names.

Default data is under %LOCALAPPDATA%/FoundationOS/development/0.1. Set FOUNDATIONOS_DATA to an operator-owned directory for a separate test installation. Keep the store and its parents under the control of the host operator. The service does not execute user code. User process isolation is work for a later increment.
