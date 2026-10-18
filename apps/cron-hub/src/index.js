// SCAFFOLD ONLY. Pending approval of specs/innings-break/runtime.md (issue #83).
// Not the scheduler. Do not deploy: a deploy would register a cron with nothing to run.

export default {
  async fetch() {
    return Response.json(
      {
        ok: false,
        error: "scaffold",
        service: "cron-hub",
        message: "Cron hub scaffold. The runtime spec is pending approval.",
      },
      { status: 501 },
    );
  },

  async scheduled() {
    throw new Error(
      "cron-hub scaffold has no scheduler. Do not deploy until specs/innings-break/runtime.md is approved and POST /__cron exists on the console API.",
    );
  },
};
