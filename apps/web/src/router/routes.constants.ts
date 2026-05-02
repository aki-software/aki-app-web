export const APP_ROUTES = {
    ROOT: '/',
    AUTH: {
        LOGIN: '/login',
        SETUP_PASSWORD: '/setup-password',
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