import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { emailsApi, MassMailingCampaign, EmailStats, EmailLog, CreateCampaignData } from '../../api/emails'
import { seasonsApi } from '../../api/seasons'
import { Season } from '../../types'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'

type TabType = 'campaigns' | 'logs' | 'custom'

const targetTypeOptions = [
  { value: 'all_teams', label: 'Все команды' },
  { value: 'approved_teams', label: 'Подтверждённые команды' },
  { value: 'pending_teams', label: 'Ожидающие подтверждения' }
]

const statusLabels: Record<string, { label: string, color: string }> = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Отправлено', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Ошибка', color: 'bg-red-100 text-red-800' }
}

export default function MailingsPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  
  const [activeTab, setActiveTab] = useState<TabType>('campaigns')
  const [loading, setLoading] = useState(true)
  
  // Campaigns state
  const [campaigns, setCampaigns] = useState<MassMailingCampaign[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState<number | null>(null)
  
  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [logsPage, setLogsPage] = useState(1)
  const [logsPages, setLogsPages] = useState(1)
  const [stats, setStats] = useState<EmailStats | null>(null)
  
  // Custom email state
  const [customEmail, setCustomEmail] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [sendingCustom, setSendingCustom] = useState(false)
  
  // Seasons for campaign creation
  const [seasons, setSeasons] = useState<Season[]>([])
  
  // Campaign form
  const [campaignForm, setCampaignForm] = useState<CreateCampaignData>({
    name: '',
    subject: '',
    body: '',
    target_type: 'approved_teams',
    target_season_id: undefined
  })

  useEffect(() => {
    loadData()
  }, [activeTab, logsPage])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'campaigns') {
        // Load campaigns and seasons separately to handle errors
        try {
          const campaignsData = await emailsApi.getCampaigns()
          setCampaigns(campaignsData?.items || [])
        } catch (e) {
          console.error('Failed to load campaigns:', e)
          setCampaigns([])
        }
        
        try {
          const seasonsData = await seasonsApi.getList()
          setSeasons(seasonsData || [])
        } catch (e) {
          console.error('Failed to load seasons:', e)
          setSeasons([])
        }
      } else if (activeTab === 'logs') {
        try {
          const logsData = await emailsApi.getLogs({ page: logsPage, limit: 20 })
          setLogs(logsData?.items || [])
          setLogsPages(logsData?.pages || 1)
        } catch (e) {
          console.error('Failed to load logs:', e)
          setLogs([])
        }
        
        try {
          const statsData = await emailsApi.getStats()
          setStats(statsData)
        } catch (e) {
          console.error('Failed to load stats:', e)
          setStats(null)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.body) {
      toast.error('Заполните все обязательные поля')
      return
    }

    setCreating(true)
    try {
      await emailsApi.createCampaign(campaignForm)
      toast.success('Рассылка создана')
      setShowCreateModal(false)
      setCampaignForm({
        name: '',
        subject: '',
        body: '',
        target_type: 'approved_teams',
        target_season_id: undefined
      })
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании')
    } finally {
      setCreating(false)
    }
  }

  const handleSendCampaign = async (campaign: MassMailingCampaign) => {
    if (!confirm(`Вы уверены, что хотите отправить рассылку "${campaign.name}" для ${campaign.total_recipients} получателей?`)) {
      return
    }

    setSending(campaign.id)
    try {
      const result = await emailsApi.sendCampaign(campaign.id)
      toast.success(result.message)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при отправке')
    } finally {
      setSending(null)
    }
  }

  const handleDeleteCampaign = async (campaign: MassMailingCampaign) => {
    if (!confirm(`Удалить рассылку "${campaign.name}"?`)) {
      return
    }

    try {
      await emailsApi.deleteCampaign(campaign.id)
      toast.success('Рассылка удалена')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при удалении')
    }
  }

  const handleSendCustomEmail = async () => {
    const recipients = customEmail.to.split(',').map(e => e.trim()).filter(e => e)
    
    if (recipients.length === 0) {
      toast.error('Укажите получателей')
      return
    }
    if (!customEmail.subject || !customEmail.body) {
      toast.error('Заполните тему и текст письма')
      return
    }

    setSendingCustom(true)
    try {
      const result = await emailsApi.sendCustom({
        to: recipients,
        subject: customEmail.subject,
        body: customEmail.body
      })
      toast.success(result.message)
      setCustomEmail({ to: '', subject: '', body: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при отправке')
    } finally {
      setSendingCustom(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">
          Рассылки
        </h1>
        {isSuperAdmin && activeTab === 'campaigns' && (
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Создать рассылку
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-eurobot-blue text-eurobot-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <EnvelopeIcon className="w-5 h-5 inline mr-2" />
            Кампании рассылок
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-eurobot-blue text-eurobot-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            История отправок
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-eurobot-blue text-eurobot-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5 inline mr-2" />
            Отправить письмо
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <EnvelopeIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет созданных рассылок</p>
                  {isSuperAdmin && (
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      Создать первую рассылку
                    </Button>
                  )}
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          {campaign.is_sent ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <CheckCircleIcon className="w-3 h-3 inline mr-1" />
                              Отправлено
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              <ClockIcon className="w-3 h-3 inline mr-1" />
                              Черновик
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Тема:</strong> {campaign.subject}
                        </p>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {campaign.body}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>
                            <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                            {campaign.total_recipients} получателей
                          </span>
                          {campaign.is_sent && (
                            <>
                              <span className="text-green-600">
                                <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                                Успешно: {campaign.sent_count}
                              </span>
                              {campaign.failed_count > 0 && (
                                <span className="text-red-600">
                                  <XCircleIcon className="w-4 h-4 inline mr-1" />
                                  Ошибок: {campaign.failed_count}
                                </span>
                              )}
                            </>
                          )}
                          <span>
                            Создано: {formatDate(campaign.created_at)}
                          </span>
                          {campaign.sent_at && (
                            <span>
                              Отправлено: {formatDate(campaign.sent_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isSuperAdmin && !campaign.is_sent && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleSendCampaign(campaign)}
                            isLoading={sending === campaign.id}
                            leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
                          >
                            Отправить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            color="red"
                            onClick={() => handleDeleteCampaign(campaign)}
                            leftIcon={<TrashIcon className="w-4 h-4" />}
                          >
                            Удалить
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-500">Всего писем</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                    <div className="text-sm text-gray-500">Отправлено</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                    <div className="text-sm text-gray-500">Ошибок</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-500">В очереди</div>
                  </div>
                </div>
              )}

              {/* Logs table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Получатель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Тема
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Тип
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Дата
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Нет записей
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.to_email}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {log.subject}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.email_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[log.status]?.color || 'bg-gray-100'}`}>
                              {statusLabels[log.status]?.label || log.status}
                            </span>
                            {log.error_message && (
                              <div className="mt-1 text-xs text-red-500 truncate max-w-xs" title={log.error_message}>
                                {log.error_message}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPage === 1}
                    onClick={() => setLogsPage(p => p - 1)}
                  >
                    Назад
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    {logsPage} из {logsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPage === logsPages}
                    onClick={() => setLogsPage(p => p + 1)}
                  >
                    Вперёд
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Custom Email Tab */}
          {activeTab === 'custom' && (
            <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Отправить письмо</h2>
              <div className="space-y-4">
                <Input
                  label="Получатели"
                  value={customEmail.to}
                  onChange={(e) => setCustomEmail({ ...customEmail, to: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  helperText="Разделяйте несколько адресов запятой"
                />
                <Input
                  label="Тема письма"
                  value={customEmail.subject}
                  onChange={(e) => setCustomEmail({ ...customEmail, subject: e.target.value })}
                  placeholder="Тема сообщения"
                />
                <Textarea
                  label="Текст письма"
                  value={customEmail.body}
                  onChange={(e) => setCustomEmail({ ...customEmail, body: e.target.value })}
                  placeholder="Напишите текст письма..."
                  rows={8}
                />
                <Button
                  onClick={handleSendCustomEmail}
                  isLoading={sendingCustom}
                  leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
                >
                  Отправить
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-heading font-bold">
                Создать рассылку
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Название рассылки"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="Например: Напоминание о регистрации"
                required
              />
              <Select
                label="Целевая аудитория"
                value={campaignForm.target_type}
                onChange={(e) => setCampaignForm({ ...campaignForm, target_type: e.target.value as CreateCampaignData['target_type'] })}
                options={targetTypeOptions}
              />
              <Select
                label="Сезон (необязательно)"
                value={campaignForm.target_season_id?.toString() || ''}
                onChange={(e) => setCampaignForm({ 
                  ...campaignForm, 
                  target_season_id: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                options={[
                  { value: '', label: 'Все сезоны' },
                  ...seasons.map(s => ({ value: s.id.toString(), label: s.name }))
                ]}
              />
              <Input
                label="Тема письма"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                placeholder="Тема вашего письма"
                required
              />
              <Textarea
                label="Текст письма"
                value={campaignForm.body}
                onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                placeholder="Напишите текст рассылки..."
                rows={8}
                required
              />
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Важно!</p>
                    <p>После создания рассылку нужно будет вручную отправить. Количество получателей будет рассчитано автоматически.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleCreateCampaign}
                isLoading={creating}
              >
                Создать
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

