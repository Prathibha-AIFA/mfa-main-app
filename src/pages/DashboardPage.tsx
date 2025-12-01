// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import type { AuthState, LoginResponseOtp } from "../types/auth";
import { generateReadableKey } from "../utils/mfa";

import "../styles/theme.css";
import "../styles/dashboard.css";

// 🔹 Auth App URL from env (Vite)
const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL;

interface Item {
  _id: string;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemsPageResponse {
  items: Item[];
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

interface DashboardPageProps {
  auth: AuthState;
  onLogout: () => void;
  onAuthUpdate: (auth: AuthState) => void; // 🔹 NEW
}

type PendingAction =
  | { type: "create" }
  | { type: "delete"; id: string }
  | null;

const ITEMS_PER_PAGE = 5;

const DashboardPage: React.FC<DashboardPageProps> = ({
  auth,
  onLogout,
  onAuthUpdate,
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [actionStatus, setActionStatus] = useState("");

  // Local MFA flag
  const [isMfaRegistered, setIsMfaRegistered] = useState(
    auth.isMfaRegistered
  );

  // MFA key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [mfaKey, setMfaKey] = useState("");
  const [mfaStatus, setMfaStatus] = useState("");

  // OTP modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    setIsMfaRegistered(auth.isMfaRegistered);
  }, [auth.isMfaRegistered]);

  const fetchItems = async (page = 1) => {
    setLoadingItems(true);
    setActionStatus("");

    try {
      const res = await api.get<ItemsPageResponse>("/items", {
        params: { page, limit: ITEMS_PER_PAGE },
      });

      setItems(res.data.items || []);
      setCurrentPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.totalItems);
    } catch (err) {
      console.error(err);
      setActionStatus("Failed to load items.");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, []);

  // -------- MFA KEY MODAL --------
  const openMfaKeyModal = async () => {
    setMfaStatus("");
    const key = generateReadableKey(auth.email);
    setMfaKey(key);
    setShowKeyModal(true);

    try {
      const res = await api.post("/auth/mfa/register-key", {
        email: auth.email,
        readableKey: key,
      });

      if (res.data.isMfaRegistered) {
        setIsMfaRegistered(true);
        setMfaStatus(
          "MFA key registered. Now open the Auth App and enter this key to see OTPs."
        );
      } else {
        setMfaStatus(
          "Key saved, but MFA flag not set. Please check with admin."
        );
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        "Failed to register MFA key. Try again later.";
      setMfaStatus(msg);
    }
  };

  const closeMfaKeyModal = () => {
    setShowKeyModal(false);
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(mfaKey);
      setMfaStatus("Key copied. Use it in the Auth App.");
    } catch {
      setMfaStatus("Unable to copy. Please copy the key manually.");
    }
  };

  // 🔹 Open Auth App (Render deployment) using env URL
  const handleOpenAuthApp = () => {
    if (!AUTH_APP_URL) {
      setMfaStatus(
        "Auth App URL is not configured. Please contact your administrator."
      );
      return;
    }
    window.open(AUTH_APP_URL, "_blank", "noopener,noreferrer");
  };

  // -------- OTP MODAL / ACTION WRAPPER --------
  const openOtpForCreate = () => {
    setPendingAction({ type: "create" });
    setOtp("");
    setOtpStatus("");
    setShowOtpModal(true);
  };

  const openOtpForDelete = (id: string) => {
    setPendingAction({ type: "delete", id });
    setOtp("");
    setOtpStatus("");
    setShowOtpModal(true);
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setPendingAction(null);
    setOtp("");
    setOtpStatus("");
  };

  // 👉 MAIN CHANGE: instead of /verify-otp-action, use /auth/login/otp
  // This "upgrades" token to mfaVerified=true like normal OTP login.
  const verifyOtpAndRunAction = async () => {
    if (!otp) {
      setOtpStatus("Please enter OTP.");
      return;
    }

    if (!pendingAction) {
      setOtpStatus("No action selected.");
      return;
    }

    try {
      setOtpStatus("Verifying OTP...");

      // 1) Login with OTP in background to get new token (mfaVerified = true)
      const res = await api.post<LoginResponseOtp>("/auth/login/otp", {
        email: auth.email,
        otp,
      });

      // Update auth in parent + axios header
      onAuthUpdate({
        token: res.data.token,
        email: res.data.email,
        isMfaRegistered: res.data.isMfaRegistered,
        mfaVerified: res.data.mfaVerified,
      });

      // 2) Run pending action using new token
      if (pendingAction.type === "create") {
        await performCreateItem();
      } else if (pendingAction.type === "delete") {
        await performDeleteItem(pendingAction.id);
      }

      closeOtpModal();
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message || "OTP verification failed.";
      setOtpStatus(msg);
    }
  };

  // -------- REAL CRUD FUNCTIONS --------
  const performCreateItem = async () => {
    if (!title) {
      setActionStatus("Title is required.");
      return;
    }

    setActionStatus("");

    try {
      await api.post<Item>("/items", {
        title,
        description,
      });

      setTitle("");
      setDescription("");
      setActionStatus("Item created.");
      fetchItems(1);
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Failed to create item.";
      setActionStatus(msg);
    }
  };

  const performDeleteItem = async (id: string) => {
    setActionStatus("");
    try {
      await api.delete(`/items/${id}`);
      setActionStatus("Item deleted.");
      fetchItems(currentPage);
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Failed to delete item.";
      setActionStatus(msg);
    }
  };

  // -------- EVENTS EXPOSED TO UI --------
  const handleCreateClick = async () => {
    if (!title) {
      setActionStatus("Title is required.");
      return;
    }

    if (!isMfaRegistered) {
      setActionStatus(
        "You must register with MFA before creating items. A key will be generated now."
      );
      await openMfaKeyModal();
      return;
    }

    openOtpForCreate();
  };

  const startEdit = (item: Item) => {
    setEditingId(item._id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setActionStatus("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleUpdateItem = async (id: string) => {
    if (!editTitle) {
      setActionStatus("Title is required.");
      return;
    }

    setActionStatus("");

    try {
      await api.put<Item>(`/items/${id}`, {
        title: editTitle,
        description: editDescription,
      });

      setActionStatus("Item updated.");
      cancelEdit();
      fetchItems(currentPage);
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Failed to update item.";
      setActionStatus(msg);
    }
  };

  const handleDeleteClick = (id: string) => {
    if (!isMfaRegistered) {
      setActionStatus(
        "You must register with MFA before deleting items. A key will be generated now."
      );
      openMfaKeyModal();
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirmDelete) return;

    openOtpForDelete(id);
  };

  const goToPrevPage = () => {
    if (currentPage <= 1) return;
    fetchItems(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage >= totalPages) return;
    fetchItems(currentPage + 1);
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  // -------- JSX --------
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Dashboard</h2>
          <p className="dashboard-meta">Logged in as: {auth.email}</p>
          <p className="dashboard-meta">
            MFA Registered: {isMfaRegistered ? "Yes" : "No"}
          </p>
          <p className="dashboard-meta">
            MFA Verified (token): {auth.mfaVerified ? "Yes" : "No"}
          </p>
        </div>
        <Button onClick={onLogout}>Logout</Button>
      </div>

      <div className="dashboard-card">
        <h3 className="section-title">Create Item (requires MFA)</h3>
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Item title"
        />
        <TextInput
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Optional description"
        />
        <Button onClick={handleCreateClick}>Create Item</Button>
        {actionStatus && <p className="status-text">{actionStatus}</p>}
      </div>

      <div className="dashboard-card">
        <h3 className="section-title">Items</h3>

        {loadingItems ? (
          <p>Loading items...</p>
        ) : items.length === 0 ? (
          <p>No items found.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isEditing = editingId === item._id;
                    return (
                      <tr key={item._id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) =>
                                setEditTitle(e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.6)",
                                background: "rgba(15,23,42,0.9)",
                                color: "var(--text-main)",
                              }}
                            />
                          ) : (
                            item.title
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.6)",
                                background: "rgba(15,23,42,0.9)",
                                color: "var(--text-main)",
                              }}
                            />
                          ) : (
                            item.description || "-"
                          )}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItem(item._id)
                                }
                                className="row-button save"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="row-button cancel"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="row-button edit"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteClick(item._id)
                                }
                                className="row-button delete"
                              >
                                Delete
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

            <div className="pagination-bar">
              <div className="pagination-buttons">
                <button
                  type="button"
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
              <div>
                Page {currentPage} of {totalPages} &nbsp;|&nbsp; Total
                items: {totalItems}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 20,
              borderRadius: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>Register with MFA</h3>
              <button
                type="button"
                onClick={closeMfaKeyModal}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Use this 16-digit key in the{" "}
              <span style={{ fontWeight: 500 }}>Auth App</span>. Once
              registered there, you can login with OTP and perform
              protected actions.
            </p>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 20,
                letterSpacing: 3,
                margin: "10px 0",
                color: "var(--accent)",
              }}
            >
              {mfaKey}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleCopyKey}>Copy Key</Button>

              {AUTH_APP_URL && (
                <button
                  type="button"
                  onClick={handleOpenAuthApp}
                  className="row-button save"
                  style={{ minWidth: 120 }}
                >
                  Open Auth App
                </button>
              )}
            </div>

            {mfaStatus && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#c4b5fd",
                  whiteSpace: "pre-line",
                }}
              >
                {mfaStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              padding: 20,
              borderRadius: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Enter OTP</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Please enter the 6-digit OTP from your Auth App to continue.
            </p>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                marginBottom: 8,
                padding: 6,
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.9)",
                color: "var(--text-main)",
                textAlign: "center",
                letterSpacing: 4,
                fontSize: 18,
                fontFamily: "monospace",
              }}
            />
            {otpStatus && (
              <p
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#fca5a5",
                  whiteSpace: "pre-line",
                }}
              >
                {otpStatus}
              </p>
            )}
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={closeOtpModal}
                className="row-button cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyOtpAndRunAction}
                className="row-button save"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
