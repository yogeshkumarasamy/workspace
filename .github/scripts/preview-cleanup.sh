#!/usr/bin/env bash
# Delete one portfolio/pr-<N> preview, or list/purge legacy preview folders.
#
# cleanup-preview.yml failed every run with "open: ***: Name or service not known".
# The runner log shows FTP_HOST passed to lftp with a leading space (" ***").
# SamKirkland/FTP-Deploy-Action reads the server input through @actions/core
# getInput, which trims whitespace, so preview deploys still connect. lftp
# resolves the raw secret and does not. Normalize to a bare hostname, or to
# ftp://host:port when a port was included, before open.
#
# Settings are applied before `open`. A later `cls` is required: lftp's `open`
# can return success without logging in when ftp:ssl-force refuses cleartext,
# and `rm -f` then exits 0 without deleting anything.
#
# Hostinger's FTPS certificate is for *.hstgr.io / hstgr.io. FTP_HOST is the
# server IP, so the name on the certificate does not match. Chain verification
# stays on (`ssl:verify-certificate yes`). `FTP_TLS_CHECK_HOSTNAME` (default
# no) is the only switch for `ssl:check-hostname`.
set -euo pipefail

OPEN_PR_NUMS=()
ROWS=()
DELETE_PATHS=()

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
  # Drop userinfo and any path/query pasted in with a URL.
  rest="${rest##*@}"
  rest="${rest%%/*}"
  rest="${rest%%\?*}"
  if [[ ! "$rest" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
    echo "::error::FTP_HOST is not a bare hostname or host:port after trimming whitespace and a scheme" >&2
    return 1
  fi
  if [[ "$rest" == *:* ]]; then
    local port="${rest##*:}"
    if ((10#$port < 1 || 10#$port > 65535)); then
      echo "::error::FTP_HOST port is out of range" >&2
      return 1
    fi
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

# yes or no. Empty means no. Anything else is a configuration error.
tls_check_hostname() {
  local raw="${FTP_TLS_CHECK_HOSTNAME:-no}"
  raw="${raw//$'\r'/}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ -z "$raw" ]]; then
    raw=no
  fi
  case "$raw" in
    yes|no) printf '%s' "$raw" ;;
    *)
      echo "::error::FTP_TLS_CHECK_HOSTNAME must be yes or no" >&2
      return 1
      ;;
  esac
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

pr_is_open() {
  local n="$1" x
  [[ "$n" =~ ^[0-9]+$ ]] || return 1
  for x in "${OPEN_PR_NUMS[@]}"; do
    if [[ "$((10#$x))" -eq "$((10#$n))" ]]; then
      return 0
    fi
  done
  return 1
}

is_deletable_segment() {
  local n="$1"
  [[ "$n" =~ ^[A-Za-z0-9._+@-]+$ ]] || return 1
  [[ "$n" != "." && "$n" != ".." && "$n" != *..* ]] || return 1
  return 0
}

# Last gate before rm. Open-PR folders and anything that is not a single
# preview path are refused.
assert_deletable_relpath() {
  local rel="$1" child
  case "$rel" in
    portfolio | .ftp-deploy-sync-state.json | portfolio/.ftp-deploy-sync-state.json)
      return 0
      ;;
    portfolio/*)
      child="${rel#portfolio/}"
      [[ "$child" != */* ]] || return 1
      if [[ "$child" == ".ftp-deploy-sync-state.json" ]]; then
        return 0
      fi
      is_deletable_segment "$child" || return 1
      if [[ "$child" =~ ^pr-([0-9]+)$ ]]; then
        pr_is_open "${BASH_REMATCH[1]}" && return 1
      fi
      return 0
      ;;
    pr-*)
      [[ "$rel" =~ ^pr-([0-9]+)$ ]] || return 1
      pr_is_open "${BASH_REMATCH[1]}" && return 1
      return 0
      ;;
    *)
      is_deletable_segment "$rel" || return 1
      [[ "$rel" != "portfolio" ]] || return 1
      return 0
      ;;
  esac
}

parse_cls_line() {
  local line="$1"
  line="${line%$'\r'}"
  PARSED_NAME=""
  PARSED_KIND=""
  [[ -n "$line" ]] || return 1
  if [[ "$line" == */ ]]; then
    PARSED_KIND=dir
    PARSED_NAME="${line%/}"
  elif [[ "$line" == *@ ]]; then
    PARSED_KIND=symlink
    PARSED_NAME="${line%@}"
  else
    PARSED_KIND="file"
    PARSED_NAME="$line"
  fi
  [[ "$PARSED_NAME" != "." && "$PARSED_NAME" != ".." ]] || return 1
  return 0
}

emit_row() {
  local action="$1" path="$2" kind="$3" reason="$4"
  ROWS+=("${action}"$'\t'"${path}"$'\t'"${kind}"$'\t'"${reason}")
  if [[ "$action" == "delete" ]]; then
    DELETE_PATHS+=("$path")
  fi
}

consider_entry() {
  local prefix="$1" name="$2" kind="$3"
  local path="$name" pr_num=""
  [[ -n "$prefix" ]] && path="${prefix}/${name}"

  if [[ "$kind" == "symlink" ]]; then
    emit_row skip "$path" symlink "symlink left in place"
    return
  fi
  if [[ "$name" == .* && "$name" != ".ftp-deploy-sync-state.json" ]]; then
    emit_row skip "$path" dot "dot entry left in place"
    return
  fi
  if [[ "$name" == ".ftp-deploy-sync-state.json" && "$kind" == "file" ]]; then
    emit_row delete "$path" sync-state "ftp sync state"
    return
  fi
  if [[ "$kind" != "dir" ]]; then
    emit_row skip "$path" file "file left in place"
    return
  fi
  if [[ "$name" =~ ^pr-([0-9]+)$ ]]; then
    pr_num="${BASH_REMATCH[1]}"
    if pr_is_open "$pr_num"; then
      emit_row keep "$path" open-pr "open PR #${pr_num}"
    else
      emit_row delete "$path" closed-pr "PR #${pr_num} is not open"
    fi
    return
  fi
  if is_deletable_segment "$name"; then
    emit_row delete "$path" legacy-slug "legacy slug folder"
  else
    emit_row skip "$path" unsafe "refusing to delete unsafe name"
  fi
}

# root_listing and portfolio_listing are `cls -1B --classify` output.
# portfolio_exists is 1 when portfolio/ was listed, even if it is empty.
classify_preview_tree() {
  local root_listing="$1" portfolio_exists="$2" portfolio_listing="$3"
  local line name kind has_pr=0
  ROWS=()
  DELETE_PATHS=()

  local -a portfolio_dirs=() portfolio_files=()
  if [[ "$portfolio_exists" == "1" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      parse_cls_line "$line" || continue
      if [[ "$PARSED_KIND" == "dir" && "$PARSED_NAME" =~ ^pr-[0-9]+$ ]]; then
        has_pr=1
      fi
      if [[ "$PARSED_KIND" == "dir" || "$PARSED_KIND" == "symlink" ]]; then
        portfolio_dirs+=("${PARSED_KIND}"$'\t'"${PARSED_NAME}")
      else
        portfolio_files+=("${PARSED_KIND}"$'\t'"${PARSED_NAME}")
      fi
    done <<< "$portfolio_listing"
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    parse_cls_line "$line" || continue
    name="$PARSED_NAME"
    kind="$PARSED_KIND"
    if [[ "$name" == "portfolio" && "$kind" == "dir" ]]; then
      if [[ "$portfolio_exists" != "1" ]]; then
        emit_row skip portfolio dir "portfolio/ disappeared before it could be classified"
        continue
      fi
      if [[ "$has_pr" == "1" ]]; then
        emit_row keep portfolio container "app folder for pr-<N> previews"
        local entry entry_kind entry_name
        for entry in "${portfolio_dirs[@]}"; do
          entry_kind="${entry%%$'\t'*}"
          entry_name="${entry#*$'\t'}"
          consider_entry portfolio "$entry_name" "$entry_kind"
        done
        for entry in "${portfolio_files[@]}"; do
          entry_kind="${entry%%$'\t'*}"
          entry_name="${entry#*$'\t'}"
          consider_entry portfolio "$entry_name" "$entry_kind"
        done
      elif [[ ${#portfolio_dirs[@]} -eq 0 && ${#portfolio_files[@]} -eq 0 ]]; then
        emit_row keep portfolio container "empty portfolio/ container"
      else
        # A branch named portfolio, published before pr-<N> folders existed.
        emit_row delete portfolio legacy-slug "legacy slug folder (no pr-<N> children)"
      fi
      continue
    fi
    consider_entry "" "$name" "$kind"
  done <<< "$root_listing"
}

prepare_connection() {
  local target root quoted_user quoted_pass check_hostname
  target=$(normalize_ftp_target "$FTP_HOST") || return 1
  root=$(normalize_preview_root "$PREVIEW_ROOT") || return 1
  quoted_user=$(lftp_quote "$FTP_USERNAME") || return 1
  quoted_pass=$(lftp_quote "$FTP_PASSWORD") || return 1
  check_hostname=$(tls_check_hostname) || return 1
  LFTP_TARGET="$target"
  PREVIEW_ROOT="$root"
  LFTP_USER_Q="$quoted_user"
  LFTP_PASS_Q="$quoted_pass"
  LFTP_CHECK_HOSTNAME="$check_hostname"
  echo "FTP target normalized to a bare hostname or ftp://host:port; ssl:verify-certificate yes; ssl:check-hostname ${LFTP_CHECK_HOSTNAME}"
}

# Run one lftp session. Arguments are complete lftp command lines, after open.
# Prints stdout. Returns 2 when the server reports "No such file or directory".
lftp_run() {
  local script out err status line
  script=$(mktemp)
  out=$(mktemp)
  err=$(mktemp)
  chmod 600 "$script"
  {
    printf '%s\n' \
      'set cmd:fail-exit yes' \
      'set net:max-retries 3' \
      'set net:timeout 30' \
      'set ftp:ssl-force true' \
      'set ssl:verify-certificate yes' \
      "set ssl:check-hostname ${LFTP_CHECK_HOSTNAME}" \
      'set ftp:list-options -a'
    printf 'open -u %s,%s %s\n' "$LFTP_USER_Q" "$LFTP_PASS_Q" "$(lftp_quote "$LFTP_TARGET")"
    for line in "$@"; do
      printf '%s\n' "$line"
    done
    printf '%s\n' 'bye'
  } > "$script"

  set +e
  lftp -f "$script" >"$out" 2>"$err"
  status=$?
  set -e
  rm -f "$script"

  if grep -q -i -E 'login failed|fatal error|name or service not known|certificate' "$err"; then
    echo "::error::lftp failed" >&2
    cat "$err" >&2
    rm -f "$out" "$err"
    return 1
  fi
  if [[ "$status" -ne 0 ]]; then
    if grep -q 'No such file or directory' "$err"; then
      rm -f "$out" "$err"
      return 2
    fi
    echo "::error::lftp failed" >&2
    cat "$err" >&2
    rm -f "$out" "$err"
    return 1
  fi
  cat "$out"
  rm -f "$out" "$err"
}

list_remote() {
  local path="$1"
  lftp_run "cls -1B --classify $(lftp_quote "$path")"
}

load_open_prs() {
  local api_out line
  if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
    echo "::error::GITHUB_REPOSITORY is required to tell open PRs from legacy folders" >&2
    return 1
  fi
  if ! api_out=$(gh api --paginate --jq '.[].number' "repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=100"); then
    echo "::error::could not list open pull requests; refusing to delete anything" >&2
    return 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    if [[ ! "$line" =~ ^[0-9]+$ ]]; then
      echo "::error::unexpected pull request number from the API" >&2
      return 1
    fi
    if ! pr_is_open "$line"; then
      OPEN_PR_NUMS+=("$line")
    fi
  done <<< "$api_out"
}

md_cell() {
  local s="$1"
  s=${s//\`/\'}
  s=${s//|/\/}
  printf '%s' "$s"
}

write_summary() {
  local summary="${GITHUB_STEP_SUMMARY:-}"
  [[ -n "$summary" ]] || return 0
  local row action path kind reason rest open_list="none"
  {
    echo "## Legacy preview folders"
    echo
    if [[ "${1:-list}" == "delete" ]]; then
      echo "Confirm was \`delete-legacy\`. Rows marked **delete** are removed after this table is written. Open-PR \`pr-<N>\` folders are kept."
    else
      echo "Nothing was deleted. Review this list, then re-run the workflow and set **confirm** to \`delete-legacy\`."
    fi
    echo
    if ((${#OPEN_PR_NUMS[@]} > 0)); then
      open_list=$(IFS=,; echo "${OPEN_PR_NUMS[*]}")
    fi
    echo "Open PRs seen: ${open_list}"
    echo
    echo "| Path | Kind | Action | Reason |"
    echo "|---|---|---|---|"
    if ((${#ROWS[@]} > 0)); then
      for row in "${ROWS[@]}"; do
        action="${row%%$'\t'*}"
        rest="${row#*$'\t'}"
        path="${rest%%$'\t'*}"
        rest="${rest#*$'\t'}"
        kind="${rest%%$'\t'*}"
        reason="${rest#*$'\t'}"
        echo "| \`$(md_cell "$path")\` | $(md_cell "$kind") | $(md_cell "$action") | $(md_cell "$reason") |"
      done
    fi
    echo
  } >> "$summary"
}

# Never rm -r portfolio/ itself while a pr-<N> directory is inside it.
assert_portfolio_parent_safe() {
  local rel line
  ((${#DELETE_PATHS[@]} > 0)) || return 0
  for rel in "${DELETE_PATHS[@]}"; do
    [[ "$rel" == "portfolio" ]] || continue
    while IFS= read -r line || [[ -n "$line" ]]; do
      parse_cls_line "$line" || continue
      if [[ "$PARSED_KIND" == "dir" && "$PARSED_NAME" =~ ^pr-[0-9]+$ ]]; then
        echo "::error::refusing to delete portfolio/ because it contains ${PARSED_NAME}" >&2
        return 1
      fi
    done <<< "$1"
  done
}

cmd_delete_pr() {
  local pr dir target
  prepare_connection || exit 1
  pr=$(printf '%s' "$PR_NUMBER" | tr -d '[:space:]')
  case "$pr" in
    ''|*[!0-9]*)
      echo "::error::bad PR number" >&2
      exit 1
      ;;
  esac
  dir="pr-${pr}"
  if [[ ! "$dir" =~ ^pr-[0-9]+$ ]]; then
    echo "::error::refusing to delete '$dir'" >&2
    exit 1
  fi
  target=$(ftp_join "$PREVIEW_ROOT" "portfolio/${dir}")
  # cls first so a TLS or login failure cannot exit 0 before rm.
  lftp_run \
    "cls -1B --classify $(lftp_quote "$PREVIEW_ROOT")" \
    "rm -r -f $(lftp_quote "$target")" \
    >/dev/null
  echo "removed portfolio/${dir}"
}

cmd_purge() {
  local root_listing portfolio_listing portfolio_path portfolio_exists=0 st
  local confirm rel quoted
  local -a rm_cmds=()
  prepare_connection || exit 1
  load_open_prs || exit 1

  if ! root_listing=$(list_remote "$PREVIEW_ROOT"); then
    exit 1
  fi

  # A PR opened while we were listing should be kept, never deleted.
  load_open_prs || exit 1

  if printf '%s\n' "$root_listing" | grep -qx 'portfolio/'; then
    portfolio_path=$(ftp_join "$PREVIEW_ROOT" "portfolio")
    set +e
    portfolio_listing=$(list_remote "$portfolio_path")
    st=$?
    set -e
    if [[ "$st" -eq 0 ]]; then
      portfolio_exists=1
    elif [[ "$st" -eq 2 ]]; then
      portfolio_exists=0
      portfolio_listing=""
    else
      exit 1
    fi
  fi

  load_open_prs || exit 1
  classify_preview_tree "$root_listing" "$portfolio_exists" "$portfolio_listing"

  confirm=$(printf '%s' "${CONFIRM:-}" | tr -d '[:space:]')
  if [[ "$confirm" != "delete-legacy" ]]; then
    write_summary list
    echo "listed ${#ROWS[@]} entries; nothing deleted"
    return 0
  fi

  assert_portfolio_parent_safe "$portfolio_listing" || exit 1
  write_summary delete

  if ((${#DELETE_PATHS[@]} > 0)); then
    for rel in "${DELETE_PATHS[@]}"; do
      if ! assert_deletable_relpath "$rel"; then
        echo "::error::refusing to delete '$rel'" >&2
        exit 1
      fi
      quoted=$(lftp_quote "$(ftp_join "$PREVIEW_ROOT" "$rel")") || exit 1
      rm_cmds+=("rm -r -f ${quoted}")
    done
    lftp_run \
      "cls -1B --classify $(lftp_quote "$PREVIEW_ROOT")" \
      "${rm_cmds[@]}" \
      >/dev/null
    echo "Removed ${#DELETE_PATHS[@]} path(s)." >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  else
    echo "No legacy paths to delete." >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  fi
  echo "deleted ${#DELETE_PATHS[@]} path(s)"
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    delete-pr) cmd_delete_pr ;;
    purge) cmd_purge ;;
    *)
      echo "::error::usage: preview-cleanup.sh delete-pr|purge" >&2
      exit 2
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
