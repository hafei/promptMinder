/**
 * Email domain validation utility
 * Restricts email addresses to allowed domains
 */

// Allowed email domains (configurable via environment variable)
const ALLOWED_DOMAINS = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS
    ? process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase())
    : ['dev.zo'];

/**
 * Validates if an email address belongs to an allowed domain
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email domain is allowed
 */
export function isEmailDomainAllowed(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split('@')[1];

    if (!emailDomain) {
        return false;
    }

    return ALLOWED_DOMAINS.includes(emailDomain);
}

/**
 * Gets the list of allowed email domains
 * @returns {string[]} - Array of allowed domains
 */
export function getAllowedDomains() {
    return [...ALLOWED_DOMAINS];
}

/**
 * Gets a human-readable error message for domain restriction
 * @returns {string} - Error message
 */
export function getDomainRestrictionMessage() {
    if (ALLOWED_DOMAINS.length === 1) {
        return `只允许使用 @${ALLOWED_DOMAINS[0]} 邮箱注册`;
    }
    return `只允许使用以下域名的邮箱: ${ALLOWED_DOMAINS.map(d => '@' + d).join(', ')}`;
}
