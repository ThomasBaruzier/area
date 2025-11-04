import type { Request } from "express";

import type { ValidatedUser } from "./auth.strategy";

export interface AuthenticatedRequest extends Request {
  user: ValidatedUser;
}
