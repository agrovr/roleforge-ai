import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { loadSavedRuns, saveCompletedRun } from "./savedProjects";

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

test("updates a server-recorded run instead of inserting a duplicate", async () => {
  const calls: Array<{ table: string; action: string; payload?: unknown }> = [];
  let tailorRunUpdated = false;
  let projectUpdated = false;

  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          async upsert(payload: unknown, options: unknown) {
            calls.push({ table, action: "upsert", payload: { payload, options } });
            return { error: null };
          },
        };
      }

      if (table === "tailor_runs") {
        return {
          select(query: string) {
            calls.push({ table, action: `select:${query}` });
            return {
              eq(column: string, value: string) {
                assert.equal(column, "user_id");
                assert.equal(value, "user-123");
                return {
                  eq(nextColumn: string, nextValue: string) {
                    assert.equal(nextColumn, "client_history_id");
                    assert.equal(nextValue, "history-1");
                    return {
                      async maybeSingle() {
                        return {
                          data: { id: "run-existing", project_id: "project-existing" },
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            calls.push({ table, action: "update", payload });
            tailorRunUpdated = true;
            assert.equal(payload.download_url, "/api/workflow/download/history-1.pdf");
            assert.deepEqual(payload.payload, {
              studioSnapshot: { downloadUrl: "/api/workflow/download/history-1.pdf" },
              runId: "history-1",
            });
            return {
              eq(column: string, value: string) {
                assert.equal(column, "id");
                assert.equal(value, "run-existing");
                return {
                  async eq(nextColumn: string, nextValue: string) {
                    assert.equal(nextColumn, "user_id");
                    assert.equal(nextValue, "user-123");
                    return { error: null };
                  },
                };
              },
            };
          },
          insert() {
            throw new Error("tailor_runs.insert should not run when client_history_id already exists");
          },
        };
      }

      if (table === "resume_projects") {
        return {
          update(payload: Record<string, unknown>) {
            calls.push({ table, action: "update", payload });
            projectUpdated = true;
            assert.equal(payload.latest_run_id, "run-existing");
            assert.equal(payload.status, "exported");
            assert.equal(payload.title, "https://jobs.example.com/role");
            return {
              eq(column: string, value: string) {
                assert.equal(column, "id");
                assert.equal(value, "project-existing");
                return {
                  async eq(nextColumn: string, nextValue: string) {
                    assert.equal(nextColumn, "user_id");
                    assert.equal(nextValue, "user-123");
                    return { error: null };
                  },
                };
              },
            };
          },
          insert() {
            throw new Error("resume_projects.insert should not run when client_history_id already exists");
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const saved = await saveCompletedRun(
    client,
    {
      id: "history-1",
      createdAt: "2026-05-21T12:00:00.000Z",
      filename: "resume.pdf",
      mode: "balanced",
      score: 84,
      downloadUrl: "/api/workflow/download/history-1.pdf",
      downloadFormat: "pdf",
      downloads: { pdf: "/api/workflow/download/history-1.pdf" },
      roleHint: "https://jobs.example.com/role",
      sourceResumeName: "resume.pdf",
      jobTarget: "https://jobs.example.com/role",
      payload: {
        studioSnapshot: { downloadUrl: "/api/workflow/download/history-1.pdf" },
        runId: "history-1",
      },
    },
    {
      id: "user-123",
      email: "person@example.com",
      user_metadata: { full_name: "Person From Google" },
    },
  );

  assert.deepEqual(saved, { projectId: "project-existing", runId: "run-existing" });
  assert.equal(tailorRunUpdated, true);
  assert.equal(projectUpdated, true);
  const profileCall = calls.find((call) => call.table === "profiles");
  const profilePayload = profileCall?.payload as { payload: { display_name: string; updated_at: string } } | undefined;
  assert.equal(profileCall?.action, "upsert");
  assert.equal(profilePayload?.payload.display_name, "Person From Google");
  assert.match(profilePayload?.payload.updated_at ?? "", /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(calls.some((call) => call.action === "insert"), false);
});
