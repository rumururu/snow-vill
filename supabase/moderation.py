#!/usr/bin/env python3
"""Snow Village report handling (operator tool). Standard library only.

Every in-app report must be reviewed: the published child safety standards
(https://snow.mkideabox.com/child-safety/) promise that violating content is removed without delay.

  python3 supabase/moderation.py check            # new reports → alert mail to the operator (LaunchAgent, every 15 min)
  python3 supabase/moderation.py list             # open reports, grouped by house, oldest first
  python3 supabase/moderation.py photo HOUSE_ID   # 2-minute link to look at the reported photo
  python3 supabase/moderation.py remove HOUSE_ID --note "why"    # violation: delete the house and its photo
  python3 supabase/moderation.py dismiss HOUSE_ID --note "why"   # no violation: close its reports
  python3 supabase/moderation.py log              # recent decisions

Database access goes through the Management API with the keychain token (same as deploy.sh); storage calls use the
project's service key fetched at run time. Alert mail is sent from the company feedback account
(mkideabox-corp-process automation/feedback/gmail_feedback.py credentials) to the operator. The mail never contains
the photo. If CSAM is confirmed: remove the house, then report it (child safety page §4) — do not download the photo.
"""
import argparse
import json
import smtplib
import ssl
import subprocess
import sys
import urllib.parse
import urllib.request
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path

REF = "qfhbkfzxhldfycmcwntw"
API = f"https://api.supabase.com/v1/projects/{REF}"
URL = f"https://{REF}.supabase.co"
BUCKET = "snowvill-photos"
OPERATOR = "mkideabox@gmail.com"
FEEDBACK_MAIL_TOOL = Path("/Volumes/home_extension/mkideabox-corp-process/automation/feedback")


def mgmt_token() -> str:
    return subprocess.run(["security", "find-generic-password", "-a", "mkideabox-games-mgmt-token", "-s", "supabase", "-w"],
                          check=True, capture_output=True, text=True).stdout.strip()


def http(method, url, headers, body=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")[:500]


class Db:
    def __init__(self):
        self.auth = {"Authorization": f"Bearer {mgmt_token()}"}

    def q(self, sql):
        status, body = http("POST", f"{API}/database/query", self.auth, {"query": sql})
        if status >= 300:
            sys.exit(f"query failed HTTP{status}: {body}")
        return body

    def one(self, sql):
        rows = self.q(sql)
        return next(iter(rows[0].values())) if rows else None

    def service_key(self):
        status, keys = http("GET", f"{API}/api-keys?reveal=true", self.auth)
        if status >= 300:
            sys.exit(f"api-keys HTTP{status}")
        return next(k["api_key"] for k in keys if k["name"] == "service_role")


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def uuid_arg(s: str) -> str:
    import uuid
    return str(uuid.UUID(s))


def queue(db):
    return db.one("select snowvill_mod_queue() as q") or []


def local(ts: str) -> str:
    """Postgres timestamptz (UTC) → this Mac's local time, minutes."""
    from datetime import datetime
    return datetime.fromisoformat(ts).astimezone().strftime("%Y-%m-%d %H:%M")


def describe(h) -> str:
    reasons = [r for r in h["reasons"] if r] or ["(사유 없음)"]
    return "\n".join([
        f"- 마을 '{h['village']}' ({h['village_id']}) · 집 '{h['nickname']}' · 사진 {'있음' if h['has_photo'] else '없음'}",
        f"  한마디: {h['message'] or '(없음)'}",
        f"  신고 {h['reports']}건 / 신고자 {h['reporters']}명 · 처음 {local(h['first_at'])} · 마지막 {local(h['last_at'])}",
        f"  사유: {' | '.join(reasons)}",
        f"  house_id: {h['house_id']}",
    ])


def send_mail(subject: str, body: str):
    sys.path.insert(0, str(FEEDBACK_MAIL_TOOL))
    import gmail_feedback as gmail  # noqa: E402  (company feedback account loader; never prints the secret)
    user, password = gmail.load_credentials()
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = user, OPERATOR, subject
    msg["Date"], msg["Message-ID"] = formatdate(localtime=True), make_msgid(domain="gmail.com")
    msg.set_content(body)
    with smtplib.SMTP(gmail.SMTP_HOST, gmail.SMTP_PORT, timeout=30) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        smtp.login(user, password)
        smtp.send_message(msg)


def cmd_check(db, args):
    q = queue(db)
    new = [h for h in q if h["unnotified"]]
    if not new:
        print("no new reports")
        return
    lines = [
        f"Snow Village에 새 신고가 들어왔습니다. 확인 대기 중인 집: {len(q)}곳 (새 신고가 있는 집 {len(new)}곳).",
        "아동 안전 표준에 따라 지체 없이 확인해 주세요. 사진은 이 메일에 넣지 않습니다.",
        "",
        *[describe(h) for h in new],
        "",
        "처리 (snow-vill 저장소에서):",
        "  python3 supabase/moderation.py list",
        "  python3 supabase/moderation.py photo <house_id>      # 2분짜리 확인 링크",
        "  python3 supabase/moderation.py remove <house_id> --note \"사유\"",
        "  python3 supabase/moderation.py dismiss <house_id> --note \"사유\"",
        "아동 성착취물이 확인되면: remove 후 경찰청(ecrm.police.go.kr)·NCMEC(report.cybertip.org)에 신고. 사진을 내려받지 마세요.",
    ]
    if args.dry_run:
        print("\n".join(lines))
        return
    send_mail(f"[Snow Village] 신고 확인 필요 — 새 신고 {sum(h['unnotified'] for h in new)}건", "\n".join(lines))
    ids = [i for h in new for i in h["report_ids"]]
    n = db.one(f"select snowvill_mod_mark_notified(array[{','.join(str(int(i)) for i in ids)}]::bigint[]) as n")
    print(f"alert sent to {OPERATOR}, {n} reports marked notified")


def cmd_list(db, args):
    q = queue(db)
    print(f"open: {len(q)} houses" + ("" if q else " — nothing to review"))
    for h in q:
        print(describe(h))


def cmd_photo(db, args):
    hid = uuid_arg(args.house_id)
    path = db.one(f"select photo_path from snowvill_houses where id = {lit(hid)}")
    if not path:
        sys.exit("no photo for this house")
    key = db.service_key()
    status, body = http("POST", f"{URL}/storage/v1/object/sign/{BUCKET}/{path}",
                        {"Authorization": f"Bearer {key}", "apikey": key}, {"expiresIn": 120})
    if status >= 300:
        sys.exit(f"sign failed HTTP{status}")
    print(f"{URL}/storage/v1{body['signedURL']}   (2분 동안 유효)")


def cmd_remove(db, args):
    hid = uuid_arg(args.house_id)
    path = db.one(f"select snowvill_mod_remove({lit(hid)}, {lit(args.note)}) as p")
    if path:
        key = db.service_key()
        status, body = http("DELETE", f"{URL}/storage/v1/object/{BUCKET}",
                            {"Authorization": f"Bearer {key}", "apikey": key}, {"prefixes": [path]})
        print(f"photo delete HTTP{status}" + ("" if status < 300 else f" — {body}  (retry: the house is already gone)"))
    print(f"removed house {hid}")


def cmd_dismiss(db, args):
    hid = uuid_arg(args.house_id)
    n = db.one(f"select snowvill_mod_dismiss({lit(hid)}, {lit(args.note)}) as n")
    print(f"dismissed {n} report(s) for house {hid}")


def cmd_log(db, args):
    for r in db.q("select at, action, village_id, house_id, reports, note from snowvill_moderation_log order by id desc limit 30"):
        print(f"{local(r['at'])}  {r['action']:9}  {r['village_id']}  {r['house_id']}  reports={r['reports']}  {r['note']}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check"); c.add_argument("--dry-run", action="store_true", help="print the mail, send nothing")
    sub.add_parser("list"); sub.add_parser("log")
    sub.add_parser("photo").add_argument("house_id")
    for name in ("remove", "dismiss"):
        s = sub.add_parser(name); s.add_argument("house_id"); s.add_argument("--note", required=True)
    args = p.parse_args()
    {"check": cmd_check, "list": cmd_list, "photo": cmd_photo, "remove": cmd_remove,
     "dismiss": cmd_dismiss, "log": cmd_log}[args.cmd](Db(), args)


if __name__ == "__main__":
    main()
