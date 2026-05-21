import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { loadSavedRuns } from "./savedProjects";

test("loads saved runs with project titles without embedded relationship names", async () => {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(table);

      if (table === "tailor_runs") {
        return {
          select(query: string) {
            assert.equal(
              query.includes("resume_projects!"),
              false,
              "saved run loading should not depend on Supabase relationship names",
            );
            return {
              eq(column: string, value: string) {
                assert.equal(column, "user_id");
                assert.equal(value, "user-123");
                return {
                  order(column: string, options: { ascending: boolean }) {
                    assert.equal(column, "created_at");
                    assert.equal(options.ascending, false);
                    return {
                      async limit(value: number) {
                        assert.equal(value, 12);
                        return {
                          data: [
                            {
                              id: "run-1",
                              client_history_id: "history-1",
                              project_id: "project-1",
                              created_at: "2026-05-21T12:00:00.000Z",
                              source_resume_name: "resume.pdf",
                              job_target: "https://jobs.example.com/role",
                              mode: "balanced",
                              fit_score: 84,
                              download_format: "pdf",
                              download_url: "/api/workflow/download/run-1.pdf",
                              payload: { studioSnapshot: { downloads: {} } },
                            },
                            {
                              id: "run-2",
                              client_history_id: "history-2",
                              project_id: "project-2",
                              created_at: "2026-05-21T12:01:00.000Z",
                              source_resume_name: "server-recorded.pdf",
                              job_target: "Server-recorded usage row",
                              mode: "balanced",
                              fit_score: 72,
                              download_format: "pdf",
                              download_url: null,
                              payload: { serverRecorded: true },
                            },
                          ],
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "resume_projects") {
        return {
          select(query: string) {
            assert.equal(query, "id, title");
            return {
              eq(column: string, value: string) {
                assert.equal(column, "user_id");
                assert.equal(value, "user-123");
                return {
                  async in(columnName: string, values: string[]) {
                    assert.equal(columnName, "id");
                    assert.deepEqual(values, ["project-1"]);
                    return {
                      data: [{ id: "project-1", title: "Senior backend role" }],
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const runs = await loadSavedRuns(client, "user-123");

  assert.deepEqual(calls, ["tailor_runs", "resume_projects"]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].projectTitle, "Senior backend role");
  assert.equal(runs[0].source, "account");
});
