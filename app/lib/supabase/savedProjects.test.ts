import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { loadSavedRuns, saveCompletedRun, updateSavedProjectStatus } from "./savedProjects";

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
                              export_template: "engineer",
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
            assert.equal(query, "id, title, status");
            return {
              eq(column: string, value: string) {
                assert.equal(column, "user_id");
                assert.equal(value, "user-123");
                return {
                  async in(columnName: string, values: string[]) {
                    assert.equal(columnName, "id");
                    assert.deepEqual(values, ["project-1"]);
                    return {
                      data: [{ id: "project-1", title: "Senior backend role", status: "active" }],
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
  assert.equal(runs[0].applicationStatus, "active");
  assert.equal(runs[0].source, "account");
  assert.equal(runs[0].snapshot?.templateSlug, "engineer");
  assert.equal(runs[0].snapshot?.templateName, "Technical");
});

test("updates saved project application status", async () => {
  const client = {
    from(table: string) {
      assert.equal(table, "resume_projects");
      return {
        update(payload: Record<string, unknown>) {
          assert.equal(payload.status, "archived");
          assert.match(String(payload.updated_at), /^\d{4}-\d{2}-\d{2}T/);
          return {
            eq(column: string, value: string) {
              assert.equal(column, "id");
              assert.equal(value, "project-1");
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
      };
    },
  } as unknown as SupabaseClient;

  assert.equal(await updateSavedProjectStatus(client, "project-1", "archived", "user-123"), "archived");
});

test("loads saved runs when the export template column is not in the schema cache yet", async () => {
  const selectQueries: string[] = [];

  const client = {
    from(table: string) {
      if (table === "tailor_runs") {
        return {
          select(query: string) {
            selectQueries.push(query);
            return {
              eq() {
                return {
                  order() {
                    return {
                      async limit() {
                        if (query.includes("export_template")) {
                          return {
                            data: null,
                            error: {
                              code: "PGRST204",
                              message: "Could not find the 'export_template' column of 'tailor_runs' in the schema cache",
                            },
                          };
                        }

                        return {
                          data: [
                            {
                              id: "run-legacy",
                              client_history_id: "history-legacy",
                              project_id: "project-legacy",
                              created_at: "2026-05-21T12:00:00.000Z",
                              source_resume_name: "legacy.pdf",
                              job_target: "Legacy target",
                              mode: "balanced",
                              fit_score: 61,
                              download_format: "pdf",
                              download_url: "/api/workflow/download/legacy.pdf",
                              payload: { studioSnapshot: { templateSlug: "compact" } },
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
          select() {
            return {
              eq() {
                return {
                  async in() {
                    return {
                      data: [{ id: "project-legacy", title: "Legacy saved project" }],
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

  assert.equal(selectQueries.length, 2);
  assert.equal(selectQueries[0].includes("export_template"), true);
  assert.equal(selectQueries[1].includes("export_template"), false);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].projectTitle, "Legacy saved project");
  assert.equal(runs[0].snapshot?.templateSlug, "compact");
  assert.equal(runs[0].snapshot?.templateName, "Compact");
});

test("sanitizes loaded saved run download links before they reach history", async () => {
  const client = {
    from(table: string) {
      if (table === "tailor_runs") {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      async limit() {
                        return {
                          data: [
                            {
                              id: "run-unsafe",
                              client_history_id: "history-unsafe",
                              project_id: "project-unsafe",
                              created_at: "2026-05-21T12:00:00.000Z",
                              source_resume_name: "unsafe.pdf",
                              job_target: "Unsafe target",
                              mode: "balanced",
                              fit_score: 63,
                              download_format: "pdf",
                              download_url: "https://downloads.example/unsafe.pdf",
                              payload: {
                                studioSnapshot: {
                                  downloadUrl: "javascript:alert(1)",
                                  downloadFormat: "txt",
                                  downloads: {
                                    pdf: "https://downloads.example/unsafe.pdf",
                                    docx: "/api/workflow/download/history-safe.docx",
                                    txt: "/api/workflow/download/.env",
                                  },
                                  templateSlug: "classic",
                                },
                              },
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
          select() {
            return {
              eq() {
                return {
                  async in() {
                    return {
                      data: [{ id: "project-unsafe", title: "Unsafe saved project" }],
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

  assert.equal(runs.length, 1);
  assert.equal(runs[0].downloadUrl, "#");
  assert.deepEqual(runs[0].downloads, {
    docx: "/api/workflow/download/history-safe.docx",
  });
  assert.deepEqual(runs[0].snapshot?.downloads, {
    docx: "/api/workflow/download/history-safe.docx",
  });
  assert.equal(runs[0].snapshot?.downloadUrl, undefined);
  assert.equal(runs[0].snapshot?.downloadFormat, undefined);
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
            assert.equal(payload.export_template, "editorial");
            assert.deepEqual(payload.payload, {
              studioSnapshot: { downloadUrl: "/api/workflow/download/history-1.pdf", templateSlug: "editorial" },
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
        studioSnapshot: { downloadUrl: "/api/workflow/download/history-1.pdf", templateSlug: "editorial" },
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

test("saves existing runs without export_template when an older schema rejects the column", async () => {
  const updatePayloads: Record<string, unknown>[] = [];

  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          async upsert() {
            return { error: null };
          },
        };
      }

      if (table === "tailor_runs") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: { id: "run-existing", project_id: "project-existing" }, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            updatePayloads.push(payload);
            return {
              eq() {
                return {
                  async eq() {
                    return updatePayloads.length === 1
                      ? {
                          error: {
                            code: "PGRST204",
                            message: "Could not find the 'export_template' column of 'tailor_runs' in the schema cache",
                          },
                        }
                      : { error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "resume_projects") {
        return {
          update() {
            return {
              eq() {
                return {
                  async eq() {
                    return { error: null };
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

  const saved = await saveCompletedRun(
    client,
    {
      id: "history-legacy",
      createdAt: "2026-05-21T12:00:00.000Z",
      filename: "resume.pdf",
      mode: "balanced",
      score: 74,
      downloadUrl: "/api/workflow/download/history-legacy.pdf",
      downloadFormat: "pdf",
      roleHint: "Legacy target",
      payload: { studioSnapshot: { templateSlug: "engineer" } },
    },
    { id: "user-123", email: "person@example.com", user_metadata: null },
  );

  assert.deepEqual(saved, { projectId: "project-existing", runId: "run-existing" });
  assert.equal(updatePayloads.length, 2);
  assert.equal(updatePayloads[0].export_template, "engineer");
  assert.equal("export_template" in updatePayloads[1], false);
});
