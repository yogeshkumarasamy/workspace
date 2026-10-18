#!/usr/bin/env bash
# Upload an explicit file list into one FTP directory. Does not mirror and
# does not delete. Used for the host-root redirect (index.html, .htaccess,
# robots.txt) and the /preview/.htaccess. An app deploy must not call this
# against a folder it does not own.
#
# DRY_RUN=1 prints the remote paths and does not connect.
# Required: FTP_ROOT, LOCAL_DIR.
# Also required unless DRY_RUN=1: FTP_HOST, FTP_USERNAME, FTP_PASSWORD.
# LOCAL_DIR may contain only index.html, .htaccess, and robots.txt.
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

allowed_name() {
  case "$1" in
    index.html|.htaccess|robots.txt) return 0 ;;
    *) return 1 ;;
  esac
}

if [[ -z "${FTP_ROOT:-}" || -z "${LOCAL_DIR:-}" ]]; then
  echo "::error::FTP_ROOT and LOCAL_DIR are required" >&2
  exit 1
fi
if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "::error::LOCAL_DIR is not a directory" >&2
  exit 1
fi

root=$(normalize_root "$FTP_ROOT") || exit 1
mapfile -t files < <(find "$LOCAL_DIR" -mindepth 1 -maxdepth 1 -type f | sort)
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "::error::LOCAL_DIR has no files" >&2
  exit 1
fi

names=()
for file in "${files[@]}"; do
  name=$(basename "$file")
  if ! allowed_name "$name"; then
    echo "::error::refusing to upload $name (only index.html, .htaccess, robots.txt)" >&2
    exit 1
  fi
  names+=("$name")
done

if [[ "${DRY_RUN:-}" == "1" ]]; then
  for name in "${names[@]}"; do
    if [[ "$root" == "/" ]]; then
      printf '/%s\n' "$name"
    else
      printf '%s/%s\n' "$root" "$name"
    fi
  done
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

quoted_root=$(lftp_quote "$root") || exit 1
put_lines=()
for file in "${files[@]}"; do
  name=$(basename "$file")
  put_lines+=("put $(lftp_quote "$file") -o $(lftp_quote "$name")")
done

echo "Uploading ${#files[@]} file(s) into the FTP directory (no delete)"

attempt=1
while (( attempt <= 4 )); do
  script=$(mktemp)
  err=$(mktemp)
  chmod 600 "$script"
  {
    printf '%s\n' \
      'set cmd:fail-exit yes' \
      'set net:max-retries 4' \
      'set net:reconnect-interval-base 10' \
      'set net:timeout 30' \
      'set ftp:passive-mode on' \
      'set ftp:ssl-force true' \
      'set ssl:verify-certificate yes' \
      "set ssl:check-hostname ${check_hostname}"
    printf 'open -u %s,%s %s\n' "$quoted_user" "$quoted_pass" "$(lftp_quote "$target")"
    printf 'cd %s\n' "$quoted_root"
    printf '%s\n' "${put_lines[@]}"
    printf '%s\n' 'bye'
  } > "$script"
  set +e
  lftp -f "$script" 2>"$err"
  status=$?
  set -e
  rm -f "$script"
  if [[ "$status" -eq 0 ]]; then
    rm -f "$err"
    echo "Host files are in place"
    exit 0
  fi
  echo "lftp put attempt ${attempt} failed" >&2
  cat "$err" >&2
  rm -f "$err"
  if (( attempt == 4 )); then
    echo "::error::could not upload host files" >&2
    exit 1
  fi
  sleep $(( attempt * 15 ))
  attempt=$(( attempt + 1 ))
done
