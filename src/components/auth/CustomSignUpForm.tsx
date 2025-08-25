/** @jsxImportSource react */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const CustomSignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/admin/dashboard', // Redirect after email confirmation
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Sign up successful! Please check your email to confirm your account.');
      navigate('/login'); // Redirect to login after successful sign-up to await email confirmation
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="pl-4 border" {/* Added border class */}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pl-4 pr-10 border" {/* Added border class */}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute inset-y-0 right-0 my-auto mr-1 h-8 w-8 p-0"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="pl-4 pr-10 border" {/* Added border class */}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute inset-y-0 right-0 my-auto mr-1 h-8 w-8 p-0"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={loading}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </form>
  );
};

export default CustomSignUpForm;