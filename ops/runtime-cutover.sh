#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly API_ROOT=/home/ubuntu/shawhposh
readonly API_RELEASES=/home/ubuntu/shawhposh/releases
readonly API_CURRENT=/home/ubuntu/shawhposh/current
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
readonly DOMAIN=shawhposh.ir
# ubuntu controls deployed releases. Exact passwordless restart/backup commands therefore treat ubuntu as a trusted deployer; they do not isolate the runtime from a compromised ubuntu process.
readonly OLD_SUDO_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service'
readonly NEW_SUDO_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service, /usr/bin/systemctl restart shawhposh-api.service'

DRY_RUN=0
for argument in "$@"; do
  case "$argument" in
    --dry-run) DRY_RUN=1 ;;
    *) printf 'Usage: sudo bash ops/runtime-cutover.sh [--dry-run]\n' >&2; exit 2 ;;
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
readonly CANDIDATE_RELEASE=$(dirname -- "$SCRIPT_DIR")
readonly CANDIDATE_SHA=${CANDIDATE_RELEASE##*/}

SNAPSHOT_DIR=
ORIGINAL_API_RELEASE=
BACKUP_TIMER_WAS_ACTIVE=0
RESERVATION_TIMER_WAS_ACTIVE=0
CUTOVER_ACTIVE=0
OWNERSHIP_CHANGE_STARTED=0
API_LINK_CHANGE_STARTED=0
PM2_API_STOPPED=0
API_UNIT_START_ATTEMPTED=0
API_HEALTHY=0
UNITS_INSTALLED=0

verify_passwordless_sudo_allowlist() {
  local expected_one=$1 expected_two=${2:-} listing
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
' "$expected_one" "$expected_two"
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
  local file=$1
  python3 - "$file" <<'PY'
import json,sqlite3,sys
from pathlib import Path
path=Path(sys.argv[1]).resolve(strict=True)
uri=path.as_uri()+'?mode=ro'
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
  verify_database "$db_file"
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

set_api_current() {
  local target=$1 temporary=/home/ubuntu/shawhposh/.current-runtime-cutover.$$.tmp
  [[ $target == "$API_RELEASES"/* && -d $target && ! -L $target ]] || { log 'CUTOVER' "Refusing release target outside the API release root: $target" >&2; return 1; }
  [[ ! -e $temporary && ! -L $temporary ]] || { log 'CUTOVER' "Refusing unexpected temporary deployment path: $temporary" >&2; return 1; }
  runuser -u ubuntu -- /usr/bin/ln -s -- "$target" "$temporary"
  if ! runuser -u ubuntu -- /usr/bin/mv -Tf -- "$temporary" "$API_CURRENT"; then
    if [[ -L $temporary && $(readlink -- "$temporary") == "$target" ]]; then
      unlink -- "$temporary"
    fi
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
  if (( API_UNIT_START_ATTEMPTED )); then
    systemctl stop "$API_UNIT" >/dev/null 2>&1 || true
    if systemctl is-enabled --quiet "$API_UNIT"; then
      systemctl disable "$API_UNIT" >/dev/null || rollback_ok=0
    fi
  fi
  if (( API_LINK_CHANGE_STARTED )) && [[ -n $ORIGINAL_API_RELEASE ]]; then
    set_api_current "$ORIGINAL_API_RELEASE" || rollback_ok=0
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
  if (( PM2_API_STOPPED )); then
    pm2_as_ubuntu restart shawhposh-api >/dev/null || rollback_ok=0
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
  if (( CUTOVER_ACTIVE && !API_HEALTHY )); then
    rollback_incomplete_cutover || true
  elif (( CUTOVER_ACTIVE )); then
    log 'FAIL' 'The API passed its cutover health gate; no automatic rollback was attempted after later-stage failure.'
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
  [[ $(dirname -- "$CANDIDATE_RELEASE") == "$API_RELEASES" && -d $CANDIDATE_RELEASE && ! -L $CANDIDATE_RELEASE ]] \
    || die 'Run this script from the staged, versioned API release directory.'
  [[ $CANDIDATE_SHA =~ ^[0-9a-f]{40}$ ]] || die 'The staged API release directory must be named by its 40-character commit SHA.'
  [[ $(realpath -e -- "$CANDIDATE_RELEASE") == "$CANDIDATE_RELEASE" ]] || die 'The staged API release resolves through an unexpected symlink.'
  [[ $(stat -c '%U' -- "$CANDIDATE_RELEASE") == ubuntu ]] || die 'The staged API release must remain ubuntu-managed.'
  [[ -f $CANDIDATE_RELEASE/server-dist/index.js && -f $CANDIDATE_RELEASE/server-dist/db/backup.js \
    && -f $CANDIDATE_RELEASE/server-dist/modules/orders/expire-reservations.js ]] || die 'The staged release is missing built server artifacts.'
  for artifact in "$CANDIDATE_RELEASE/server-dist/index.js" "$CANDIDATE_RELEASE/server-dist/db/backup.js" \
    "$CANDIDATE_RELEASE/server-dist/modules/orders/expire-reservations.js"; do
    assert_source_file "$artifact"
  done
  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
    assert_source_file "$CANDIDATE_RELEASE/ops/$unit"
  done
  assert_source_file "$CANDIDATE_RELEASE/ops/sudoers.d/ubuntu-shawhposh"
  assert_source_file "$CANDIDATE_RELEASE/ops/runtime-cutover.sh"
  [[ $(<"$CANDIDATE_RELEASE/ops/sudoers.d/ubuntu-shawhposh") == "$NEW_SUDO_POLICY" ]] || die 'The prepared sudo policy differs from the reviewed exact-command allowlist.'
  visudo -cf /etc/sudoers >/dev/null || die 'The existing sudo policy does not validate.'
  local current_sudo_policy=/etc/sudoers.d/ubuntu-shawhposh
  if [[ -e $current_sudo_policy || -L $current_sudo_policy ]]; then
    [[ -f $current_sudo_policy && ! -L $current_sudo_policy ]] || die 'The existing Shawhposh sudo policy has an unexpected file type.'
    [[ $(<"$current_sudo_policy") == "$OLD_SUDO_POLICY" || $(<"$current_sudo_policy") == "$NEW_SUDO_POLICY" ]] \
      || die 'The existing Shawhposh sudo policy differs from both reviewed allowlists.'
    [[ $(stat -c '%U:%G:%a' -- "$current_sudo_policy") == 'root:root:440' ]] || die 'The existing Shawhposh sudo policy permissions are unexpected.'
    visudo -cf "$current_sudo_policy" >/dev/null || die 'The existing Shawhposh sudo policy does not validate.'
  fi
  verify_passwordless_sudo_allowlist "$OLD_SUDO_POLICY" "$NEW_SUDO_POLICY"
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
  verify_database "$DATABASE_FILE"
  [[ ! -e /etc/shawhposh/offsite.env && ! -L /etc/shawhposh/offsite.env \
    && ! -e /etc/shawhposh/rclone.conf && ! -L /etc/shawhposh/rclone.conf ]] \
    || die 'Off-host config already exists; refusing to install a backup OnSuccess hook.'
  [[ -L $API_CURRENT ]] || die 'The API current path is not the expected deployment symlink.'
  ORIGINAL_API_RELEASE=$(readlink -e -- "$API_CURRENT")
  [[ $(dirname -- "$ORIGINAL_API_RELEASE") == "$API_RELEASES" && -d $ORIGINAL_API_RELEASE ]] || die 'API current points outside the versioned release tree.'
  [[ $(basename -- "$ORIGINAL_API_RELEASE") == "$OLD_PRODUCTION_SHA" || $ORIGINAL_API_RELEASE == "$CANDIDATE_RELEASE" ]] \
    || die 'The active API release changed from the reviewed production baseline.'
  assert_real_directory "$API_RELEASES/$OLD_PRODUCTION_SHA"
  [[ -f $API_RELEASES/$OLD_PRODUCTION_SHA/server-dist/index.js ]] || die 'The known-good production API rollback artifact is missing.'
  [[ -L $WEB_CURRENT ]] || die 'The frontend current path is not the expected deployment symlink.'
  local web_target
  web_target=$(readlink -e -- "$WEB_CURRENT")
  [[ $(dirname -- "$web_target") == "$WEB_RELEASES" && -f $web_target/index.html ]] || die 'Frontend current points outside its expected release tree.'
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
  [[ ! -e /home/ubuntu/shawhposh/.current-runtime-cutover.$$.tmp && ! -L /home/ubuntu/shawhposh/.current-runtime-cutover.$$.tmp ]] \
    || die 'A temporary API release symlink already exists; inspect it before retrying.'
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
  log 'PRECHECK' 'Checking current web routes and commerce methods.'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" >/dev/null
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/admin/payments" >/dev/null
  verify_public_catalog
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/payment-methods/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); ok=d.get("methods")==[]; print("active_payment_methods=%d" % len(d.get("methods",[]))); sys.exit(0 if ok else 1)'
  curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/shipping/methods" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); methods=d.get("shippingMethods",[]); print("active_shipping_methods=%d" % len(methods)); sys.exit(0 if methods==[] else 1)'
  local available_kib backup_available_kib
  available_kib=$(df -Pk "$STATE_ROOT" | awk 'NR==2 {print $4}')
  [[ $available_kib =~ ^[0-9]+$ ]] && (( available_kib >= 1048576 )) || die 'Less than 1 GiB is available on the Shawhposh state filesystem.'
  backup_available_kib=$(df -Pk "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
  [[ $backup_available_kib =~ ^[0-9]+$ ]] && (( backup_available_kib >= 1048576 )) || die 'Less than 1 GiB is available on the Shawhposh backup filesystem.'
  log 'PRECHECK' "Available space: state=${available_kib} KiB backups=${backup_available_kib} KiB."
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
  install -o root -g root -m 0440 -- "$CANDIDATE_RELEASE/ops/sudoers.d/ubuntu-shawhposh" "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  systemd-analyze verify \
    "$SNAPSHOT_DIR/candidate/$API_UNIT" \
    "$SNAPSHOT_DIR/candidate/$BACKUP_UNIT" \
    "$SNAPSHOT_DIR/candidate/$BACKUP_TIMER" \
    "$SNAPSHOT_DIR/candidate/$RESERVATION_UNIT" \
    "$SNAPSHOT_DIR/candidate/$REPLICATION_UNIT" \
    "$SNAPSHOT_DIR/candidate/$RESERVATION_TIMER"
  visudo -cf "$SNAPSHOT_DIR/candidate/ubuntu-shawhposh"
  printf 'candidate_release=%s\nprevious_api_release=%s\n' "$CANDIDATE_RELEASE" "$ORIGINAL_API_RELEASE" > "$SNAPSHOT_DIR/manifest.txt"
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
  log 'PERMISSIONS' "$WEB_ROOT and its release entries -> ubuntu:ubuntu; public files remain readable by Nginx."
  chown ubuntu:ubuntu -- "$WEB_ROOT"
  chown -h ubuntu:ubuntu -- "$WEB_CURRENT"
  find -P "$WEB_RELEASES" -xdev -exec chown -h ubuntu:ubuntu -- {} +
  runuser -u www-data -- test -r "$WEB_CURRENT/index.html" || die 'Nginx worker cannot read the current frontend after ownership changes.'
  runuser -u shawhposh -- test -r "$ENV_FILE" || die 'Runtime user cannot read the protected environment file.'
  runuser -u shawhposh -- test -w "$DATABASE_FILE" || die 'Runtime user cannot write the SQLite database.'
  runuser -u shawhposh -- test -w "$RECEIPT_ROOT" || die 'Runtime user cannot write receipt storage.'
  runuser -u shawhposh -- test -w "$BACKUP_ROOT" || die 'Runtime user cannot write backup storage.'
  runuser -u shawhposh -- test ! -w "$CANDIDATE_RELEASE" || die 'Runtime user can modify the deployed release directory.'
  runuser -u shawhposh -- test ! -w "$CANDIDATE_RELEASE/server-dist" || die 'Runtime user can modify the deployed server artifact directory.'
  runuser -u ubuntu -- test ! -w "$DATABASE_FILE" || die 'ubuntu can still write the production database.'
  runuser -u ubuntu -- test ! -w "$RECEIPT_ROOT" || die 'ubuntu can still write payment receipts.'
  runuser -u ubuntu -- test ! -w "$BACKUP_ROOT" || die 'ubuntu can still write Shawhposh backups.'
  runuser -u shawhposh -- test ! -w "$CANDIDATE_RELEASE/server-dist/index.js" || die 'Runtime account can modify its deployed application code.'
  log 'PERMISSIONS' 'State, env, receipts, backups, and deployment-code permissions verified.'
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

wait_for_health() {
  local attempt
  for attempt in {1..30}; do
    if health_json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" else 1)' 2>/dev/null; then
      health_is_connected
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
  log 'SUDO' 'Installing /etc/sudoers.d/ubuntu-shawhposh with the reviewed exact-command policy; password-required sudo is unchanged.'
  if [[ -e $temporary || -L $temporary ]]; then die "Unexpected temporary sudoers path exists: $temporary"; fi
  if [[ -e $target || -L $target ]]; then
    [[ -f $target && ! -L $target ]] || die 'Installed Shawhposh sudo policy is not a regular file.'
    if ! cmp -s -- "$target" "$source"; then
      [[ $(<"$target") == "$OLD_SUDO_POLICY" ]] || die 'Existing Shawhposh sudo policy differs from the known reviewed baseline; refusing to replace it.'
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
  if ! verify_passwordless_sudo_allowlist "$NEW_SUDO_POLICY"; then
    restore_sudo_policy || true
    visudo -cf /etc/sudoers || true
    die 'Passwordless sudo differs from the new exact allowlist; prior policy restored.'
  fi
  log 'SUDO' 'Scoped policy installed; ordinary password-required sudo was left unchanged.'
}

main() {
  validate_preflight
  if (( DRY_RUN )); then
    log 'DRY RUN' 'No production changes were made. Planned: save rollback unit snapshot; pause the two existing timers; run and verify a fresh local DB/receipt backup; create/validate the service user; install prepared systemd units; assign only the exact Shawhposh state paths; switch the API current symlink to this staged release; cut over PM2 to systemd with rollback on health failure; verify data and services; install the exact sudo policy.'
    log 'DRY RUN' 'Off-host replication configuration and timers remain untouched and disabled.'
    return 0
  fi

  [[ -t 0 ]] || die 'The cutover requires an owner at an interactive terminal.'
  printf '[CONFIRM] This will change Shawhposh service ownership and switch the production API. Type CUTOVER to continue: ' >&2
  local confirmation
  IFS= read -r confirmation
  [[ $confirmation == CUTOVER ]] || die 'Owner confirmation did not match; no production changes were made.'

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
  log 'API CUTOVER' 'Stopping only the Shawhposh PM2 API and switching to the staged versioned release.'
  pm2_other_snapshot > "$SNAPSHOT_DIR/pm2-unrelated-before.json"
  PM2_API_STOPPED=1
  pm2_as_ubuntu stop shawhposh-api >/dev/null
  if [[ $ORIGINAL_API_RELEASE != "$CANDIDATE_RELEASE" ]]; then
    log 'API CUTOVER' "$API_CURRENT -> $CANDIDATE_RELEASE"
    set_api_current "$CANDIDATE_RELEASE"
    API_LINK_CHANGE_STARTED=1
  fi
  apply_runtime_permissions
  API_UNIT_START_ATTEMPTED=1
  systemctl start "$API_UNIT"
  wait_for_health || die 'New systemd API health/database check failed.'
  [[ $(systemctl is-active "$API_UNIT") == active ]] || die 'The dedicated API service is not active.'
  [[ $(systemctl show -p User --value "$API_UNIT") == shawhposh ]] || die 'The API systemd unit is not configured for the runtime user.'
  local api_pid api_owner
  api_pid=$(systemctl show -p MainPID --value "$API_UNIT")
  [[ $api_pid =~ ^[1-9][0-9]*$ ]] || die 'The dedicated API service has no main process.'
  api_owner=$(ps -o user= -p "$api_pid" | xargs)
  [[ $api_owner == shawhposh ]] || die "API process owner is $api_owner, expected shawhposh."
  [[ $(pm2_other_snapshot) == "$(<"$SNAPSHOT_DIR/pm2-unrelated-before.json")" ]] || die 'An unrelated PM2 application changed during API startup.'
  systemctl enable "$API_UNIT" >/dev/null
  API_HEALTHY=1
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
  verify_database "$DATABASE_FILE"
  [[ $(readlink -e -- "$API_CURRENT") == "$CANDIDATE_RELEASE" ]] || die 'The API current symlink does not point to the staged commit.'
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
  CUTOVER_ACTIVE=0
  log 'VERIFY' 'Runtime cutover completed. Shipping/payment remain disabled; off-host replication remains unconfigured.'
  log 'VERIFY' "Rollback configuration snapshot: $SNAPSHOT_DIR"
  log 'VERIFY' "Active API release: $(readlink -e -- "$API_CURRENT")"
  log 'VERIFY' 'Retained database and receipt backups; no business rows were created or deleted.'
}

main
