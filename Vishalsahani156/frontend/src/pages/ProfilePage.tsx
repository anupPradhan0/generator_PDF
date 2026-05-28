import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InputField } from '../components/forms/InputField';
import { PasswordField } from '../components/forms/PasswordField';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi } from '../api/user.api';

const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .regex(
        /^[A-Za-z]+$/,
        'Name must contain only letters (A–Z) and no numbers or special characters.'
      ),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    oldPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(
      data.oldPassword?.trim() || data.newPassword?.trim() || data.confirmNewPassword?.trim()
    );

    if (!wantsPasswordChange) return;

    if (!data.oldPassword?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Old password is required',
        path: ['oldPassword'],
      });
    }

    if (!data.newPassword?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New password is required',
        path: ['newPassword'],
      });
    } else {
      if (data.newPassword.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Minimum 4 characters required',
          path: ['newPassword'],
        });
      }
      if (data.newPassword.length > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Maximum 8 characters allowed',
          path: ['newPassword'],
        });
      }
    }

    if (!data.confirmNewPassword?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Confirm new password is required',
        path: ['confirmNewPassword'],
      });
    } else if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmNewPassword'],
      });
    }
  });

type ProfileForm = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone,
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const wantsPasswordChange = Boolean(
        data.oldPassword?.trim() ||
          data.newPassword?.trim() ||
          data.confirmNewPassword?.trim()
      );

      const { user: updated, message } = await updateProfileApi({
        name: data.name,
        phone: data.phone,
        ...(wantsPasswordChange
          ? {
              oldPassword: data.oldPassword,
              newPassword: data.newPassword,
              confirmNewPassword: data.confirmNewPassword,
            }
          : {}),
      });
      updateUser(updated);
      reset({
        name: updated.name,
        phone: updated.phone,
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      toast.success(message ?? 'Profile updated successfully!');
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
          <PasswordField
            label="Old Password"
            placeholder="Required to change password"
            visible={passwordsVisible}
            showToggle={false}
            {...register('oldPassword')}
            error={errors.oldPassword?.message}
          />
          <PasswordField
            label="New Password"
            placeholder="4–8 characters"
            visible={passwordsVisible}
            showToggle={false}
            {...register('newPassword')}
            error={errors.newPassword?.message}
          />
          <PasswordField
            label="Confirm New Password"
            visible={passwordsVisible}
            onVisibleChange={setPasswordsVisible}
            {...register('confirmNewPassword')}
            error={errors.confirmNewPassword?.message}
          />
          <Button type="submit" isLoading={isSubmitting}>
            Update Profile
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};
