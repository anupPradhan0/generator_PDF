import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvoice,
  deleteInvoice,
  fetchInvoiceById,
  fetchInvoices,
  updateInvoice,
} from '../api/invoicesApi';
import { queryKeys } from '../constants/queryKeys';
import { getApiErrorMessage } from './useAuthQueries';

export { getApiErrorMessage };

export const useInvoicesQuery = (page = 1, limit = 10, enabled = true) =>
  useQuery({
    queryKey: queryKeys.invoices.list(page, limit),
    queryFn: () => fetchInvoices({ page, limit }),
    enabled,
    placeholderData: (previousData) => previousData,
  });

export const useInvoiceQuery = (id, enabled = true) =>
  useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => fetchInvoiceById(id),
    enabled: Boolean(id) && enabled,
  });

export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
};

export const useUpdateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(variables.id),
      });
    },
  });
};

export const useDeleteInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
};
