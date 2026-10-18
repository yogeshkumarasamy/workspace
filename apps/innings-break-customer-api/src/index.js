// SCAFFOLD ONLY. Pending approval of specs/innings-break/runtime.md (issue #83).
// Not the customer API. Do not deploy.

export default {
  async fetch() {
    return Response.json(
      {
        ok: false,
        error: "scaffold",
        service: "ib-customer-api",
        message:
          "Innings Break customer API scaffold. The runtime spec is pending approval.",
      },
      { status: 501 },
    );
  },
};
