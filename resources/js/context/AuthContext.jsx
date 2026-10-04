import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, errorMessage } from '../api';

const AuthContext = createContext();

// Rol bazlı yetki: yönetici (patron/müdür) tüm ekranlar; garson masalar, mutfak ekranı, QR kodlar
export const MANAGER_ROLES = ['patron', 'mudur'];

export const AuthProvider = ({ children }) => {
    // Açılışta oturum yok: önce şifre ekranı gelir (oturum kalıcı saklanmaz, bkz. api.js)
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    // API 401 döndüğünde (token geçersiz/süresi dolmuş) oturumu kapat → giriş ekranı açılır
    useEffect(() => {
        const handleUnauthorized = () => {
            setUser(null);
            setToken(null);
        };
        window.addEventListener('unopia:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unopia:unauthorized', handleUnauthorized);
    }, []);

    const login = async (pin) => {
        setLoading(true);
        try {
            const data = await apiService.login(pin);
            setUser(data.user);
            setToken(data.token);
            return { success: true, user: data.user };
        } catch (error) {
            return {
                success: false,
                message:
                    error.response?.status === 429
                        ? 'Çok fazla hatalı deneme. Lütfen bir dakika sonra tekrar deneyin.'
                        : errorMessage(error, 'Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.'),
            };
        } finally {
            setLoading(false);
        }
    };

    // Çıkış anında giriş ekranına döner; sunucudaki oturum (token) iptali arkada tamamlanır
    const logout = async () => {
        const revoke = apiService.logout();
        setUser(null);
        setToken(null);
        await revoke;
    };

    const isManager = MANAGER_ROLES.includes(user?.role);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!token, isManager }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
