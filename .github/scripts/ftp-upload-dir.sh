#!/usr/bin/env bash
# Upload one app folder over FTPS.
#
# SERVER_DIR is the exact directory the files must land in (the same path
# the old FTP-Deploy-Action server-dir used). The script creates that
# directory and the dist subdirectories with lftp MKD on the control
# connection, lists that directory, and stops if any subdirectory is
# missing. Only then does it mirror into that directory.
#
# mirror --delete removes files inside SERVER_DIR that are not in LOCAL_DIR.
# It does not run unless the path ends with portfolio/, yt-scheduler/, or
# <those>/pr-<N>/, and the listing check has already succeeded. It never
# deletes a parent, the docroot, or /preview/.
#
# MODE=remove deletes only a path whose final component is _ftp-probe.
# DRY_RUN=1 prints the plan and does not connect.
# LISTING_FIXTURE=<file> checks a saved listing and does not connect.
#
# Required: SERVER_DIR, and LOCAL_DIR unless MODE=remove.
# Also required unless DRY_RUN=1 or LISTING_FIXTURE is set:
# FTP_HOST, FTP_USERNAME, FTP_PASSWORD.
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

normalize_server_dir() {
  local r="$1"
  r="${r//$'\r'/}"
  r="${r#"${r%%[![:space:]]*}"}"
  r="${r%"${r##*[![:space:]]}"}"
  while [[ "$r" == *//* ]]; do
    r="${r//\/\//\/}"
  done
  while [[ "$r" == */ && "$r" != "/" ]]; do
    r="${r%/}"
  done
  if [[ -z "$r" || "$r" == "/" || "$r" == "." ]]; then
    echo "::error::refusing server-dir" >&2
    return 1
  fi
  if [[ ! "$r" =~ ^[A-Za-z0-9._/-]+$ ]]; then
    echo "::error::refusing server-dir" >&2
    return 1
  fi
  local rest="${r#/}" part
  local -a parts=()
  IFS=/ read -ra parts <<< "$rest"
  for part in "${parts[@]}"; do
    if [[ -z "$part" || "$part" == "." || "$part" == ".." ]]; then
      echo "::error::refusing server-dir" >&2
      return 1
    fi
  done
  printf '%s' "$r"
}

# The final path components must be the app folder, or that folder plus pr-<N>.
# _ftp-probe/portfolio is allowed. The docroot, /preview, and _ftp-probe itself
# are not.
app_folder_dir() {
  local dir="$1"
  [[ "$dir" =~ (^|/)(portfolio|yt-scheduler)(/pr-[1-9][0-9]*)?$ ]]
}

probe_root_dir() {
  local dir="$1"
  [[ "$dir" =~ /_ftp-probe$ ]]
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

child_dir_names() {
  local local_dir="$1" dir name
  if [[ ! -d "$local_dir" ]]; then
    echo "::error::LOCAL_DIR is not a directory" >&2
    return 1
  fi
  while IFS= read -r dir; do
    name=$(basename "$dir")
    if [[ ! "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
      echo "::error::refusing local directory $name" >&2
      return 1
    fi
    printf '%s\n' "$name"
  done < <(find "$local_dir" -mindepth 1 -maxdepth 1 -type d | sort)
}

# cls -1F prints directories with a trailing slash. A name with no slash is
# not a directory and does not satisfy the check.
listing_has_dir() {
  local listing="$1" name="$2" line bare
  while IFS= read -r line; do
    line="${line//$'\r'/}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ "$line" == */ ]] || continue
    bare="${line%/}"
    bare="${bare#./}"
    bare="${bare##*/}"
    [[ "$bare" == "$name" ]] && return 0
  done <<< "$listing"
  return 1
}

listing_has_file() {
  local listing="$1" name="$2" line bare
  while IFS= read -r line; do
    line="${line//$'\r'/}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ "$line" == */ ]] && continue
    bare="${line#./}"
    bare="${bare##*/}"
    [[ "$bare" == "$name" ]] && return 0
  done <<< "$listing"
  return 1
}

require_dirs() {
  local listing="$1"
  shift
  local name missing=()
  for name in "$@"; do
    if ! listing_has_dir "$listing" "$name"; then
      missing+=("${name}/")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "::error::server-dir listing is missing ${missing[*]}" >&2
    echo "Remote listing:" >&2
    printf '%s\n' "$listing" >&2
    return 1
  fi
  local joined=""
  for name in "$@"; do
    joined+="${name}/ "
  done
  echo "Required directories are present: ${joined% }"
}

target_label() {
  local dir="$1" trimmed parent
  trimmed="${dir%/}"
  parent="${trimmed%/*}"
  printf 'ends with %s inside %s' "${trimmed##*/}" "${parent##*/}"
}

if [[ -z "${SERVER_DIR:-}" ]]; then
  echo "::error::SERVER_DIR is required" >&2
  exit 1
fi

mode="${MODE:-all}"
case "$mode" in
  all|remove|check) ;;
  *) echo "::error::MODE must be all, remove, or check" >&2; exit 1 ;;
esac

server_dir=$(normalize_server_dir "$SERVER_DIR") || exit 1

if [[ "$mode" == "remove" ]]; then
  if ! probe_root_dir "$server_dir"; then
    echo "::error::refusing to remove a path that is not the _ftp-probe folder" >&2
    exit 1
  fi
else
  if ! app_folder_dir "$server_dir"; then
    echo "::error::refusing server-dir that is not an app folder" >&2
    exit 1
  fi
  if [[ -z "${LOCAL_DIR:-}" ]]; then
    echo "::error::LOCAL_DIR is required" >&2
    exit 1
  fi
  dirs_text=$(child_dir_names "$LOCAL_DIR") || exit 1
  mapfile -t child_names <<< "$dirs_text"
  if [[ ${#child_names[@]} -eq 0 || -z "${child_names[0]}" ]]; then
    echo "::error::LOCAL_DIR has no subdirectories to verify" >&2
    exit 1
  fi
fi

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "server-dir: $server_dir"
  if [[ "$mode" == "remove" ]]; then
    echo "remove: inside-probe-only"
    exit 0
  fi
  echo "mkdir: $server_dir"
  for name in "${child_names[@]}"; do
    echo "mkdir: ${server_dir}/${name}"
    echo "require-dir: ${name}/"
  done
  echo "mirror: ${LOCAL_DIR} -> ${server_dir}"
  echo "delete: inside-server-dir-only"
  exit 0
fi

if [[ "$mode" == "check" || -n "${LISTING_FIXTURE:-}" ]]; then
  if [[ ! -f "${LISTING_FIXTURE:-}" ]]; then
    echo "::error::LISTING_FIXTURE is not a file" >&2
    exit 1
  fi
  require_dirs "$(cat "$LISTING_FIXTURE")" "${child_names[@]}"
  exit 0
fi

if [[ -z "${FTP_HOST:-}" || -z "${FTP_USERNAME:-}" || -z "${FTP_PASSWORD:-}" ]]; then
  echo "::error::FTP_HOST, FTP_USERNAME, and FTP_PASSWORD are required" >&2
  exit 1
fi

target=$(normalize_ftp_target "$FTP_HOST") || exit 1
quoted_user=$(lftp_quote "$FTP_USERNAME") || exit 1
quoted_pass=$(lftp_quote "$FTP_PASSWORD") || exit 1
quoted_dir=$(lftp_quote "$server_dir") || exit 1
check_hostname="${FTP_TLS_CHECK_HOSTNAME:-no}"
case "$check_hostname" in
  yes|no) ;;
  *) echo "::error::FTP_TLS_CHECK_HOSTNAME must be yes or no" >&2; exit 1 ;;
esac

run_lftp() {
  local script err status
  script=$(mktemp)
  err=$(mktemp)
  chmod 600 "$script"
  {
    printf '%s\n' \
      'set cmd:fail-exit yes' \
      'set net:max-retries 3' \
      'set net:reconnect-interval-base 10' \
      'set net:timeout 60' \
      'set ftp:passive-mode on' \
      'set ftp:ssl-force true' \
      'set ftp:ssl-protect-data true' \
      'set ssl:verify-certificate yes' \
      "set ssl:check-hostname ${check_hostname}" \
      'set mirror:parallel-transfer-count 1'
    printf 'open -u %s,%s %s\n' "$quoted_user" "$quoted_pass" "$(lftp_quote "$target")"
    printf '%s\n' "$@"
    printf '%s\n' 'bye'
  } > "$script"
  set +e
  lftp -f "$script" 2>"$err"
  status=$?
  set -e
  rm -f "$script"
  if [[ "$status" -ne 0 ]]; then
    cat "$err" >&2
    rm -f "$err"
    return "$status"
  fi
  rm -f "$err"
}

list_remote() {
  run_lftp \
    'cache flush' \
    "cls -1F --basename ${quoted_dir}"
}

echo "FTP target $(target_label "$server_dir")"

if [[ "$mode" == "remove" ]]; then
  attempt=1
  while (( attempt <= 4 )); do
    echo "Removing the probe folder (attempt ${attempt})"
    if run_lftp "rm -r -f ${quoted_dir} || echo __REMOVED__"; then
      echo "Probe folder removed"
      exit 0
    fi
    echo "lftp remove attempt ${attempt} failed" >&2
    if (( attempt == 4 )); then
      echo "::error::could not remove the probe folder" >&2
      exit 1
    fi
    sleep $(( attempt * 15 ))
    attempt=$(( attempt + 1 ))
  done
fi

mkdir_lines=("mkdir -p ${quoted_dir} || echo __EXISTS__")
for name in "${child_names[@]}"; do
  mkdir_lines+=("mkdir -p $(lftp_quote "${server_dir}/${name}") || echo __EXISTS__")
done

dot_puts=()
if [[ -f "${LOCAL_DIR}/.htaccess" ]]; then
  dot_puts+=("put $(lftp_quote "${LOCAL_DIR}/.htaccess") -o .htaccess")
fi

attempt=1
while (( attempt <= 4 )); do
  echo "Creating ${#mkdir_lines[@]} directories (attempt ${attempt})"
  if ! run_lftp "${mkdir_lines[@]}"; then
    echo "lftp mkdir attempt ${attempt} failed" >&2
  else
    echo "Listing the app folder before upload"
    if listing=$(list_remote); then
      echo "Remote listing:"
      printf '%s\n' "$listing"
      if require_dirs "$listing" "${child_names[@]}"; then
        echo "Mirroring into the app folder (delete stays inside it)"
        if run_lftp \
          "mirror -R --delete --no-perms --parallel=1 --verbose $(lftp_quote "$LOCAL_DIR") ${quoted_dir}" \
          "cd ${quoted_dir}" \
          "${dot_puts[@]+"${dot_puts[@]}"}"
        then
          echo "Listing the app folder after upload"
          if listing=$(list_remote); then
            echo "Remote listing:"
            printf '%s\n' "$listing"
            if require_dirs "$listing" "${child_names[@]}" && listing_has_file "$listing" "index.html"; then
              echo "index.html is in the app folder"
              exit 0
            fi
            echo "::error::upload listing is missing index.html or a required directory" >&2
          else
            echo "lftp list after upload failed" >&2
          fi
        else
          echo "lftp mirror attempt ${attempt} failed" >&2
        fi
      fi
    else
      echo "lftp list attempt ${attempt} failed" >&2
    fi
  fi
  if (( attempt == 4 )); then
    echo "::error::could not upload the app folder" >&2
    exit 1
  fi
  sleep $(( attempt * 15 ))
  attempt=$(( attempt + 1 ))
done
