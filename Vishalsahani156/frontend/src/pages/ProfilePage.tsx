import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InputField } from '../components/forms/InputField';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi } from '../api/user.api';

const profileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length < 6) return false;
      if (data.password && data.password !== data.confirmPassword) return false;
      return true;
    },
    { message: 'Passwords must match and be at least 6 characters', path: ['confirmPassword'] }
  );

type ProfileForm = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, phone: user.phone });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const payload: { name?: string; phone?: string; password?: string } = {
        name: data.name,
        phone: data.phone,
      };
      if (data.password) payload.password = data.password;

      const { data: res } = await updateProfileApi(payload);
      const updated = res.data;
      updateUser({
        id: (updated as { _id?: string })._id || user!.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      });
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update profile';
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Email (cannot be changed)</p>
          <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
        >
          <InputField label="Full Name" {...register('name')} error={errors.name?.message} />
          <InputField label="Phone Number" {...register('phone')} error={errors.phone?.message} />
          <InputField
            label="New Password (optional)"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <InputField
            label="Confirm New Password"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" isLoading={isSubmitting}>
            Update Profile
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};
