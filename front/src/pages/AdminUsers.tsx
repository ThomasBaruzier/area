import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/useAuth";
import apiFetch from "../utils/fetchApi";

type AdminUser = {
  id: number | string;
  username: string;
  email: string;
  role?: string | null;
};

type Editable = {
  username: string;
  email: string;
};

export default function AdminUsers(): JSX.Element {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Editable>>({});

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.username || a.email).localeCompare(b.username || b.email),
      ),
    [users],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AdminUser[]>("/api/user/list");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const startEdit = (u: AdminUser) => {
    setEditing((prev) => ({
      ...prev,
      [String(u.id)]: { username: u.username, email: u.email },
    }));
  };

  const cancelEdit = (id: string | number) => {
    setEditing((prev) => {
      const { [String(id)]: _, ...rest } = prev;
      return rest;
    });
  };

  const onEditField =
    (id: string | number, field: keyof Editable) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEditing((prev) => ({
        ...prev,
        [String(id)]: { ...prev[String(id)], [field]: val },
      }));
    };

  const saveEdit = async (id: string | number) => {
    const draft = editing[String(id)];
    try {
      await apiFetch<AdminUser>(`/api/user/admin/${String(id)}`, {
        method: "PATCH",
        body: draft,
      });
      setUsers((prev) =>
        prev.map((u) => (String(u.id) === String(id) ? { ...u, ...draft } : u)),
      );
      cancelEdit(id);
    } catch (e) {
      console.error(e);
      alert("Failed to save changes");
    }
  };

  const deleteUser = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiFetch<{ message: string }>(`/api/user/admin/${String(id)}`, {
        method: "DELETE",
      });
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
    } catch (e) {
      console.error(e);
      alert("Failed to delete user");
    }
  };

  const promoteUser = async (id: string | number) => {
    try {
      const updated = await apiFetch<AdminUser>(
        `/api/user/admin/${String(id)}/promote`,
        {
          method: "PATCH",
        },
      );
      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(id)
            ? { ...u, role: updated.role ?? "ADMIN" }
            : u,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Failed to promote user");
    }
  };

  if (!isAdmin) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h1>Unauthorized</h1>
        <p>You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 4 }}>
      <h1 style={{ marginBottom: "1.2rem" }}>User Management</h1>

      {loading && <p>Loading users…</p>}
      {error && (
        <p className="error-box" style={{ maxWidth: 560 }}>
          {error}{" "}
          <button
            type="button"
            className="wf-btn"
            onClick={() => void fetchUsers()}
            style={{ marginLeft: 8 }}
          >
            Retry
          </button>
        </p>
      )}

      {!loading && !error && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--color-surface)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <th style={{ textAlign: "left", padding: "10px 12px" }}>ID</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>
                  Username
                </th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>
                  Email
                </th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>
                  Role
                </th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => {
                const ed = editing[String(u.id)];

                return (
                  <tr
                    key={String(u.id)}
                    data-testid={`user-row-${String(u.id)}`}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      {u.id}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      {Object.hasOwn(editing, String(u.id)) ? (
                        <input
                          className="input"
                          value={ed.username}
                          data-testid={`username-input-${String(u.id)}`}
                          onChange={onEditField(u.id, "username")}
                        />
                      ) : (
                        u.username
                      )}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      {Object.hasOwn(editing, String(u.id)) ? (
                        <input
                          className="input"
                          value={ed.email}
                          data-testid={`email-input-${String(u.id)}`}
                          onChange={onEditField(u.id, "email")}
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      {u.role ?? "-"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--color-border)",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {!Object.hasOwn(editing, String(u.id)) ? (
                        <>
                          <button
                            type="button"
                            className="wf-btn"
                            onClick={() => {
                              startEdit(u);
                            }}
                            data-testid={`edit-btn-${String(u.id)}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="wf-btn"
                            onClick={() => void promoteUser(u.id)}
                            data-testid={`promote-btn-${String(u.id)}`}
                            disabled={u.role?.toUpperCase() === "ADMIN"}
                            title={
                              u.role?.toUpperCase() === "ADMIN"
                                ? "Already admin"
                                : "Promote to admin"
                            }
                          >
                            Promote
                          </button>
                          <button
                            type="button"
                            className="wf-btn danger"
                            onClick={() => void deleteUser(u.id)}
                            data-testid={`delete-btn-${String(u.id)}`}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="wf-btn"
                            onClick={() => void saveEdit(u.id)}
                            data-testid={`save-btn-${String(u.id)}`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="wf-btn"
                            onClick={() => {
                              cancelEdit(u.id);
                            }}
                            data-testid={`cancel-btn-${String(u.id)}`}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
