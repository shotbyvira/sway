/** Dev / non-Workers builds never see a real Durable Object binding. */
export const env: { ROOMS?: undefined } = {};

export class DurableObject {
  ctx: unknown;
  env: unknown;
  constructor(ctx: unknown, env: unknown) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class WorkerEntrypoint {}
export class WorkflowEntrypoint {}
