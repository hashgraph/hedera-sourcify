import express, { Response, Request, NextFunction } from "express";
import { deprecatedRoutesVerifyStateless } from "./controllers/verification/verify/stateless/verify.stateless.routes";
import { deprecatedRoutesVerifySession } from "./controllers/verification/verify/session/verify.session.routes";
import { deprecatedRoutesSessionState } from "./controllers/verification/session-state/session-state.routes";
import { deprecatedRoutesRepository } from "./controllers/repository/repository.routes";

type HTTPMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

export const deprecatedRoutes: {
  [index: string]: { path: string; method: string };
} = {
  ...deprecatedRoutesVerifyStateless,
  ...deprecatedRoutesVerifySession,
  ...deprecatedRoutesSessionState,
  ...deprecatedRoutesRepository,
};

// Replace req.url and req.originalUrl allowing OpenApiValidator to handle deprecated routes
// otherwise creating an openapi declaration file for each deprecated route is necessary
export function initDeprecatedRoutes(app: express.Application) {
  Object.keys(deprecatedRoutes).forEach((deprecatedRoute: string) => {
    const { path, method } = deprecatedRoutes[deprecatedRoute];
    app[method as HTTPMethod](
      deprecatedRoute,
      (req: Request, res: Response, next: NextFunction) => {
        req.url = path;
        req.originalUrl = path;
        next();
      }
    );
  });
}
