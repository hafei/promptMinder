import { SITE_CONFIG } from '@/lib/site-config';

export const metadata = {
  title: "注册",
  description: `创建一个 ${SITE_CONFIG.appName} 账户。`,
  robots: { index: false, follow: false },
};

export default function SignUpLayout({ children }) {
  return children;
}





