import { BadRequestException } from "./app-error.utils";

/** Return one route parameter and reject repeated/missing values. */
export function requiredRouteParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestException(`Missing or invalid route parameter: ${name}`);
  }
  return value;
}
