
import { useState } from "react";
import {FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Link} from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";


function LoginPage() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState('password'); // 'password' or 'otp'
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const payload = {
                username: email,
                password,
            };

            const data = await authApi.login(payload);

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);

            // Determine role and redirect accordingly
            try {
                const me = await authApi.me()
                const roleStr = (me && me.role) || ''
                const rolesArr = Array.isArray(me?.roles) ? me.roles : []
                const isAdmin = String(roleStr).toLowerCase().includes('admin') || rolesArr.some(r => String(r).toLowerCase().includes('admin'))

                window.location.href = isAdmin ? '/admin' : '/music'
            } catch (err) {
                // If fetching profile fails, fallback to regular dashboard
                window.location.href = '/music'
            }

        } catch (err) {
            setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Vui lòng nhập email.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.requestLoginOtp({ email: email });
            setOtpRequested(true);
        } catch (err) {
            setError(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!email || !otpCode) {
            setError('Vui lòng nhập email và mã OTP.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await authApi.verifyLoginOtp({ email: email, otp: otpCode });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            try {
                const me = await authApi.me()
                const roleStr = (me && me.role) || ''
                const rolesArr = Array.isArray(me?.roles) ? me.roles : []
                const isAdmin = String(roleStr).toLowerCase().includes('admin') || rolesArr.some(r => String(r).toLowerCase().includes('admin'))

                window.location.href = isAdmin ? '/admin' : '/music'
            } catch (err) {
                window.location.href = '/music'
            }
        } catch (err) {
            setError(err.message || 'Xác thực OTP thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }



    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="flex items-center justify-center p-4 pt-10">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-600 mb-2">MusicFlow</h1>
            <p className="text-gray-600">Đăng nhập để phát nhạc</p>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="text-sm">
                    <button
                        type="button"
                        onClick={() => { setMode('password'); setOtpRequested(false); setError(null); }}
                        className={`mr-3 ${mode === 'password' ? 'font-semibold text-red-600' : 'text-gray-600'}`}
                    >
                        Mật khẩu
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('otp'); setError(null); }}
                        className={`${mode === 'otp' ? 'font-semibold text-red-600' : 'text-gray-600'}`}
                    >
                        Đăng nhập bằng OTP
                    </button>
                </div>
            </div>

            {mode === 'password' && (
                <form onSubmit={handleLogin} className="space-y-6">
            <FieldGroup>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                />
            </FieldGroup>

            <FieldGroup>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <div className="relative">
                    <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-11"
                    required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                        disabled={isLoading}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </FieldGroup>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
                </div>
            )}

            <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
                disabled={isLoading}
            >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
                </form>
            )}

            {mode === 'otp' && (
                <div>
                    <form onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp} className="space-y-6">
                        <FieldGroup>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </FieldGroup>

                        {otpRequested && (
                            <FieldGroup>
                                <FieldLabel htmlFor="otp">Mã OTP</FieldLabel>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="Nhập mã OTP"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </FieldGroup>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
                            disabled={isLoading}
                        >
                            {isLoading ? (otpRequested ? 'Xác thực...' : 'Gửi mã...') : (otpRequested ? 'Xác thực OTP' : 'Gửi mã OTP')}
                        </Button>
                    </form>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => { setMode('password'); setOtpRequested(false); setError(null); }}
                            className="text-sm text-gray-600 hover:text-red-600"
                        >
                            Quay lại đăng nhập bằng mật khẩu
                        </button>
                    </div>
                </div>
            )}

            <p className="text-center mt-6 text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/signup" className="text-red-600 hover:text-red-700 font-semibold">
                Đăng ký ngay
            </Link>
            </p>
        </div>
        </div>
        </div>
    );
}

export default LoginPage;