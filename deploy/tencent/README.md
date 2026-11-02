# Tencent Cloud deployment

The static site is served at `dungeonraid.cn` and `www.dungeonraid.cn`. Requests under `/api/` are reverse proxied by Nginx to the existing `api.dungeonraid.win`; D1, KV, and verification services remain unchanged.

Prerequisites:

- DNS A records for the apex (`@`) and `www` point to the Tencent Cloud public IP. An `api` record is not needed because the game calls the same-origin `/api/` path.
- Tencent Cloud security group allows inbound TCP 80 and 443. Keep SSH restricted to the administrator's IP.
- For a Mainland China instance, the domain must have the required ICP filing before public service is enabled.
- The local `tencentcloud_ed25519` key grants `ubuntu` SSH access and sudo permission.

Deploy static files and the HTTP Nginx configuration:

```sh
bash deploy/tencent/deploy.sh ubuntu@120.53.20.149
```

After DNS A records for both apex and `www` resolve publicly and port 80 is reachable, issue and install a certificate:

```sh
ssh -i tencentcloud_ed25519 ubuntu@120.53.20.149
sudo certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --expand --redirect -d dungeonraid.cn -d www.dungeonraid.cn
```

The apex and `www` names share the site and redirect to HTTPS. The `api` record is not required for this same-origin proxy setup.
