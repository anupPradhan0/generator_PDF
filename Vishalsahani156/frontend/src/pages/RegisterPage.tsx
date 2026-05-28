import { useState, type FocusEvent } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { InputField } from '../components/forms/InputField';
import { PasswordField } from '../components/forms/PasswordField';
import { Button } from '../components/common/Button';

const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Field is required' })
      .trim()
      .min(1, 'Field is required'),
    email: z
      .string({ required_error: 'Field is required' })
      .trim()
      .min(1, 'Field is required')
      .email('Invalid email address'),
    phone: z
      .string({ required_error: 'Field is required' })
      .trim()
      .min(1, 'Field is required')
      .regex(/^\d+$/, 'Invalid number')
      .max(12, 'Invalid number'),
    password: z
      .string({ required_error: 'Field is required' })
      .min(1, 'Field is required')
      .min(4, 'Minimum 4 characters required')
      .max(8, 'Maximum 8 characters allowed'),
    confirmPassword: z.string({ required_error: 'Field is required' }).min(1, 'Field is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

/** Stops browsers from pre-filling saved login/profile data on the register form. */
const withoutAutofill = (field: UseFormRegisterReturn) => ({
  ...field,
  readOnly: true,
  onFocus: (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.readOnly = false;
    field.onFocus(event);
  },
});

export const RegisterPage = () => {
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Register to start generating professional PDFs
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6" autoComplete="off">
            <InputField
              label="Full Name"
              autoComplete="off"
              {...withoutAutofill(register('name'))}
              error={errors.name?.message}
            />
            <InputField
              label="Email"
              type="email"
              autoComplete="off"
              {...withoutAutofill(register('email'))}
              error={errors.email?.message}
            />
            <InputField
              label="Phone Number"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              {...withoutAutofill(register('phone'))}
              error={errors.phone?.message}
            />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              visible={passwordsVisible}
              showToggle={false}
              {...withoutAutofill(register('password'))}
              error={errors.password?.message}
            />
            <PasswordField
              label="Confirm Password"
              autoComplete="new-password"
              visible={passwordsVisible}
              onVisibleChange={setPasswordsVisible}
              {...withoutAutofill(register('confirmPassword'))}
              error={errors.confirmPassword?.message}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Register
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
