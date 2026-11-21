import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Log In - Competitive Pirates',
  description: 'Log in to your Competitive Pirates account.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}