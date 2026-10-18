export function browserTransferPage(): Response {
  return new Response(BROWSER_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const BROWSER_HTML = `<!doctype html>
<meta charset="utf-8">
<title>yt-upload-spike client transfer</title>
<h1>Client transfer</h1>
<p>Bytes move in this browser. The Worker only receives them because this page talks to the mock sink. A production client would PUT to YouTube's resumable session instead, and the Worker would not see the body.</p>
<label>Bearer token <input id="token" size="40"></label>
<label>Chunk bytes <input id="chunk" value="1048576"></label>
<input id="file" type="file">
<button id="go">Upload to mock sink</button>
<pre id="log"></pre>
<script>
const log = document.querySelector("#log");
const say = (line) => { log.textContent += line + "\\n"; };
document.querySelector("#go").onclick = async () => {
  const file = document.querySelector("#file").files[0];
  if (!file) return say("choose a file");
  const token = document.querySelector("#token").value.trim();
  const chunk = Number(document.querySelector("#chunk").value);
  const headers = token ? { Authorization: "Bearer " + token } : {};
  const created = await fetch("/sink/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ totalSize: file.size, storage: file.size > 262144 ? "r2" : "memory" }),
  });
  const session = await created.json();
  if (!created.ok) return say("session failed " + JSON.stringify(session));
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + chunk, file.size);
    const slice = file.slice(offset, end);
    const put = await fetch("/sink/sessions/" + session.id, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Range": "bytes " + offset + "-" + (end - 1) + "/" + file.size,
        "Content-Type": "application/octet-stream",
      },
      body: slice,
    });
    const body = await put.json();
    say(put.status + " received " + body.received);
    if (!put.ok && put.status !== 308) return;
    offset = body.received;
  }
  say("done sha256 " + (session && "see GET /sink/sessions/" + session.id));
};
</script>
`;
