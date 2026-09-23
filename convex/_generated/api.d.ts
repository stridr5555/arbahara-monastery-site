/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as administration from "../administration.js";
import type * as archive from "../archive.js";
import type * as auth from "../auth.js";
import type * as authOptions from "../authOptions.js";
import type * as donations from "../donations.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as members from "../members.js";
import type * as paymentRecords from "../paymentRecords.js";
import type * as payments from "../payments.js";
import type * as security from "../security.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  administration: typeof administration;
  archive: typeof archive;
  auth: typeof auth;
  authOptions: typeof authOptions;
  donations: typeof donations;
  events: typeof events;
  http: typeof http;
  members: typeof members;
  paymentRecords: typeof paymentRecords;
  payments: typeof payments;
  security: typeof security;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
