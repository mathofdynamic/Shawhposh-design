#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly REPOSITORY_URL='https://github.com/mathofdynamic/Shawhposh-design'
readonly REPOSITORY_URL_GIT='https://github.com/mathofdynamic/Shawhposh-design.git'
readonly RUNNER_TARGET=/usr/local/sbin/shawhposh-bootstrap
readonly RUNNER_TEMP=/usr/local/sbin/.shawhposh-bootstrap.install
readonly SUDOERS_TARGET=/etc/sudoers.d/ubuntu-shawhposh-bootstrap
readonly SUDOERS_TEMP=/etc/sudoers.d/.ubuntu-shawhposh-bootstrap.install
readonly SHA_ARGUMENT='^[0-9a-f]{40}$'
readonly SUDO_POLICY="ubuntu ALL=(root) NOPASSWD: $RUNNER_TARGET $SHA_ARGUMENT"

die() { printf '[BOOTSTRAP INSTALL] ERROR: %s\n' "$*" >&2; exit 1; }
log() { printf '[BOOTSTRAP INSTALL] %s\n' "$*"; }

(( EUID == 0 )) || die 'Run once with owner-authenticated sudo from the reviewed staged release.'
[[ -t 0 && -t 1 ]] || die 'The one-time owner installation requires a terminal.'
[[ $# -eq 0 ]] || die 'This installer accepts no arguments.'
[[ -x /usr/bin/git && -x /usr/bin/runuser && -x /usr/bin/python3 && -x /usr/sbin/visudo && -x /usr/bin/sudo ]] \
  || die 'A required Git, Python, sudo, runuser, or visudo executable is unavailable.'

script_input=${BASH_SOURCE[0]}
[[ -f $script_input && ! -L $script_input ]] || die 'Installer source must be a regular non-symlink file.'
script_path=$(realpath -e -- "$script_input")
source_root=$(dirname -- "$(dirname -- "$script_path")")
[[ $source_root =~ ^/home/ubuntu/shawhposh/releases/[0-9a-f]{40}$ \
  && $(dirname -- "$source_root") == /home/ubuntu/shawhposh/releases ]] \
  || die 'Run only from a versioned Ubuntu-owned Shawhposh release.'
[[ $(stat -c '%U:%G' -- "$source_root") == ubuntu:ubuntu ]] || die 'Staged release is not owned by ubuntu.'
[[ $(stat -c '%a' -- "$source_root") =~ ^[0-7]{3,4}$ ]] || die 'Staged release has an invalid mode.'
root_mode=$(stat -c '%a' -- "$source_root")
(( (8#$root_mode & 0022) == 0 )) || die 'Staged release is group/world writable.'

git_as_ubuntu() {
  runuser -u ubuntu -- env -i HOME=/home/ubuntu PATH=/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    /usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null -C "$source_root" "$@"
}

origin=$(git_as_ubuntu config --local --get remote.origin.url) || die 'Cannot read staged Git origin.'
[[ $origin == "$REPOSITORY_URL" || $origin == "$REPOSITORY_URL_GIT" ]] || die 'Staged release is not from the fixed Shawhposh repository.'
source_sha=$(git_as_ubuntu rev-parse HEAD) || die 'Cannot resolve staged commit.'
[[ $source_sha =~ ^[0-9a-f]{40}$ && $(basename -- "$source_root") == "$source_sha" ]] || die 'Staged directory does not match its Git commit.'
source_branch=$(git_as_ubuntu branch --show-current) || die 'Cannot read staged branch.'
[[ $source_branch == main || -z $source_branch ]] || die 'Install from main or a detached main release.'
[[ $source_sha == $(git_as_ubuntu rev-parse origin/main) ]] || die 'Installer release must equal the locally fetched origin/main SHA.'
[[ -z $(git_as_ubuntu status --porcelain --untracked-files=all) ]] || die 'Staged release is not clean.'

for source in "$script_path" "$source_root/ops/bootstrap_runner.py"; do
  [[ -f $source && ! -L $source && $(stat -c '%U' -- "$source") == ubuntu ]] \
    || die "Reviewed install source is missing or unsafe: $source"
  mode=$(stat -c '%a' -- "$source")
  [[ $mode =~ ^[0-7]{3,4}$ ]] && (( (8#$mode & 0022) == 0 )) || die "Install source is group/world writable: $source"
done
git_as_ubuntu show HEAD:ops/install-bootstrap-runner.sh | cmp -s - "$script_path" \
  || die 'Installer bytes differ from the clean main commit.'
git_as_ubuntu show HEAD:ops/bootstrap_runner.py | cmp -s - "$source_root/ops/bootstrap_runner.py" \
  || die 'Runner bytes differ from the clean main commit.'
/usr/bin/python3 -I - "$source_root/ops/bootstrap_runner.py" <<'PY'
import ast, pathlib, sys
ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
PY

[[ -d /usr/local/sbin && ! -L /usr/local/sbin && $(stat -c '%U:%G:%a' /usr/local/sbin) == root:root:755 ]] \
  || die '/usr/local/sbin is not the expected root-owned directory.'
[[ -d /etc/sudoers.d && ! -L /etc/sudoers.d && $(stat -c '%U:%G' /etc/sudoers.d) == root:root ]] \
  || die '/etc/sudoers.d is not a real root-owned directory.'
/usr/sbin/visudo -cf /etc/sudoers >/dev/null || die 'Existing sudoers configuration is invalid.'

runner_created=0
policy_created=0
runner_temp_created=0
policy_temp_created=0
committed=0
rollback_install() {
  local status=$?
  trap - EXIT
  if (( committed == 0 )); then
    if (( policy_created )); then unlink -- "$SUDOERS_TARGET" 2>/dev/null || true; fi
    if (( runner_created )); then unlink -- "$RUNNER_TARGET" 2>/dev/null || true; fi
    if (( policy_temp_created )); then unlink -- "$SUDOERS_TEMP" 2>/dev/null || true; fi
    if (( runner_temp_created )); then unlink -- "$RUNNER_TEMP" 2>/dev/null || true; fi
    /usr/sbin/visudo -cf /etc/sudoers >/dev/null || log 'WARNING: sudoers needs owner review; use the existing authenticated session.'
  fi
  exit "$status"
}
trap rollback_install EXIT

[[ ! -e $RUNNER_TEMP && ! -L $RUNNER_TEMP ]] || die 'Unexpected helper staging path exists.'
runner_temp_created=1
/usr/bin/install -o root -g root -m 0755 -- "$source_root/ops/bootstrap_runner.py" "$RUNNER_TEMP"
git_as_ubuntu show HEAD:ops/bootstrap_runner.py | cmp -s - "$RUNNER_TEMP" \
  || die 'Root-owned runner staging copy differs from the clean main commit.'

if [[ -e $RUNNER_TARGET || -L $RUNNER_TARGET ]]; then
  [[ -f $RUNNER_TARGET && ! -L $RUNNER_TARGET && $(stat -c '%U:%G:%a' -- "$RUNNER_TARGET") == root:root:755 ]] \
    || die 'Existing bootstrap runner has an unexpected type, owner, or mode.'
  cmp -s -- "$RUNNER_TARGET" "$RUNNER_TEMP" || die 'Existing bootstrap runner differs from the reviewed release.'
else
  /usr/bin/mv -T -- "$RUNNER_TEMP" "$RUNNER_TARGET"
  runner_temp_created=0
  runner_created=1
fi

if [[ -e $SUDOERS_TARGET || -L $SUDOERS_TARGET ]]; then
  [[ -f $SUDOERS_TARGET && ! -L $SUDOERS_TARGET && $(stat -c '%U:%G:%a' -- "$SUDOERS_TARGET") == root:root:440 \
    && $(<"$SUDOERS_TARGET") == "$SUDO_POLICY" ]] || die 'Existing temporary bootstrap policy is not the exact reviewed rule.'
else
  [[ ! -e $SUDOERS_TEMP && ! -L $SUDOERS_TEMP ]] || die 'Unexpected temporary sudoers staging path exists.'
  policy_temp_created=1
  printf '%s\n' "$SUDO_POLICY" > "$SUDOERS_TEMP"
  chown root:root -- "$SUDOERS_TEMP"
  chmod 0440 -- "$SUDOERS_TEMP"
  /usr/sbin/visudo -cf "$SUDOERS_TEMP" >/dev/null || die 'Temporary sudoers rule failed isolated validation.'
  /usr/bin/mv -T -- "$SUDOERS_TEMP" "$SUDOERS_TARGET"
  policy_temp_created=0
  policy_created=1
fi

/usr/sbin/visudo -cf /etc/sudoers >/dev/null || die 'Combined sudoers configuration failed validation.'
[[ $(stat -c '%U:%G:%a' -- "$RUNNER_TARGET") == root:root:755 ]] || die 'Installed runner ownership or mode is incorrect.'
runuser -u ubuntu -- test ! -w "$RUNNER_TARGET" || die 'ubuntu can modify the root-owned bootstrap runner.'
[[ $(<"$SUDOERS_TARGET") == "$SUDO_POLICY" ]] || die 'Installed temporary policy differs from the exact SHA-scoped rule.'
if (( runner_temp_created )); then unlink -- "$RUNNER_TEMP"; runner_temp_created=0; fi

expect_denied() {
  if runuser -u ubuntu -- /usr/bin/sudo -n "$@" >/dev/null 2>&1; then
    die "Unexpected passwordless command was accepted: $*"
  fi
}
expect_denied "$RUNNER_TARGET" invalid
expect_denied "$RUNNER_TARGET" AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
expect_denied "$RUNNER_TARGET" 0123456789abcdef0123456789abcdef01234567 extra
expect_denied /bin/bash -c 'exit 0'
expect_denied /bin/sh -c 'exit 0'
expect_denied /usr/bin/systemctl status nginx

listing=$(/usr/bin/sudo -n -l -U ubuntu 2>&1) || die 'Cannot inspect effective ubuntu sudo policy non-interactively.'
[[ $listing == *"$RUNNER_TARGET ^[0-9a-f]{40}$"* ]] || die 'Effective sudo policy does not show the exact bootstrap runner rule.'
committed=1
trap - EXIT
log "Installed root-owned SHA-scoped bootstrap runner from reviewed main commit $source_sha."
log 'The temporary rule remains until a complete bootstrap succeeds; failures leave it available for retry.'
