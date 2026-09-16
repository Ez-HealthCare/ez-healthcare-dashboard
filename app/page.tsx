"use client";

import { useState } from "react";

interface SanitizedUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authentication state
  const [authData, setAuthData] = useState<AuthResponse | null>(null);
  const [oldRefreshToken, setOldRefreshToken] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<SanitizedUser | null>(null);

  const API_URL = "http://localhost:3000/api";

  const handleFillTestAccount = () => {
    setEmail("admin@ezhealthcare.com");
    setPassword("Admin@123456");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      setAuthData(data);
      setSuccessMessage("Đăng nhập thành công!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kết nối đến máy chủ API";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!authData?.refreshToken) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save old refresh token to test replay attack detection later if desired
      setOldRefreshToken(authData.refreshToken);

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: authData.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Làm mới token thất bại");
      }

      setAuthData(data);
      setSuccessMessage("Làm mới token thành công! (Refresh Token Rotation đã cấp cặp token mới)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi làm mới token";
      setError(message);
      if (message.includes("thu hồi") || message.includes("hết hạn")) {
        setAuthData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestReplayAttack = async () => {
    if (!oldRefreshToken) {
      setError(
        "Vui lòng nhấn 'Làm mới Token' ít nhất 1 lần trước để tạo ra một token cũ đã bị thu hồi."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: oldRefreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Yêu cầu bị từ chối");
      }

      setAuthData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi Replay Attack";
      setError(
        `[Mô phỏng Replay Attack]: Server đã phát hiện tái sử dụng token cũ! Chi tiết: "${message}" -> Toàn bộ phiên đăng nhập đã bị huỷ.`
      );
      setAuthData(null);
      setOldRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchProfile = async () => {
    if (!authData?.accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authData.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể truy cập Protected API");
      }

      setProfileResult(data);
      setSuccessMessage("Đã xác thực thành công qua Bearer Access Token!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi truy cập Protected API";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (authData?.refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: authData.refreshToken }),
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    setAuthData(null);
    setOldRefreshToken(null);
    setProfileResult(null);
    setSuccessMessage("Đã đăng xuất thành công.");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container chính */}
      <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 shadow-2xl rounded-2xl p-8 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Ez-HealthCare Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            JWT Authentication với Refresh Token Rotation & Reuse Detection (Auth0 Concept)
          </p>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-sm flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* MÀN HÌNH 1: FORM LOGIN KHI CHƯA ĐĂNG NHẬP */}
        {!authData ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Đăng nhập tài khoản</h2>
              <button
                type="button"
                onClick={handleFillTestAccount}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 transition cursor-pointer"
              >
                ✨ Điền nhanh tài khoản Test
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ezhealthcare.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng Nhập"
                )}
              </button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">
                Thông tin tài khoản kiểm thử mặc định:
              </div>
              <div>
                • Email: <code className="text-blue-300 font-mono">admin@ezhealthcare.com</code>
              </div>
              <div>
                • Mật khẩu: <code className="text-blue-300 font-mono">Admin@123456</code>
              </div>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH 2: TRẠNG THÁI ĐÃ ĐĂNG NHẬP THÀNH CÔNG */
          <div className="space-y-6">
            {/* Header trạng thái */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold text-sm">
                  Đã xác thực danh tính
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-700/60 text-xs font-medium transition cursor-pointer"
              >
                🚪 Đăng xuất
              </button>
            </div>

            {/* Thông tin người dùng ("đây là ai" - tuyệt đối không để lộ thông tin nhạy cảm) */}
            <div className="bg-slate-950/60 border border-slate-700/80 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>👤</span> Thông tin người dùng (User Identity)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <span className="text-slate-400 block text-xs">Họ và tên:</span>
                  <span className="font-semibold text-white">
                    {authData.user.name || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <span className="text-slate-400 block text-xs">Email:</span>
                  <span className="font-semibold text-blue-300">{authData.user.email}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <span className="text-slate-400 block text-xs">User ID:</span>
                  <span className="font-mono text-xs text-slate-300">{authData.user.id}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <span className="text-slate-400 block text-xs">Trạng thái:</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                    {authData.user.isActive ? "Đang hoạt động" : "Đã khóa"}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Token Display */}
            <div className="bg-slate-950/60 border border-slate-700/80 rounded-xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>🔑</span> Access Token (Bearer JWT)
                </h3>
                <button
                  onClick={() => navigator.clipboard.writeText(authData.accessToken)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  Sao chép token
                </button>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-amber-200/90 break-all max-h-28 overflow-y-auto select-all">
                {authData.accessToken}
              </div>
            </div>

            {/* Các nút hành động kiểm thử Auth0 Concept */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Thao tác kiểm thử tính năng bảo mật:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nút 1: Test Protected API */}
                <button
                  onClick={handleFetchProfile}
                  disabled={loading}
                  className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <span>🛡️</span> Gọi API Protected (/profile)
                </button>

                {/* Nút 2: Refresh Token Rotation */}
                <button
                  onClick={handleRefreshToken}
                  disabled={loading}
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <span>🔄</span> Refresh Token Rotation (RTR)
                </button>
              </div>

              {/* Nút 3: Mô phỏng Replay Attack */}
              {oldRefreshToken && (
                <button
                  onClick={handleTestReplayAttack}
                  disabled={loading}
                  className="w-full p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 text-amber-200 text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <span>🚨</span> Mô phỏng Replay Attack (Tái sử dụng token cũ để kích hoạt Reuse
                  Detection)
                </button>
              )}
            </div>

            {/* Profile Result Display if called */}
            {profileResult && (
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 space-y-2 text-xs">
                <div className="font-semibold text-blue-300">
                  Dữ liệu trả về từ Protected Endpoint <code>/api/auth/profile</code>:
                </div>
                <pre className="text-slate-300 bg-slate-900 p-2.5 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(profileResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
