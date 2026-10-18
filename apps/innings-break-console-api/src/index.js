// SCAFFOLD ONLY. Pending approval of specs/innings-break/runtime.md (issue #83).
// Not the console API. Do not deploy.

export default {
  async fetch() {
    return Response.json(
      {
        ok: false,
        error: "scaffold",
        service: "ib-console-api",
        message:
          "Innings Break console API scaffold. The runtime spec is pending approval.",
      },
      { status: 501 },
    );
  },
};
