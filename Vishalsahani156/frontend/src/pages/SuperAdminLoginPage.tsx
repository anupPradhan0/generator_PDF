import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { InputField } from '../components/forms/InputField';
import { Button } from '../components/common/Button';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type Form = z.infer<typeof schema>;

export const SuperAdminLoginPage = () => {
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password);
      toast.success('Signed in as Super Admin');
      navigate('/super-admin/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Sign In</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Access the Super Admin dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <InputField label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <InputField
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Login
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Need to create a Super Admin?{' '}
            <Link to="/super-admin/register" className="font-medium text-primary-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

