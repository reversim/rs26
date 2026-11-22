import type { IncomingMessage } from "node:http";

/** One JSON-RPC message from the request body, and its method name for logs. */
export type Message = {
  body: object;
  method?: string;
};

/** The params of an `initialize` request, as far as metrics read them. Every field is untrusted. */
export type InitializeParams = {
  clientInfo?: ClientInfo;
  protocolVersion?: unknown;
};

/** The client's self-description in `initialize`. */
export type ClientInfo = {
  name?: unknown;
  version?: unknown;
};

/**
 * Cloud Functions reads the request body before the handler runs and exposes it as
 * `rawBody`, so the request stream is already drained by the time we see it.
 */
export type RawBodyRequest = IncomingMessage & {
  rawBody?: Buffer;
};
