export const APP_ROUTES = {
    ROOT: '/',
    AUTH: {
        LOGIN: '/login',
        SETUP_PASSWORD: '/setup-password',
        FORGOT_PASSWORD: '/forgot-password',
        RESET_PASSWORD: '/reset-password',
    },
    DASHBOARD: {
        ROOT: '/dashboard',
        RESULTS: 'results',
        SESSIONS: 'sessions/:id',
        VOUCHERS: 'vouchers',
        USERS: 'users',
        INSTITUTIONS: 'institutions/:id',
        SETTINGS: 'settings',
        ACTIVITY: 'activity',
    }
} as const;
