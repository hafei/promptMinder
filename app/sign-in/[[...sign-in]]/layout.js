import { SITE_CONFIG } from '@/lib/site-config';

export const metadata = {
  title: "登录",
  description: `登录到 ${SITE_CONFIG.appName}。`,
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }) {
  return children;
}





