# 0.1 FoundationOS

**What is the smallest app folder FoundationOS can recognise and launch?**

Status: planning baseline. The scope and acceptance for the first runnable increment remain to be agreed.

## Starting journey

A person made a Weather app months ago. They find it in FoundationOS, open its folder and run it without remembering its framework or startup command. A Scrum Workspace is another possible custom web app.

## Next discussion

Use Weather to compare the proposed app folder containing source and a launcher with the existing FoundationOS convention of `app.json` and `system/`. Decide how an app is recognised, launched, reached in the browser and returned from. Review the current implementation before deciding what can be reused.

## Product direction

- Begin with web apps. Each app has its source and one way to start it.
- A signed-in user can open OpenCode from an app or folder. The URL identifies the app and launch context, while the session identifies the user. Confining an instance to the selected workspace needs further design and verification.
- Edge is envisioned as a movable widget for returning to the originating location and moving forward. Suggested destinations, dictation and controller input need exploration.
- The client should work locally and support the intended address os.subsolutions.dev, with routes such as /apps/opencode. Hosting and routing are for a later increment.
- A typical increment uses four sprints: implementation, checking, continued work and QA. Research can lead an increment when needed. Add a fifth sprint when final QA finds enough follow-up work. Priority orders work, effort informs capacity and severity informs bug priority. Automated bucket filling is a future idea.

## Shared context

Read the [product definition](../../planning/FoundationOS.md), [planning index](../../planning/README.md), and [decision log](../../planning/harness-strategy/01-decision-log.md). The existing OneDrive checkout remains a reference for current behaviour.
