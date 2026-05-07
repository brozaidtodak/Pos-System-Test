#!/usr/bin/env python3
"""
EasyStore webhook registration helper (p1_29).

Registers webhooks via API since EasyStore admin UI doesn't expose
webhook config. Idempotent — checks for existing first.

Run:
   source ~/.claude/.env
   python3 scripts/easystore_webhook_register.py [--list] [--delete <id>]

Topics registered:
   - orders/create
   - orders/cancelled
   - orders/updated
"""
import argparse, json, os, sys, urllib.request, urllib.error

EASYSTORE_BASE = "https://www.10camp.com/api/3.0"
EASYSTORE_TOKEN = os.environ.get("EASYSTORE_TOKEN")
WEBHOOK_URL = "https://pos-system-test.netlify.app/api/easystore-webhook"
TOPICS = ["orders/create", "orders/cancelled", "orders/updated"]

if not EASYSTORE_TOKEN:
    sys.exit("EASYSTORE_TOKEN not set; run: source ~/.claude/.env first")


def es(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        f"{EASYSTORE_BASE}{path}",
        data=data, method=method,
        headers={
            "EasyStore-Access-Token": EASYSTORE_TOKEN,
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} {method} {path}: {body[:300]}")
        return None


def list_webhooks():
    return es("GET", "/webhooks.json")


def create_webhook(topic):
    # EasyStore API expects "url" field (not "address" as some clones use)
    payload = {
        "webhook": {
            "url": WEBHOOK_URL,
            "topic": topic,
            "format": "json"
        }
    }
    return es("POST", "/webhooks.json", payload)


def delete_webhook(wid):
    return es("DELETE", f"/webhooks/{wid}.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="List existing webhooks only")
    ap.add_argument("--delete", help="Delete webhook by ID")
    ap.add_argument("--clear-all", action="store_true", help="Delete all webhooks first then re-register")
    args = ap.parse_args()

    print("=== EasyStore Webhook Manager ===\n")

    # List existing
    existing = list_webhooks()
    if existing is None:
        sys.exit("Failed to list webhooks. Check EASYSTORE_TOKEN.")

    webhooks = existing.get("webhooks", [])
    print(f"Currently registered: {len(webhooks)} webhook(s)")
    for w in webhooks:
        url_val = w.get('url') or w.get('address') or '(no URL)'
        print(f"  [{w.get('id')}] {w.get('topic'):<22} → {url_val}")

    if args.list:
        return

    if args.delete:
        print(f"\nDeleting webhook {args.delete}...")
        delete_webhook(args.delete)
        print("Deleted.")
        return

    if args.clear_all and webhooks:
        print(f"\nClearing {len(webhooks)} existing webhooks...")
        for w in webhooks:
            delete_webhook(w.get("id"))
        print("Cleared.")
        webhooks = []

    # Register required topics if not already present
    # API may return either 'address' or 'url' depending on version
    existing_topics = {
        w.get("topic"): w for w in webhooks
        if (w.get("address") == WEBHOOK_URL or w.get("url") == WEBHOOK_URL)
    }

    print(f"\nTarget URL: {WEBHOOK_URL}")
    print(f"Topics needed: {', '.join(TOPICS)}\n")

    created = 0
    skipped = 0
    for topic in TOPICS:
        if topic in existing_topics:
            print(f"  [skip] {topic} already registered (id {existing_topics[topic].get('id')})")
            skipped += 1
            continue
        print(f"  [new]  Registering {topic}...")
        result = create_webhook(topic)
        if result and result.get("webhook"):
            wid = result["webhook"].get("id")
            print(f"         OK — id {wid}")
            created += 1
        else:
            print(f"         FAILED")

    print(f"\nSummary: {created} created, {skipped} already existed.")
    print("\nVerify webhooks live by visiting:")
    print(f"  https://pos-system-test.netlify.app/api/easystore-webhook")


if __name__ == "__main__":
    main()
