import axios, { AxiosInstance } from 'axios';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

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
  private subdomain: string;
  private baseUrl: string;

  constructor() {
    this.token = env.IVR_API_TOKEN ?? '';
    this.subdomain = env.IVR_SUBDOMAIN ?? '';
    this.baseUrl = env.IVR_API_BASE_URL ?? 'https://api.ivrsolutions.in';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('IVR API response', {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('IVR API error', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  get isConfigured(): boolean {
    return !!(this.token && this.subdomain);
  }

  /**
   * Click-to-Call: Initiates a bridge call between agent and customer
   * Endpoint: GET /api/c2c_get
   * Params: token, did, ext_no, phone
   */
  async initiateClickToCall(params: {
    agentExtension: string;
    did: string;
    customerPhone: string;
  }): Promise<ClickToCallResult> {
    if (!this.isConfigured) {
      return { success: false, message: 'IVR integration not configured. Please set IVR_API_TOKEN and IVR_SUBDOMAIN.' };
    }

    try {
      // Clean phone number (remove spaces, dashes, country code if needed)
      const cleanPhone = params.customerPhone.replace(/\D/g, '').replace(/^91/, '');

      const url = `/api/c2c_get`;
      const response = await this.client.get(url, {
        params: {
          token: this.token,
          did: params.did,
          ext_no: params.agentExtension,
          phone: cleanPhone,
        },
      });

      const data = response.data;

      // IVR Solutions returns success/failure in various formats
      if (data?.status === 'success' || data?.Success === true || response.status === 200) {
        return {
          success: true,
          callId: data?.call_id ?? data?.CallId ?? data?.unique_id ?? undefined,
          message: data?.message ?? 'Call initiated successfully',
          rawResponse: data,
        };
      } else {
        return {
          success: false,
          message: data?.message ?? data?.error ?? 'Call initiation failed',
          rawResponse: data,
        };
      }
    } catch (error) {
      const err = error as Error;
      logger.error('Click-to-Call failed', { error: err.message, params });
      return { success: false, message: err.message };
    }
  }

  /**
   * Fetch Click-to-Call logs
   */
  async getCTCLogs(params: {
    fromDate: string;
    toDate: string;
    phone?: string;
    agentExtension?: string;
  }): Promise<CallLogEntry[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await this.client.get('/api/ctc_logs', {
        params: {
          token: this.token,
          from_date: params.fromDate,
          to_date: params.toDate,
          phone: params.phone,
          ext_no: params.agentExtension,
        },
      });

      const data = response.data;
      if (!Array.isArray(data?.data ?? data)) return [];

      const logs = Array.isArray(data) ? data : data.data;
      return logs.map((log: Record<string, unknown>) => ({
        callId: (log.call_id ?? log.unique_id ?? '') as string,
        callerNumber: (log.caller_no ?? log.from ?? '') as string,
        customerNumber: (log.customer_no ?? log.phone ?? log.to ?? '') as string,
        agentExtension: (log.ext_no ?? log.agent_ext ?? '') as string,
        did: (log.did ?? '') as string,
        duration: typeof log.duration === 'number' ? log.duration : parseInt(log.duration as string ?? '0'),
        status: (log.status ?? '') as string,
        startTime: (log.start_time ?? log.created_at ?? '') as string,
        endTime: (log.end_time ?? '') as string,
        recordingUrl: (log.recording_url ?? log.recording ?? '') as string,
        direction: 'outbound',
      }));
    } catch (error) {
      logger.error('Failed to fetch CTC logs', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Fetch general call logs (inbound/outbound)
   */
  async getCallLogs(params: {
    fromDate: string;
    toDate: string;
    phone?: string;
    direction?: 'inbound' | 'outbound';
  }): Promise<CallLogEntry[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await this.client.get('/api/call_logs', {
        params: {
          token: this.token,
          from_date: params.fromDate,
          to_date: params.toDate,
          phone: params.phone,
          type: params.direction,
        },
      });

      const data = response.data;
      if (!Array.isArray(data?.data ?? data)) return [];

      const logs = Array.isArray(data) ? data : data.data;
      return logs.map((log: Record<string, unknown>) => ({
        callId: (log.call_id ?? log.unique_id ?? '') as string,
        callerNumber: (log.caller_no ?? log.from ?? '') as string,
        customerNumber: (log.customer_no ?? log.phone ?? log.to ?? '') as string,
        agentExtension: (log.ext_no ?? '') as string,
        did: (log.did ?? '') as string,
        duration: typeof log.duration === 'number' ? log.duration : parseInt(log.duration as string ?? '0'),
        status: (log.status ?? '') as string,
        startTime: (log.start_time ?? log.created_at ?? '') as string,
        endTime: (log.end_time ?? '') as string,
        recordingUrl: (log.recording_url ?? '') as string,
        direction: (log.direction ?? params.direction ?? 'outbound') as 'inbound' | 'outbound',
      }));
    } catch (error) {
      logger.error('Failed to fetch call logs', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Change dialer campaign status (start/pause/stop)
   */
  async changeDialerStatus(dialerId: string, status: 'start' | 'pause' | 'stop'): Promise<DialerStatusChangeResult> {
    if (!this.isConfigured) {
      return { success: false, message: 'IVR not configured' };
    }

    try {
      const response = await this.client.post('/api/change_dialer_status', {
        token: this.token,
        dialer_id: dialerId,
        status,
      });

      const data = response.data;
      return {
        success: data?.status === 'success' || response.status === 200,
        message: data?.message,
      };
    } catch (error) {
      logger.error('Failed to change dialer status', { error: (error as Error).message, dialerId, status });
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Add phone numbers to an active dialer campaign
   */
  async addToDialer(dialerId: string, phones: string[]): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const response = await this.client.post('/api/add_to_dialer', {
        token: this.token,
        dialer_id: dialerId,
        phones: phones.join(','),
      });

      return response.data?.status === 'success' || response.status === 200;
    } catch (error) {
      logger.error('Failed to add to dialer', { error: (error as Error).message, dialerId });
      return false;
    }
  }

  /**
   * Toggle IVR agent status (active/inactive)
   */
  async toggleAgentStatus(agentId: string, status: 'active' | 'inactive'): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const response = await this.client.post('/api/toggle_agent_status', {
        token: this.token,
        agent_id: agentId,
        status,
      });

      return response.data?.status === 'success' || response.status === 200;
    } catch (error) {
      logger.error('Failed to toggle agent status', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Test IVR API connection
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.isConfigured) {
      return { connected: false, message: 'IVR credentials not configured' };
    }

    try {
      // Try to fetch recent call logs as a connectivity test
      const response = await this.client.get('/api/call_logs', {
        params: {
          token: this.token,
          from_date: new Date().toISOString().split('T')[0],
          to_date: new Date().toISOString().split('T')[0],
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        return { connected: true, message: 'IVR API connection successful' };
      } else {
        return { connected: false, message: `Unexpected response: ${response.status}` };
      }
    } catch (error) {
      const err = error as Error;
      return { connected: false, message: err.message };
    }
  }
}

export const ivrService = new IVRService();

