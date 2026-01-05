import apiClient from './client'

// Types
export interface EmailLog {
  id: number
  to_email: string
  subject: string
  email_type: string
  status: 'pending' | 'sent' | 'failed'
  error_message?: string
  created_at: string
  sent_at?: string
  team_id?: number
}

export interface EmailLogListResponse {
  items: EmailLog[]
  total: number
  page: number
  pages: number
}

export interface EmailStats {
  total: number
  sent: number
  failed: number
  pending: number
  by_type: Record<string, number>
}

export interface MassMailingCampaign {
  id: number
  name: string
  subject: string
  body: string
  target_type: string
  target_season_id?: number
  total_recipients: number
  sent_count: number
  failed_count: number
  is_sent: boolean
  created_at: string
  sent_at?: string
}

export interface MassMailingListResponse {
  items: MassMailingCampaign[]
  total: number
  page: number
  pages: number
}

export interface CreateCampaignData {
  name: string
  subject: string
  body: string
  target_type: 'all_teams' | 'approved_teams' | 'pending_teams'
  target_season_id?: number
}

export interface SendCustomEmailData {
  to: string[]
  subject: string
  body: string
  html?: string
}

// API
export const emailsApi = {
  // Email logs
  getLogs: async (params?: {
    page?: number
    limit?: number
    email_type?: string
    status?: string
    search?: string
  }): Promise<EmailLogListResponse> => {
    const response = await apiClient.get('/emails/logs', { params })
    return response.data
  },

  getStats: async (): Promise<EmailStats> => {
    const response = await apiClient.get('/emails/logs/stats')
    return response.data
  },

  // Mass mailing campaigns
  getCampaigns: async (params?: {
    page?: number
    limit?: number
  }): Promise<MassMailingListResponse> => {
    const response = await apiClient.get('/emails/campaigns', { params })
    return response.data
  },

  createCampaign: async (data: CreateCampaignData): Promise<MassMailingCampaign> => {
    const response = await apiClient.post('/emails/campaigns', data)
    return response.data
  },

  sendCampaign: async (campaignId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/emails/campaigns/${campaignId}/send`)
    return response.data
  },

  deleteCampaign: async (campaignId: number): Promise<void> => {
    await apiClient.delete(`/emails/campaigns/${campaignId}`)
  },

  // Custom email
  sendCustom: async (data: SendCustomEmailData): Promise<{ message: string }> => {
    const response = await apiClient.post('/emails/send-custom', data)
    return response.data
  }
}

