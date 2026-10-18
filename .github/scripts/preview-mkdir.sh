#!/usr/bin/env bash
# Create one app folder's directories before FTP-Deploy-Action uploads.
#
# Hostinger drops the FTPS data socket (ECONNRESET) or stalls the control
# socket when FTP-Deploy-Action MKDs a folder that does not exist yet
# (assets/ on a first publish). lftp issues MKD on the control connection
# and retries. The action then only stores files.
#
# Called from .github/actions/prepare-ftp-dirs for every yt-scheduler upload
# (preview, dev, staging, production) and for the portfolio folder upload.
#
# DRY_RUN=1 prints the remote directories and does not connect.
# Required: REL_DIR, LOCAL_DIR, and PREVIEW_ROOT or FTP_ROOT (the parent).
# REL_DIR is <slug> or <slug>/pr-<N>. The parent is the host docroot for a
# release and the /preview directory for a preview.
# Also required unless DRY_RUN=1: FTP_HOST, FTP_USERNAME, FTP_PASSWORD.
set -euo pipefail

if [[ -z "${PREVIEW_ROOT:-}" && -n "${FTP_ROOT:-}" ]]; then
  PREVIEW_ROOT="$FTP_ROOT"
fi

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

normalize_preview_root() {
  local r="$1"
  r="${r//$'\r'/}"
  r="${r#"${r%%[![:space:]]*}"}"
  r="${r%"${r##*[![:space:]]}"}"
  while [[ "$r" == */ && "$r" != "/" ]]; do
    r="${r%/}"
  done
  if [[ -z "$r" ]]; then
    echo "::error::preview root is empty" >&2
    return 1
  fi
  if [[ ! "$r" =~ ^[A-Za-z0-9._/-]+$ ]]; then
    echo "::error::refusing preview root" >&2
    return 1
  fi
  if [[ "$r" != "/" ]]; then
    local rest="${r#/}" part
    local -a parts=()
    IFS=/ read -ra parts <<< "$rest"
    for part in "${parts[@]}"; do
      if [[ -z "$part" || "$part" == "." || "$part" == ".." ]]; then
        echo "::error::refusing preview root" >&2
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

ftp_join() {
  local root="$1" rel="$2"
  if [[ "$root" == "/" ]]; then
    printf '/%s' "$rel"
  else
    printf '%s/%s' "$root" "$rel"
  fi
}

# REL_DIR is <slug> or <slug>/pr-<N>. LOCAL_DIR is the built dist.
remote_dirs() {
  local root="$1" rel="$2" local_dir="$3" dir sub remote
  if [[ ! "$rel" =~ ^[a-z0-9]+(-[a-z0-9]+)*(/pr-[1-9][0-9]*)?$ ]]; then
    echo "::error::REL_DIR must be <slug> or <slug>/pr-<N>" >&2
    return 1
  fi
  if [[ ! -d "$local_dir" ]]; then
    echo "::error::LOCAL_DIR is not a directory" >&2
    return 1
  fi
  printf '%s\n' "$(ftp_join "$root" "$rel")"
  while IFS= read -r dir; do
    sub="${dir#"$local_dir"/}"
    if [[ "$sub" == *".."* || ! "$sub" =~ ^[A-Za-z0-9._/-]+$ ]]; then
      echo "::error::refusing local directory $sub" >&2
      return 1
    fi
    remote="$(ftp_join "$root" "$rel")/${sub}"
    printf '%s\n' "$remote"
  done < <(find "$local_dir" -mindepth 1 -type d | sort)
}

if [[ -z "${PREVIEW_ROOT:-}" || -z "${REL_DIR:-}" || -z "${LOCAL_DIR:-}" ]]; then
  echo "::error::PREVIEW_ROOT, REL_DIR, and LOCAL_DIR are required" >&2
  exit 1
fi

root=$(normalize_preview_root "$PREVIEW_ROOT") || exit 1
dirs_text=$(remote_dirs "$root" "$REL_DIR" "$LOCAL_DIR") || exit 1
mapfile -t dirs <<< "$dirs_text"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  printf '%s\n' "${dirs[@]}"
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

mkdir_lines=()
for remote in "${dirs[@]}"; do
  mkdir_lines+=("mkdir -p -f $(lftp_quote "$remote")")
done

echo "Creating ${#dirs[@]} preview directories under the preview root (ssl:check-hostname ${check_hostname})"

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
    printf '%s\n' "${mkdir_lines[@]}"
    printf '%s\n' 'bye'
  } > "$script"
  set +e
  lftp -f "$script" 2>"$err"
  status=$?
  set -e
  rm -f "$script"
  if [[ "$status" -eq 0 ]]; then
    rm -f "$err"
    echo "Preview directories are ready"
    exit 0
  fi
  echo "lftp mkdir attempt ${attempt} failed" >&2
  cat "$err" >&2
  rm -f "$err"
  if (( attempt == 4 )); then
    echo "::error::could not create preview directories" >&2
    exit 1
  fi
  sleep $(( attempt * 15 ))
  attempt=$(( attempt + 1 ))
done
