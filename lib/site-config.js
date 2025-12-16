export const SITE_CONFIG = {
    // App Name
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'PromptMinder',

    // App Logo URL (relative to public directory or absolute URL)
    appLogo: process.env.NEXT_PUBLIC_APP_LOGO || '/logo2.png',

    // App Favicon URL (relative to public directory or absolute URL)
    appFavicon: process.env.NEXT_PUBLIC_APP_FAVICON || '/favicon.ico',

    // Logo Dimensions (in pixels)
    appLogoWidth: parseInt(process.env.NEXT_PUBLIC_APP_LOGO_WIDTH || '40'),
    appLogoHeight: parseInt(process.env.NEXT_PUBLIC_APP_LOGO_HEIGHT || '40'),

    // Footer description
    footerDescription: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Make AI prompt management simpler and more efficient...',
};
