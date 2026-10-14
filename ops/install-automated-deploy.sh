#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly REPOSITORY_URL='https://github.com/mathofdynamic/Shawhposh-design'
readonly BUILD_USER=shawhposh-build
readonly BUILD_GROUP=shawhposh-build
readonly BUILD_ROOT=/var/lib/shawhposh-build
readonly BUILD_RUNS=/var/lib/shawhposh-build/runs
readonly MIRROR_ROOT=/var/cache/shawhposh-deploy
readonly GIT_TEMPLATE_ROOT=/var/cache/shawhposh-deploy/templates
readonly RUNTIME_ROOT=/opt/shawhposh
readonly RUNTIME_RELEASES=/opt/shawhposh/releases
readonly RUNTIME_CURRENT=/opt/shawhposh/current
readonly WEB_ROOT=/var/www/shawhposh
readonly WEB_RELEASES=/var/www/shawhposh/releases
readonly WEB_CURRENT=/var/www/shawhposh/current
readonly LIB_ROOT=/usr/local/lib/shawhposh-deploy
readonly DEPLOY_COMMAND=/usr/local/sbin/shawhposh-deploy
readonly SUDOERS_TARGET=/etc/sudoers.d/ubuntu-shawhposh
readonly SUDOERS_TEMP=/etc/sudoers.d/.ubuntu-shawhposh.automated-deploy
readonly HELPER_TEMP=/usr/local/sbin/.shawhposh-deploy.automated-install
readonly BOOTSTRAP_RUNNER_PATH=/usr/local/sbin/shawhposh-bootstrap
readonly BOOTSTRAP_RUNNER_SUDOERS=/etc/sudoers.d/ubuntu-shawhposh-bootstrap
readonly SHA_SUDO_ARGUMENT='^[0-9a-f]{40}$'
readonly LEGACY_SHA_SUDO_ARGUMENT=$(python3 -c 'print("[0-9a-f]" * 40)')
readonly BOOTSTRAP_CONTEXT_VALUE='AUTOMATE_SHAWHPosh-v1'
readonly BOOTSTRAP_RUNNER_SUDO_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$'
readonly NEW_SUDO_POLICY="Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: $DEPLOY_COMMAND $SHA_SUDO_ARGUMENT"
readonly OLD_SUDO_POLICY_OWNER_AUTH="Defaults:ubuntu timestamp_timeout=0
ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
ubuntu ALL=(root) PASSWD: /usr/local/sbin/shawhposh-promote-release $LEGACY_SHA_SUDO_ARGUMENT"
readonly OLD_SUDO_POLICY_CUTOVER_3='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service'
readonly OLD_SUDO_POLICY_CUTOVER_4='ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx, /usr/bin/systemctl start shawhposh-backup.service, /usr/bin/systemctl restart shawhposh-api.service'

die() { printf '[INSTALL] ERROR: %s\n' "$*" >&2; exit 1; }
log() { printf '[INSTALL] %s\n' "$*"; }

restore_previous_sudo_policy() {
  local rc=$?
  trap - EXIT
  if (( ${policy_changed:-0} == 1 && ${policy_committed:-0} == 0 )); then
    if [[ -n ${backup:-} && -f $backup && ! -L $backup ]]; then
      if ! install -o root -g root -m 0440 -- "$backup" "$SUDOERS_TARGET"; then
        log 'CRITICAL: could not restore the previous sudoers policy; retain the current root session.' >&2
      fi
    else
      if ! unlink -- "$SUDOERS_TARGET"; then
        log 'CRITICAL: could not remove the uncommitted sudoers policy; retain the current root session.' >&2
      fi
    fi
    if ! /usr/sbin/visudo -cf /etc/sudoers >/dev/null; then
      log 'CRITICAL: sudoers validation failed after rollback; use the open owner root session.' >&2
    else
      log 'Uncommitted sudoers change was rolled back.'
    fi
  fi
  exit "$rc"
}

require_exact_dir() {
  local path=$1 owner=$2 group=$3 mode=$4 actual
  [[ -d $path && ! -L $path ]] || die "Expected a real directory: $path"
  [[ $(realpath -e -- "$path") == "$path" ]] || die "Directory resolves through an alias: $path"
  actual=$(stat -c '%U:%G:%a' -- "$path")
  [[ $actual == "$owner:$group:$mode" ]] || die "Unexpected directory ownership/mode for $path ($actual)."
}

require_safe_existing_dir_or_create() {
  local path=$1 mode=$2
  if [[ -e $path || -L $path ]]; then
    require_exact_dir "$path" root root "$mode"
  else
    install -d -o root -g root -m "$mode" -- "$path"
    require_exact_dir "$path" root root "$mode"
  fi
}

require_source_file() {
  local path=$1
  [[ -f $path && ! -L $path ]] || die "Required reviewed install artifact is missing or unsafe: $path"
}

validate_runtime_release_metadata() {
  local metadata_path=$1 release_sha=$2
  [[ $release_sha =~ ^[0-9a-f]{40}$ && -f $metadata_path && ! -L $metadata_path ]] || return 1
  printf 'APP_VERSION=%s\n' "$release_sha" | /usr/bin/cmp -s - "$metadata_path"
}

require_interactive_installer_terminal() {
  [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]] && return 0
  [[ -t 0 ]] || die 'Owner installation requires a terminal.'
}

(( EUID == 0 )) || die 'Run once with owner-authenticated sudo: sudo bash ops/install-automated-deploy.sh'
require_interactive_installer_terminal

script_path=$(realpath -e -- "${BASH_SOURCE[0]}")
git_as_ubuntu_from() {
  local path=$1
  shift
  runuser -u ubuntu -- env -i HOME=/home/ubuntu PATH=/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    /usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null -C "$path" "$@"
}
if [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]]; then
  bootstrap_source_root=${SHAWHPOSH_BOOTSTRAP_SOURCE_ROOT:-}
  [[ ${EUID:-$(id -u)} -eq 0 ]] || die 'Bootstrap install source is root-only.'
  [[ $bootstrap_source_root =~ ^/root/shawhposh-production-automation-[0-9]{8}T[0-9]{6}Z/trusted$ ]] \
    || die 'Bootstrap install source path is outside the fixed root-only snapshot.'
  [[ -d $bootstrap_source_root && ! -L $bootstrap_source_root && $(realpath -e -- "$bootstrap_source_root") == "$bootstrap_source_root" \
    && $(stat -c '%U:%G:%a' -- "$bootstrap_source_root") == root:root:700 ]] \
    || die 'Bootstrap install source directory is not a protected root-owned snapshot.'
  repo_root=$bootstrap_source_root
  log 'Using root-owned, hash-verified bootstrap artifacts.'
else
  repo_root=$(git_as_ubuntu_from "$(dirname -- "$script_path")/.." rev-parse --show-toplevel)
  repo_root=$(realpath -e -- "$repo_root")
  [[ $(stat -c '%U' -- "$repo_root") == ubuntu && $repo_root == /home/ubuntu/shawhposh/* ]] || die 'Install source must be an ubuntu-owned Shawhposh checkout.'
  git_as_ubuntu() { git_as_ubuntu_from "$repo_root" "$@"; }
  [[ $(git_as_ubuntu config --local --get remote.origin.url) == "$REPOSITORY_URL" || $(git_as_ubuntu config --local --get remote.origin.url) == "$REPOSITORY_URL.git" ]] \
    || die 'The source checkout does not point to the approved Shawhposh GitHub repository.'
  source_branch=$(git_as_ubuntu branch --show-current)
  [[ $source_branch == main || -z $source_branch ]] \
    || die 'Install from main or a clean detached origin/main release checkout.'
  [[ $(git_as_ubuntu rev-parse HEAD) == $(git_as_ubuntu rev-parse origin/main) ]] \
    || die 'The source checkout does not match its locally fetched origin/main commit.'
  [[ -z $(git_as_ubuntu status --porcelain --untracked-files=all) ]] \
    || die 'The install checkout is not clean; commit/review changes before installation.'
fi

for source in \
  "$repo_root/ops/automated_deploy.py" \
  "$repo_root/ops/promote_frontend.py" \
  "$repo_root/ops/promote_release.py" \
  "$repo_root/ops/shawhposh-deploy" \
  "$repo_root/ops/sudoers.d/ubuntu-shawhposh"; do
  require_source_file "$source"
  if [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]]; then
    [[ $(stat -c '%U:%G:%a' -- "$source") == root:root:600 ]] || die "Bootstrap artifact is not a private root-owned file: $source"
  fi
done

[[ $(id -un ubuntu 2>/dev/null || true) == ubuntu ]] || die 'Expected deployment account ubuntu is missing.'
[[ -x /usr/bin/git && -x /usr/bin/npm && -x /usr/bin/node && -x /usr/bin/python3 ]] || die 'Required Git, npm, Node, or Python executable is missing.'
[[ -x /usr/bin/systemd-run && -x /usr/bin/systemctl && -x /usr/bin/curl ]] || die 'Required systemd or curl executable is missing.'
[[ -x /usr/sbin/visudo ]] || die 'visudo is unavailable.'

require_exact_dir /opt root root 755
require_exact_dir "$RUNTIME_ROOT" root root 755
require_exact_dir "$RUNTIME_RELEASES" root root 755
[[ -L $RUNTIME_CURRENT && $(stat -c '%U:%G' -- "$RUNTIME_CURRENT") == root:root ]] || die 'The protected runtime current pointer is not a root-owned symlink.'
runtime_target=$(readlink -e -- "$RUNTIME_CURRENT")
[[ $(dirname -- "$runtime_target") == "$RUNTIME_RELEASES" ]] || die 'The protected runtime current pointer is outside the release tree.'
active_sha=$(basename -- "$runtime_target")
[[ $active_sha =~ ^[0-9a-f]{40}$ && $(stat -c '%U:%G:%a' -- "$runtime_target") == root:root:755 ]] \
  || die 'The active runtime release is not a protected root-owned SHA directory.'
validate_runtime_release_metadata "$runtime_target/release.env" "$active_sha" \
  || die 'Active runtime release version metadata does not match its path.'

api_unit=/etc/systemd/system/shawhposh-api.service
[[ -f $api_unit && ! -L $api_unit ]] || die 'The dedicated API systemd unit is missing.'
[[ $(stat -c '%U:%G:%a' -- "$api_unit") == root:root:644 ]] || die 'The API unit ownership/mode is unexpected.'
grep -Fxq 'User=shawhposh' "$api_unit" || die 'The API service is not configured to run as shawhposh.'
grep -Fxq 'WorkingDirectory=/opt/shawhposh/current' "$api_unit" || die 'The API service working directory is outside the protected release tree.'
grep -Fxq 'ExecStart=/usr/bin/node --max-old-space-size=96 /opt/shawhposh/current/server-dist/index.js' "$api_unit" \
  || die 'The API service executable differs from the reviewed protected runtime path.'
! grep -Fq '/home/ubuntu/' "$api_unit" || die 'The API unit references ubuntu-writable code.'
systemctl is-active --quiet shawhposh-api.service || die 'The dedicated API service is not active; complete runtime cutover first.'
[[ $(systemctl show -p User --value shawhposh-api.service) == shawhposh ]] || die 'The active API unit runtime identity is unexpected.'
api_pid=$(systemctl show -p MainPID --value shawhposh-api.service)
[[ $api_pid =~ ^[1-9][0-9]*$ && $(ps -o user= -p "$api_pid" | xargs) == shawhposh ]] || die 'The running API process is not owned by shawhposh.'
health=$(/usr/bin/curl --disable --fail --silent --show-error --max-time 8 --resolve shawhposh.ir:443:127.0.0.1 https://shawhposh.ir/api/health) \
  || die 'The current API health endpoint failed.'
printf '%s' "$health" | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" and d.get("version")==sys.argv[1] else 1)' "$active_sha" \
  || die 'The current API health version or database state does not match the protected release.'
log "Protected API baseline verified: $active_sha"

require_exact_dir /var/www root root 755
require_exact_dir "$WEB_ROOT" root root 755
require_exact_dir "$WEB_RELEASES" root root 755
[[ -L $WEB_CURRENT && $(stat -c '%U:%G' -- "$WEB_CURRENT") == root:root ]] \
  || die 'Frontend current is not a root-owned symlink.'
web_target=$(readlink -e -- "$WEB_CURRENT")
[[ $(dirname -- "$web_target") == "$WEB_RELEASES" && $(basename -- "$web_target") =~ ^([0-9a-f]{40}|20[0-9]{6}-[0-9a-f]{8})$ \
  && $(stat -c '%U:%G:%a' -- "$web_target") == root:root:755 && -f $web_target/index.html ]] \
  || die 'Active frontend release is outside the protected root-owned static release tree.'
web_problem=$(find -P "$WEB_RELEASES" -xdev \
  \( -type d \( ! -user root -o ! -group root -o ! -perm 0755 \) \
    -o -type f \( ! -user root -o ! -group root -o ! -perm 0644 -o -links +1 \) \
    -o \( ! -type d -a ! -type f \) \) -print -quit)
[[ -z $web_problem ]] || die "Frontend release tree contains an unsafe artifact: $web_problem"
runuser -u www-data -- test -r "$WEB_CURRENT/index.html" || die 'Nginx cannot read the protected frontend release.'
runuser -u ubuntu -- test ! -w "$WEB_ROOT" && runuser -u ubuntu -- test ! -w "$WEB_CURRENT/index.html" \
  || die 'ubuntu can modify the protected frontend tree.'
/usr/sbin/nginx -T 2>&1 | grep -Fq "root $WEB_CURRENT;" || die 'Nginx is not configured to serve the protected frontend current path.'

if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
  [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(stat -c '%U:%G:%a' -- "$SUDOERS_TARGET") == root:root:440 ]] \
    || die 'Existing Shawhposh sudoers file has unexpected type, owner, or mode.'
  current_policy=$(<"$SUDOERS_TARGET")
  case "$current_policy" in
    "$NEW_SUDO_POLICY"|"$OLD_SUDO_POLICY_OWNER_AUTH"|"$OLD_SUDO_POLICY_CUTOVER_3"|"$OLD_SUDO_POLICY_CUTOVER_4") ;;
    *) die 'Existing Shawhposh sudoers policy is not a reviewed baseline; refusing to overwrite it.' ;;
  esac
fi
[[ ! -e $SUDOERS_TEMP && ! -L $SUDOERS_TEMP ]] || die 'Unexpected sudoers temporary path already exists.'
[[ ! -e $HELPER_TEMP && ! -L $HELPER_TEMP ]] || die 'Unexpected deployment-helper temporary path already exists.'
/usr/sbin/visudo -cf /etc/sudoers >/dev/null || die 'The current sudoers configuration is invalid.'

if ! getent passwd "$BUILD_USER" >/dev/null; then
  useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --comment 'Shawhposh isolated build account' "$BUILD_USER"
fi
passwd --lock "$BUILD_USER" >/dev/null
[[ $(getent passwd "$BUILD_USER" | cut -d: -f7) == /usr/sbin/nologin ]] || die 'Build account shell is not nologin.'
[[ $(id -gn "$BUILD_USER") == "$BUILD_GROUP" && $(id -G "$BUILD_USER") == "$(getent group "$BUILD_GROUP" | cut -d: -f3)" ]] \
  || die 'Build account has unexpected supplementary groups.'
[[ $(id -u "$BUILD_USER") -ge 100 && $(id -u "$BUILD_USER") -ne 0 ]] || die 'Build account UID is unexpected.'

require_safe_existing_dir_or_create "$BUILD_ROOT" 711
require_safe_existing_dir_or_create "$BUILD_RUNS" 711
require_safe_existing_dir_or_create "$MIRROR_ROOT" 700
require_safe_existing_dir_or_create "$GIT_TEMPLATE_ROOT" 700
[[ -z $(find "$GIT_TEMPLATE_ROOT" -mindepth 1 -maxdepth 1 -print -quit) ]] || die 'Git template directory must be empty.'
require_safe_existing_dir_or_create "$LIB_ROOT" 755
require_exact_dir /usr/local/sbin root root 755
if [[ -e $DEPLOY_COMMAND || -L $DEPLOY_COMMAND ]]; then
  [[ -f $DEPLOY_COMMAND && ! -L $DEPLOY_COMMAND && $(stat -c '%U:%G:%a' -- "$DEPLOY_COMMAND") == root:root:755 ]] \
    || die 'Existing automated deploy command has unexpected type, owner, or mode.'
fi
for installed in "$LIB_ROOT/automated_deploy.py" "$LIB_ROOT/promote_frontend.py" "$LIB_ROOT/promote_release.py"; do
  if [[ -e $installed || -L $installed ]]; then
    [[ -f $installed && ! -L $installed && $(stat -c '%U:%G:%a' -- "$installed") == root:root:644 ]] \
      || die "Existing deployment library file has unexpected type, owner, or mode: $installed"
  fi
done
while IFS= read -r entry; do
  case "$(basename -- "$entry")" in
    automated_deploy.py|promote_frontend.py|promote_release.py) ;;
    *) die "Unexpected file in root-owned deployment library: $entry" ;;
  esac
done < <(find "$LIB_ROOT" -mindepth 1 -maxdepth 1 -print)

runuser -u "$BUILD_USER" -- test ! -r /var/lib/shawhposh/.env || die 'Build account can read production secrets.'
runuser -u "$BUILD_USER" -- test ! -r /var/lib/shawhposh/shawhposh.sqlite || die 'Build account can read the production database.'
runuser -u "$BUILD_USER" -- test ! -r /var/lib/shawhposh/uploads/payment-receipts || die 'Build account can read payment receipts.'
runuser -u "$BUILD_USER" -- test ! -r /var/backups/shawhposh || die 'Build account can read local backups.'

if [[ -e $SUDOERS_TARGET ]]; then
  backup="/root/ubuntu-shawhposh.sudoers.$(date -u +%Y%m%dT%H%M%SZ).bak"
  [[ ! -e $backup && ! -L $backup ]] || die 'Sudoers rollback backup path already exists.'
  install -o root -g root -m 0600 -- "$SUDOERS_TARGET" "$backup"
  log "Existing dedicated sudoers policy backed up at $backup"
fi

policy_changed=0
policy_committed=0
trap restore_previous_sudo_policy EXIT

install -o root -g root -m 0644 -- "$repo_root/ops/promote_release.py" "$LIB_ROOT/promote_release.py"
install -o root -g root -m 0644 -- "$repo_root/ops/promote_frontend.py" "$LIB_ROOT/promote_frontend.py"
install -o root -g root -m 0644 -- "$repo_root/ops/automated_deploy.py" "$LIB_ROOT/automated_deploy.py"
install -o root -g root -m 0755 -- "$repo_root/ops/shawhposh-deploy" "$HELPER_TEMP"
/usr/bin/python3 -I -c 'import ast,sys; [ast.parse(open(p,encoding="utf-8").read()) for p in sys.argv[1:]]' \
  "$LIB_ROOT/promote_release.py" "$LIB_ROOT/promote_frontend.py" "$LIB_ROOT/automated_deploy.py" "$HELPER_TEMP" \
  || die 'Installed Python deployment files failed syntax validation.'
mv -T -- "$HELPER_TEMP" "$DEPLOY_COMMAND"
[[ $(stat -c '%U:%G:%a' -- "$DEPLOY_COMMAND") == root:root:755 ]] || die 'Deployment command ownership/mode validation failed.'
[[ $(stat -c '%U:%G:%a' -- "$LIB_ROOT/automated_deploy.py") == root:root:644 ]] || die 'Deployment library ownership/mode validation failed.'
[[ $(stat -c '%U:%G:%a' -- "$LIB_ROOT/promote_frontend.py") == root:root:644 ]] || die 'Frontend deployment library ownership/mode validation failed.'

install -o root -g root -m 0440 -- "$repo_root/ops/sudoers.d/ubuntu-shawhposh" "$SUDOERS_TEMP"
/usr/sbin/visudo -cf "$SUDOERS_TEMP" >/dev/null || die 'New Shawhposh sudoers policy failed isolated validation.'
mv -T -- "$SUDOERS_TEMP" "$SUDOERS_TARGET"
policy_changed=1
if ! /usr/sbin/visudo -cf /etc/sudoers >/dev/null || ! /usr/sbin/visudo -cf "$SUDOERS_TARGET" >/dev/null; then
  die 'New sudoers policy failed validation; previous policy will be restored.'
fi

sudo_verbose=$(/usr/bin/sudo -ll -U ubuntu 2>&1) || die 'Could not inspect verbose effective ubuntu sudo policy.'
bootstrap_runner_entry=
if [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]]; then
  [[ -f $BOOTSTRAP_RUNNER_PATH && ! -L $BOOTSTRAP_RUNNER_PATH \
    && $(stat -c '%U:%G:%a' -- "$BOOTSTRAP_RUNNER_PATH") == root:root:755 ]] \
    || die 'Trusted bootstrap runner is missing or unsafe.'
  [[ -f $BOOTSTRAP_RUNNER_SUDOERS && ! -L $BOOTSTRAP_RUNNER_SUDOERS \
    && $(stat -c '%U:%G:%a' -- "$BOOTSTRAP_RUNNER_SUDOERS") == root:root:440 \
    && $(<"$BOOTSTRAP_RUNNER_SUDOERS") == "$BOOTSTRAP_RUNNER_SUDO_POLICY" ]] \
    || die 'The exact temporary bootstrap sudo rule is missing or unsafe.'
  bootstrap_runner_entry="$BOOTSTRAP_RUNNER_PATH $SHA_SUDO_ARGUMENT"
fi
if ! printf '%s\n' "$sudo_verbose" | /usr/bin/python3 -c '
import sys
expected = {
    "/usr/local/sbin/shawhposh-deploy " + sys.argv[1],
}
if len(sys.argv) > 2 and sys.argv[2]:
    expected.add(sys.argv[2])
blocks = []
current = None
in_commands = False
def finish():
    if current is not None and current["nopasswd"]:
        blocks.append((current["runas"], set(current["commands"])))
for line in sys.stdin:
    if line.startswith("Sudoers entry: "):
        finish()
        current = {"runas": None, "nopasswd": False, "commands": []}
        in_commands = False
        continue
    if current is None:
        continue
    stripped = line.strip()
    if stripped.startswith("RunAsUsers:"):
        current["runas"] = stripped.partition(":")[2].strip()
    elif stripped.startswith("Options:"):
        current["nopasswd"] = "!authenticate" in stripped.split()
    elif stripped == "Commands:":
        in_commands = True
    elif in_commands and line[:1].isspace() and stripped:
        current["commands"].append(stripped)
finish()
entries = [(runas, command) for runas, commands in blocks for command in commands]
if len(entries) != len(expected) or set(entries) != {("root", command) for command in expected}:
    print("Effective passwordless sudo entries differ from the reviewed exact allowlist.", file=sys.stderr)
    sys.exit(1)
' "$SHA_SUDO_ARGUMENT" "$bootstrap_runner_entry"; then
  die 'Effective passwordless sudo differs from the exact reviewed allowlist; previous policy will be restored.'
fi

policy_committed=1
log 'Install complete. Automatic deploy is enabled only for an exact 40-character SHA reachable from origin/main.'
log 'No application service, database, payment method, shipping method, or production record was changed.'
