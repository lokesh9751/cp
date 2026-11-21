import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Sign Up - Competitive Pirates',
  description: 'Create a new Competitive Pirates account.',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}