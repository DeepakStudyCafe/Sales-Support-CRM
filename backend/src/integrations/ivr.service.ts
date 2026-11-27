import axios, { AxiosInstance } from 'axios';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { getPool } from '../config/database';

export interface ClickToCallResult {
  success: boolean;
  callId?: string;
  message?: string;
  rawResponse?: unknown;
}

export interface CallLogEntry {
  callId: string;
  callerNumber: string;
  customerNumber: string;
  agentExtension: string;
  did: string;
  duration?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
  recordingUrl?: string;
  direction: 'inbound' | 'outbound';
}

export interface DialerStatusChangeResult {
  success: boolean;
  message?: string;
}

export class IVRService {
  private client: AxiosInstance;
  private token: string;
  private baseUrl: string;
  private did: string;

  constructor() {
    this.token = env.IVR_API_TOKEN ?? '';
    this.baseUrl = (env.IVR_API_BASE_URL ?? 'https://api.ivrsolutions.in').replace(/\/+$/, '');
    this.did = env.IVR_DID_NUMBER ?? '01140005000';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Logging interceptors
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('IVR Solutions API response', {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.warn('IVR Solutions API warning/error', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Dynamically fetch latest credentials from environment or DB settings table.
   * This ensures that whenever the user updates the token in .env or Settings, it works instantly.
   */
  async getCredentials(): Promise<{ token: string; baseUrl: string; did: string }> {
    let token = env.IVR_API_TOKEN || this.token || '';
    let baseUrl = env.IVR_API_BASE_URL || this.baseUrl || 'https://api.ivrsolutions.in';
    let did = env.IVR_DID_NUMBER || this.did || '01140005000';

    try {
      const pool = getPool();
      const res = await pool.request().query<{ key: string; value: string }>(`
        SELECT [key], [value] FROM settings WHERE [key] IN ('ivr_token', 'ivr_base_url', 'ivr_did_number')
      `);
      res.recordset.forEach((row) => {
        if (row.key === 'ivr_token' && row.value && row.value !== '••••••••••••••••' && row.value.trim().length > 5) {
          token = row.value.trim();
        }
        if (row.key === 'ivr_base_url' && row.value && row.value.trim().startsWith('http')) {
          baseUrl = row.value.trim().replace(/\/+$/, '');
        }
        if (row.key === 'ivr_did_number' && row.value && row.value.trim()) {
          did = row.value.trim();
        }
      });
    } catch {
      // Database not ready or table empty; fall back to environment variables
    }

    if (token) this.token = token;
    if (baseUrl) this.baseUrl = baseUrl;
    if (did) this.did = did;

    return { token, baseUrl, did };
  }

  get isConfigured(): boolean {
    return !!(this.token && this.token.length > 5);
  }

  /**
   * Helper to build auth headers
   */
  private getHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Click-to-Call (C2C): Initiates a bridge call between agent extension and customer phone.
   * Endpoint: POST /api/c2c_post (fallback: GET /api/c2c_get)
   * Official Parameters: token, did, ext_no, phone, custom_id
   */
  async initiateClickToCall(params: {
    agentExtension: string;
    did?: string;
    customerPhone: string;
    customId?: string;
  }): Promise<ClickToCallResult> {
    const creds = await this.getCredentials();
    if (!creds.token) {
      return {
        success: false,
        message: 'IVR API Token is not configured. Please set IVR_API_TOKEN in backend/.env or under Settings -> Calling.',
      };
    }

    // Clean phone number: 10 digits without leading +91, 91 or 0
    let cleanPhone = params.customerPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.length > 10 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1);
    }

    const did = params.did || creds.did;
    const extNo = params.agentExtension || '101';
    const payload = {
      token: creds.token,
      did,
      ext_no: extNo,
      phone: cleanPhone,
      custom_id: params.customId || undefined,
    };

    const headers = this.getHeaders(creds.token);

    // 1. Try standard GET /api/c2c_get with query parameters
    try {
      const response = await axios.get(`${creds.baseUrl}/api/c2c_get`, {
        params: payload,
        headers,
        timeout: 15000,
      });

      const data = response.data;
      if (data?.status === 'success' || data?.status === 200 || data?.Success === true || response.status === 200) {
        return {
          success: true,
          callId: data?.call_id ?? data?.CallId ?? data?.unique_id ?? data?.data?.call_id,
          message: data?.message ?? 'Call initiated successfully via IVR Solutions bridge',
          rawResponse: data,
        };
      }
    } catch (getErr: any) {
      const getResp = getErr.response?.data;
      if (getResp?.message === 'Token Invalid' || getResp?.status === 401) {
        return {
          success: false,
          message: 'Invalid IVR Solutions API Token. Please check your token in backend/.env',
          rawResponse: getResp,
        };
      }
      logger.debug('GET /api/c2c_get returned non-success, trying POST /api/c2c_post fallback', {
        error: getErr.message,
      });
    }

    // 2. Fallback to POST /api/c2c_post
    try {
      const response = await axios.post(`${creds.baseUrl}/api/c2c_post`, payload, {
        headers,
        timeout: 15000,
      });

      const data = response.data;
      if (data?.status === 'success' || data?.status === 200 || data?.Success === true || response.status === 200) {
        return {
          success: true,
          callId: data?.call_id ?? data?.CallId ?? data?.unique_id ?? data?.data?.call_id,
          message: data?.message ?? 'Call initiated successfully via IVR Solutions bridge',
          rawResponse: data,
        };
      } else {
        return {
          success: false,
          message: data?.message ?? data?.error ?? 'Call initiation failed from IVR Solutions',
          rawResponse: data,
        };
      }
    } catch (postErr: any) {
      const msg = postErr.response?.data?.message || postErr.response?.data?.error || postErr.message;
      logger.error('Click-to-Call failed', { error: msg, params });
      return { success: false, message: `IVR Solutions call error: ${msg}` };
    }
  }

  /**
   * Fetch Call Logs & Recordings (CDR)
   * Endpoint: POST /api/call_logs (fallback: GET /api/call_logs)
   * Parameters: token, from_date, to_date, phone, type (inbound/outbound)
   */
  async getCallLogs(params: {
    fromDate: string;
    toDate: string;
    phone?: string;
    direction?: 'inbound' | 'outbound';
  }): Promise<CallLogEntry[]> {
    const creds = await this.getCredentials();
    if (!creds.token) return [];

    const requestData = {
      token: creds.token,
      from_date: params.fromDate,
      to_date: params.toDate,
      phone: params.phone,
      type: params.direction,
    };
    const headers = this.getHeaders(creds.token);

    let rawLogs: any[] = [];

    // Try POST
    try {
      const response = await axios.post(`${creds.baseUrl}/api/call_logs`, requestData, {
        headers,
        timeout: 15000,
      });
      const data = response.data;
      rawLogs = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    } catch {
      // Fallback to GET
      try {
        const response = await axios.get(`${creds.baseUrl}/api/call_logs`, {
          params: requestData,
          headers,
          timeout: 15000,
        });
        const data = response.data;
        rawLogs = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      } catch (getErr: any) {
        logger.error('Failed to fetch call logs from IVR Solutions', { error: getErr.message });
        return [];
      }
    }

    return rawLogs.map((log: Record<string, any>) => ({
      callId: String(log.call_id || log.unique_id || log.id || ''),
      callerNumber: String(log.caller_no || log.from || log.caller || ''),
      customerNumber: String(log.customer_no || log.phone || log.to || ''),
      agentExtension: String(log.ext_no || log.agent_ext || ''),
      did: String(log.did || ''),
      duration: typeof log.duration === 'number' ? log.duration : parseInt(log.duration || '0', 10),
      status: String(log.status || 'completed'),
      startTime: String(log.start_time || log.created_at || ''),
      endTime: String(log.end_time || ''),
      recordingUrl: String(log.recording_url || log.recording || log.record_file || ''),
      direction: (log.direction || params.direction || 'outbound') as 'inbound' | 'outbound',
    }));
  }

  /**
   * Fetch Click-to-Call Logs
   * Endpoint: GET or POST /api/ctc_logs
   */
  async getCTCLogs(params: {
    fromDate: string;
    toDate: string;
    phone?: string;
    agentExtension?: string;
  }): Promise<CallLogEntry[]> {
    const creds = await this.getCredentials();
    if (!creds.token) return [];

    const requestData = {
      token: creds.token,
      from_date: params.fromDate,
      to_date: params.toDate,
      phone: params.phone,
      ext_no: params.agentExtension,
    };
    const headers = this.getHeaders(creds.token);

    let rawLogs: any[] = [];
    try {
      const response = await axios.get(`${creds.baseUrl}/api/ctc_logs`, {
        params: requestData,
        headers,
        timeout: 15000,
      });
      const data = response.data;
      rawLogs = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    } catch {
      try {
        const response = await axios.post(`${creds.baseUrl}/api/ctc_logs`, requestData, {
          headers,
          timeout: 15000,
        });
        const data = response.data;
        rawLogs = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      } catch (err: any) {
        logger.error('Failed to fetch CTC logs', { error: err.message });
        return [];
      }
    }

    return rawLogs.map((log: Record<string, any>) => ({
      callId: String(log.call_id || log.unique_id || log.id || ''),
      callerNumber: String(log.caller_no || log.from || ''),
      customerNumber: String(log.customer_no || log.phone || log.to || ''),
      agentExtension: String(log.ext_no || params.agentExtension || ''),
      did: String(log.did || ''),
      duration: typeof log.duration === 'number' ? log.duration : parseInt(log.duration || '0', 10),
      status: String(log.status || 'completed'),
      startTime: String(log.start_time || log.created_at || ''),
      endTime: String(log.end_time || ''),
      recordingUrl: String(log.recording_url || log.recording || ''),
      direction: 'outbound',
    }));
  }

  /**
   * Register Webhook URL with IVR Solutions
   * Endpoint: POST /api/add_webhook_url
   */
  async registerWebhook(webhookUrl: string, secretKey?: string): Promise<{ success: boolean; message: string }> {
    const creds = await this.getCredentials();
    if (!creds.token) {
      return { success: false, message: 'IVR API Token is not configured.' };
    }

    try {
      const response = await axios.post(
        `${creds.baseUrl}/api/add_webhook_url`,
        {
          token: creds.token,
          webhookurl: webhookUrl,
          secret_key: secretKey || 'ivr_crm_secret',
        },
        { headers: this.getHeaders(creds.token), timeout: 15000 }
      );

      const data = response.data;
      return {
        success: data?.status === 'success' || response.status === 200,
        message: data?.message || 'Webhook successfully registered with IVR Solutions',
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, message: `Webhook registration failed: ${msg}` };
    }
  }

  /**
   * Change dialer campaign status (start/pause/stop)
   * Endpoint: POST /api/change_dialer_status
   */
  async changeDialerStatus(dialerId: string, status: 'start' | 'pause' | 'stop'): Promise<DialerStatusChangeResult> {
    const creds = await this.getCredentials();
    if (!creds.token) {
      return { success: false, message: 'IVR API Token not configured' };
    }

    try {
      const response = await axios.post(
        `${creds.baseUrl}/api/change_dialer_status`,
        {
          token: creds.token,
          dialer_id: dialerId,
          status,
        },
        { headers: this.getHeaders(creds.token), timeout: 15000 }
      );

      const data = response.data;
      return {
        success: data?.status === 'success' || response.status === 200,
        message: data?.message || `Dialer campaign status changed to ${status}`,
      };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Add phone numbers to an active dialer campaign
   * Endpoint: POST /api/add_to_dialer
   */
  async addToDialer(dialerId: string, phones: string[]): Promise<boolean> {
    const creds = await this.getCredentials();
    if (!creds.token) return false;

    try {
      const response = await axios.post(
        `${creds.baseUrl}/api/add_to_dialer`,
        {
          token: creds.token,
          dialer_id: dialerId,
          phones: phones.join(','),
        },
        { headers: this.getHeaders(creds.token), timeout: 15000 }
      );

      return response.data?.status === 'success' || response.status === 200;
    } catch (error) {
      logger.error('Failed to add contacts to IVR dialer', { error: (error as Error).message, dialerId });
      return false;
    }
  }

  /**
   * Toggle IVR agent status (active/inactive)
   * Endpoint: POST /api/toggle_agent_status
   */
  async toggleAgentStatus(agentId: string, status: 'active' | 'inactive'): Promise<boolean> {
    const creds = await this.getCredentials();
    if (!creds.token) return false;

    try {
      const response = await axios.post(
        `${creds.baseUrl}/api/toggle_agent_status`,
        {
          token: creds.token,
          agent_id: agentId,
          status,
        },
        { headers: this.getHeaders(creds.token), timeout: 15000 }
      );

      return response.data?.status === 'success' || response.status === 200;
    } catch (error) {
      logger.error('Failed to toggle agent status', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Test IVR API connection with https://api.ivrsolutions.in
   */
  async testConnection(): Promise<{ connected: boolean; message: string; baseUrl: string }> {
    const creds = await this.getCredentials();
    if (!creds.token) {
      return {
        connected: false,
        message: 'IVR API Token is not configured. Please add IVR_API_TOKEN to backend/.env or under Settings -> Calling.',
        baseUrl: creds.baseUrl,
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${creds.baseUrl}/api/call_logs`, {
        params: {
          token: creds.token,
          from_date: today,
          to_date: today,
        },
        headers: this.getHeaders(creds.token),
        timeout: 12000,
      });

      if (response.status === 200) {
        return {
          connected: true,
          message: 'IVR Solutions API gateway is reachable and token is authenticated successfully.',
          baseUrl: creds.baseUrl,
        };
      } else {
        return {
          connected: false,
          message: `IVR API returned status code ${response.status}`,
          baseUrl: creds.baseUrl,
        };
      }
    } catch (error: any) {
      const respData = error.response?.data;
      if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        respData?.status === 401 ||
        respData?.message === 'Token Invalid' ||
        String(respData?.message).toLowerCase().includes('token')
      ) {
        return {
          connected: false,
          message: 'Invalid IVR Solutions API Token. Please check and copy your valid token from ivrsolutions.in dashboard (Settings -> API Token).',
          baseUrl: creds.baseUrl,
        };
      }
      return {
        connected: false,
        message: respData?.message || error.message || 'Connection to https://api.ivrsolutions.in timed out',
        baseUrl: creds.baseUrl,
      };
    }
  }
}

export const ivrService = new IVRService();
