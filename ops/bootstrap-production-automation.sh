#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly REPOSITORY_URL='https://github.com/mathofdynamic/Shawhposh-design'
readonly EXPECTED_RUNTIME_SHA=c45e3c67fe986a362c4cb46e2a9859568f8b0a8f
readonly EXPECTED_RUNTIME_RELEASE=/home/ubuntu/shawhposh/releases/c45e3c67fe986a362c4cb46e2a9859568f8b0a8f
readonly API_RELEASES=/home/ubuntu/shawhposh/releases
readonly API_CURRENT=/home/ubuntu/shawhposh/current
readonly OLD_PRODUCTION_SHA=2ede63d7d207735dce0958464f4e6462f80494e1
readonly DOMAIN=shawhposh.ir
readonly DATABASE_FILE=/var/lib/shawhposh/shawhposh.sqlite
readonly ENV_FILE=/var/lib/shawhposh/.env
readonly RECEIPT_ROOT=/var/lib/shawhposh/uploads/payment-receipts
readonly BACKUP_ROOT=/var/backups/shawhposh
readonly RUNTIME_CURRENT=/opt/shawhposh/current
readonly RUNTIME_ROOT=/opt/shawhposh
readonly RUNTIME_RELEASES=/opt/shawhposh/releases
readonly PROMOTION_HELPER=/usr/local/sbin/shawhposh-promote-release
readonly WEB_ROOT=/var/www/shawhposh
readonly WEB_RELEASES=/var/www/shawhposh/releases
readonly WEB_CURRENT=/var/www/shawhposh/current
readonly API_UNIT=shawhposh-api.service
readonly BACKUP_UNIT=shawhposh-backup.service
readonly BACKUP_TIMER=shawhposh-backup.timer
readonly RESERVATION_UNIT=shawhposh-reservations.service
readonly RESERVATION_TIMER=shawhposh-reservations.timer
readonly REPLICATION_UNIT=shawhposh-replicate.service
readonly DEPLOY_COMMAND=/usr/local/sbin/shawhposh-deploy
readonly SUDOERS_TARGET=/etc/sudoers.d/ubuntu-shawhposh
readonly BOOTSTRAP_CONTEXT_VALUE='AUTOMATE_SHAWHPosh-v1'
readonly BOOTSTRAP_RUNNER_CONTEXT_VALUE='SHAWHPOSH_BOOTSTRAP_RUNNER-v1'
readonly BOOTSTRAP_RUNNER_CONFIRMATION='AUTOMATE SHAWHPosh'
readonly BOOTSTRAP_RUNNER_PATH=/usr/local/sbin/shawhposh-bootstrap
readonly BOOTSTRAP_RUNNER_SUDOERS=/etc/sudoers.d/ubuntu-shawhposh-bootstrap
readonly BOOTSTRAP_RUNNER_SUDO_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$'
readonly FINAL_SUDO_POLICY='Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$'
readonly PRE_CUTOVER_SUDO_POLICY_3='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service'
readonly PRE_CUTOVER_SUDO_POLICY_4='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service, /usr/bin/systemctl restart shawhposh-api.service'
LEGACY_SHA_ARGUMENT=
for (( index=0; index<40; index++ )); do LEGACY_SHA_ARGUMENT+='[0-9a-f]'; done
readonly LEGACY_SHA_ARGUMENT
readonly CUTOVER_SUDO_POLICY="Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
ubuntu ALL=(root) PASSWD: /usr/local/sbin/shawhposh-promote-release $LEGACY_SHA_ARGUMENT"

SCRIPT_REALPATH=
CONTROLLER_RELEASE=
TRUSTED_GIT_ROOT=
CUTOVER_SCRIPT=
INSTALLER_SCRIPT=
BOOTSTRAP_SNAPSHOT=
CUTOVER_SNAPSHOT_DIR=
CUTOVER_ACCEPTED=0
RUNNER_MODE=0
RESUME_RUNTIME=0
RESUME_FINAL_INSTALL=0
declare -A CONTROLLER_HASHES=()

log() { printf '[%s] %s\n' "$1" "$2"; }
die() { log 'ABORT' "$*" >&2; return 1; }
replication_unit_has_no_autostart() {
  local state
  state=$(systemctl is-enabled "$REPLICATION_UNIT" 2>/dev/null || true)
  case "$state" in
    static|disabled|masked|masked-runtime) return 0 ;;
    *) return 1 ;;
  esac
}

git_as_ubuntu_from() {
  local path=$1
  shift
  runuser -u ubuntu -- env -i HOME=/home/ubuntu PATH=/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    /usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null -C "$path" "$@"
}

require_file() { [[ -f $1 && ! -L $1 ]] || die "Required regular file missing or unsafe: $1"; }
require_dir() { [[ -d $1 && ! -L $1 && $(realpath -e -- "$1") == "$1" ]] || die "Required directory missing or unsafe: $1"; }

check_checkout() {
  local path=$1 sha=$2 check_main=$3 branch origin
  require_dir "$path"
  [[ $(stat -c '%U' -- "$path") == ubuntu ]] || die "Release is not ubuntu-owned: $path"
  origin=$(git_as_ubuntu_from "$path" config --local --get remote.origin.url)
  [[ $origin == "$REPOSITORY_URL" || $origin == "$REPOSITORY_URL.git" ]] || die "Unexpected repository origin: $path"
  [[ $(git_as_ubuntu_from "$path" rev-parse HEAD) == "$sha" ]] || die "Release HEAD differs from pinned SHA: $path"
  [[ -z $(git_as_ubuntu_from "$path" status --porcelain --untracked-files=all) ]] || die "Release has local changes: $path"
  if [[ $check_main == yes ]]; then
    branch=$(git_as_ubuntu_from "$path" branch --show-current)
    [[ $branch == main || -z $branch ]] || die 'Bootstrap source must be main or detached at origin/main.'
    [[ $sha == $(git_as_ubuntu_from "$path" rev-parse origin/main) ]] || die 'Bootstrap source differs from fetched origin/main.'
  fi
}

validate_artifacts() {
  local root=$1 role=$2 file
  for file in package.json node_modules/.package-lock.json server-dist/index.js \
    server-dist/db/backup.js server-dist/modules/orders/expire-reservations.js \
    ops/replicate-backups.mjs ops/promote_release.py ops/runtime-cutover.sh \
    ops/install-automated-deploy.sh ops/automated_deploy.py ops/shawhposh-deploy \
    ops/sudoers.d/ubuntu-shawhposh ops/shawhposh-api.service ops/shawhposh-backup.service \
    ops/shawhposh-backup.timer ops/shawhposh-reservations.service \
    ops/shawhposh-reservations.timer ops/shawhposh-replicate.service; do
    require_file "$root/$file"
  done
  if [[ $role == controller ]]; then
    require_file "$root/ops/promote_frontend.py"
    for file in ops/legacy-systemd/shawhposh-backup.service ops/legacy-systemd/shawhposh-backup.timer \
      ops/legacy-systemd/shawhposh-reservations.service ops/legacy-systemd/shawhposh-reservations.timer; do
      require_file "$root/$file"
    done
  fi
  require_dir "$root/node_modules"
  require_dir "$root/server-dist"
  [[ $(stat -c '%U' -- "$root/node_modules") == ubuntu ]] || die "node_modules is not ubuntu-owned: $root"
}

bootstrap_preflight() {
  local runtime_head controller_sha branch file mode trusted_root git_root requested_sha workspace source_owner
  (( EUID == 0 )) || die 'Run with owner-authenticated sudo: sudo bash ops/bootstrap-production-automation.sh'
  [[ -f ${BASH_SOURCE[0]} && ! -L ${BASH_SOURCE[0]} ]] || die 'Bootstrap must be invoked from a regular file.'
  SCRIPT_REALPATH=$(readlink -e -- "${BASH_SOURCE[0]}")
  if [[ ${SHAWHPOSH_BOOTSTRAP_RUNNER_CONTEXT:-} == "$BOOTSTRAP_RUNNER_CONTEXT_VALUE" ]]; then
    RUNNER_MODE=1
    [[ $# -eq 1 && $1 == --trusted-runner ]] || die 'Trusted runner mode accepts only its fixed internal argument.'
    trusted_root=${SHAWHPOSH_BOOTSTRAP_TRUSTED_ROOT:-}
    git_root=${SHAWHPOSH_BOOTSTRAP_GIT_ROOT:-}
    TRUSTED_GIT_ROOT=$git_root
    requested_sha=${SHAWHPOSH_BOOTSTRAP_REQUESTED_SHA:-}
    workspace=${SHAWHPOSH_BOOTSTRAP_WORKSPACE:-}
    [[ $requested_sha =~ ^[0-9a-f]{40}$ ]] || die 'Trusted runner did not provide a valid requested SHA.'
    [[ $workspace =~ ^/var/tmp/shawhposh-bootstrap-[A-Za-z0-9_-]+$ \
      && $trusted_root == "$workspace/trusted" && $git_root == "$workspace/checkout" ]] \
      || die 'Trusted runner source is outside its fixed private workspace.'
    [[ $(realpath -e -- "$workspace") == "$workspace" && $(stat -c '%U:%G:%a' -- "$workspace") == root:root:700 ]] \
      || die 'Trusted runner workspace is not a private root-owned directory.'
    [[ -d $git_root && ! -L $git_root && $(realpath -e -- "$git_root") == "$git_root" \
      && $(stat -c '%U:%G' -- "$git_root") == root:root ]] || die 'Trusted Git checkout is not root-owned.'
    [[ $SCRIPT_REALPATH == "$trusted_root/ops/bootstrap-production-automation.sh" \
      && -d $trusted_root && ! -L $trusted_root && $(realpath -e -- "$trusted_root") == "$trusted_root" \
      && $(stat -c '%U:%G:%a' -- "$trusted_root") == root:root:700 ]] \
      || die 'Bootstrap controller is not in the private root-owned trusted directory.'
    [[ $(stat -c '%U:%G:%a' -- "$SCRIPT_REALPATH") == root:root:600 ]] \
      || die 'Trusted bootstrap controller has unexpected ownership or mode.'
    [[ $(/usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$git_root" remote get-url origin) == "$REPOSITORY_URL.git" \
      && $(/usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$git_root" rev-parse HEAD) == "$requested_sha" ]] \
      || die 'Trusted Git checkout identity or requested SHA is invalid.'
    /usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$git_root" merge-base --is-ancestor "$requested_sha" origin/main \
      || die 'Requested bootstrap commit is not reachable from fixed origin/main.'
    /usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$git_root" merge-base --is-ancestor "$OLD_PRODUCTION_SHA" "$requested_sha" \
      || die 'The fixed legacy timer source commit is not an ancestor of the trusted bootstrap commit.'
    CONTROLLER_RELEASE=$trusted_root
    controller_sha=$requested_sha
    branch=detached
  else
    [[ -t 0 && -t 1 ]] || die 'Bootstrap requires an interactive terminal.'
    [[ $# -eq 0 ]] || die 'This bootstrap accepts no arguments.'
    CONTROLLER_RELEASE=$(dirname -- "$(dirname -- "$SCRIPT_REALPATH")")
    [[ $(dirname -- "$CONTROLLER_RELEASE") == "$API_RELEASES" && $(basename -- "$CONTROLLER_RELEASE") =~ ^[0-9a-f]{40}$ ]] \
      || die 'Run only from a versioned Shawhposh release under the fixed release root.'
    controller_sha=$(basename -- "$CONTROLLER_RELEASE")
    check_checkout "$CONTROLLER_RELEASE" "$controller_sha" yes
    branch=$(git_as_ubuntu_from "$CONTROLLER_RELEASE" branch --show-current)
  fi
  CUTOVER_SCRIPT=$CONTROLLER_RELEASE/ops/runtime-cutover.sh
  INSTALLER_SCRIPT=$CONTROLLER_RELEASE/ops/install-automated-deploy.sh

  check_checkout "$EXPECTED_RUNTIME_RELEASE" "$EXPECTED_RUNTIME_SHA" no
  git_as_ubuntu_from "$EXPECTED_RUNTIME_RELEASE" merge-base --is-ancestor "$EXPECTED_RUNTIME_SHA" origin/main \
    || die 'Fixed runtime commit is no longer reachable from origin/main.'
  runtime_head=$(git_as_ubuntu_from "$EXPECTED_RUNTIME_RELEASE" rev-parse HEAD)
  [[ $runtime_head == "$EXPECTED_RUNTIME_SHA" ]] || die 'Fixed runtime candidate is not the approved c45 commit.'
  log 'PRECHECK' "bootstrap_source=$controller_sha branch=${branch:-detached} runtime_candidate=$runtime_head"

  if (( RUNNER_MODE )); then
    for file in ops/bootstrap-production-automation.sh ops/runtime-cutover.sh ops/install-automated-deploy.sh \
      ops/automated_deploy.py ops/promote_frontend.py ops/promote_release.py ops/replicate-backups.mjs \
      ops/shawhposh-deploy ops/sudoers.d/ubuntu-shawhposh ops/shawhposh-api.service \
      ops/shawhposh-backup.service ops/shawhposh-backup.timer ops/shawhposh-reservations.service \
      ops/shawhposh-reservations.timer ops/shawhposh-replicate.service; do
      require_file "$CONTROLLER_RELEASE/$file"
      [[ $(stat -c '%U:%G:%a' -- "$CONTROLLER_RELEASE/$file") == root:root:600 ]] \
        || die "Trusted controller artifact has unsafe ownership or mode: $file"
    done
  else
    validate_artifacts "$CONTROLLER_RELEASE" controller
  fi
  validate_artifacts "$EXPECTED_RUNTIME_RELEASE" runtime
  for file in ops/bootstrap-production-automation.sh ops/runtime-cutover.sh ops/install-automated-deploy.sh; do
    source_owner=$(stat -c '%U:%G' -- "$CONTROLLER_RELEASE/$file")
    if (( RUNNER_MODE )); then [[ $source_owner == root:root ]] || die "Trusted bootstrap source is not root-owned: $file"; else [[ $source_owner == ubuntu:ubuntu ]] || die "Bootstrap source is not ubuntu-owned: $file"; fi
    mode=$(stat -c '%a' -- "$CONTROLLER_RELEASE/$file")
    [[ $mode =~ ^[0-7]{3,4}$ ]] && (( (8#$mode & 0022) == 0 )) || die "Bootstrap source is group/world writable: $file"
  done
  [[ $(<"$EXPECTED_RUNTIME_RELEASE/ops/sudoers.d/ubuntu-shawhposh") == "$FINAL_SUDO_POLICY" ]] \
    || die 'Pinned candidate does not contain the reviewed SHA-scoped sudo policy.'
  [[ $(<"$CONTROLLER_RELEASE/ops/sudoers.d/ubuntu-shawhposh") == "$FINAL_SUDO_POLICY" ]] \
    || die 'Bootstrap source does not contain the reviewed SHA-scoped sudo policy.'
  [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(stat -c '%U:%G:%a' -- "$SUDOERS_TARGET") == root:root:440 ]] \
    || die 'Expected reviewed Shawhposh sudoers baseline is missing or has an unsafe type, owner, or mode.'
  case "$(<"$SUDOERS_TARGET")" in
    "$PRE_CUTOVER_SUDO_POLICY_3"|"$PRE_CUTOVER_SUDO_POLICY_4"|"$CUTOVER_SUDO_POLICY") ;;
    *) die 'Existing Shawhposh sudoers file does not match a reviewed pre-cutover baseline.' ;;
  esac
  if (( RUNNER_MODE )); then
    [[ -f $BOOTSTRAP_RUNNER_SUDOERS && ! -L $BOOTSTRAP_RUNNER_SUDOERS \
      && $(stat -c '%U:%G:%a' -- "$BOOTSTRAP_RUNNER_SUDOERS") == root:root:440 \
      && $(<"$BOOTSTRAP_RUNNER_SUDOERS") == "$BOOTSTRAP_RUNNER_SUDO_POLICY" ]] \
      || die 'The exact temporary bootstrap sudo rule is missing or unsafe.'
    [[ -f $BOOTSTRAP_RUNNER_PATH && ! -L $BOOTSTRAP_RUNNER_PATH \
      && $(stat -c '%U:%G:%a' -- "$BOOTSTRAP_RUNNER_PATH") == root:root:755 ]] \
      || die 'The installed temporary bootstrap runner is missing or unsafe.'
    /usr/sbin/visudo -cf "$BOOTSTRAP_RUNNER_SUDOERS" >/dev/null || die 'Temporary bootstrap sudoers file is invalid.'
    if systemctl is-active --quiet "$API_UNIT"; then
      RESUME_RUNTIME=1
      case "$(<"$SUDOERS_TARGET")" in
        "$CUTOVER_SUDO_POLICY") RESUME_FINAL_INSTALL=0 ;;
        "$FINAL_SUDO_POLICY") RESUME_FINAL_INSTALL=1 ;;
        *) die 'An active systemd runtime has an unrecognized deployment sudo policy.' ;;
      esac
    fi
  fi
  /usr/sbin/visudo -cf "$SUDOERS_TARGET" >/dev/null || die 'Existing Shawhposh sudoers file is invalid.'
  [[ -x /usr/sbin/visudo && -x /usr/bin/sudo && -x /usr/bin/systemctl && -x /usr/bin/curl ]] || die 'Required system utilities are missing.'
  /usr/sbin/visudo -cf /etc/sudoers >/dev/null || die 'Current sudoers configuration is invalid.'
  for file in ops/runtime-cutover.sh ops/install-automated-deploy.sh ops/automated_deploy.py ops/promote_frontend.py \
    ops/promote_release.py ops/shawhposh-deploy ops/sudoers.d/ubuntu-shawhposh; do
    CONTROLLER_HASHES[$file]=$(sha256sum -- "$CONTROLLER_RELEASE/$file")
    CONTROLLER_HASHES[$file]=${CONTROLLER_HASHES[$file]%% *}
  done
  if (( ! RUNNER_MODE )); then
    for file in ops/legacy-systemd/shawhposh-backup.service ops/legacy-systemd/shawhposh-backup.timer \
      ops/legacy-systemd/shawhposh-reservations.service ops/legacy-systemd/shawhposh-reservations.timer; do
      source_owner=$(stat -c '%U:%G' -- "$CONTROLLER_RELEASE/$file")
      [[ $source_owner == ubuntu:ubuntu ]] || die "Legacy timer template is not ubuntu-owned: $file"
      mode=$(stat -c '%a' -- "$CONTROLLER_RELEASE/$file")
      [[ $mode =~ ^[0-7]{3,4}$ ]] && (( (8#$mode & 0022) == 0 )) || die "Legacy timer template is group/world writable: $file"
      CONTROLLER_HASHES[$file]=$(sha256sum -- "$CONTROLLER_RELEASE/$file")
      CONTROLLER_HASHES[$file]=${CONTROLLER_HASHES[$file]%% *}
    done
  fi
  log 'PRECHECK' 'Static release, host prerequisites, and fixed production paths are ready for owner review.'
}

create_private_trusted_snapshot_directories() {
  local trusted_root=$1 path
  for path in "$trusted_root" "$trusted_root/ops" "$trusted_root/ops/sudoers.d" "$trusted_root/ops/legacy-systemd"; do
    install -d -o root -g root -m 0700 -- "$path"
    chmod 0700 -- "$path"
  done
}

capture_legacy_timer_templates() {
  local unit relative git_relative source destination digest expected_hash entry object_mode object_type object_id object_path
  local -a legacy_units=(shawhposh-backup.service shawhposh-backup.timer \
    shawhposh-reservations.service shawhposh-reservations.timer)
  for unit in "${legacy_units[@]}"; do
    relative=ops/legacy-systemd/$unit
    destination=$BOOTSTRAP_SNAPSHOT/trusted/$relative
    [[ ! -e $destination && ! -L $destination ]] || die "Legacy template snapshot path already exists: $unit"
    if (( RUNNER_MODE )); then
      git_relative=ops/$unit
      entry=$(/usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$TRUSTED_GIT_ROOT" \
        ls-tree "$OLD_PRODUCTION_SHA" -- "$git_relative") || die "Could not inspect fixed legacy unit source: $unit"
      IFS=$' \t' read -r object_mode object_type object_id object_path <<< "$entry"
      [[ $object_mode == 100644 && $object_type == blob && $object_id =~ ^[0-9a-f]{40}$ && $object_path == "$git_relative" ]] \
        || die "Fixed legacy unit is not a regular committed file: $unit"
      /usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$TRUSTED_GIT_ROOT" \
        show "$OLD_PRODUCTION_SHA:$git_relative" > "$destination" || die "Could not snapshot fixed legacy unit: $unit"
      chown root:root -- "$destination"
      chmod 0600 -- "$destination"
    else
      source=$CONTROLLER_RELEASE/$relative
      [[ -f $source && ! -L $source && $(stat -c '%U:%G' -- "$source") == ubuntu:ubuntu ]] \
        || die "Legacy timer template is missing or unsafe: $unit"
      digest=$(sha256sum -- "$source")
      expected_hash=${CONTROLLER_HASHES[$relative]:-}
      [[ -n $expected_hash && ${digest%% *} == "$expected_hash" ]] || die "Legacy timer template changed after preflight: $unit"
      install -o root -g root -m 0600 -- "$source" "$destination"
    fi
    [[ -f $destination && ! -L $destination && -s $destination \
      && $(stat -c '%U:%G:%a' -- "$destination") == root:root:600 ]] \
      || die "Legacy timer template snapshot is unsafe: $unit"
    digest=$(sha256sum -- "$destination")
    CONTROLLER_HASHES[$relative]=${digest%% *}
  done
}

capture_bootstrap_snapshot() {
  local stamp path unit source destination digest source_owner
  stamp=$(/usr/bin/date -u +%Y%m%dT%H%M%SZ)
  BOOTSTRAP_SNAPSHOT=/root/shawhposh-production-automation-$stamp
  [[ ! -e $BOOTSTRAP_SNAPSHOT && ! -L $BOOTSTRAP_SNAPSHOT ]] || die 'Root rollback metadata path already exists.'
  install -d -o root -g root -m 0700 -- "$BOOTSTRAP_SNAPSHOT"
  printf 'runtime_sha=%s\ncontroller_release=%s\ncreated_utc=%s\n' "$EXPECTED_RUNTIME_SHA" "$CONTROLLER_RELEASE" "$stamp" \
    > "$BOOTSTRAP_SNAPSHOT/manifest.txt"
  chmod 0600 "$BOOTSTRAP_SNAPSHOT/manifest.txt"
  if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
    [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET ]] || die 'Cannot snapshot unexpected sudoers file type.'
    install -o root -g root -m 0600 -- "$SUDOERS_TARGET" "$BOOTSTRAP_SNAPSHOT/sudoers-before"
    printf 'present\n' > "$BOOTSTRAP_SNAPSHOT/sudoers-before.state"
  else
    printf 'absent\n' > "$BOOTSTRAP_SNAPSHOT/sudoers-before.state"
  fi
  {
    for path in /var/lib/shawhposh /var/lib/shawhposh/shawhposh.sqlite /var/lib/shawhposh/.env \
      /var/lib/shawhposh/uploads/payment-receipts /var/backups/shawhposh \
      /home/ubuntu/shawhposh/current /var/www/shawhposh/current /opt/shawhposh/current; do
      if [[ -e $path || -L $path ]]; then stat -c '%n|%U:%G:%a|%F|%N' -- "$path"; else printf '%s|absent\n' "$path"; fi
    done
  } > "$BOOTSTRAP_SNAPSHOT/ownership-before.txt"
  chmod 0600 "$BOOTSTRAP_SNAPSHOT/ownership-before.txt"
  for unit in shawhposh-api.service shawhposh-backup.service shawhposh-backup.timer \
    shawhposh-reservations.service shawhposh-reservations.timer shawhposh-replicate.service; do
    path=/etc/systemd/system/$unit
    if [[ -e $path || -L $path ]]; then
      [[ -f $path && ! -L $path ]] || die "Cannot snapshot unexpected unit type: $path"
      install -o root -g root -m 0600 -- "$path" "$BOOTSTRAP_SNAPSHOT/$unit"
    else
      printf 'absent\n' > "$BOOTSTRAP_SNAPSHOT/$unit.state"
      chmod 0600 "$BOOTSTRAP_SNAPSHOT/$unit.state"
    fi
  done
  runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 jlist \
    | /usr/bin/python3 -c 'import json,sys; apps=json.load(sys.stdin); rows=[{"name":p.get("name"),"pid":int(p.get("pid",0)),"status":p.get("pm2_env",{}).get("status"),"cwd":p.get("pm2_env",{}).get("pm_cwd")} for p in apps if p.get("name")=="shawhposh-api"]; print(json.dumps(rows,separators=(",",":")))' \
    > "$BOOTSTRAP_SNAPSHOT/pm2-api-before.json"
  chmod 0600 "$BOOTSTRAP_SNAPSHOT/pm2-api-before.json"
  create_private_trusted_snapshot_directories "$BOOTSTRAP_SNAPSHOT/trusted"
  for path in "$BOOTSTRAP_SNAPSHOT/trusted" "$BOOTSTRAP_SNAPSHOT/trusted/ops" \
    "$BOOTSTRAP_SNAPSHOT/trusted/ops/sudoers.d" "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd"; do
    [[ $(stat -c '%U:%G:%a' -- "$path") == root:root:700 ]] || die "Trusted snapshot directory is not private: $path"
  done
  for source in ops/runtime-cutover.sh ops/install-automated-deploy.sh ops/automated_deploy.py \
    ops/promote_frontend.py ops/promote_release.py ops/shawhposh-deploy ops/sudoers.d/ubuntu-shawhposh; do
    destination=$BOOTSTRAP_SNAPSHOT/trusted/$source
    [[ -f $CONTROLLER_RELEASE/$source && ! -L $CONTROLLER_RELEASE/$source ]] || die "Trusted controller source changed type: $source"
    source_owner=$(stat -c '%U:%G' -- "$CONTROLLER_RELEASE/$source")
    if (( RUNNER_MODE )); then [[ $source_owner == root:root ]] || die "Trusted controller source is not root-owned: $source"; else [[ $source_owner == ubuntu:ubuntu ]] || die "Trusted controller source is not ubuntu-owned: $source"; fi
    mode=$(stat -c '%a' -- "$CONTROLLER_RELEASE/$source")
    [[ $mode =~ ^[0-7]{3,4}$ ]] && (( (8#$mode & 0022) == 0 )) || die "Trusted controller source is group/world writable: $source"
    digest=$(sha256sum -- "$CONTROLLER_RELEASE/$source")
    [[ ${digest%% *} == "${CONTROLLER_HASHES[$source]}" ]] || die "Controller source changed after preflight: $source"
    install -o root -g root -m 0600 -- "$CONTROLLER_RELEASE/$source" "$destination"
    digest=$(sha256sum -- "$destination")
    [[ ${digest%% *} == "${CONTROLLER_HASHES[$source]}" ]] || die "Root-owned controller snapshot failed hash verification: $source"
  done
  capture_legacy_timer_templates
  CUTOVER_SCRIPT=$BOOTSTRAP_SNAPSHOT/trusted/ops/runtime-cutover.sh
  INSTALLER_SCRIPT=$BOOTSTRAP_SNAPSHOT/trusted/ops/install-automated-deploy.sh
  log 'SNAPSHOT' "Root-only bootstrap metadata: $BOOTSTRAP_SNAPSHOT"
}

run_cutover_preflight() {
  log 'PRECHECK' 'Running the fixed-candidate production cutover dry run from root-owned, hash-verified script copies.'
  env SHAWHPOSH_BOOTSTRAP_CONTEXT="$BOOTSTRAP_CONTEXT_VALUE" /bin/bash "$CUTOVER_SCRIPT" --execute-from-bootstrap --dry-run
}

perform_runtime_cutover() {
  local log_file=$BOOTSTRAP_SNAPSHOT/runtime-cutover.log status path
  if env SHAWHPOSH_BOOTSTRAP_CONTEXT="$BOOTSTRAP_CONTEXT_VALUE" /bin/bash "$CUTOVER_SCRIPT" --execute-from-bootstrap 2>&1 \
    | /usr/bin/tee "$log_file"; then :; else status=$?; chmod 0600 "$log_file" 2>/dev/null || true; return "$status"; fi
  CUTOVER_ACCEPTED=1
  chmod 0600 "$log_file" || return 1
  mapfile -t snapshots < <(/usr/bin/sed -n 's/^\[VERIFY\] Rollback configuration snapshot: //p' "$log_file")
  [[ ${#snapshots[@]} -ge 1 ]] || { die 'Cutover returned no rollback-snapshot reference.'; return 1; }
  CUTOVER_SNAPSHOT_DIR=${snapshots[0]}
  for path in "${snapshots[@]}"; do [[ $path == "$CUTOVER_SNAPSHOT_DIR" ]] || { die 'Cutover emitted ambiguous rollback paths.'; return 1; }; done
  [[ $CUTOVER_SNAPSHOT_DIR == /root/shawhposh-runtime-cutover-* && -d $CUTOVER_SNAPSHOT_DIR && ! -L $CUTOVER_SNAPSHOT_DIR ]] \
    || { die 'Cutover snapshot path is unexpected.'; return 1; }
}

snapshot_preinstall_sudo_policy() {
  [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(<"$SUDOERS_TARGET") == "$CUTOVER_SUDO_POLICY" ]] \
    || { die 'Cutover did not install the reviewed intermediate sudoers policy.'; return 1; }
  install -o root -g root -m 0600 -- "$SUDOERS_TARGET" "$BOOTSTRAP_SNAPSHOT/sudoers-before-automated-install" || return 1
  /usr/sbin/visudo -cf "$BOOTSTRAP_SNAPSHOT/sudoers-before-automated-install" >/dev/null \
    || { die 'Intermediate sudoers snapshot is invalid.'; return 1; }
}

restore_original_sudo_policy() {
  local state=$BOOTSTRAP_SNAPSHOT/sudoers-before.state saved=$BOOTSTRAP_SNAPSHOT/sudoers-before
  [[ -f $state && ! -L $state ]] || { log 'CRITICAL' 'Original sudoers snapshot is missing; keep the root session open.'; return 1; }
  case "$(<"$state")" in
    present)
      [[ -f $saved && ! -L $saved && $(stat -c '%U:%G:%a' -- "$saved") == root:root:600 ]] \
        || { log 'CRITICAL' 'Original sudoers snapshot is unsafe; keep the root session open.'; return 1; }
      if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
        [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(stat -c '%U:%G:%a' -- "$SUDOERS_TARGET") == root:root:440 \
          && $(<"$SUDOERS_TARGET") == "$CUTOVER_SUDO_POLICY" ]] \
          || { log 'CRITICAL' 'Refusing to overwrite an unexpected sudoers target; keep the root session open.'; return 1; }
      fi
      install -o root -g root -m 0440 -- "$saved" "$SUDOERS_TARGET" || return 1
      ;;
    absent)
      if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
        [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(<"$SUDOERS_TARGET") == "$CUTOVER_SUDO_POLICY" ]] \
          || { log 'CRITICAL' 'Refusing to remove an unexpected sudoers policy; keep the root session open.'; return 1; }
        unlink -- "$SUDOERS_TARGET" || return 1
      fi
      ;;
    *) log 'CRITICAL' 'Original sudoers snapshot state is invalid; keep the root session open.'; return 1 ;;
  esac
  /usr/sbin/visudo -cf /etc/sudoers >/dev/null || { log 'CRITICAL' 'Restored original sudoers policy is invalid.'; return 1; }
}

restore_preinstall_sudo_policy() {
  local saved=$BOOTSTRAP_SNAPSHOT/sudoers-before-automated-install
  [[ -f $saved && ! -L $saved && $(stat -c '%U:%G:%a' -- "$saved") == root:root:600 ]] \
    || { log 'CRITICAL' 'Cannot restore intermediate sudoers policy; retain the root session.'; return 1; }
  if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
    [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(stat -c '%U:%G:%a' -- "$SUDOERS_TARGET") == root:root:440 \
      && ( $(<"$SUDOERS_TARGET") == "$FINAL_SUDO_POLICY" || $(<"$SUDOERS_TARGET") == "$CUTOVER_SUDO_POLICY" ) ]] \
      || { log 'CRITICAL' 'Refusing to overwrite an unexpected sudoers target; retain the root session.'; return 1; }
  fi
  install -o root -g root -m 0440 -- "$saved" "$SUDOERS_TARGET" || return 1
  /usr/sbin/visudo -cf /etc/sudoers >/dev/null && /usr/sbin/visudo -cf "$SUDOERS_TARGET" >/dev/null
}

perform_automated_deploy_install() {
  env SHAWHPOSH_BOOTSTRAP_CONTEXT="$BOOTSTRAP_CONTEXT_VALUE" \
    SHAWHPOSH_BOOTSTRAP_SOURCE_ROOT="$BOOTSTRAP_SNAPSHOT/trusted" /bin/bash "$INSTALLER_SCRIPT"
}

pm2_other_snapshot() {
  runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 jlist \
    | /usr/bin/python3 -c 'import json,sys; a=json.load(sys.stdin); r=sorted((p.get("name",""),int(p.get("pid",0)),p.get("pm2_env",{}).get("status","unknown")) for p in a if p.get("name")!="shawhposh-api"); print(json.dumps(r,separators=(",",":")))'
}

recover_interrupted_legacy_timers() {
  local unit path pid owner health release_names release source destination relative expected_hash recovery_stage
  local -a timer_units=("$BACKUP_TIMER" "$RESERVATION_TIMER")
  local -a legacy_units=(shawhposh-backup.service shawhposh-backup.timer \
    shawhposh-reservations.service shawhposh-reservations.timer)
  if systemctl is-active --quiet "${timer_units[0]}" && systemctl is-active --quiet "${timer_units[1]}" \
    && systemctl is-enabled --quiet "${timer_units[0]}" && systemctl is-enabled --quiet "${timer_units[1]}"; then
    local all_legacy=1
    for unit in "${legacy_units[@]}"; do
      path=/etc/systemd/system/$unit
      if [[ ! -f $path || -L $path || $(stat -c '%U:%G:%a' -- "$path") != root:root:644 ]]; then
        all_legacy=0
        break
      fi
      if ! cmp -s -- "$path" "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/$unit"; then
        all_legacy=0
        break
      fi
    done
    (( all_legacy )) && return 0
  fi

  # Only recover the exact interrupted-preparation state: protected copies exist,
  # no protected current pointer was installed, and the known PM2 runtime/data
  # still match the pre-cutover state. Other inactive-timer states remain a hard
  # preflight failure and are never repaired speculatively.
  (( RUNNER_MODE == 1 && RESUME_RUNTIME == 0 )) || return 0
  systemctl is-enabled --quiet "${timer_units[0]}" && systemctl is-enabled --quiet "${timer_units[1]}" || return 0
  [[ ! -e $RUNTIME_CURRENT && ! -L $RUNTIME_CURRENT ]] || return 0
  if systemctl is-active --quiet "$API_UNIT" || systemctl is-enabled --quiet "$API_UNIT"; then return 0; fi
  if systemctl is-active --quiet "$BACKUP_UNIT" || systemctl is-active --quiet "$RESERVATION_UNIT"; then return 0; fi
  [[ -d $RUNTIME_ROOT && ! -L $RUNTIME_ROOT && $(stat -c '%U:%G:%a' -- "$RUNTIME_ROOT") == root:root:755 \
    && -d $RUNTIME_RELEASES && ! -L $RUNTIME_RELEASES && $(stat -c '%U:%G:%a' -- "$RUNTIME_RELEASES") == root:root:755 \
    && -f $PROMOTION_HELPER && ! -L $PROMOTION_HELPER \
    && $(stat -c '%U:%G:%a' -- "$PROMOTION_HELPER") == root:root:755 ]] || return 0
  release_names=$(find -P "$RUNTIME_RELEASES" -mindepth 1 -maxdepth 1 -printf '%f\n' | sort) || return 0
  [[ $release_names == "$(printf '%s\n%s' "$OLD_PRODUCTION_SHA" "$EXPECTED_RUNTIME_SHA")" ]] || return 0
  for release in "$RUNTIME_RELEASES/$OLD_PRODUCTION_SHA" "$RUNTIME_RELEASES/$EXPECTED_RUNTIME_SHA"; do
    [[ -d $release && ! -L $release && $(stat -c '%U:%G:%a' -- "$release") == root:root:755 ]] || return 0
  done
  [[ $(readlink -e -- "$API_CURRENT") == "$API_RELEASES/$OLD_PRODUCTION_SHA" \
    && $(stat -c '%U:%G:%a' -- /var/lib/shawhposh) == ubuntu:ubuntu:700 \
    && $(stat -c '%U:%G:%a' -- "$DATABASE_FILE") == ubuntu:ubuntu:600 \
    && $(stat -c '%U:%G:%a' -- "$ENV_FILE") == ubuntu:ubuntu:600 \
    && $(stat -c '%U:%G:%a' -- /var/lib/shawhposh/uploads) == ubuntu:ubuntu:700 \
    && $(stat -c '%U:%G:%a' -- "$RECEIPT_ROOT") == ubuntu:ubuntu:700 \
    && $(stat -c '%U:%G:%a' -- "$BACKUP_ROOT") == ubuntu:ubuntu:700 ]] || return 0

  pid=$(runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 jlist \
    | /usr/bin/python3 -c 'import json,sys; apps=[p for p in json.load(sys.stdin) if p.get("name")=="shawhposh-api"]; ok=len(apps)==1 and apps[0].get("pm2_env",{}).get("status")=="online" and int(apps[0].get("pid",0))>0; print(apps[0].get("pid",0) if len(apps)==1 else 0); sys.exit(0 if ok else 1)') || return 0
  [[ $pid =~ ^[1-9][0-9]*$ ]] || return 0
  owner=$(ps -o user= -p "$pid" | awk '{$1=$1; print}') || return 0
  [[ $owner == ubuntu ]] || return 0
  health=$(/usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health") || return 0
  printf '%s\n' "$health" | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1] else 1)' "$OLD_PRODUCTION_SHA" || return 0
  verify_database || return 0

  for unit in "$API_UNIT" "$BACKUP_UNIT" "$BACKUP_TIMER" "$RESERVATION_UNIT" "$RESERVATION_TIMER" "$REPLICATION_UNIT"; do
    path=/etc/systemd/system/$unit
    [[ -f $path && ! -L $path && $(stat -c '%U:%G:%a' -- "$path") == root:root:644 \
      && -f $CONTROLLER_RELEASE/ops/$unit && ! -L $CONTROLLER_RELEASE/ops/$unit ]] || return 0
    if [[ $unit == "$API_UNIT" || $unit == "$REPLICATION_UNIT" ]]; then
      cmp -s -- "$path" "$CONTROLLER_RELEASE/ops/$unit" || return 0
    elif ! cmp -s -- "$path" "$CONTROLLER_RELEASE/ops/$unit" \
      && ! cmp -s -- "$path" "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/$unit"; then
      return 0
    fi
  done

  for unit in "${legacy_units[@]}"; do
    relative=ops/legacy-systemd/$unit
    source=$BOOTSTRAP_SNAPSHOT/trusted/$relative
    expected_hash=${CONTROLLER_HASHES[$relative]:-}
    [[ -n $expected_hash && -f $source && ! -L $source \
      && $(stat -c '%U:%G:%a' -- "$source") == root:root:600 ]] || return 0
    [[ $(sha256sum -- "$source") == "$expected_hash  $source" ]] || return 0
  done
  /usr/bin/systemd-analyze verify \
    "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/shawhposh-backup.service" \
    "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/shawhposh-backup.timer" \
    "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/shawhposh-reservations.service" \
    "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/shawhposh-reservations.timer" || return 0

  recovery_stage=$BOOTSTRAP_SNAPSHOT/legacy-systemd-restore
  install -d -o root -g root -m 0700 -- "$recovery_stage" || return 1
  for unit in "${legacy_units[@]}"; do
    source=$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/$unit
    install -o root -g root -m 0644 -- "$source" "$recovery_stage/$unit" || return 1
    [[ $(stat -c '%U:%G:%a' -- "$recovery_stage/$unit") == root:root:644 ]] || return 1
  done

  log 'RECOVERY' 'Restoring the reviewed ubuntu-owned timer units left inactive by the interrupted protected-release preparation.'
  systemctl stop "${timer_units[@]}" || return 1
  for unit in "${legacy_units[@]}"; do
    destination=/etc/systemd/system/$unit
    if ! mv -fT -- "$recovery_stage/$unit" "$destination"; then
      systemctl stop "${timer_units[@]}" "$BACKUP_UNIT" "$RESERVATION_UNIT" >/dev/null 2>&1 || true
      restore_recovery_timer_units || log 'CRITICAL' 'Failed to restore the pre-recovery timer-unit snapshot.'
      return 1
    fi
  done
  if ! systemctl daemon-reload || ! systemctl start "${timer_units[@]}"; then
    systemctl stop "${timer_units[@]}" "$BACKUP_UNIT" "$RESERVATION_UNIT" >/dev/null 2>&1 || true
    restore_recovery_timer_units || log 'CRITICAL' 'Failed to restore the pre-recovery timer-unit snapshot.'
    return 1
  fi
  for unit in "${timer_units[@]}"; do
    if ! systemctl is-enabled --quiet "$unit" || ! systemctl is-active --quiet "$unit"; then
      systemctl stop "${timer_units[@]}" "$BACKUP_UNIT" "$RESERVATION_UNIT" >/dev/null 2>&1 || true
      restore_recovery_timer_units || log 'CRITICAL' 'Failed to restore the pre-recovery timer-unit snapshot.'
      return 1
    fi
  done
  log 'RECOVERY' 'Legacy backup and reservation timers are active again; production API and data remain on the verified PM2 release.'
}

restore_recovery_timer_units() {
  local unit source destination rollback_stage=$BOOTSTRAP_SNAPSHOT/recovery-rollback
  local -a legacy_units=(shawhposh-backup.service shawhposh-backup.timer \
    shawhposh-reservations.service shawhposh-reservations.timer)
  install -d -o root -g root -m 0700 -- "$rollback_stage" || return 1
  for unit in "${legacy_units[@]}"; do
    source=$BOOTSTRAP_SNAPSHOT/$unit
    [[ -f $source && ! -L $source && $(stat -c '%U:%G:%a' -- "$source") == root:root:600 ]] || return 1
    install -o root -g root -m 0644 -- "$source" "$rollback_stage/$unit" || return 1
  done
  for unit in "${legacy_units[@]}"; do
    destination=/etc/systemd/system/$unit
    mv -fT -- "$rollback_stage/$unit" "$destination" || return 1
  done
  systemctl daemon-reload
}

prepare_resume_runtime_snapshot() {
  CUTOVER_SNAPSHOT_DIR=$BOOTSTRAP_SNAPSHOT/resume-runtime
  install -d -o root -g root -m 0700 -- "$CUTOVER_SNAPSHOT_DIR"
  pm2_other_snapshot > "$CUTOVER_SNAPSHOT_DIR/pm2-unrelated-before.json"
  chmod 0600 "$CUTOVER_SNAPSHOT_DIR/pm2-unrelated-before.json"
}

verify_database() {
  /usr/bin/python3 - "$DATABASE_FILE" <<'PY'
import json,sqlite3,sys
db=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True)
try:
    integrity=db.execute("PRAGMA integrity_check").fetchone()[0]
    fks=db.execute("PRAGMA foreign_key_check").fetchall()
    expected={"products":6,"product_variants":67,"inventory":67,"orders":0,"payment_attempts":0,"manual_payment_receipts":0,"shipping_methods":0}
    counts={n:db.execute('SELECT count(*) FROM "'+n+'"').fetchone()[0] for n in expected}
finally: db.close()
print(json.dumps({"integrity":integrity,"foreignKeyErrors":len(fks),"counts":counts},separators=(",",":")))
if integrity!="ok" or fks or counts!=expected: sys.exit(1)
PY
}

verify_empty_methods() {
  local endpoint=$1 key=$2
  /usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN$endpoint" \
    | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); values=d.get(sys.argv[1]); print("%s=%d"%(sys.argv[1],len(values or []))); sys.exit(0 if values==[] else 1)' "$key"
}

verify_runtime() {
  local health pid owner target path web_target frontend_problem
  health=$(/usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health") || return 1
  printf '%s\n' "$health" | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print("status=%s database=%s version=%s"%(d.get("status"),d.get("database"),d.get("version"))); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1] else 1)' "$EXPECTED_RUNTIME_SHA" || return 1
  [[ $(systemctl is-active "$API_UNIT") == active && $(systemctl show -p User --value "$API_UNIT") == shawhposh ]] \
    || { die 'Systemd API status or user is incorrect.'; return 1; }
  pid=$(systemctl show -p MainPID --value "$API_UNIT") || return 1
  [[ $pid =~ ^[1-9][0-9]*$ ]] || { die 'Systemd API has no main process.'; return 1; }
  owner=$(ps -o user= -p "$pid" | awk '{$1=$1;print}') || return 1
  [[ $owner == shawhposh ]] || { die 'API process is not running as shawhposh.'; return 1; }
  target=$(readlink -e -- "$RUNTIME_CURRENT") || return 1
  [[ $target == /opt/shawhposh/releases/$EXPECTED_RUNTIME_SHA && $(stat -c '%U:%G:%a' "$target") == root:root:755 ]] \
    || { die 'Active runtime path or ownership is incorrect.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$WEB_ROOT") == root:root:755 \
    && $(stat -c '%U:%G:%a' "$WEB_RELEASES") == root:root:755 \
    && -L $WEB_CURRENT && $(stat -c '%U:%G:%F' "$WEB_CURRENT") == root:root:symbolic\ link ]] \
    || { die 'Protected frontend directories or current symlink have incorrect ownership/modes.'; return 1; }
  web_target=$(readlink -e -- "$WEB_CURRENT") || return 1
  [[ $(dirname -- "$web_target") == "$WEB_RELEASES" && $(stat -c '%U:%G:%a' "$web_target") == root:root:755 \
    && -f $WEB_CURRENT/index.html ]] \
    || { die 'Active frontend path or ownership is incorrect.'; return 1; }
  frontend_problem=$(find -P "$WEB_RELEASES" -xdev \
    \( -type d \( ! -user root -o ! -group root -o ! -perm 0755 \) \
      -o -type f \( ! -user root -o ! -group root -o ! -perm 0644 -o -links +1 \) \
      -o \( ! -type d -a ! -type f \) \) -print -quit) || return 1
  [[ -z $frontend_problem ]] || { die "Protected frontend contains an unsafe artifact: $frontend_problem"; return 1; }
  runuser -u www-data -- test -r "$WEB_CURRENT/index.html" \
    || { die 'Nginx cannot read the protected frontend.'; return 1; }
  runuser -u ubuntu -- test ! -w "$WEB_ROOT" && runuser -u ubuntu -- test ! -w "$WEB_CURRENT/index.html" \
    || { die 'ubuntu can modify the protected frontend tree.'; return 1; }
  runuser -u ubuntu -- test ! -w /opt/shawhposh && runuser -u shawhposh -- test ! -w /opt/shawhposh \
    || { die 'An unprivileged service/deployment account can replace the protected current pointer.'; return 1; }
  for path in "$RUNTIME_CURRENT/server-dist/index.js" "$RUNTIME_CURRENT/server-dist/db/backup.js" \
    "$RUNTIME_CURRENT/server-dist/modules/orders/expire-reservations.js"; do
    [[ $(stat -c '%U:%G' "$path") == root:root ]] || { die "Runtime code is not root-owned: $path"; return 1; }
    runuser -u ubuntu -- test ! -w "$path" && runuser -u shawhposh -- test ! -w "$path" \
      || { die "Runtime code is writable: $path"; return 1; }
  done
  [[ $(stat -c '%U:%G:%a' "$DATABASE_FILE") == shawhposh:shawhposh:600 ]] || { die 'Database ownership/mode is incorrect.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$ENV_FILE") == root:shawhposh:640 ]] || { die 'Environment ownership/mode is incorrect.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$RECEIPT_ROOT") == shawhposh:shawhposh:700 ]] || { die 'Receipt permissions are incorrect.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$BACKUP_ROOT") == shawhposh:shawhposh:700 ]] || { die 'Backup permissions are incorrect.'; return 1; }
  runuser -u ubuntu -- test ! -r "$DATABASE_FILE" && runuser -u ubuntu -- test ! -w "$DATABASE_FILE" || { die 'ubuntu can access the database.'; return 1; }
  runuser -u ubuntu -- test ! -r "$ENV_FILE" || { die 'ubuntu can read .env.'; return 1; }
  runuser -u ubuntu -- test ! -r "$RECEIPT_ROOT" && runuser -u ubuntu -- test ! -w "$RECEIPT_ROOT" || { die 'ubuntu can access receipts.'; return 1; }
  runuser -u ubuntu -- test ! -r "$BACKUP_ROOT" && runuser -u ubuntu -- test ! -w "$BACKUP_ROOT" || { die 'ubuntu can access backups.'; return 1; }
  verify_database || return 1
  verify_empty_methods /api/v1/payment-methods/methods methods || return 1
  verify_empty_methods /api/v1/shipping/methods shippingMethods || return 1
  /usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" >/dev/null || return 1
  /usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/admin/payments" >/dev/null || return 1
  local redirect
  redirect=$(/usr/bin/curl --silent --show-error --max-time 8 --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null --write-out '%{http_code} %{redirect_url}' "http://$DOMAIN/") || return 1
  [[ $redirect == "301 https://$DOMAIN/" || $redirect == "308 https://$DOMAIN/" ]] || { die 'HTTP does not redirect to HTTPS.'; return 1; }
  systemctl is-active --quiet nginx && /usr/sbin/nginx -t >/dev/null || { die 'Nginx is unhealthy.'; return 1; }
  systemctl is-active --quiet auditd || { die 'auditd is inactive.'; return 1; }
  systemctl is-active --quiet "$BACKUP_TIMER" || { die 'Backup timer is inactive.'; return 1; }
  systemctl is-active --quiet "$RESERVATION_TIMER" || { die 'Reservation timer is inactive.'; return 1; }
  if systemctl is-active --quiet "$REPLICATION_UNIT" || ! replication_unit_has_no_autostart; then
    die 'Off-host replication became active or configured for automatic start.'; return 1
  fi
  runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 jlist \
    | /usr/bin/python3 -c 'import json,sys; a=json.load(sys.stdin); sys.exit(1 if any(p.get("name")=="shawhposh-api" for p in a) else 0)' \
    || { die 'Legacy PM2 API entry remains.'; return 1; }
  [[ -f $CUTOVER_SNAPSHOT_DIR/pm2-unrelated-before.json ]] || { die 'Cutover snapshot lacks unrelated-PM2 baseline.'; return 1; }
  [[ $(pm2_other_snapshot) == "$(<"$CUTOVER_SNAPSHOT_DIR/pm2-unrelated-before.json")" ]] || { die 'Unrelated PM2 applications changed.'; return 1; }
}

verify_final_sudo_policy() {
  local listing=$BOOTSTRAP_SNAPSHOT/effective-sudo-list.txt verbose=$BOOTSTRAP_SNAPSHOT/effective-sudo-list-verbose.txt
  [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(<"$SUDOERS_TARGET") == "$FINAL_SUDO_POLICY" ]] \
    || { die 'Installed sudoers file differs from the exact SHA-scoped rule.'; return 1; }
  /usr/sbin/visudo -cf /etc/sudoers >/dev/null && /usr/sbin/visudo -cf "$SUDOERS_TARGET" >/dev/null \
    || { die 'Final sudoers validation failed.'; return 1; }
  /usr/bin/sudo -n -l -U ubuntu > "$listing" 2>&1 || { die 'Cannot inspect effective ubuntu sudo rights non-interactively.'; return 1; }
  /usr/bin/sudo -n -ll -U ubuntu > "$verbose" 2>&1 || { die 'Cannot inspect verbose effective ubuntu sudo rights.'; return 1; }
  chmod 0600 "$listing" "$verbose" || return 1
  if ! /usr/bin/python3 - "$verbose" "$RUNNER_MODE" <<'PY'
import sys
expected={"/usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$"}
if sys.argv[2] == "1": expected.add("/usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$")
blocks=[]; current=None; in_commands=False
def finish():
    if current is not None and current["nopasswd"]: blocks.append((current["runas"],set(current["commands"])))
for line in open(sys.argv[1],encoding="utf-8"):
    if line.startswith("Sudoers entry: "):
        finish(); current={"runas":None,"nopasswd":False,"commands":[]}; in_commands=False; continue
    if current is None: continue
    text=line.strip()
    if text.startswith("RunAsUsers:"): current["runas"]=text.partition(":")[2].strip()
    elif text.startswith("Options:"): current["nopasswd"]="!authenticate" in text.split()
    elif text=="Commands:": in_commands=True
    elif in_commands and line[:1].isspace() and text: current["commands"].append(text)
finish()
flattened=[(runas,command) for runas,commands in blocks for command in commands]
if len(flattened) != len(expected) or {command for runas,command in flattened if runas=="root"} != expected \
    or any(runas!="root" for runas,_ in flattened):
    print("Effective passwordless sudo exceeds the exact reviewed rule set.",file=sys.stderr); sys.exit(1)
PY
  then
    die 'Effective NOPASSWD policy differs from the exact deploy helper rule.'
    return 1
  fi
  expect_denied() { if runuser -u ubuntu -- /usr/bin/sudo -n "$@" >/dev/null 2>&1; then die "Unexpected NOPASSWD command: $*"; return 1; fi; return 0; }
  expect_denied "$DEPLOY_COMMAND" invalid || return 1
  expect_denied "$DEPLOY_COMMAND" "$EXPECTED_RUNTIME_SHA" extra || return 1
  expect_denied "$DEPLOY_COMMAND" ../../etc/passwd || return 1
  expect_denied "$DEPLOY_COMMAND" C45E3C67FE986A362C4CB46E2A9859568F8B0A8F || return 1
  if (( RUNNER_MODE )); then
    expect_denied "$BOOTSTRAP_RUNNER_PATH" invalid || return 1
    expect_denied "$BOOTSTRAP_RUNNER_PATH" AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA || return 1
    expect_denied "$BOOTSTRAP_RUNNER_PATH" "$EXPECTED_RUNTIME_SHA" extra || return 1
  fi
  expect_denied /usr/bin/systemctl status nginx || return 1
  expect_denied /bin/bash -c 'exit 0' || return 1
  expect_denied /bin/sh -c 'exit 0' || return 1
  expect_denied /usr/bin/python3 -c 'pass' || return 1
  expect_denied /usr/bin/node -e 'process.exit(0)' || return 1
  expect_denied /usr/bin/git --version || return 1
  expect_denied /bin/rm --version || return 1
  expect_denied /usr/bin/find --version || return 1
  expect_denied /bin/cp --version || return 1
  expect_denied /bin/mv --version || return 1
}

verify_final_install() {
  verify_runtime || return 1
  verify_final_sudo_policy || return 1
  [[ $(stat -c '%U:%G:%a' "$DEPLOY_COMMAND") == root:root:755 ]] || { die 'Deploy helper owner/mode is incorrect.'; return 1; }
  [[ $(stat -c '%U:%G:%a' /usr/local/lib/shawhposh-deploy/automated_deploy.py) == root:root:644 ]] \
    || { die 'Deploy library is not root-owned/read-only.'; return 1; }
  [[ $(stat -c '%U:%G:%a' /usr/local/lib/shawhposh-deploy/promote_frontend.py) == root:root:644 ]] \
    || { die 'Frontend deployment library is not root-owned/read-only.'; return 1; }
  getent passwd shawhposh-build >/dev/null || { die 'Isolated build account is missing.'; return 1; }
}

verify_legacy_pm2_rollback() {
  local pid owner
  pid=$(runuser -u ubuntu -- env HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2 /usr/bin/pm2 jlist \
    | /usr/bin/python3 -c 'import json,sys; a=[p for p in json.load(sys.stdin) if p.get("name")=="shawhposh-api"]; ok=len(a)==1 and a[0].get("pm2_env",{}).get("status")=="online" and int(a[0].get("pid",0))>0; print(a[0].get("pid",0) if len(a)==1 else 0); sys.exit(0 if ok else 1)')
  [[ $pid =~ ^[1-9][0-9]*$ ]] || { die 'Legacy PM2 API was not restored after cutover failure.'; return 1; }
  owner=$(ps -o user= -p "$pid" | awk '{$1=$1;print}') || return 1
  [[ $owner == ubuntu ]] || { die 'Restored PM2 API is not owned by ubuntu.'; return 1; }
  [[ $(readlink -e -- /home/ubuntu/shawhposh/current) == /home/ubuntu/shawhposh/releases/2ede63d7d207735dce0958464f4e6462f80494e1 ]] \
    || { die 'Legacy API release pointer is not restored.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$DATABASE_FILE") == ubuntu:ubuntu:600 ]] || { die 'Legacy database ownership was not restored.'; return 1; }
  [[ $(stat -c '%U:%G:%a' "$ENV_FILE") == ubuntu:ubuntu:600 ]] || { die 'Legacy environment-file ownership was not restored.'; return 1; }
  /usr/bin/curl --fail --silent --show-error --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health" \
    | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1] else 1)' 2ede63d7d207735dce0958464f4e6462f80494e1 \
    || return 1
  if systemctl is-active --quiet "$API_UNIT" || systemctl is-enabled --quiet "$API_UNIT"; then
    die 'Systemd API remains active/enabled after rollback.'
    return 1
  fi
  log 'ROLLBACK' 'Legacy PM2 API, release pointer, database access, and health were verified.'
}

run_bootstrap_phases() {
  CUTOVER_ACCEPTED=0
  if (( RESUME_RUNTIME )); then
    CUTOVER_ACCEPTED=1
    log 'RUNTIME CUTOVER' 'A prior attempt already passed runtime acceptance; verifying it before resuming deploy installation.'
    prepare_resume_runtime_snapshot || { log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Could not prepare a private retry snapshot; healthy runtime was preserved.'; return 1; }
    if ! verify_runtime; then
      log 'RUNTIME CUTOVER: FAILED' 'Existing systemd runtime did not pass its acceptance gate; no retry mutation was attempted.'
      return 1
    fi
    if (( RESUME_FINAL_INSTALL )); then
      if ! verify_final_install; then
        log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Existing deploy installation failed verification; temporary access remains available.'
        return 1
      fi
      log 'RUNTIME CUTOVER: SUCCESS' 'Healthy protected runtime was verified.'
      log 'AUTOMATED DEPLOY INSTALL: SUCCESS' 'Existing permanent deploy capability was verified; temporary access can now be removed.'
      return 0
    fi
    log 'RUNTIME CUTOVER: SUCCESS' 'Healthy protected runtime was verified; resuming only automated deploy installation.'
    if ! snapshot_preinstall_sudo_policy; then
      log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Intermediate sudo policy could not be snapshotted; healthy runtime was preserved.'
      return 1
    fi
    if ! perform_automated_deploy_install; then
      restore_preinstall_sudo_policy || log 'CRITICAL' 'Could not restore intermediate sudo policy; keep the authenticated maintenance session open.'
      log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Healthy runtime preserved; temporary bootstrap access remains available.'
      return 1
    fi
    if ! verify_final_install; then
      restore_preinstall_sudo_policy || log 'CRITICAL' 'Could not restore intermediate sudo policy; keep the authenticated maintenance session open.'
      log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Healthy runtime preserved; temporary bootstrap access remains available.'
      return 1
    fi
    log 'AUTOMATED DEPLOY INSTALL: SUCCESS' 'Resumed installation passed verification.'
    return 0
  fi
  log 'RUNTIME CUTOVER' 'Starting fixed c45 runtime cutover.'
  if ! recover_interrupted_legacy_timers; then
    log 'RECOVERY: FAILED' 'Could not safely restore the interrupted legacy timer state; cutover and deploy installation were skipped.'
    return 1
  fi
  if ! run_cutover_preflight; then
    log 'PRECHECK: FAILED' 'Cutover dry run failed; no production mutation was attempted.'
    return 1
  fi
  if ! perform_runtime_cutover; then
    if (( CUTOVER_ACCEPTED )); then
      log 'RUNTIME CUTOVER: SUCCESS' 'The runtime passed its cutover gate; bootstrap metadata validation failed, so automated install was skipped.'
    elif ! verify_legacy_pm2_rollback; then
      log 'CRITICAL' 'Cutover failed before acceptance and legacy PM2 restoration could not be verified; keep the root session open.'
    fi
    log 'RUNTIME CUTOVER: FAILED' 'Automated deployment installation was not attempted.'
    return 1
  fi
  CUTOVER_ACCEPTED=1
  log 'RUNTIME CUTOVER: SUCCESS' 'Runtime acceptance passed; preserve the healthy systemd service.'
  if ! snapshot_preinstall_sudo_policy; then
    restore_original_sudo_policy || log 'CRITICAL' 'Could not restore the original sudo policy; keep root session open.'
    log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Runtime preserved; deployment installation not attempted.'
    return 1
  fi
  if ! perform_automated_deploy_install; then
    restore_preinstall_sudo_policy || log 'CRITICAL' 'Could not restore intermediate sudo policy; keep root session open.'
    log 'RUNTIME CUTOVER: SUCCESS' 'Healthy runtime preserved.'
    log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Previous scoped sudo policy restored where possible.'
    return 1
  fi
  if ! verify_final_install; then
    restore_preinstall_sudo_policy || log 'CRITICAL' 'Could not restore intermediate sudo policy; keep root session open.'
    log 'RUNTIME CUTOVER: SUCCESS' 'Healthy runtime preserved.'
    log 'AUTOMATED DEPLOY INSTALL: FAILED' 'Post-install verification failed; previous scoped sudo policy restored where possible.'
    return 1
  fi
  log 'AUTOMATED DEPLOY INSTALL: SUCCESS' 'Only the lowercase 40-hex SHA deployment command is passwordless.'
}

print_plan() {
  cat <<EOF
This one-time operation will:
  1. Use the fixed runtime candidate $EXPECTED_RUNTIME_RELEASE.
  2. Create verified database/receipt backups and root-only rollback metadata.
  3. Run the API as the dedicated shawhposh user from root-owned protected code.
  4. Restore the legacy PM2 API if a runtime acceptance check fails.
  5. Install the isolated build user and root-owned SHA-scoped deploy helper.
  6. Verify invalid deployment arguments and arbitrary root commands are denied.

Payments, shipping, and off-host backup remain disabled or unconfigured.
EOF
}

main() {
  bootstrap_preflight "$@"
  print_plan
  local confirmation
  if (( RUNNER_MODE )); then
    confirmation=${SHAWHPOSH_BOOTSTRAP_RUNNER_CONFIRMATION:-}
    unset SHAWHPOSH_BOOTSTRAP_RUNNER_CONFIRMATION
    [[ $confirmation == "$BOOTSTRAP_RUNNER_CONFIRMATION" ]] || die 'Trusted runner confirmation was not provided after preflight.'
    log 'CONFIRM' 'The root-owned runner supplied the reviewed confirmation after all preflight checks passed.'
  else
    printf '[CONFIRM] Type exactly AUTOMATE SHAWHPosh to continue: ' >&2
    IFS= read -r confirmation || die 'No owner confirmation was received.'
  fi
  [[ $confirmation == 'AUTOMATE SHAWHPosh' ]] || die 'Confirmation did not match; no production changes were made.'
  capture_bootstrap_snapshot
  if run_bootstrap_phases; then
    log 'COMPLETE' "Bootstrap completed. Root-only metadata: $BOOTSTRAP_SNAPSHOT"
    return 0
  fi
  return 1
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
