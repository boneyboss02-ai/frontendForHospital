// const BASE_URL = '/api';
const BASE_URL = "https://backendforhospital-1.onrender.com/api";

function getToken() {
  return localStorage.getItem('wardline_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    Object.assign(error, data); // e.g. requires_verification, user_id — existing `.message` reads are unaffected
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request('/auth/me'),
  registerPatient: (payload) =>
    request('/auth/register-patient', { method: 'POST', body: payload, auth: false }),
  verifyEmail: (user_id, code) =>
    request('/auth/verify-email', { method: 'POST', body: { user_id, code }, auth: false }),
  resendVerificationCode: (user_id) =>
    request('/auth/resend-verification-code', { method: 'POST', body: { user_id }, auth: false }),
  changePassword: (current_password, new_password) =>
    request('/auth/me/password', { method: 'PATCH', body: { current_password, new_password } }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, new_password) =>
    request('/auth/reset-password', { method: 'POST', body: { token, new_password }, auth: false }),

  patients: {
    list: (search) => request(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id) => request(`/patients/${id}`),
    create: (payload) => request('/patients', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/patients/${id}`, { method: 'PUT', body: payload }),
    invite: (id, payload) => request(`/patients/${id}/invite`, { method: 'POST', body: payload }),
  },

  appointments: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/appointments${qs ? `?${qs}` : ''}`);
    },
    create: (payload) => request('/appointments', { method: 'POST', body: payload }),
    updateStatus: (id, status) =>
      request(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
    addConsultation: (id, payload) => request(`/appointments/${id}/consultation`, { method: 'POST', body: payload }),
    availability: (doctor_id, date) =>
      request(`/appointments/availability?doctor_id=${encodeURIComponent(doctor_id)}&date=${encodeURIComponent(date)}`),
  },

  staff: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/staff${qs ? `?${qs}` : ''}`);
    },
    getAvailability: (doctorId) => request(`/staff/${doctorId}/availability`),
    addAvailability: (doctorId, payload) => request(`/staff/${doctorId}/availability`, { method: 'POST', body: payload }),
    deleteAvailability: (doctorId, availabilityId) =>
      request(`/staff/${doctorId}/availability/${availabilityId}`, { method: 'DELETE' }),
  },

  lab: {
    orders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/lab/orders${qs ? `?${qs}` : ''}`);
    },
    createOrder: (payload) => request('/lab/orders', { method: 'POST', body: payload }),
    getOrder: (id) => request(`/lab/orders/${id}`),
    addResult: (id, { result_text, file }) => {
      const formData = new FormData();
      if (result_text) formData.append('result_text', result_text);
      if (file) formData.append('file', file);
      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      return fetch(`${BASE_URL}/lab/orders/${id}/results`, { method: 'POST', headers, body: formData })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
          return data;
        });
    },
    fileUrl: (resultId) => `${BASE_URL}/lab/results/${resultId}/file`,
    // Plain <a href> tags can't send the Authorization header this API
    // needs, so downloads/views go through fetch + a blob URL instead.
    openFile: async (resultId) => {
      const token = getToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/lab/results/${resultId}/file`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Could not load file (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  },

  pharmacy: {
    medicines: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/pharmacy/medicines${qs ? `?${qs}` : ''}`);
    },
    createMedicine: (payload) => request('/pharmacy/medicines', { method: 'POST', body: payload }),
    adjustStock: (id, delta) => request(`/pharmacy/medicines/${id}/stock`, { method: 'PATCH', body: { delta } }),

    prescriptions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/pharmacy/prescriptions${qs ? `?${qs}` : ''}`);
    },
    createPrescription: (payload) => request('/pharmacy/prescriptions', { method: 'POST', body: payload }),
    getPrescription: (id) => request(`/pharmacy/prescriptions/${id}`),
    dispenseItem: (itemId, quantity) =>
      request(`/pharmacy/prescription-items/${itemId}/dispense`, { method: 'PATCH', body: { quantity } }),
  },

  billing: {
    invoices: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/billing/invoices${qs ? `?${qs}` : ''}`);
    },
    createInvoice: (payload) => request('/billing/invoices', { method: 'POST', body: payload }),
    getInvoice: (id) => request(`/billing/invoices/${id}`),
    addItem: (invoiceId, payload) => request(`/billing/invoices/${invoiceId}/items`, { method: 'POST', body: payload }),
    addPayment: (invoiceId, payload) => request(`/billing/invoices/${invoiceId}/payments`, { method: 'POST', body: payload }),
  },

  inpatient: {
    beds: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/inpatient/beds${qs ? `?${qs}` : ''}`);
    },
    wards: () => request('/inpatient/wards'),
    updateBedStatus: (id, status) => request(`/inpatient/beds/${id}/status`, { method: 'PATCH', body: { status } }),
    admissions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/inpatient/admissions${qs ? `?${qs}` : ''}`);
    },
    admit: (payload) => request('/inpatient/admissions', { method: 'POST', body: payload }),
    discharge: (id, discharge_summary) =>
      request(`/inpatient/admissions/${id}/discharge`, { method: 'PATCH', body: { discharge_summary } }),
  },

  portal: {
    me: () => request('/portal/me'),
    updateMe: (payload) => request('/portal/me', { method: 'PUT', body: payload }),
    appointments: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/portal/appointments${qs ? `?${qs}` : ''}`);
    },
    bookAppointment: (payload) => request('/portal/appointments', { method: 'POST', body: payload }),
    cancelAppointment: (id) => request(`/portal/appointments/${id}/cancel`, { method: 'PATCH' }),
    labResults: () => request('/portal/lab-results'),
    getLabResult: (id) => request(`/portal/lab-results/${id}`),
    prescriptions: () => request('/portal/prescriptions'),
    getPrescription: (id) => request(`/portal/prescriptions/${id}`),
    invoices: () => request('/portal/invoices'),
    getInvoice: (id) => request(`/portal/invoices/${id}`),
  },

  notifications: {
    list: (unreadOnly) => request(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  },

  shifts: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/shifts${qs ? `?${qs}` : ''}`);
    },
    create: (payload) => request('/shifts', { method: 'POST', body: payload }),
    remove: (id) => request(`/shifts/${id}`, { method: 'DELETE' }),
  },
};

export { getToken };
