#!/usr/bin/env bash
set -Eeuo pipefail

if (($# != 3)); then
  echo 'Usage: retain-releases.sh [--dry-run|--apply] PREVIOUS_API_SHA PREVIOUS_WEB_SHA' >&2
  exit 2
fi
case "$1" in
  --dry-run) mode=dry-run ;;
  --apply) mode=apply ;;
  *) echo 'Usage: retain-releases.sh [--dry-run|--apply] PREVIOUS_API_SHA PREVIOUS_WEB_SHA' >&2; exit 2 ;;
esac
previous_api=$2
previous_web=$3

keep_count=5

retain_tree() {
  local expected_root=$1
  local current_link=$2
  local previous_name=$3
  local root current_release current_name record entry_type modified_at name last_mtime
  local candidate candidate_real confirmation
  local -a releases=()
  local -A keep=()

  if [[ ! -d "$expected_root" || -L "$expected_root" ]]; then
    echo "Refusing unexpected release root: $expected_root" >&2
    return 1
  fi
  root=$(realpath -e -- "$expected_root")
  if [[ "$root" != "$expected_root" || "$root" == / || "$root" == "$(dirname "$root")" ]]; then
    echo "Refusing ambiguous release root: $expected_root -> $root" >&2
    return 1
  fi

  current_release=$(realpath -e -- "$current_link")
  if [[ ! -d "$current_release" || "$(dirname "$current_release")" != "$root" ]]; then
    echo "Refusing current symlink outside release root: $current_link -> $current_release" >&2
    return 1
  fi
  current_name=${current_release##*/}
  if [[ ! "$previous_name" =~ ^([0-9a-f]{40}|20[0-9]{6}-[0-9a-f]{8})$ || ! -d "$root/$previous_name" || -L "$root/$previous_name" || "$previous_name" == "$current_name" ]]; then
    echo "Refusing unverified previous release in $root: $previous_name" >&2
    return 1
  fi

  mapfile -d '' releases < <(find -P "$root" -mindepth 1 -maxdepth 1 -printf '%y\t%T@\t%f\0' | sort -z -t $'\t' -k2,2nr)
  if ((${#releases[@]} == 0)); then
    echo "Refusing empty release root: $root" >&2
    return 1
  fi

  last_mtime=
  for record in "${releases[@]}"; do
    IFS=$'\t' read -r entry_type modified_at name <<<"$record"
    if [[ "$entry_type" != d || ! "$name" =~ ^([0-9a-f]{40}|20[0-9]{6}-[0-9a-f]{8})$ ]]; then
      echo "Refusing ambiguous entry in $root: type=$entry_type name=$name" >&2
      return 1
    fi
    if [[ -n "$last_mtime" && "$modified_at" == "$last_mtime" ]]; then
      echo "Refusing ambiguous release mtimes in $root near $name" >&2
      return 1
    fi
    last_mtime=$modified_at
  done

  keep["$current_name"]=1
  keep["$previous_name"]=1
  for record in "${releases[@]}"; do
    IFS=$'\t' read -r _ _ name <<<"$record"
    if ((${#keep[@]} >= keep_count)); then break; fi
    keep["$name"]=1
  done

  printf 'RELEASE_ROOT=%s CURRENT=%s PREVIOUS=%s KEEP=%s MODE=%s\n' "$root" "$current_name" "$previous_name" "${#keep[@]}" "$mode"
  for record in "${releases[@]}"; do
    IFS=$'\t' read -r _ _ name <<<"$record"
    [[ -n "${keep[$name]:-}" ]] && continue

    candidate="$root/$name"
    if [[ -L "$candidate" || ! -d "$candidate" ]]; then
      echo "Refusing candidate that is not a real directory: $candidate" >&2
      return 1
    fi
    candidate_real=$(realpath -e -- "$candidate")
    if [[ "$candidate_real" != "$candidate" || "$(dirname "$candidate_real")" != "$root" ]]; then
      echo "Refusing candidate outside release root: $candidate -> $candidate_real" >&2
      return 1
    fi

    if [[ "$mode" == dry-run ]]; then
      printf 'DRY_RUN_REMOVE=%s\n' "$candidate"
      continue
    fi

    read -r -p "Type release name to remove $name: " confirmation
    if [[ "$confirmation" != "$name" ]]; then
      echo "Skipped $candidate; confirmation did not match" >&2
      continue
    fi
    find -P "$candidate_real" -xdev -depth -delete
    logger -t shawhposh-release-retention -p user.notice -- "removed root=$root release=$name"
    printf 'REMOVED=%s\n' "$candidate"
  done
}

retain_tree /home/ubuntu/shawhposh/releases /home/ubuntu/shawhposh/current "$previous_api"
retain_tree /var/www/shawhposh/releases /var/www/shawhposh/current "$previous_web"
