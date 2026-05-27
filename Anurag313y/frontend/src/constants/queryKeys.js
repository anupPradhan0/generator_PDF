export const queryKeys = {
  auth: {
    all: ['auth'],
    me: ['auth', 'me'],
  },
  invoices: {
    all: ['invoices'],
    list: (page, limit) => ['invoices', 'list', { page, limit }],
    detail: (id) => ['invoices', 'detail', id],
  },
};
