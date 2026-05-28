import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { InputField } from '../components/forms/InputField';
import { Button } from '../components/common/Button';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

const schema = z
  .object({
    username: z.string().trim().min(2, 'Username is required').max(50),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(6, 'Minimum 6 characters required').max(100),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    registrationKey: z.string().trim().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Form = z.infer<typeof schema>;

export const SuperAdminRegisterPage = () => {
  const { register: registerAdmin } = useSuperAdminAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await registerAdmin({
        username: data.username,
        email: data.email,
        password: data.password,
        registrationKey: data.registrationKey?.trim() || undefined,
      });
      toast.success('Super Admin created successfully!');
      navigate('/super-admin/dashboard');
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Super Admin</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Register a Super Admin account (may require a registration key)
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <InputField label="Username" {...register('username')} error={errors.username?.message} />
            <InputField label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <InputField
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            <InputField
              label="Confirm Password"
              type="password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            <InputField
              label="Registration Key (optional)"
              {...register('registrationKey')}
              error={errors.registrationKey?.message}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Register
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have a Super Admin?{' '}
            <Link to="/super-admin/login" className="font-medium text-primary-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

