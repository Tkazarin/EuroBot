import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { contactsApi, ContactCreateData } from '../api/contacts'
import { useSettingsStore } from '../store/settingsStore'
import { useSmartCaptcha } from '../hooks/useSmartCaptcha'
import SEO from '../components/SEO'
import SmartCaptcha from '../components/ui/SmartCaptcha'
import YandexMap from '../components/YandexMap'
import Input from '../components/ui/Input'
import PhoneInput from '../components/ui/PhoneInput'
import Textarea from '../components/ui/Textarea'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'

const topicOptions = [
  { value: 'technical', label: 'Технические вопросы' },
  { value: 'registration', label: 'Регистрация и участие' },
  { value: 'sponsorship', label: 'Спонсорство и партнерство' },
  { value: 'press', label: 'Пресса' },
  { value: 'other', label: 'Другое' }
]

export default function ContactsPage() {
  const { settings } = useSettingsStore()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const { isEnabled: captchaEnabled, resetCaptcha } = useSmartCaptcha()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactCreateData>()

  const contactEmails = settings.contact_emails as Record<string, string> | undefined

  const onSubmit = async (data: ContactCreateData) => {
    // Check captcha if enabled
    if (captchaEnabled && !captchaToken) {
      toast.error('Пожалуйста, пройдите проверку капчи')
      return
    }

    setSubmitting(true)
    try {
      await contactsApi.send({
        ...data,
        recaptcha_token: captchaToken || undefined
      })
      setSuccess(true)
      reset()
      setCaptchaToken(null)
      resetCaptcha()
      toast.success('Сообщение отправлено!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при отправке')
      resetCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SEO
        title="Контакты"
        description="Свяжитесь с организаторами соревнований Евробот. Контактные данные и форма обратной связи."
        url="/contacts"
      />

      <div className="bg-eurobot-navy py-16">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            Контакты
          </h1>
          <p className="text-gray-300 text-lg">
            Свяжитесь с нами любым удобным способом
          </p>
        </div>
      </div>

      <section className="py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <div>
              <h2 className="section-title">Как с нами связаться</h2>

              {/* Email categories */}
              {contactEmails && (
                <div className="space-y-4 mb-8">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="w-6 h-6 text-eurobot-gold flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Технические вопросы</h3>
                      <a href={`mailto:${contactEmails.technical}`} className="text-eurobot-blue hover:underline">
                        {contactEmails.technical}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Вопросы по правилам, полю, роботам
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="w-6 h-6 text-eurobot-gold flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Регистрация и участие</h3>
                      <a href={`mailto:${contactEmails.registration}`} className="text-eurobot-blue hover:underline">
                        {contactEmails.registration}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Регистрация команд, организационные вопросы
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="w-6 h-6 text-eurobot-gold flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Спонсорство и партнерство</h3>
                      <a href={`mailto:${contactEmails.sponsorship}`} className="text-eurobot-blue hover:underline">
                        {contactEmails.sponsorship}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Сотрудничество, спонсорские предложения
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="w-6 h-6 text-eurobot-gold flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Пресса</h3>
                      <a href={`mailto:${contactEmails.press}`} className="text-eurobot-blue hover:underline">
                        {contactEmails.press}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Запросы от СМИ, аккредитация
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address and phone */}
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <MapPinIcon className="w-6 h-6 text-eurobot-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Адрес</h3>
                    <p className="text-gray-600">
                      ул. Косыгина, 17, корп. 1<br />
                      Москва, Россия
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <PhoneIcon className="w-6 h-6 text-eurobot-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Телефон</h3>
                    <a href="tel:+74951234567" className="text-eurobot-blue hover:underline">
                      +7 (495) 123-45-67
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div>
              <h2 className="section-title">Форма обратной связи</h2>
              
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card p-8 text-center"
                >
                  <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Сообщение отправлено!</h3>
                  <p className="text-gray-600 mb-4">
                    Мы ответим вам в ближайшее время
                  </p>
                  <Button onClick={() => setSuccess(false)} variant="outline">
                    Отправить ещё
                  </Button>
                </motion.div>
              ) : (
                <div className="card p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                      label="Ваше имя"
                      {...register('name', { required: 'Обязательное поле' })}
                      error={errors.name?.message}
                      placeholder="Иван Иванов"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Email"
                        type="email"
                        {...register('email', { 
                          required: 'Обязательное поле',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Некорректный email'
                          }
                        })}
                        error={errors.email?.message}
                        placeholder="email@example.com"
                      />
                      <PhoneInput
                        label="Телефон (необязательно)"
                        {...register('phone')}
                      />
                    </div>

                    <Select
                      label="Тема обращения"
                      options={topicOptions}
                      {...register('topic', { required: 'Обязательное поле' })}
                      error={errors.topic?.message}
                      placeholder="Выберите тему"
                    />

                    <Textarea
                      label="Сообщение"
                      rows={5}
                      {...register('message', { 
                        required: 'Обязательное поле',
                        minLength: { value: 10, message: 'Минимум 10 символов' }
                      })}
                      error={errors.message?.message}
                      placeholder="Опишите ваш вопрос..."
                    />

                    {/* Yandex SmartCaptcha */}
                    <SmartCaptcha
                      onVerify={(token) => setCaptchaToken(token)}
                      className="mt-2"
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={submitting}
                    >
                      Отправить сообщение
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section>
        <YandexMap
          center={[55.7025, 37.5547]}
          zoom={16}
          markers={[
            {
              coordinates: [55.7025, 37.5547],
              title: 'EUROBOT Россия',
              description: 'ул. Косыгина, 17, корп. 1, Москва'
            }
          ]}
          height="400px"
        />
      </section>
    </>
  )
}



