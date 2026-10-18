#!/usr/bin/env bash
# Opt-in removal of portfolio files left at a host docroot from before T13.
#
# Each app now uploads only into its own folder. This script never deletes
# portfolio/, yt-scheduler/, preview/, previews/, or the infrastructure files
# index.html, .htaccess, and robots.txt. It deletes only the old root-level
# names that the new root rewrite does not need.
#
# CONFIRM must be delete-legacy-root. DRY_RUN=1 prints the rm commands and
# does not connect.
# Required: FTP_ROOT. Unless DRY_RUN=1: FTP_HOST, FTP_USERNAME, FTP_PASSWORD.
set -euo pipefail

normalize_ftp_target() {
  local raw="$1"
  raw="${raw//$'\r'/}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ -z "$raw" ]]; then
    echo "::error::FTP_HOST is empty" >&2
    return 1
  fi
  local rest="$raw"
  case "$raw" in
    ftp://*) rest="${raw#ftp://}" ;;
    ftps://*) rest="${raw#ftps://}" ;;
  esac
  rest="${rest##*@}"
  rest="${rest%%/*}"
  rest="${rest%%\?*}"
  if [[ ! "$rest" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
    echo "::error::FTP_HOST is not a bare hostname or host:port" >&2
    return 1
  fi
  if [[ "$rest" == *:* ]]; then
    printf 'ftp://%s' "$rest"
  else
    printf '%s' "$rest"
  fi
}

normalize_root() {
  local r="$1"
  r="${r//$'\r'/}"
  r="${r#"${r%%[![:space:]]*}"}"
  r="${r%"${r##*[![:space:]]}"}"
  while [[ "$r" == */ && "$r" != "/" ]]; do
    r="${r%/}"
  done
  if [[ -z "$r" ]]; then
    echo "::error::FTP_ROOT is empty" >&2
    return 1
  fi
  if [[ ! "$r" =~ ^[A-Za-z0-9._/-]+$ ]]; then
    echo "::error::refusing FTP_ROOT" >&2
    return 1
  fi
  if [[ "$r" != "/" ]]; then
    local rest="${r#/}" part
    local -a parts=()
    IFS=/ read -ra parts <<< "$rest"
    for part in "${parts[@]}"; do
      if [[ -z "$part" || "$part" == "." || "$part" == ".." ]]; then
        echo "::error::refusing FTP_ROOT" >&2
        return 1
      fi
    done
  fi
  printf '%s' "$r"
}

lftp_quote() {
  local s="$1"
  case "$s" in
    ''|*[\"\\$'\n'$'\r']*|*'`'*)
      echo "::error::refusing unsafe FTP argument" >&2
      return 1
      ;;
  esac
  printf '"%s"' "$s"
}

# Direct children only. Directories use rm -r. Files use rm -f.
# Never add an app folder or the live root files to this list.
LEGACY_DIRS=(assets fonts)
LEGACY_FILES=(favicon.svg og.png sitemap.xml .ftp-deploy-sync-state.json)

if [[ "${CONFIRM:-}" != "delete-legacy-root" ]]; then
  echo "::error::refusing cleanup; set CONFIRM=delete-legacy-root" >&2
  exit 1
fi
if [[ -z "${FTP_ROOT:-}" ]]; then
  echo "::error::FTP_ROOT is required" >&2
  exit 1
fi

root=$(normalize_root "$FTP_ROOT") || exit 1

join_root() {
  local name="$1"
  if [[ "$root" == "/" ]]; then
    printf '/%s' "$name"
  else
    printf '%s/%s' "$root" "$name"
  fi
}

commands=()
for name in "${LEGACY_DIRS[@]}"; do
  commands+=("rm -r -f $(lftp_quote "$(join_root "$name")")")
done
for name in "${LEGACY_FILES[@]}"; do
  commands+=("rm -f $(lftp_quote "$(join_root "$name")")")
done

if [[ "${DRY_RUN:-}" == "1" ]]; then
  printf '%s\n' "${commands[@]}"
  exit 0
fi

if [[ -z "${FTP_HOST:-}" || -z "${FTP_USERNAME:-}" || -z "${FTP_PASSWORD:-}" ]]; then
  echo "::error::FTP_HOST, FTP_USERNAME, and FTP_PASSWORD are required" >&2
  exit 1
fi

target=$(normalize_ftp_target "$FTP_HOST") || exit 1
quoted_user=$(lftp_quote "$FTP_USERNAME") || exit 1
quoted_pass=$(lftp_quote "$FTP_PASSWORD") || exit 1
check_hostname="${FTP_TLS_CHECK_HOSTNAME:-no}"
case "$check_hostname" in
  yes|no) ;;
  *) echo "::error::FTP_TLS_CHECK_HOSTNAME must be yes or no" >&2; exit 1 ;;
esac

echo "Deleting legacy root files under the docroot (app folders are not in the list)"

attempt=1
while (( attempt <= 4 )); do
  script=$(mktemp)
  err=$(mktemp)
  chmod 600 "$script"
  {
    printf '%s\n' \
      'set cmd:fail-exit yes' \
      'set net:max-retries 2' \
      'set net:timeout 30' \
      'set ftp:passive-mode on' \
      'set ftp:ssl-force true' \
      'set ssl:verify-certificate yes' \
      "set ssl:check-hostname ${check_hostname}"
    printf 'open -u %s,%s %s\n' "$quoted_user" "$quoted_pass" "$(lftp_quote "$target")"
    printf '%s\n' "${commands[@]}"
    printf '%s\n' 'bye'
  } > "$script"
  set +e
  lftp -f "$script" 2>"$err"
  status=$?
  set -e
  rm -f "$script"
  if [[ "$status" -eq 0 ]]; then
    rm -f "$err"
    echo "Legacy root files removed"
    exit 0
  fi
  echo "lftp cleanup attempt ${attempt} failed" >&2
  cat "$err" >&2
  rm -f "$err"
  if (( attempt == 4 )); then
    echo "::error::could not remove legacy root files" >&2
    exit 1
  fi
  sleep $(( attempt * 15 ))
  attempt=$(( attempt + 1 ))
done
