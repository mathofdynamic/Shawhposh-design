#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly API_ROOT=/home/ubuntu/shawhposh
readonly API_RELEASES=/home/ubuntu/shawhposh/releases
readonly API_CURRENT=/home/ubuntu/shawhposh/current
readonly RUNTIME_ROOT=/opt/shawhposh
readonly RUNTIME_RELEASES=/opt/shawhposh/releases
readonly RUNTIME_CURRENT=/opt/shawhposh/current
readonly PROMOTION_HELPER=/usr/local/sbin/shawhposh-promote-release
readonly WEB_ROOT=/var/www/shawhposh
readonly WEB_RELEASES=/var/www/shawhposh/releases
readonly WEB_CURRENT=/var/www/shawhposh/current
readonly STATE_ROOT=/var/lib/shawhposh
readonly DATABASE_FILE=/var/lib/shawhposh/shawhposh.sqlite
readonly ENV_FILE=/var/lib/shawhposh/.env
readonly UPLOAD_ROOT=/var/lib/shawhposh/uploads
readonly RECEIPT_ROOT=/var/lib/shawhposh/uploads/payment-receipts
readonly BACKUP_ROOT=/var/backups/shawhposh
readonly API_UNIT=shawhposh-api.service
readonly BACKUP_UNIT=shawhposh-backup.service
readonly BACKUP_TIMER=shawhposh-backup.timer
readonly RESERVATION_UNIT=shawhposh-reservations.service
readonly RESERVATION_TIMER=shawhposh-reservations.timer
readonly REPLICATION_UNIT=shawhposh-replicate.service
readonly OLD_PRODUCTION_SHA=2ede63d7d207735dce0958464f4e6462f80494e1
readonly BOOTSTRAP_RUNTIME_SHA=c45e3c67fe986a362c4cb46e2a9859568f8b0a8f
readonly BOOTSTRAP_CONTEXT_VALUE='AUTOMATE_SHAWHPosh-v1'
readonly DOMAIN=shawhposh.ir
readonly SHA_SUDO_ARGUMENT=$(python3 -c 'print("[0-9a-f]" * 40)')
readonly OLD_SUDO_POLICY_3='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service'
readonly OLD_SUDO_POLICY_4='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service, /usr/bin/systemctl restart shawhposh-api.service'
readonly NEW_PASSWORDLESS_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx'
readonly AUTOMATED_SUDO_POLICY='Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$'
readonly NEW_SUDO_POLICY="Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
ubuntu ALL=(root) PASSWD: /usr/local/sbin/shawhposh-promote-release $SHA_SUDO_ARGUMENT"

DRY_RUN=0
BOOTSTRAP_EXECUTION=0
for argument in "$@"; do
  case "$argument" in
    --dry-run) DRY_RUN=1 ;;
    --execute-from-bootstrap) BOOTSTRAP_EXECUTION=1 ;;
    *) printf 'Usage: sudo bash ops/runtime-cutover.sh [--dry-run] [--execute-from-bootstrap]\n' >&2; exit 2 ;;
  esac
done

log() { printf '[%s] %s\n' "$1" "$2"; }
die() { log 'ABORT' "$*" >&2; on_error "${BASH_LINENO[0]:-unknown}" 1; }
need_command() { command -v "$1" >/dev/null 2>&1 || die "Required command is missing: $1"; }

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  printf '[ABORT] Run this script with sudo from the staged Shawhposh release.\n' >&2
  exit 1
fi

readonly SCRIPT_REALPATH=$(readlink -e -- "${BASH_SOURCE[0]}")
readonly SCRIPT_DIR=$(dirname -- "$SCRIPT_REALPATH")
if (( BOOTSTRAP_EXECUTION )); then
  [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]] \
    || { printf '[ABORT] Bootstrap execution requires the root bootstrap context.\n' >&2; exit 2; }
  readonly CANDIDATE_RELEASE=/home/ubuntu/shawhposh/releases/$BOOTSTRAP_RUNTIME_SHA
  readonly CANDIDATE_SHA=$BOOTSTRAP_RUNTIME_SHA
else
  readonly CANDIDATE_RELEASE=$(dirname -- "$SCRIPT_DIR")
  readonly CANDIDATE_SHA=${CANDIDATE_RELEASE##*/}
fi

SNAPSHOT_DIR=
ORIGINAL_API_RELEASE=
ORIGINAL_RUNTIME_SHA=
BACKUP_TIMER_WAS_ACTIVE=0
RESERVATION_TIMER_WAS_ACTIVE=0
CUTOVER_ACTIVE=0
CUTOVER_ACCEPTED=0
OWNERSHIP_CHANGE_STARTED=0
API_LINK_CHANGE_STARTED=0
PM2_API_STOPPED=0
API_UNIT_START_ATTEMPTED=0
UNITS_INSTALLED=0
PROMOTION_HELPER_INSTALLED=0

verify_passwordless_sudo_allowlist() {
  local listing
  listing=$(sudo -n -l -U ubuntu 2>/dev/null) || { log 'SUDO' 'Could not inspect ubuntu sudo permissions without prompting.' >&2; return 1; }
  printf '%s\n' "$listing" | python3 -c '
import re,sys
allowed=set()
for value in sys.argv[1:]:
 if value:
  prefix="ubuntu ALL=(root) NOPASSWD: "
  if not value.startswith(prefix):
   print("Invalid expected sudo policy format.",file=sys.stderr); sys.exit(2)
  allowed.add("(root) NOPASSWD: "+value[len(prefix):])
actual={re.sub(r"\s+", " ", line.strip()) for line in sys.stdin if "NOPASSWD:" in line}
if len(actual)!=1 or next(iter(actual)) not in allowed:
 print("Unexpected passwordless sudo allowlist; refusing the cutover.",file=sys.stderr)
 sys.exit(1)
' "$@"
}

verify_password_required_promotion_rule() {
  local listing
  listing=$(sudo -n -l -U ubuntu 2>/dev/null) || { log 'SUDO' 'Could not inspect promotion sudo permissions without prompting.' >&2; return 1; }
  printf '%s\n' "$listing" | python3 -c '
import re,sys
expected="/usr/local/sbin/shawhposh-promote-release "+sys.argv[1]
matches=[]
for raw in sys.stdin:
 line=re.sub(r"\s+", " ", raw.strip())
 if "/usr/local/sbin/shawhposh-promote-release" in line:
  matches.append(line)
if len(matches)!=1 or "NOPASSWD:" in matches[0]:
 print("Promotion must require owner sudo authentication exactly once.",file=sys.stderr); sys.exit(1)
line=re.sub(r"^\(root\)\s+(?:PASSWD:\s+)?", "", matches[0])
if line!=expected:
 print("Promotion sudo rule is not limited to one 40-hex SHA argument.",file=sys.stderr); sys.exit(1)
' "$SHA_SUDO_ARGUMENT"
}

pm2_as_ubuntu() {
  runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 "$@"
}

health_json() {
  curl --fail --silent --show-error --max-time 8 \
    --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health"
}

health_is_connected() {
  health_json | python3 -c 'import json,sys; d=json.load(sys.stdin); ok=d.get("status")=="ok" and d.get("database")=="connected"; print("status=%s database=%s version=%s" % (d.get("status","unknown"),d.get("database","unknown"),d.get("version","unknown"))); sys.exit(0 if ok else 1)'
}

health_has_version() {
  local expected=$1
  health_json | python3 -c 'import json,sys; d=json.load(sys.stdin); ok=d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1]; print("expected_version=%s actual_version=%s"%(sys.argv[1],d.get("version","unknown"))); sys.exit(0 if ok else 1)' "$expected"
}

verify_public_catalog() {
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/products" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); products=d.get("products",[]); ok=len(products)==6 and all(p.get("variants") for p in products); print("public_products=%d" % len(products)); sys.exit(0 if ok else 1)'
}

pm2_api_check() {
  pm2_as_ubuntu jlist | python3 -c '
import json,sys
apps=json.load(sys.stdin)
matches=[p for p in apps if p.get("name")=="shawhposh-api"]
if len(matches)!=1:
 print("Expected exactly one PM2 process named shawhposh-api",file=sys.stderr); sys.exit(1)
p=matches[0]
status=p.get("pm2_env",{}).get("status","unknown")
pid=p.get("pid",0)
print("name=shawhposh-api status=%s pid=%s" % (status,pid))
sys.exit(0 if status=="online" and int(pid)>0 else 1)
'
}

pm2_api_owner_check() {
  local info pid owner
  info=$(pm2_api_check)
  printf '%s\n' "$info"
  pid=${info##*pid=}
  [[ $pid =~ ^[1-9][0-9]*$ ]] || die 'Could not determine the PM2 API PID.'
  owner=$(ps -o user= -p "$pid" | awk '{$1=$1; print}')
  [[ $owner == ubuntu ]] || die "The current PM2 API process owner is $owner, expected ubuntu."
}

pm2_other_snapshot() {
  pm2_as_ubuntu jlist | python3 -c '
import json,sys
apps=json.load(sys.stdin)
items=sorted((p.get("name",""),int(p.get("pid",0)),p.get("pm2_env",{}).get("status","unknown")) for p in apps if p.get("name")!="shawhposh-api")
print(json.dumps(items,separators=(",",":")))
'
}

pm2_api_exists() {
  pm2_as_ubuntu jlist | python3 -c 'import json,sys; apps=json.load(sys.stdin); sys.exit(0 if any(p.get("name")=="shawhposh-api" for p in apps) else 1)'
}

pm2_api_metadata() {
  pm2_as_ubuntu jlist | python3 -c '
import json,sys
apps=[p for p in json.load(sys.stdin) if p.get("name")=="shawhposh-api"]
if len(apps)!=1: sys.exit("Expected exactly one PM2 API process for rollback metadata.")
p=apps[0]; e=p.get("pm2_env",{})
keys=("pm_cwd","pm_exec_path","exec_interpreter","exec_mode","instances","node_args","args","autorestart","max_restarts","restart_delay","kill_timeout")
out={"name":p.get("name"),"pid":p.get("pid"),"status":e.get("status"),"config":{k:e.get(k) for k in keys}}
print(json.dumps(out,sort_keys=True,separators=(",",":")))
'
}

assert_real_directory() {
  local expected=$1 actual
  [[ -d $expected && ! -L $expected ]] || die "Required directory is missing or is a symlink: $expected"
  actual=$(realpath -e -- "$expected")
  [[ $actual == "$expected" ]] || die "Unexpected canonical path for $expected: $actual"
}

assert_regular_file() {
  local file=$1
  [[ -f $file && ! -L $file ]] || die "Required file is missing, non-regular, or a symlink: $file"
}

assert_private_file() {
  local file=$1
  assert_regular_file "$file"
  [[ $(stat -c '%h' -- "$file") == 1 ]] || die "Refusing a hard-linked protected file: $file"
}

assert_source_file() {
  local file=$1 mode
  assert_regular_file "$file"
  [[ $(stat -c '%U' -- "$file") == ubuntu ]] || die "Release source is not owned by ubuntu: $file"
  mode=$(stat -c '%a' -- "$file")
  [[ $mode =~ ^[0-7]{3,4}$ ]] || die "Could not inspect source permissions: $file"
  (( (8#$mode & 0022) == 0 )) || die "Release source is group/world writable: $file"
}

validate_automated_sudo_policy() {
  local policy_file=$CANDIDATE_RELEASE/ops/sudoers.d/ubuntu-shawhposh
  assert_source_file "$policy_file"
  printf '%s\n' "$AUTOMATED_SUDO_POLICY" | cmp -s - "$policy_file" \
    || die 'The prepared automated-deploy sudo policy differs from the reviewed SHA-only allowlist.'
}

check_env_value_without_printing() {
  local key=$1 expected=$2
  python3 - "$ENV_FILE" "$key" "$expected" <<'PY'
import sys
path, wanted, expected = sys.argv[1:]
found = []
with open(path, encoding='utf-8') as stream:
    for line in stream:
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        if stripped.startswith('export '):
            stripped = stripped[7:].lstrip()
        name, separator, value = stripped.partition('=')
        if separator and name.strip() == wanted:
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            found.append(value)
if len(found) != 1 or found[0] != expected:
    print(f'{wanted}=invalid-or-ambiguous', file=sys.stderr)
    sys.exit(1)
print(f'{wanted}=verified')
PY
}

backup_pair() {
  python3 - "$BACKUP_ROOT" <<'PY'
import os,re,sys
from pathlib import Path
root=Path(sys.argv[1])
db=re.compile(r'^shawhposh-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.sqlite$')
receipts=re.compile(r'^payment-receipts-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.tar\.gz$')
databases={}; archives={}
for entry in root.iterdir():
    if db.fullmatch(entry.name): databases[db.fullmatch(entry.name).group(1)]=entry
    match=receipts.fullmatch(entry.name)
    if match: archives[match.group(1)]=entry
matching=sorted(databases.keys() & archives.keys())
if not matching:
    sys.exit(1)
stamp=matching[-1]
print(f'{databases[stamp]}\t{archives[stamp]}')
PY
}

verify_database() {
  local file=$1 database_kind=${2:-live}
  [[ $database_kind == live || $database_kind == backup ]] || die 'Database verification kind is invalid.'
  python3 - "$file" "$database_kind" <<'PY'
import json,sqlite3,sys
from pathlib import Path
path=Path(sys.argv[1]).resolve(strict=True)
uri=path.as_uri()+'?mode=ro'
if sys.argv[2]=='backup':
    uri+='&immutable=1'
db=sqlite3.connect(uri,uri=True)
try:
    db.execute('BEGIN')
    integrity=db.execute('PRAGMA integrity_check').fetchone()[0]
    fk_errors=db.execute('PRAGMA foreign_key_check').fetchall()
    expected={
      'products':6,
      'product_variants':67,
      'inventory':67,
      'orders':0,
      'payment_attempts':0,
      'manual_payment_receipts':0,
      'shipping_methods':0,
    }
    counts={table:db.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] for table in expected}
finally:
    db.close()
print(json.dumps({'integrity':integrity,'foreignKeyErrors':len(fk_errors),'counts':counts},separators=(',',':')))
if integrity!='ok' or fk_errors or counts!=expected:
    sys.exit(1)
PY
}

verify_backup_pair() {
  local pair=$1 db_file archive_file
  IFS=$'\t' read -r db_file archive_file <<< "$pair"
  [[ -n $db_file && -n $archive_file ]] || die 'Backup pair was not identified.'
  for file in "$db_file" "$archive_file"; do
    [[ $(dirname -- "$file") == "$BACKUP_ROOT" && -f $file && ! -L $file && -s $file && $(stat -c '%h' -- "$file") == 1 ]] || die "Unsafe or empty backup artifact: $file"
    [[ $(stat -c '%a' -- "$file") == 600 ]] || die "Backup artifact permissions are not 0600: $file"
  done
  for suffix in -wal -shm -journal; do
    [[ ! -e "$db_file$suffix" && ! -L "$db_file$suffix" ]] || die "Unexpected SQLite backup sidecar: $db_file$suffix"
  done
  verify_database "$db_file" backup
  tar -tzf "$archive_file" >/dev/null || die 'Receipt archive integrity check failed.'
  sha256sum -- "$db_file" "$archive_file"
}

verify_exact_tree_contents() {
  local directory=$1 kind=$2 entry name
  while IFS= read -r -d '' entry; do
    name=${entry##*/}
    case "$kind:$name" in
      receipt:*)
        [[ -f $entry && ! -L $entry && $(stat -c '%h' -- "$entry") == 1 ]] || die "Unexpected or hard-linked entry under receipt storage: $name"
        ;;
      state:.env)
        [[ -f $entry && ! -L $entry && $(stat -c '%h' -- "$entry") == 1 ]] || die 'Unexpected environment file type or hard link.'
        ;;
      state:shawhposh.sqlite)
        [[ -f $entry && ! -L $entry && $(stat -c '%h' -- "$entry") == 1 ]] || die 'Unexpected database file type or hard link.'
        ;;
      state:shawhposh.sqlite-wal|state:shawhposh.sqlite-shm|state:shawhposh.sqlite-journal)
        [[ -f $entry && ! -L $entry && $(stat -c '%h' -- "$entry") == 1 ]] || die "Unexpected SQLite sidecar type or hard link: $name"
        ;;
      state:uploads)
        [[ -d $entry && ! -L $entry ]] || die 'Unexpected uploads path type.'
        ;;
      upload:payment-receipts)
        [[ -d $entry && ! -L $entry ]] || die 'Unexpected payment receipt directory type.'
        ;;
      backup:*)
        [[ $name =~ ^shawhposh-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}\.[0-9]{3}Z\.sqlite$ \
          || $name =~ ^payment-receipts-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}\.[0-9]{3}Z\.tar\.gz$ ]] \
          || die "Unexpected backup filename: $name"
        [[ -f $entry && ! -L $entry && $(stat -c '%h' -- "$entry") == 1 && $(stat -c '%U:%G:%a' -- "$entry") == 'ubuntu:ubuntu:600' ]] \
          || die "Unexpected backup artifact type or ownership: $name"
        ;;
      *) die "Unexpected entry under $directory: $name" ;;
    esac
  done < <(find -P "$directory" -mindepth 1 -maxdepth 1 -print0)
}

snapshot_unit() {
  local unit=$1 path=/etc/systemd/system/$1
  if [[ -e $path || -L $path ]]; then
    [[ -f $path && ! -L $path ]] || die "Unexpected systemd unit path type: $path"
    cp -p -- "$path" "$SNAPSHOT_DIR/$unit"
    printf 'present\n' > "$SNAPSHOT_DIR/$unit.state"
  else
    printf 'absent\n' > "$SNAPSHOT_DIR/$unit.state"
  fi
}

restore_unit() {
  local unit=$1 path=/etc/systemd/system/$1 state
  state=$(<"$SNAPSHOT_DIR/$unit.state")
  if [[ $state == present ]]; then
    if [[ -e $path || -L $path ]]; then
      [[ -f $path && ! -L $path ]] || { log 'ROLLBACK' "Unexpected unit path type: $path"; return 1; }
    fi
    install -o root -g root -m "$(stat -c '%a' -- "$SNAPSHOT_DIR/$unit")" -- "$SNAPSHOT_DIR/$unit" "$path"
  elif [[ $state == absent ]]; then
    if [[ -e $path || -L $path ]]; then
      [[ -f $path && ! -L $path ]] || { log 'ROLLBACK' "Refusing to unlink an unexpected unit path: $path"; return 1; }
      unlink -- "$path"
    fi
  else
    log 'ROLLBACK' "Unknown saved state for $unit; leaving it untouched."
    return 1
  fi
}

restore_sudo_policy() {
  local target=/etc/sudoers.d/ubuntu-shawhposh state
  state=$(<"$SNAPSHOT_DIR/ubuntu-shawhposh.state")
  if [[ $state == present ]]; then
    if [[ -e $target || -L $target ]]; then
      [[ -f $target && ! -L $target ]] || { log 'SUDO' 'Refusing to replace an unexpected sudoers path during rollback.'; return 1; }
    fi
    install -o root -g root -m 0440 -- "$SNAPSHOT_DIR/ubuntu-shawhposh" "$target"
  elif [[ $state == absent ]]; then
    if [[ -e $target || -L $target ]]; then
      [[ -f $target && ! -L $target ]] || { log 'SUDO' 'Refusing to unlink an unexpected sudoers path during rollback.'; return 1; }
      unlink -- "$target"
    fi
  else
    log 'SUDO' 'Saved sudo policy state is ambiguous; leaving the installed policy untouched.'
    return 1
  fi
}

restore_promotion_helper() {
  local target=$PROMOTION_HELPER state
  state=$(<"$SNAPSHOT_DIR/promotion-helper.state")
  if [[ $state == present ]]; then
    if [[ -e $target || -L $target ]]; then
      [[ -f $target && ! -L $target ]] || { log 'ROLLBACK' "Unexpected promotion-helper path type: $target"; return 1; }
    fi
    install -o root -g root -m 0755 -- "$SNAPSHOT_DIR/promotion-helper" "$target"
  elif [[ $state == absent ]]; then
    if [[ -e $target || -L $target ]]; then
      [[ -f $target && ! -L $target && $(stat -c '%U:%G' -- "$target") == 'root:root' ]] \
        || { log 'ROLLBACK' "Refusing to unlink an unexpected promotion helper: $target"; return 1; }
      unlink -- "$target"
    fi
  else
    log 'ROLLBACK' 'Saved promotion-helper state is ambiguous; leaving it untouched.'
    return 1
  fi
}

restore_runtime_ownership_to_ubuntu() {
  log 'ROLLBACK' 'Restoring the pre-cutover ubuntu ownership model.'
  for path in "$STATE_ROOT" "$BACKUP_ROOT" "$UPLOAD_ROOT" "$RECEIPT_ROOT"; do
    [[ -d $path && ! -L $path ]] || { log 'ROLLBACK' "Unsafe directory during ownership rollback: $path"; return 1; }
  done
  [[ -f $DATABASE_FILE && ! -L $DATABASE_FILE && -f $ENV_FILE && ! -L $ENV_FILE ]] \
    || { log 'ROLLBACK' 'Database or environment file changed type during rollback.'; return 1; }
  chown root:root -- "$STATE_ROOT" "$BACKUP_ROOT" || return 1
  chmod 0700 -- "$STATE_ROOT" "$BACKUP_ROOT" || return 1
  chown ubuntu:ubuntu -- "$DATABASE_FILE"
  chmod 0600 -- "$DATABASE_FILE"
  for suffix in -wal -shm -journal; do
    if [[ -e $DATABASE_FILE$suffix || -L $DATABASE_FILE$suffix ]]; then
      [[ -f $DATABASE_FILE$suffix && ! -L $DATABASE_FILE$suffix && $(stat -c '%h' -- "$DATABASE_FILE$suffix") == 1 ]] || return 1
      chown ubuntu:ubuntu -- "$DATABASE_FILE$suffix"
      chmod 0600 -- "$DATABASE_FILE$suffix"
    fi
  done
  chown ubuntu:ubuntu -- "$ENV_FILE"
  chmod 0600 -- "$ENV_FILE"
  chown ubuntu:ubuntu -- "$RECEIPT_ROOT" "$UPLOAD_ROOT"
  chmod 0700 -- "$RECEIPT_ROOT" "$UPLOAD_ROOT"
  find -P "$RECEIPT_ROOT" -mindepth 1 -maxdepth 1 -type f -exec chown ubuntu:ubuntu -- {} +
  find -P "$RECEIPT_ROOT" -mindepth 1 -maxdepth 1 -type f -exec chmod 0600 -- {} +
  local file
  for file in "$BACKUP_ROOT"/shawhposh-*.sqlite "$BACKUP_ROOT"/payment-receipts-*.tar.gz; do
    [[ -e $file || -L $file ]] || continue
    [[ -f $file && ! -L $file ]] || return 1
    chown ubuntu:ubuntu -- "$file"
    chmod 0600 -- "$file"
  done
  chown ubuntu:ubuntu -- "$BACKUP_ROOT" "$STATE_ROOT"
  chmod 0700 -- "$BACKUP_ROOT" "$STATE_ROOT"
  [[ -d $WEB_ROOT && ! -L $WEB_ROOT && -d $WEB_RELEASES && ! -L $WEB_RELEASES && -L $WEB_CURRENT ]] \
    || { log 'ROLLBACK' 'Frontend release tree changed type during ownership rollback.'; return 1; }
  chown ubuntu:ubuntu -- "$WEB_ROOT" "$WEB_RELEASES"
  chown -h ubuntu:ubuntu -- "$WEB_CURRENT"
  find -P "$WEB_RELEASES" -xdev -type d -exec chown ubuntu:ubuntu -- {} + -exec chmod 0755 -- {} +
  find -P "$WEB_RELEASES" -xdev -type f -exec chown ubuntu:ubuntu -- {} + -exec chmod 0644 -- {} +
  chmod 0755 -- "$WEB_ROOT" "$WEB_RELEASES"
  log 'ROLLBACK' 'Restored the pre-cutover ubuntu ownership of the static release tree.'
}

restore_old_timers() {
  if (( BACKUP_TIMER_WAS_ACTIVE )); then
    systemctl enable "$BACKUP_TIMER" >/dev/null || return 1
    systemctl start "$BACKUP_TIMER" || return 1
  fi
  if (( RESERVATION_TIMER_WAS_ACTIVE )); then
    systemctl enable "$RESERVATION_TIMER" >/dev/null || return 1
    systemctl start "$RESERVATION_TIMER" || return 1
  fi
}

rollback_incomplete_cutover() {
  local rollback_ok=1
  log 'ROLLBACK' 'The new API did not complete acceptance checks; restoring the prior release and PM2 API.'
  if (( API_LINK_CHANGE_STARTED )); then
    if [[ -x $PROMOTION_HELPER ]]; then
      "$PROMOTION_HELPER" "$OLD_PRODUCTION_SHA" || rollback_ok=0
    else
      rollback_ok=0
    fi
    [[ -L $RUNTIME_CURRENT && $(readlink -e -- "$RUNTIME_CURRENT") == "$RUNTIME_RELEASES/$OLD_PRODUCTION_SHA" ]] || rollback_ok=0
  fi
  if (( API_UNIT_START_ATTEMPTED )); then
    systemctl stop "$API_UNIT" >/dev/null 2>&1 || true
    if systemctl is-enabled --quiet "$API_UNIT"; then
      systemctl disable "$API_UNIT" >/dev/null || rollback_ok=0
    fi
  fi
  if (( OWNERSHIP_CHANGE_STARTED )); then
    restore_runtime_ownership_to_ubuntu || rollback_ok=0
  fi
  if (( UNITS_INSTALLED )) && [[ -n $SNAPSHOT_DIR ]]; then
    for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
      restore_unit "$unit" || rollback_ok=0
    done
    systemctl daemon-reload || rollback_ok=0
  fi
  if (( PROMOTION_HELPER_INSTALLED )) && [[ -n $SNAPSHOT_DIR ]]; then
    restore_promotion_helper || rollback_ok=0
  fi
  if (( PM2_API_STOPPED )); then
    if pm2_api_exists; then
      pm2_as_ubuntu restart shawhposh-api >/dev/null || rollback_ok=0
    else
      local legacy_ecosystem=$API_RELEASES/$OLD_PRODUCTION_SHA/ops/ecosystem.cjs
      if [[ -f $legacy_ecosystem && ! -L $legacy_ecosystem ]]; then
        pm2_as_ubuntu start "$legacy_ecosystem" --only shawhposh-api >/dev/null || rollback_ok=0
        pm2_as_ubuntu save >/dev/null || rollback_ok=0
      else
        log 'ROLLBACK' 'The verified legacy PM2 ecosystem file is missing; cannot recreate the deleted PM2 entry.'
        rollback_ok=0
      fi
    fi
    health_is_connected >/dev/null || rollback_ok=0
  fi
  restore_old_timers || rollback_ok=0
  if (( rollback_ok )); then
    log 'ROLLBACK' 'Prior PM2 API, data ownership, unit files, and active timers were restored.'
  else
    log 'ROLLBACK' 'Automatic rollback was incomplete. Keep this SSH session open and use the root snapshot at: '"$SNAPSHOT_DIR"
  fi
}

on_error() {
  local line=${1:-unknown} status=${2:-1}
  trap - ERR
  if (( CUTOVER_ACTIVE && !CUTOVER_ACCEPTED )); then
    rollback_incomplete_cutover || true
  elif (( CUTOVER_ACTIVE )); then
    log 'FAIL' 'Runtime acceptance already passed; the healthy systemd runtime was preserved.'
  fi
  log 'FAIL' "Stopped at line $line with exit status $status. Review logs before retrying."
  exit "$status"
}
trap 'on_error "$LINENO" "$?"' ERR

validate_preflight() {
  log 'PRECHECK' 'Checking identity, fixed paths, release artifacts, health, timers, and configuration.'
  for command_name in awk chown chmod cmp cp curl date df dirname find getent install id ln mv node passwd pm2 ps python3 realpath readlink runuser sha256sum sleep stat sudo systemctl systemd-analyze tar unlink useradd visudo xargs; do
    need_command "$command_name"
  done
  [[ -x /usr/bin/pm2 && -x /usr/bin/node ]] || die 'Expected Node and PM2 executables are unavailable.'
  [[ -x /usr/sbin/runuser ]] || die 'runuser is unavailable.'
  [[ -x /usr/bin/env && -x /usr/bin/ps && -x /usr/bin/sudo && -x /usr/sbin/nginx ]] || die 'A required system utility is unavailable.'
  for path in "$STATE_ROOT" "$API_ROOT" "$WEB_ROOT" "$BACKUP_ROOT"; do assert_real_directory "$path"; done
  assert_real_directory "$API_RELEASES"
  assert_real_directory "$WEB_RELEASES"
  assert_real_directory /opt
  assert_real_directory /usr/local/sbin
  [[ $(stat -c '%U:%G:%a' /opt) == 'root:root:755' ]] || die '/opt ownership or mode is unexpected.'
  if [[ -e $RUNTIME_ROOT || -L $RUNTIME_ROOT ]]; then
    assert_real_directory "$RUNTIME_ROOT"
    [[ $(stat -c '%U:%G:%a' "$RUNTIME_ROOT") == 'root:root:755' ]] || die 'Protected runtime root ownership or mode is unexpected.'
    if [[ -e $RUNTIME_RELEASES || -L $RUNTIME_RELEASES ]]; then
      assert_real_directory "$RUNTIME_RELEASES"
      [[ $(stat -c '%U:%G:%a' "$RUNTIME_RELEASES") == 'root:root:755' ]] || die 'Protected runtime releases ownership or mode is unexpected.'
    elif [[ -e $RUNTIME_CURRENT || -L $RUNTIME_CURRENT ]]; then
      die 'Runtime current exists without its protected releases directory.'
    fi
    if [[ -e $RUNTIME_CURRENT || -L $RUNTIME_CURRENT ]]; then
      [[ -L $RUNTIME_CURRENT && $(stat -c '%U:%G:%F' -- "$RUNTIME_CURRENT") == 'root:root:symbolic link' ]] \
        || die 'Runtime current is not a root-owned symlink.'
      local runtime_target
      runtime_target=$(readlink -e -- "$RUNTIME_CURRENT")
      [[ $(dirname -- "$runtime_target") == "$RUNTIME_RELEASES" && $(basename -- "$runtime_target") =~ ^[0-9a-f]{40}$ ]] \
        || die 'Runtime current points outside a SHA-named protected release.'
      [[ $(stat -c '%U:%G:%a' -- "$runtime_target") == 'root:root:755' ]] || die 'Active runtime release is not root-owned and protected.'
      ORIGINAL_RUNTIME_SHA=$(basename -- "$runtime_target")
    fi
  fi
  [[ $(dirname -- "$CANDIDATE_RELEASE") == "$API_RELEASES" && -d $CANDIDATE_RELEASE && ! -L $CANDIDATE_RELEASE ]] \
    || die 'Run this script from the staged, versioned API release directory.'
  [[ $CANDIDATE_SHA =~ ^[0-9a-f]{40}$ ]] || die 'The staged API release directory must be named by its 40-character commit SHA.'
  [[ $(realpath -e -- "$CANDIDATE_RELEASE") == "$CANDIDATE_RELEASE" ]] || die 'The staged API release resolves through an unexpected symlink.'
  [[ $(stat -c '%U' -- "$CANDIDATE_RELEASE") == ubuntu ]] || die 'The staged API release must remain ubuntu-managed.'
  [[ -f $CANDIDATE_RELEASE/package.json && -d $CANDIDATE_RELEASE/node_modules \
    && -f $CANDIDATE_RELEASE/server-dist/index.js && -f $CANDIDATE_RELEASE/server-dist/db/backup.js \
    && -f $CANDIDATE_RELEASE/server-dist/modules/orders/expire-reservations.js \
    && -f $CANDIDATE_RELEASE/ops/replicate-backups.mjs ]] || die 'The staged release is missing required runtime artifacts.'
  assert_source_file "$CANDIDATE_RELEASE/package.json"
  [[ $(stat -c '%U' -- "$CANDIDATE_RELEASE/node_modules") == ubuntu && ! -L $CANDIDATE_RELEASE/node_modules ]] \
    || die 'The staged node_modules directory must be a real ubuntu-managed directory.'
  for artifact in "$CANDIDATE_RELEASE/server-dist/index.js" "$CANDIDATE_RELEASE/server-dist/db/backup.js" \
    "$CANDIDATE_RELEASE/server-dist/modules/orders/expire-reservations.js"; do
    assert_source_file "$artifact"
  done
  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
    assert_source_file "$CANDIDATE_RELEASE/ops/$unit"
  done
  validate_automated_sudo_policy
  assert_source_file "$CANDIDATE_RELEASE/ops/runtime-cutover.sh"
  assert_source_file "$CANDIDATE_RELEASE/ops/promote_release.py"
  assert_source_file "$CANDIDATE_RELEASE/ops/replicate-backups.mjs"
  visudo -cf /etc/sudoers >/dev/null || die 'The existing sudo policy does not validate.'
  local current_sudo_policy=/etc/sudoers.d/ubuntu-shawhposh
  if [[ -e $current_sudo_policy || -L $current_sudo_policy ]]; then
    [[ -f $current_sudo_policy && ! -L $current_sudo_policy ]] || die 'The existing Shawhposh sudo policy has an unexpected file type.'
    [[ $(<"$current_sudo_policy") == "$OLD_SUDO_POLICY_3" || $(<"$current_sudo_policy") == "$OLD_SUDO_POLICY_4" \
      || $(<"$current_sudo_policy") == "$NEW_SUDO_POLICY" ]] \
      || die 'The existing Shawhposh sudo policy differs from the reviewed pre-cutover allowlists.'
    [[ $(stat -c '%U:%G:%a' -- "$current_sudo_policy") == 'root:root:440' ]] || die 'The existing Shawhposh sudo policy permissions are unexpected.'
    visudo -cf "$current_sudo_policy" >/dev/null || die 'The existing Shawhposh sudo policy does not validate.'
  fi
  verify_passwordless_sudo_allowlist "$OLD_SUDO_POLICY_3" "$OLD_SUDO_POLICY_4" "$NEW_PASSWORDLESS_POLICY"
  assert_private_file "$DATABASE_FILE"
  assert_private_file "$ENV_FILE"
  check_env_value_without_printing DATABASE_PATH "$DATABASE_FILE"
  check_env_value_without_printing PAYMENT_RECEIPT_DIR "$RECEIPT_ROOT"
  assert_real_directory "$UPLOAD_ROOT"
  assert_real_directory "$RECEIPT_ROOT"
  verify_exact_tree_contents "$RECEIPT_ROOT" receipt
  verify_exact_tree_contents "$STATE_ROOT" state
  verify_exact_tree_contents "$UPLOAD_ROOT" upload
  verify_exact_tree_contents "$BACKUP_ROOT" backup
  verify_database "$DATABASE_FILE" live
  [[ ! -e /etc/shawhposh/offsite.env && ! -L /etc/shawhposh/offsite.env \
    && ! -e /etc/shawhposh/rclone.conf && ! -L /etc/shawhposh/rclone.conf ]] \
    || die 'Off-host config already exists; refusing to install a backup OnSuccess hook.'
  [[ -L $API_CURRENT ]] || die 'The legacy PM2 API current path is not the expected staging symlink.'
  ORIGINAL_API_RELEASE=$(readlink -e -- "$API_CURRENT")
  [[ $(dirname -- "$ORIGINAL_API_RELEASE") == "$API_RELEASES" && -d $ORIGINAL_API_RELEASE ]] || die 'API current points outside the versioned release tree.'
  [[ $(basename -- "$ORIGINAL_API_RELEASE") == "$OLD_PRODUCTION_SHA" || $ORIGINAL_API_RELEASE == "$CANDIDATE_RELEASE" ]] \
    || die 'The active API release changed from the reviewed production baseline.'
  assert_real_directory "$API_RELEASES/$OLD_PRODUCTION_SHA"
  [[ -f $API_RELEASES/$OLD_PRODUCTION_SHA/package.json && -d $API_RELEASES/$OLD_PRODUCTION_SHA/node_modules \
    && -f $API_RELEASES/$OLD_PRODUCTION_SHA/server-dist/index.js \
    && -f $API_RELEASES/$OLD_PRODUCTION_SHA/server-dist/db/backup.js \
    && -f $API_RELEASES/$OLD_PRODUCTION_SHA/server-dist/modules/orders/expire-reservations.js \
    && -f $API_RELEASES/$OLD_PRODUCTION_SHA/ops/replicate-backups.mjs \
    && -f $API_RELEASES/$OLD_PRODUCTION_SHA/ops/ecosystem.cjs && ! -L $API_RELEASES/$OLD_PRODUCTION_SHA/ops/ecosystem.cjs ]] \
    || die 'The known-good production API rollback release is missing required runtime artifacts.'
  [[ -L $WEB_CURRENT ]] || die 'The frontend current path is not the expected deployment symlink.'
  local web_target
  web_target=$(readlink -e -- "$WEB_CURRENT")
  [[ $(dirname -- "$web_target") == "$WEB_RELEASES" && -f $web_target/index.html ]] || die 'Frontend current points outside its expected release tree.'
  [[ $(stat -c '%U:%G:%a' -- "$WEB_ROOT") == 'ubuntu:ubuntu:755' \
    && $(stat -c '%U:%G:%a' -- "$WEB_RELEASES") == 'ubuntu:ubuntu:755' \
    && $(stat -c '%U:%G' -- "$WEB_CURRENT") == 'ubuntu:ubuntu' ]] \
    || die 'Frontend root ownership differs from the reviewed pre-cutover model.'
  local frontend_problem
  frontend_problem=$(find -P "$WEB_RELEASES" -xdev \
    \( -type d \( ! -user ubuntu -o ! -group ubuntu -o ! -perm 0755 \) \
      -o -type f \( ! -user ubuntu -o ! -group ubuntu -o ! -perm 0644 -o -links +1 \) \
      -o \( ! -type d -a ! -type f \) \) -print -quit)
  [[ -z $frontend_problem ]] || die "Frontend release tree is not a regular ubuntu-owned static tree: $frontend_problem"
  [[ $(stat -c '%U:%G:%a' -- "$STATE_ROOT") == 'ubuntu:ubuntu:700' ]] || die 'Persistent-state directory differs from the reviewed pre-cutover ownership.'
  [[ $(stat -c '%U:%G:%a' -- "$DATABASE_FILE") == 'ubuntu:ubuntu:600' ]] || die 'Database ownership differs from the reviewed pre-cutover ownership.'
  [[ $(stat -c '%U:%G:%a' -- "$ENV_FILE") == 'ubuntu:ubuntu:600' ]] || die 'Environment-file ownership differs from the reviewed pre-cutover ownership.'
  [[ $(stat -c '%U:%G:%a' -- "$BACKUP_ROOT") == 'ubuntu:ubuntu:700' ]] || die 'Backup directory ownership differs from the reviewed pre-cutover ownership.'
  [[ $(stat -c '%U:%G:%a' -- "$UPLOAD_ROOT") == 'ubuntu:ubuntu:700' ]] || die 'Upload directory ownership differs from the reviewed pre-cutover ownership.'
  [[ $(stat -c '%U:%G:%a' -- "$RECEIPT_ROOT") == 'ubuntu:ubuntu:700' ]] || die 'Receipt directory ownership differs from the reviewed pre-cutover ownership.'
  for suffix in -wal -shm -journal; do
    if [[ -e $DATABASE_FILE$suffix || -L $DATABASE_FILE$suffix ]]; then
      assert_private_file "$DATABASE_FILE$suffix"
      [[ $(stat -c '%U:%G:%a' -- "$DATABASE_FILE$suffix") == 'ubuntu:ubuntu:600' ]] || die "SQLite sidecar ownership/mode is unexpected: $DATABASE_FILE$suffix"
    fi
  done
  if [[ -e $PROMOTION_HELPER || -L $PROMOTION_HELPER ]]; then
    [[ -f $PROMOTION_HELPER && ! -L $PROMOTION_HELPER && $(stat -c '%U:%G:%a' -- "$PROMOTION_HELPER") == 'root:root:755' ]] \
      || die 'Existing root promotion helper has an unexpected owner, mode, or file type.'
  fi
  getent passwd www-data >/dev/null || die 'Nginx worker identity www-data is missing.'
  systemctl is-active --quiet nginx || die 'Nginx is not active.'
  systemctl is-active --quiet auditd || die 'auditd is not active.'
  /usr/sbin/nginx -t >/dev/null || die 'Nginx configuration validation failed.'
  systemctl is-active --quiet "$BACKUP_TIMER" || die 'The existing backup timer is not active.'
  systemctl is-active --quiet "$RESERVATION_TIMER" || die 'The existing reservation timer is not active.'
  systemctl is-enabled --quiet "$BACKUP_TIMER" || die 'The existing backup timer is not enabled.'
  systemctl is-enabled --quiet "$RESERVATION_TIMER" || die 'The existing reservation timer is not enabled.'
  if systemctl is-active --quiet "$API_UNIT" || systemctl is-enabled --quiet "$API_UNIT"; then
    die 'A systemd API service is already active or enabled; refusing a dual-runtime cutover.'
  fi
  if systemctl is-active --quiet "$REPLICATION_UNIT" || systemctl is-enabled --quiet "$REPLICATION_UNIT"; then
    die 'Off-host replication service is active or enabled; refusing to alter its state.'
  fi
  pm2_api_owner_check
  log 'PRECHECK' 'Existing PM2 API:'
  health_is_connected
  health_has_version "$OLD_PRODUCTION_SHA" || die 'The current PM2 API is not the reviewed production commit.'
  log 'PRECHECK' 'Checking current web routes and commerce methods.'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" >/dev/null
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/admin/payments" >/dev/null
  verify_public_catalog
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/payment-methods/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); ok=d.get("methods")==[]; print("active_payment_methods=%d" % len(d.get("methods",[]))); sys.exit(0 if ok else 1)'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/shipping/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); methods=d.get("shippingMethods",[]); print("active_shipping_methods=%d" % len(methods)); sys.exit(0 if methods==[] else 1)'
  local available_kib backup_available_kib runtime_available_kib runtime_required_kib runtime_old_kib
  available_kib=$(df -Pk "$STATE_ROOT" | awk 'NR==2 {print $4}')
  [[ $available_kib =~ ^[0-9]+$ ]] && (( available_kib >= 1048576 )) || die 'Less than 1 GiB is available on the Shawhposh state filesystem.'
  backup_available_kib=$(df -Pk "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
  [[ $backup_available_kib =~ ^[0-9]+$ ]] && (( backup_available_kib >= 1048576 )) || die 'Less than 1 GiB is available on the Shawhposh backup filesystem.'
  runtime_available_kib=$(df -Pk /opt | awk 'NR==2 {print $4}')
  runtime_required_kib=$(du -sk -- "$CANDIDATE_RELEASE/package.json" "$CANDIDATE_RELEASE/server-dist" "$CANDIDATE_RELEASE/node_modules" "$CANDIDATE_RELEASE/ops/replicate-backups.mjs" \
    | awk '{ total += $1 } END { print total + 0 }')
  if [[ $CANDIDATE_SHA != "$OLD_PRODUCTION_SHA" ]]; then
    runtime_old_kib=$(du -sk -- "$API_RELEASES/$OLD_PRODUCTION_SHA/package.json" "$API_RELEASES/$OLD_PRODUCTION_SHA/server-dist" "$API_RELEASES/$OLD_PRODUCTION_SHA/node_modules" "$API_RELEASES/$OLD_PRODUCTION_SHA/ops/replicate-backups.mjs" \
      | awk '{ total += $1 } END { print total + 0 }')
    runtime_required_kib=$((runtime_required_kib + runtime_old_kib))
  fi
  [[ $runtime_available_kib =~ ^[0-9]+$ && $runtime_required_kib =~ ^[0-9]+$ ]] \
    && (( runtime_available_kib >= runtime_required_kib + 262144 )) \
    || die 'Insufficient /opt space for protected copies of the current and rollback releases.'
  log 'PRECHECK' "Available space: state=${available_kib} KiB backups=${backup_available_kib} KiB runtime=${runtime_available_kib} KiB; protected release estimate=${runtime_required_kib} KiB."
  systemd-analyze verify \
    "$CANDIDATE_RELEASE/ops/$API_UNIT" \
    "$CANDIDATE_RELEASE/ops/$BACKUP_UNIT" \
    "$CANDIDATE_RELEASE/ops/$BACKUP_TIMER" \
    "$CANDIDATE_RELEASE/ops/$RESERVATION_UNIT" \
    "$CANDIDATE_RELEASE/ops/$RESERVATION_TIMER" \
    "$CANDIDATE_RELEASE/ops/$REPLICATION_UNIT"
}

capture_unit_snapshot() {
  local stamp unit
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  SNAPSHOT_DIR=/root/shawhposh-runtime-cutover-$stamp
  [[ ! -e $SNAPSHOT_DIR && ! -L $SNAPSHOT_DIR ]] || die "Rollback snapshot path already exists: $SNAPSHOT_DIR"
  install -d -o root -g root -m 0700 -- "$SNAPSHOT_DIR"
  install -d -o root -g root -m 0700 -- "$SNAPSHOT_DIR/candidate"
  pm2_api_metadata > "$SNAPSHOT_DIR/pm2-api-before.json"
  chmod 0600 -- "$SNAPSHOT_DIR/pm2-api-before.json"
  {
    for unit in "$STATE_ROOT" "$DATABASE_FILE" "$ENV_FILE" "$UPLOAD_ROOT" "$RECEIPT_ROOT" "$BACKUP_ROOT" "$API_CURRENT" "$WEB_CURRENT"; do
      if [[ -e $unit || -L $unit ]]; then
        stat -c '%n|%U:%G:%a|%F|%N' -- "$unit"
      else
        printf '%s|absent\n' "$unit"
      fi
    done
  } > "$SNAPSHOT_DIR/ownership-before.txt"
  chmod 0600 -- "$SNAPSHOT_DIR/ownership-before.txt"
  find -P "$WEB_ROOT" -xdev -printf '%P|%u:%g:%m|%y|%n\n' \
    > "$SNAPSHOT_DIR/frontend-ownership-before.txt"
  chmod 0600 -- "$SNAPSHOT_DIR/frontend-ownership-before.txt"
  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT" ubuntu-shawhposh; do
    if [[ $unit == ubuntu-shawhposh ]]; then
      if [[ -e /etc/sudoers.d/$unit || -L /etc/sudoers.d/$unit ]]; then
        [[ -f /etc/sudoers.d/$unit && ! -L /etc/sudoers.d/$unit ]] || die 'Unexpected installed sudo policy path type.'
        cp -p -- "/etc/sudoers.d/$unit" "$SNAPSHOT_DIR/$unit"
        printf 'present\n' > "$SNAPSHOT_DIR/$unit.state"
      else
        printf 'absent\n' > "$SNAPSHOT_DIR/$unit.state"
      fi
    else
      snapshot_unit "$unit"
    fi
  done
  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
    install -o root -g root -m 0644 -- "$CANDIDATE_RELEASE/ops/$unit" "$SNAPSHOT_DIR/candidate/$unit"
  done
  printf '%s\n' "$NEW_SUDO_POLICY" > "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  chown root:root "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  chmod 0440 "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  if [[ -e $PROMOTION_HELPER || -L $PROMOTION_HELPER ]]; then
    [[ -f $PROMOTION_HELPER && ! -L $PROMOTION_HELPER ]] || die 'Existing promotion helper path has an unexpected type.'
    cp -p -- "$PROMOTION_HELPER" "$SNAPSHOT_DIR/promotion-helper"
    printf 'present\n' > "$SNAPSHOT_DIR/promotion-helper.state"
  else
    printf 'absent\n' > "$SNAPSHOT_DIR/promotion-helper.state"
  fi
  install -o root -g root -m 0755 -- "$CANDIDATE_RELEASE/ops/promote_release.py" "$SNAPSHOT_DIR/candidate/shawhposh-promote-release"
  systemd-analyze verify \
    "$SNAPSHOT_DIR/candidate/$API_UNIT" \
    "$SNAPSHOT_DIR/candidate/$BACKUP_UNIT" \
    "$SNAPSHOT_DIR/candidate/$BACKUP_TIMER" \
    "$SNAPSHOT_DIR/candidate/$RESERVATION_UNIT" \
    "$SNAPSHOT_DIR/candidate/$REPLICATION_UNIT" \
    "$SNAPSHOT_DIR/candidate/$RESERVATION_TIMER"
  visudo -cf "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  /usr/bin/python3 -c 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())' "$SNAPSHOT_DIR/candidate/shawhposh-promote-release"
  printf 'candidate_release=%s\nprevious_api_release=%s\nprevious_runtime_sha=%s\n' \
    "$CANDIDATE_RELEASE" "$ORIGINAL_API_RELEASE" "$ORIGINAL_RUNTIME_SHA" > "$SNAPSHOT_DIR/manifest.txt"
  chmod 0600 "$SNAPSHOT_DIR"/*.state "$SNAPSHOT_DIR"/manifest.txt
  log 'PRECHECK' "Rollback configuration snapshot: $SNAPSHOT_DIR"
}

create_or_verify_runtime_user() {
  log 'USER' 'Creating or validating the locked, non-login Shawhposh service identity.'
  if ! getent passwd shawhposh >/dev/null; then
    useradd --system --user-group --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin shawhposh
    passwd --lock shawhposh >/dev/null
  fi
  local passwd_entry shell home groups password_state service_uid system_uid_max
  passwd_entry=$(getent passwd shawhposh) || die 'Could not inspect the Shawhposh service identity.'
  IFS=: read -r _ _ _ _ _ home shell <<< "$passwd_entry"
  [[ $home == /nonexistent && $shell == /usr/sbin/nologin ]] || die 'Existing shawhposh account has an unexpected home or shell.'
  service_uid=$(id -u shawhposh)
  system_uid_max=$(awk '$1 == "SYS_UID_MAX" { print $2; exit }' /etc/login.defs)
  [[ $service_uid =~ ^[0-9]+$ && $system_uid_max =~ ^[0-9]+$ ]] && (( service_uid <= system_uid_max )) \
    || die 'The Shawhposh account is not within the configured system-user UID range.'
  groups=$(id -nG shawhposh)
  [[ $groups == shawhposh ]] || die 'Existing shawhposh account has unexpected supplementary groups.'
  password_state=$(passwd -S shawhposh | awk '{print $2}')
  [[ $password_state == L || $password_state == LK || $password_state == NP ]] || die 'The Shawhposh service account password is not locked.'
  [[ ! -e /nonexistent/.ssh && ! -L /nonexistent/.ssh ]] || die 'Unexpected SSH key directory exists for the service account.'
  if sudo -l -U shawhposh >/dev/null 2>&1; then die 'The Shawhposh runtime account has sudo permissions.'; fi
  log 'USER' "uid=$(id -u shawhposh) groups=$groups shell=$shell password=$password_state"
}

apply_runtime_permissions() {
  log 'PERMISSIONS' 'Assigning only Shawhposh runtime state and exact backup paths.'
  OWNERSHIP_CHANGE_STARTED=1
  log 'PERMISSIONS' "$STATE_ROOT and $BACKUP_ROOT -> root:root 0700 while protected entries are updated"
  chown root:root -- "$STATE_ROOT" "$BACKUP_ROOT"
  chmod 0700 -- "$STATE_ROOT" "$BACKUP_ROOT"
  assert_real_directory "$STATE_ROOT"
  assert_real_directory "$UPLOAD_ROOT"
  assert_real_directory "$RECEIPT_ROOT"
  assert_real_directory "$BACKUP_ROOT"
  assert_regular_file "$DATABASE_FILE"
  assert_regular_file "$ENV_FILE"
  verify_exact_tree_contents "$STATE_ROOT" state
  verify_exact_tree_contents "$UPLOAD_ROOT" upload
  verify_exact_tree_contents "$RECEIPT_ROOT" receipt
  verify_exact_tree_contents "$BACKUP_ROOT" backup
  log 'PERMISSIONS' "$DATABASE_FILE -> shawhposh:shawhposh 0600"
  chown shawhposh:shawhposh -- "$DATABASE_FILE"
  chmod 0600 -- "$DATABASE_FILE"
  local suffix file
  for suffix in -wal -shm -journal; do
    if [[ -e $DATABASE_FILE$suffix || -L $DATABASE_FILE$suffix ]]; then
      assert_private_file "$DATABASE_FILE$suffix"
      log 'PERMISSIONS' "$DATABASE_FILE$suffix -> shawhposh:shawhposh 0600"
      chown shawhposh:shawhposh -- "$DATABASE_FILE$suffix"
      chmod 0600 -- "$DATABASE_FILE$suffix"
    fi
  done
  log 'PERMISSIONS' "$ENV_FILE -> root:shawhposh 0640"
  chown root:shawhposh -- "$ENV_FILE"
  chmod 0640 -- "$ENV_FILE"
  log 'PERMISSIONS' "$UPLOAD_ROOT and $RECEIPT_ROOT -> shawhposh:shawhposh 0700"
  chown shawhposh:shawhposh -- "$RECEIPT_ROOT" "$UPLOAD_ROOT"
  chmod 0700 -- "$RECEIPT_ROOT" "$UPLOAD_ROOT"
  while IFS= read -r -d '' file; do
    log 'PERMISSIONS' "$file -> shawhposh:shawhposh 0600"
    chown shawhposh:shawhposh -- "$file"
    chmod 0600 -- "$file"
  done < <(find -P "$RECEIPT_ROOT" -mindepth 1 -maxdepth 1 -type f -print0)
  for file in "$BACKUP_ROOT"/shawhposh-*.sqlite "$BACKUP_ROOT"/payment-receipts-*.tar.gz; do
    [[ -e $file || -L $file ]] || continue
    [[ -f $file && ! -L $file ]] || die "Unexpected backup artifact type: $file"
    log 'PERMISSIONS' "$file -> shawhposh:shawhposh 0600"
    chown shawhposh:shawhposh -- "$file"
    chmod 0600 -- "$file"
  done
  log 'PERMISSIONS' "$BACKUP_ROOT -> shawhposh:shawhposh 0700"
  chown shawhposh:shawhposh -- "$BACKUP_ROOT"
  chmod 0700 -- "$BACKUP_ROOT"
  log 'PERMISSIONS' "$STATE_ROOT -> shawhposh:shawhposh 0700"
  chown shawhposh:shawhposh -- "$STATE_ROOT"
  chmod 0700 -- "$STATE_ROOT"
  log 'PERMISSIONS' "$WEB_ROOT and its static release tree -> root:root; directories 0755, files 0644."
  chown root:root -- "$WEB_ROOT" "$WEB_RELEASES"
  chown -h root:root -- "$WEB_CURRENT"
  find -P "$WEB_RELEASES" -xdev -type d -exec chown root:root -- {} + -exec chmod 0755 -- {} +
  find -P "$WEB_RELEASES" -xdev -type f -exec chown root:root -- {} + -exec chmod 0644 -- {} +
  chmod 0755 -- "$WEB_ROOT" "$WEB_RELEASES"
  runuser -u www-data -- test -r "$WEB_CURRENT/index.html" || die 'Nginx worker cannot read the current frontend after ownership changes.'
  runuser -u ubuntu -- test ! -w "$WEB_CURRENT/index.html" || die 'ubuntu can still write the active frontend.'
  runuser -u ubuntu -- test ! -w "$WEB_ROOT" || die 'ubuntu can still replace the frontend current symlink.'
  runuser -u shawhposh -- test -r "$ENV_FILE" || die 'Runtime user cannot read the protected environment file.'
  runuser -u shawhposh -- test -w "$DATABASE_FILE" || die 'Runtime user cannot write the SQLite database.'
  runuser -u shawhposh -- test -w "$RECEIPT_ROOT" || die 'Runtime user cannot write receipt storage.'
  runuser -u shawhposh -- test -w "$BACKUP_ROOT" || die 'Runtime user cannot write backup storage.'
  runuser -u ubuntu -- test ! -w "$DATABASE_FILE" || die 'ubuntu can still write the production database.'
  runuser -u ubuntu -- test ! -w "$RECEIPT_ROOT" || die 'ubuntu can still write payment receipts.'
  runuser -u ubuntu -- test ! -w "$BACKUP_ROOT" || die 'ubuntu can still write Shawhposh backups.'
  log 'PERMISSIONS' 'Runtime state ownership and ubuntu data-access denial verified.'
}

verify_active_runtime_release() {
  local sha=$1 release path web_target frontend_problem
  [[ $sha =~ ^[0-9a-f]{40}$ ]] || die 'Active runtime release identifier is invalid.'
  release="$RUNTIME_RELEASES/$sha"
  [[ $(readlink -e -- "$RUNTIME_CURRENT") == "$release" ]] || die 'Runtime current does not point inside protected releases.'
  [[ $(stat -c '%U:%G:%a' -- "$RUNTIME_ROOT") == 'root:root:755' ]] || die 'Runtime root ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$RUNTIME_RELEASES") == 'root:root:755' ]] || die 'Runtime releases ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$release") == 'root:root:755' ]] || die 'Active release is not root-owned and protected.'
  [[ $(stat -c '%U:%G:%F' -- "$RUNTIME_CURRENT") == 'root:root:symbolic link' ]] || die 'Runtime current symlink is not root-owned.'
  [[ $(stat -c '%U:%G:%a' -- "$WEB_ROOT") == 'root:root:755' \
    && $(stat -c '%U:%G:%a' -- "$WEB_RELEASES") == 'root:root:755' ]] \
    || die 'Protected frontend root ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%F' -- "$WEB_CURRENT") == 'root:root:symbolic link' ]] || die 'Frontend current symlink is not root-owned.'
  web_target=$(readlink -e -- "$WEB_CURRENT")
  [[ $(dirname -- "$web_target") == "$WEB_RELEASES" && $(stat -c '%U:%G:%a' -- "$web_target") == 'root:root:755' \
    && -f $WEB_CURRENT/index.html ]] || die 'Active frontend release is outside the protected root-owned tree.'
  runuser -u www-data -- test -r "$WEB_CURRENT/index.html" || die 'Nginx cannot read the protected frontend.'
  runuser -u ubuntu -- test ! -w "$WEB_ROOT" && runuser -u ubuntu -- test ! -w "$WEB_CURRENT/index.html" \
    || die 'ubuntu can modify the protected frontend tree.'
  frontend_problem=$(find -P "$WEB_RELEASES" -xdev \
    \( -type d \( ! -user root -o ! -group root -o ! -perm 0755 \) \
      -o -type f \( ! -user root -o ! -group root -o ! -perm 0644 -o -links +1 \) \
      -o \( ! -type d -a ! -type f \) \) -print -quit)
  [[ -z $frontend_problem ]] || die "Protected frontend has unsafe ownership, mode, or file type: $frontend_problem"
  for path in \
    "$RUNTIME_CURRENT/package.json" \
    "$RUNTIME_CURRENT/server-dist/index.js" \
    "$RUNTIME_CURRENT/server-dist/db/backup.js" \
    "$RUNTIME_CURRENT/server-dist/modules/orders/expire-reservations.js" \
    "$RUNTIME_CURRENT/ops/replicate-backups.mjs"; do
    [[ $(stat -c '%U:%G' -- "$path") == 'root:root' ]] || die "Runtime artifact is not root-owned: $path"
    runuser -u ubuntu -- test ! -w "$path" || die "ubuntu can write active runtime code: $path"
    runuser -u shawhposh -- test ! -w "$path" || die "Runtime account can write executable code: $path"
  done
  runuser -u ubuntu -- test ! -w /opt/shawhposh/current/server-dist/index.js || die 'ubuntu can write active API code.'
  runuser -u shawhposh -- test ! -w /opt/shawhposh/current/server-dist/index.js || die 'shawhposh can write active API code.'
  runuser -u ubuntu -- test ! -w /opt/shawhposh/current/server-dist/db/backup.js || die 'ubuntu can write active backup code.'
  runuser -u shawhposh -- test ! -w /opt/shawhposh/current/server-dist/db/backup.js || die 'shawhposh can write active backup code.'
  runuser -u ubuntu -- test ! -w /opt/shawhposh/current/server-dist/modules/orders/expire-reservations.js || die 'ubuntu can write active reservation code.'
  runuser -u shawhposh -- test ! -w /opt/shawhposh/current/server-dist/modules/orders/expire-reservations.js || die 'shawhposh can write active reservation code.'
  runuser -u ubuntu -- test ! -w "$RUNTIME_ROOT" || die 'ubuntu can replace the protected runtime current symlink.'
  runuser -u shawhposh -- test ! -w "$RUNTIME_ROOT" || die 'Runtime account can replace the protected current symlink.'
  log 'PERMISSIONS' "Backend and frontend release $sha are root-owned; ubuntu and runtime cannot edit code or replace current."
}

install_units() {
  local unit
  UNITS_INSTALLED=1
  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
    log 'SYSTEMD' "/etc/systemd/system/$unit"
    install -o root -g root -m 0644 -- "$SNAPSHOT_DIR/candidate/$unit" "/etc/systemd/system/$unit"
  done
  systemd-analyze verify \
    "/etc/systemd/system/$API_UNIT" \
    "/etc/systemd/system/$BACKUP_UNIT" \
    "/etc/systemd/system/$BACKUP_TIMER" \
    "/etc/systemd/system/$RESERVATION_UNIT" \
    "/etc/systemd/system/$RESERVATION_TIMER" \
    "/etc/systemd/system/$REPLICATION_UNIT"
  systemctl daemon-reload
}

install_promotion_helper() {
  local temporary=/usr/local/sbin/.shawhposh-promote-release.runtime-cutover
  [[ ! -e $temporary && ! -L $temporary ]] || die "Unexpected temporary promotion-helper path exists: $temporary"
  PROMOTION_HELPER_INSTALLED=1
  log 'PROMOTION' "Installing reviewed SHA-only helper at $PROMOTION_HELPER."
  install -o root -g root -m 0755 -- "$SNAPSHOT_DIR/candidate/shawhposh-promote-release" "$temporary"
  /usr/bin/python3 -c 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())' "$temporary" \
    || die 'Installed promotion helper failed Python syntax validation.'
  mv -Tf -- "$temporary" "$PROMOTION_HELPER"
  [[ $(stat -c '%U:%G:%a' -- "$PROMOTION_HELPER") == 'root:root:755' ]] || die 'Promotion helper ownership/mode validation failed.'
}

wait_for_health() {
  local attempt
  for attempt in {1..30}; do
    if health_json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1] else 1)' "$CANDIDATE_SHA" 2>/dev/null; then
      health_has_version "$CANDIDATE_SHA"
      return 0
    fi
    sleep 1
  done
  return 1
}

verify_payment_shipping_disabled() {
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/payment-methods/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); methods=d.get("methods",[]); print("active_payment_methods=%d" % len(methods)); sys.exit(0 if methods==[] else 1)'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/shipping/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); methods=d.get("shippingMethods",[]); print("active_shipping_methods=%d" % len(methods)); sys.exit(0 if methods==[] else 1)'
}

install_sudo_policy() {
  local source=$SNAPSHOT_DIR/candidate/ubuntu-shawhposh
  local target=/etc/sudoers.d/ubuntu-shawhposh temporary=/etc/sudoers.d/.ubuntu-shawhposh.runtime-cutover
  log 'SUDO' 'Installing passwordless Nginx-only commands and a password-required 40-hex SHA-only promotion rule; sudo authentication caching is disabled.'
  if [[ -e $temporary || -L $temporary ]]; then die "Unexpected temporary sudoers path exists: $temporary"; fi
  if [[ -e $target || -L $target ]]; then
    [[ -f $target && ! -L $target ]] || die 'Installed Shawhposh sudo policy is not a regular file.'
    if ! cmp -s -- "$target" "$source"; then
      [[ $(<"$target") == "$OLD_SUDO_POLICY_3" || $(<"$target") == "$OLD_SUDO_POLICY_4" ]] \
        || die 'Existing Shawhposh sudo policy differs from the known reviewed baseline; refusing to replace it.'
    fi
  fi
  install -o root -g root -m 0440 -- "$source" "$temporary"
  if ! visudo -cf "$temporary" >/dev/null; then
    [[ -f $temporary && ! -L $temporary ]] && unlink -- "$temporary"
    die 'The staged sudo policy failed validation.'
  fi
  mv -Tf -- "$temporary" "$target"
  if ! visudo -cf /etc/sudoers >/dev/null || ! visudo -cf "$target" >/dev/null; then
    log 'SUDO' 'Validation failed; restoring the previous dedicated sudo policy.'
    restore_sudo_policy || true
    visudo -cf /etc/sudoers || die 'The previous sudo policy did not validate after restoration.'
    die 'New sudo policy validation failed; old policy restored.'
  fi
  if ! verify_passwordless_sudo_allowlist "$NEW_PASSWORDLESS_POLICY" || ! verify_password_required_promotion_rule; then
    restore_sudo_policy || true
    visudo -cf /etc/sudoers || true
    die 'Installed sudo rules differ from the reviewed Nginx-only passwordless and SHA-scoped password-required policy; prior policy restored.'
  fi
  log 'SUDO' 'Passwordless sudo is limited to Nginx checks; release promotion prompts the owner and disables sudo timestamp caching.'
}

main() {
  validate_preflight
  if (( DRY_RUN )); then
    log 'DRY RUN' 'No production changes were made. Planned: save rollback snapshots; pause only Shawhposh timers; create and verify a fresh DB/receipt backup; create/validate the runtime user; install units and root-owned promotion helper; prepare protected copies of the rollback and candidate releases; move state ownership; promote old then candidate release through the helper; verify runtime code write denial, services, data, and site; install the SHA-scoped sudo policy.'
    log 'DRY RUN' 'Off-host replication configuration and timers remain untouched and disabled.'
    return 0
  fi

  [[ -t 0 ]] || die 'The cutover requires an owner at an interactive terminal.'
  if (( BOOTSTRAP_EXECUTION )); then
    log 'CONFIRM' 'Bootstrap owner confirmation has already authorized this runtime cutover.'
  else
    printf '[CONFIRM] This will change Shawhposh service ownership and switch the production API. Type CUTOVER to continue: ' >&2
    local confirmation
    IFS= read -r confirmation
    [[ $confirmation == CUTOVER ]] || die 'Owner confirmation did not match; no production changes were made.'
  fi

  capture_unit_snapshot
  local original_backup_pair backup_start backup_pair_now backup_db backup_receipts redirect artifact
  BACKUP_TIMER_WAS_ACTIVE=1
  RESERVATION_TIMER_WAS_ACTIVE=1
  CUTOVER_ACTIVE=1
  log 'BACKUP' 'Pausing only the existing Shawhposh timers before the ownership transition.'
  systemctl stop "$BACKUP_TIMER" "$RESERVATION_TIMER"
  for _ in {1..30}; do
    if ! systemctl is-active --quiet "$BACKUP_UNIT" && ! systemctl is-active --quiet "$RESERVATION_UNIT"; then break; fi
    sleep 1
  done
  systemctl is-active --quiet "$BACKUP_UNIT" && die 'The existing backup job did not finish before the cutover.'
  systemctl is-active --quiet "$RESERVATION_UNIT" && die 'The reservation job did not finish before the cutover.'
  original_backup_pair=$(backup_pair || true)
  backup_start=$(date -u +%s)
  systemctl start "$BACKUP_UNIT"
  backup_pair_now=$(backup_pair)
  [[ $backup_pair_now != "$original_backup_pair" ]] || die 'The existing backup service did not create a new complete backup pair.'
  IFS=$'\t' read -r backup_db backup_receipts <<< "$backup_pair_now"
  [[ $(stat -c '%Y' -- "$backup_db") -ge $((backup_start - 1)) && $(stat -c '%Y' -- "$backup_receipts") -ge $((backup_start - 1)) ]] \
    || die 'The backup pair is older than this maintenance run.'
  verify_backup_pair "$backup_pair_now"
  log 'BACKUP' 'Fresh pre-cutover database and receipt backups passed integrity checks.'

  create_or_verify_runtime_user
  install_units
  install_promotion_helper
  log 'PROMOTION' "Preparing rollback release $OLD_PRODUCTION_SHA and candidate $CANDIDATE_SHA under $RUNTIME_RELEASES."
  "$PROMOTION_HELPER" --prepare "$OLD_PRODUCTION_SHA"
  if [[ $CANDIDATE_SHA != "$OLD_PRODUCTION_SHA" ]]; then
    "$PROMOTION_HELPER" --prepare "$CANDIDATE_SHA"
  fi
  log 'API CUTOVER' 'Stopping only the Shawhposh PM2 API; no systemd service will execute from the ubuntu staging tree.'
  pm2_other_snapshot > "$SNAPSHOT_DIR/pm2-unrelated-before.json"
  PM2_API_STOPPED=1
  pm2_as_ubuntu stop shawhposh-api >/dev/null
  apply_runtime_permissions
  API_UNIT_START_ATTEMPTED=1
  log 'API CUTOVER' "Promoting the known-good protected rollback release $OLD_PRODUCTION_SHA first."
  "$PROMOTION_HELPER" "$OLD_PRODUCTION_SHA"
  API_LINK_CHANGE_STARTED=1
  ORIGINAL_RUNTIME_SHA=$OLD_PRODUCTION_SHA
  if [[ $CANDIDATE_SHA != "$OLD_PRODUCTION_SHA" ]]; then
    log 'API CUTOVER' "Promoting candidate release $CANDIDATE_SHA; the helper will restore $OLD_PRODUCTION_SHA if health fails."
    "$PROMOTION_HELPER" "$CANDIDATE_SHA" || die 'Candidate promotion failed; the helper restored the previous root-owned runtime release.'
  fi
  verify_active_runtime_release "$CANDIDATE_SHA"
  [[ $(systemctl is-active "$API_UNIT") == active ]] || die 'The dedicated API service is not active.'
  [[ $(systemctl show -p User --value "$API_UNIT") == shawhposh ]] || die 'The API systemd unit is not configured for the runtime user.'
  local api_pid api_owner
  api_pid=$(systemctl show -p MainPID --value "$API_UNIT")
  [[ $api_pid =~ ^[1-9][0-9]*$ ]] || die 'The dedicated API service has no main process.'
  api_owner=$(ps -o user= -p "$api_pid" | xargs)
  [[ $api_owner == shawhposh ]] || die "API process owner is $api_owner, expected shawhposh."
  [[ $(pm2_other_snapshot) == "$(<"$SNAPSHOT_DIR/pm2-unrelated-before.json")" ]] || die 'An unrelated PM2 application changed during API startup.'
  systemctl enable "$API_UNIT" >/dev/null
  log 'API CUTOVER' "Healthy API PID $api_pid runs as $api_owner."
  log 'API CUTOVER' 'Removing only the stopped Shawhposh PM2 entry after systemd acceptance.'
  pm2_as_ubuntu delete shawhposh-api >/dev/null
  pm2_as_ubuntu save >/dev/null
  pm2_as_ubuntu jlist | python3 -c 'import json,sys; apps=json.load(sys.stdin); sys.exit(1 if any(p.get("name")=="shawhposh-api" for p in apps) else 0)'
  [[ $(pm2_other_snapshot) == "$(<"$SNAPSHOT_DIR/pm2-unrelated-before.json")" ]] || die 'An unrelated PM2 application changed during API removal.'

  log 'RESERVATIONS' 'Starting the dedicated reservation expiry service and timer.'
  systemctl enable --now "$RESERVATION_TIMER"
  systemctl start "$RESERVATION_UNIT"
  [[ $(systemctl show -p Result --value "$RESERVATION_UNIT") == success ]] || die 'Reservation expiry did not complete successfully.'
  [[ $(systemctl show -p User --value "$RESERVATION_UNIT") == shawhposh ]] || die 'Reservation service is not configured for the runtime user.'
  systemctl is-active --quiet "$RESERVATION_TIMER" || die 'Reservation timer is not active.'
  log 'RESERVATIONS' 'Dedicated reservation job completed; timer is active.'

  log 'BACKUP SERVICE' 'Starting the dedicated backup timer and validating a post-cutover pair.'
  systemctl enable --now "$BACKUP_TIMER"
  [[ $(systemctl show -p User --value "$BACKUP_UNIT") == shawhposh ]] || die 'Backup service is not configured for the runtime user.'
  systemctl start "$BACKUP_UNIT"
  local post_backup_pair
  post_backup_pair=$(backup_pair)
  [[ $post_backup_pair != "$backup_pair_now" ]] || die 'The dedicated backup service did not create a new pair.'
  verify_backup_pair "$post_backup_pair"
  local post_backup_db post_receipt_archive
  IFS=$'\t' read -r post_backup_db post_receipt_archive <<< "$post_backup_pair"
  for artifact in "$post_backup_db" "$post_receipt_archive"; do
    [[ $(stat -c '%U:%G:%a' -- "$artifact") == 'shawhposh:shawhposh:600' ]] || die "Runtime backup ownership/mode is incorrect: $artifact"
  done
  systemctl is-active --quiet "$BACKUP_TIMER" || die 'Backup timer is not active.'
  log 'BACKUP SERVICE' 'Dedicated backup service created and verified a new database/receipt pair.'

  log 'VERIFY' 'Checking database counts, permissions, live routes, and disabled commerce methods.'
  verify_database "$DATABASE_FILE" live
  verify_active_runtime_release "$CANDIDATE_SHA"
  [[ $(stat -c '%U:%G:%a' -- "$STATE_ROOT") == 'shawhposh:shawhposh:700' ]] || die 'State-directory ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$UPLOAD_ROOT") == 'shawhposh:shawhposh:700' ]] || die 'Upload-directory ownership/mode is incorrect.'
  assert_private_file "$DATABASE_FILE"
  [[ $(stat -c '%U:%G:%a' -- "$DATABASE_FILE") == 'shawhposh:shawhposh:600' ]] || die 'Database ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$ENV_FILE") == 'root:shawhposh:640' ]] || die 'Environment-file ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$RECEIPT_ROOT") == 'shawhposh:shawhposh:700' ]] || die 'Receipt directory ownership/mode is incorrect.'
  [[ $(stat -c '%U:%G:%a' -- "$BACKUP_ROOT") == 'shawhposh:shawhposh:700' ]] || die 'Backup directory ownership/mode is incorrect.'
  for suffix in -wal -shm -journal; do
    if [[ -e $DATABASE_FILE$suffix || -L $DATABASE_FILE$suffix ]]; then
      assert_private_file "$DATABASE_FILE$suffix"
      [[ $(stat -c '%U:%G:%a' -- "$DATABASE_FILE$suffix") == 'shawhposh:shawhposh:600' ]] || die "SQLite sidecar ownership/mode is incorrect: $DATABASE_FILE$suffix"
    fi
  done
  health_is_connected
  health_has_version "$CANDIDATE_SHA" || die 'The public API version does not match the protected runtime candidate.'
  /usr/sbin/nginx -t >/dev/null || die 'Nginx configuration validation failed after cutover.'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" >/dev/null
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/admin/payments" >/dev/null
  verify_public_catalog
  redirect=$(curl --silent --show-error --max-time 8 --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null --write-out '%{http_code} %{redirect_url}' "http://$DOMAIN/")
  [[ $redirect == "301 https://$DOMAIN/" || $redirect == "308 https://$DOMAIN/" ]] || die 'HTTP-to-HTTPS redirect is incorrect.'
  verify_payment_shipping_disabled
  systemctl is-active --quiet nginx || die 'Nginx is not active.'
  systemctl is-active --quiet auditd || die 'auditd is not active.'
  runuser -u ubuntu -- test ! -w "$DATABASE_FILE" || die 'ubuntu can write the production database.'
  runuser -u ubuntu -- test ! -r "$DATABASE_FILE" || die 'ubuntu can read the production database.'
  runuser -u ubuntu -- test ! -r "$ENV_FILE" || die 'ubuntu can read the production environment file.'
  runuser -u ubuntu -- test ! -r "$RECEIPT_ROOT" || die 'ubuntu can read payment receipts.'
  runuser -u ubuntu -- test ! -w "$RECEIPT_ROOT" || die 'ubuntu can write receipt storage.'
  runuser -u ubuntu -- test ! -r "$BACKUP_ROOT" || die 'ubuntu can read Shawhposh backups.'
  runuser -u ubuntu -- test ! -w "$BACKUP_ROOT" || die 'ubuntu can write/delete backup storage.'
  [[ ! -e /etc/shawhposh/offsite.env && ! -L /etc/shawhposh/offsite.env \
    && ! -e /etc/shawhposh/rclone.conf && ! -L /etc/shawhposh/rclone.conf ]] || die 'Off-host replication config appeared during cutover; refusing activation.'
  if systemctl is-active --quiet "$REPLICATION_UNIT" || systemctl is-enabled --quiet "$REPLICATION_UNIT"; then
    die 'Off-host replication became active or enabled during cutover.'
  fi

  install_sudo_policy
  CUTOVER_ACCEPTED=1
  CUTOVER_ACTIVE=0
  log 'VERIFY' 'Runtime cutover completed. Shipping/payment remain disabled; off-host replication remains unconfigured.'
  log 'VERIFY' "Rollback configuration snapshot: $SNAPSHOT_DIR"
  log 'VERIFY' "Active protected API release: $(readlink -e -- "$RUNTIME_CURRENT")"
  log 'VERIFY' 'Retained database and receipt backups; no business rows were created or deleted.'
}

main
