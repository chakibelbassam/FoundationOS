# Cloudflare: what it gives us and what we must do

You said you will use Cloudflare overall. Here is what that actually buys, what
it does not, and the exact shape it should take for FoundationOS.

## 1. What Cloudflare enables

| Capability | What it does for us | Cost |
| --- | --- | --- |
| **Authoritative DNS** | Move the zone from GoDaddy, keep GoDaddy as registrar | Free |
| **Proxied records** | Hides the home IP, terminates TLS, absorbs attacks | Free |
| **Universal SSL** | Covers `cebsolutions.dev` **and** `*.cebsolutions.dev` | Free |
| **Cloudflare Tunnel** | Outbound-only connection; no port forwarding, no static IP | Free |
| **WebSockets / SSE** | Works through the proxy for the embedded harness | Free |
| **Access (Zero Trust)** | Identity gate (email OTP) before traffic reaches us | Free tier |
| **WAF + rate limits** | Basic protection on login and instance start | Free (limited rules) |

## 2. The wildcard detail that decides the hostnames

Universal SSL covers the **apex and first-level wildcard** only:
`cebsolutions.dev` and `*.cebsolutions.dev`.

`*.fos.cebsolutions.dev` is a **second-level** wildcard and needs Advanced
Certificate Manager or Total TLS (paid).

**Therefore use first-level hostnames:**

```
os.cebsolutions.dev              -> FoundationOS shell
oc-weather.cebsolutions.dev      -> Weather workshop
oc-calculator.cebsolutions.dev   -> Calculator workshop
```

This also makes cookies easy: set the session cookie on
`Domain=.cebsolutions.dev`. Subdomains of the same registrable domain are
**same-site**, so `SameSite=Lax` cookies work inside our iframe and are still
not sent to other sites.

## 3. Tunnel shape

```
Home PC
  127.0.0.1:4317   FoundationOS server (private, never 0.0.0.0)
        ^
        |  Host-based router (os. vs oc-*)
        |
  cloudflared (Windows service, outbound QUIC)
        |
  Cloudflare edge  ---  https://os.cebsolutions.dev
                        https://oc-weather.cebsolutions.dev
```

Ingress rules (one tunnel, host-based):

```yaml
tunnel: fos
credentials-file: C:\ProgramData\cloudflared\<id>.json
ingress:
  - hostname: os.cebsolutions.dev
    service: http://127.0.0.1:4317
  - hostname: "*.cebsolutions.dev"
    service: http://127.0.0.1:4317
  - service: http_status:404
```

DNS: a proxied CNAME for `os` and `*` pointing at `<tunnel-id>.cfargotunnel.com`.

## 4. What we must add in FoundationOS

1. **Trust proxy**: read the real client IP from `CF-Connecting-IP`; only trust
   it when the request comes from loopback (cloudflared).
2. **Host routing**: `oc-<slug>.*` selects a workshop; everything else is the
   shell. Unknown host -> 404, never a default app.
3. **Auth on every host**: a member session; workshop origins redirect to
   login, never render a shell. With accounts (D15), the session identifies a
   user; **app access is checked per request**, so a shared workshop URL still
   requires a grant. Invites are redeemed before any host renders.
4. **Cookie scope**: session cookie on `.cebsolutions.dev`, `HttpOnly`,
   `Secure`, `SameSite=Lax`.
5. **Cache bypass** for `/api/*`, `/harness/*`, WebSockets and anything with a
   session; do not let Cloudflare cache authenticated responses.
6. **Rate limits** on login and instance start; a WAF rule to block obvious
   abuse of the proxy route.
7. **HSTS** once TLS is proven, not before.
8. **Origin fallback**: local `http://127.0.0.1:4317` and LAN IP still work
   when the tunnel is down.

## 5. The Access question (be careful)

Cloudflare Access is tempting: an email OTP in front of everything. But Access
sets a **cookie per hostname**. With a workshop per app, every iframe would ask
for its own login, which breaks the embedded experience.

Recommended split:

- **Access on `os.cebsolutions.dev` only** (belt and braces for the shell), or
  not at all if our own login is solid.
- **Workshop hosts**: our own session cookie at `.cebsolutions.dev`, checked by
  the host router. They are still unreachable without login because our server
  is the only origin.
- Never put Access on `*.cebsolutions.dev`.

## 6. What Cloudflare does not solve

- **A sleeping PC.** The tunnel is offline; the phone gets an error page. There
  is no "directory" that stays up unless something else hosts it.
- **Concurrency, corruption, memory.** All product-side problems.
- **Authorisation.** Cloudflare can say "this is you"; it cannot say "you may
  edit this app".
- **Local agents.** They still connect over loopback or the LAN; they do not
  need Cloudflare.

## 7. The "directory" from the earlier plan

Your old plan had `os.cebsolutions.dev` as a **public directory** that stays up
when the home PC is offline, listing server names and routes. That matters when
there are **multiple servers**. With one PC it adds a second deployment, a
second auth story and a sync problem, for no benefit.

Lean: **skip the directory for v1**. If a second server appears, `os.` can grow
into it without changing any hostname.

## 8. Setup order (dependency-safe)

1. Add the zone in Cloudflare; import the existing records (`A @ parked`,
   `CNAME www`, `TXT _dmarc`, any MX).
2. Verify the imported records match before switching nameservers.
3. Change nameservers at GoDaddy; wait for propagation.
4. Create the tunnel, install `cloudflared` as a service, add ingress.
5. Add proxied DNS records for `os` and `*`.
6. Add host routing + auth + cookie scope in the server **before** the
   wildcard record goes live.
7. Test from cellular: shell, one workshop, one API call, one WebSocket.
8. Only then enable HSTS and (optionally) Access on `os.`.

## 9. Effort

- DNS cutover: **Ef-3** (config, verify).
- Tunnel + service: **Ef-3**.
- Host routing + cookie scope + trust proxy: **Ef-2** (security-sensitive).
- Remote test from cellular: **Ef-3** (manual steps).

## 10. Open questions

1. Is the PC allowed to be the only origin, or do you want a tiny always-on
   relay later? (Lean: PC only; accept the sleep error page.)
2. Do you want Access in front of `os.` as well as our login? (Double login is
   safe but annoying.)
3. Is `os.cebsolutions.dev` the name you want for the shell? Alternatives:
   `fos.`, `home.`, `app.`
