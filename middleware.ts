// Next.js requires the middleware to be in middleware.ts with a default export named "middleware".
// The logic lives in proxy.ts for historical reasons — we re-export it here.
export { proxy as middleware, config } from "./proxy";
