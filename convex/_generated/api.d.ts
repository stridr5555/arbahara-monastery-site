/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achActions from "../achActions.js";
import type * as achRecords from "../achRecords.js";
import type * as achValidation from "../achValidation.js";
import type * as administration from "../administration.js";
import type * as archive from "../archive.js";
import type * as auth from "../auth.js";
import type * as authOptions from "../authOptions.js";
import type * as bankActions from "../bankActions.js";
import type * as bankDetailVault from "../bankDetailVault.js";
import type * as bankRecords from "../bankRecords.js";
import type * as calendarActions from "../calendarActions.js";
import type * as calendarRecords from "../calendarRecords.js";
import type * as crons from "../crons.js";
import type * as donations from "../donations.js";
import type * as events from "../events.js";
import type * as finance from "../finance.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as ledger from "../ledger.js";
import type * as members from "../members.js";
import type * as office from "../office.js";
import type * as paymentRecords from "../paymentRecords.js";
import type * as payments from "../payments.js";
import type * as security from "../security.js";
import type * as spouses from "../spouses.js";
import type * as tokenVault from "../tokenVault.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achActions: typeof achActions;
  achRecords: typeof achRecords;
  achValidation: typeof achValidation;
  administration: typeof administration;
  archive: typeof archive;
  auth: typeof auth;
  authOptions: typeof authOptions;
  bankActions: typeof bankActions;
  bankDetailVault: typeof bankDetailVault;
  bankRecords: typeof bankRecords;
  calendarActions: typeof calendarActions;
  calendarRecords: typeof calendarRecords;
  crons: typeof crons;
  donations: typeof donations;
  events: typeof events;
  finance: typeof finance;
  households: typeof households;
  http: typeof http;
  imports: typeof imports;
  ledger: typeof ledger;
  members: typeof members;
  office: typeof office;
  paymentRecords: typeof paymentRecords;
  payments: typeof payments;
  security: typeof security;
  spouses: typeof spouses;
  tokenVault: typeof tokenVault;
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
