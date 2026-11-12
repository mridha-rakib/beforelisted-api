import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { GrantAccessRepository } from "../src/modules/grant-access/grant-access.repository";

describe("GrantAccessRepository transaction sessions", () => {
  for (const useSession of [true, false]) {
    it(`updates a grant ${useSession ? "inside" : "outside"} a transaction`, async () => {
      const session = {} as any;
      const result = { _id: "grant-1", status: "rejected" };
      const repository = Object.create(GrantAccessRepository.prototype) as any;
      let updated = false;
      repository.model = {
        findByIdAndUpdate: (id: string, data: unknown, options: unknown) => {
          assert.equal(id, "grant-1");
          assert.deepEqual(data, { status: "rejected" });
          assert.deepEqual(options, useSession ? { new: true, session } : { new: true });
          updated = true;
          return { lean: async () => result };
        },
      };
      // Keep this call typed to the real repository API: a mock of the
      // service dependency would miss a two-argument override regression.
      const typedRepository: GrantAccessRepository = repository;
      const actual = useSession
        ? await typedRepository.updateById("grant-1", { status: "rejected" }, session)
        : await typedRepository.updateById("grant-1", { status: "rejected" });
      assert.equal(actual, result);
      assert.equal(updated, true);
    });
  }
});
