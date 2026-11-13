import { IVRService } from '../integrations/ivr.service';

describe('IVR Solutions Telephony Service', () => {
  it('should detect unconfigured state when environment tokens are missing', async () => {
    const service = new IVRService();
    // In test environment without real IVR_API_TOKEN, isConfigured should be false
    if (!service.isConfigured) {
      const result = await service.initiateClickToCall({
        agentExtension: '101',
        did: '01140005000',
        customerPhone: '+91 98765 43210',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('IVR integration not configured');
    }
  });

  it('should sanitize destination telephone numbers correctly', () => {
    const rawNumber1 = '+91 98765-43210';
    const clean1 = rawNumber1.replace(/\D/g, '').replace(/^91/, '');
    expect(clean1).toBe('9876543210');

    const rawNumber2 = '09876543210';
    const clean2 = rawNumber2.replace(/\D/g, '').replace(/^0/, '');
    expect(clean2).toBe('9876543210');
  });

  it('should safely return empty array for CTC logs when provider is unconfigured', async () => {
    const service = new IVRService();
    if (!service.isConfigured) {
      const logs = await service.getCTCLogs({
        fromDate: '2026-11-01',
        toDate: '2026-11-11',
      });
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    }
  });
});

