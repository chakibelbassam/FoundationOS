# FoundationOS Manual

**Version 0.1 · Local server review candidate · 25 November 2026**

## Start the local server

Install Node.js 24 or later on Windows. Open versions, then 0.1 FoundationOS, and double-click Start.cmd. The console prints a local address ending in /status. Open it in a browser to see the version and ready state. Keep the console open while you use the server. Press Ctrl+C to stop it.

## Create a private profile

Open a terminal in the same version folder. Run the command below with your chosen lowercase profile name. Keep its returned key private. The operator uses this key as a bearer credential for the profile's file operations.

```powershell
.\Start.cmd create-user alice
```

Each profile has a unique home with a profile.json file and a files directory. The default data location is %LOCALAPPDATA%/FoundationOS/development/0.1. Starting the server again there reopens the same profiles and files.

## Read and write files

GET /profile returns the profile for your key. GET /files lists its flat text files. PUT /files/weather.txt writes up to 64 KiB. GET /files/weather.txt returns its contents. Each request uses the Authorization header with the Bearer scheme. Two people can use the same filename independently.

The 0.1 acceptance check exercised the Windows launcher, restart, independent file contents, missing credentials, traversal, hard links and a directory junction. This version runs on loopback in a directory controlled by the operator. The browser client and execution of imported apps are planned in later increments.
