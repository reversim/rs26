/**
 * An error whose message is safe to show to the MCP client (bad input, unknown id…).
 * Any other error is logged server-side and reported as a generic failure, so
 * internal details (stack traces, upstream URLs, network errors) never leak.
 */
export class UserError extends Error {
  override name = "UserError";
}
