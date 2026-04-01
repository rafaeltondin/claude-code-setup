// Página de Configurações com Setup Wizard em 3 etapas
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Save
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useSettings, useUpdateSettings } from '../api/hooks';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';

type SettingsStep = 'account' | 'email';

const accountSchema = z.object({
  name:  z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
});

const emailSchema = z.object({
  smtpHost:      z.string().optional(),
  smtpPort:      z.number().optional(),
  smtpUser:      z.string().optional(),
  smtpPass:      z.string().optional(),
  imapHost:      z.string().optional(),
  imapPort:      z.number().optional(),
  emailFrom:     z.string().email('Email inválido').optional().or(z.literal('')),
  emailFromName: z.string().optional(),
});

type AccountForm    = z.infer<typeof accountSchema>;
type EmailForm      = z.infer<typeof emailSchema>;

const STEPS: { key: SettingsStep; label: string; icon: React.ReactNode }[] = [
  { key: 'account',   label: 'Conta',           icon: <User size={16} /> },
  { key: 'email',     label: 'Email SMTP/IMAP', icon: <Mail size={16} /> },
];

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label, id, error, type = 'text', placeholder, hint, ...props
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  placeholder?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword && show ? 'text' : type;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-[#9898aa]">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={actualType}
          placeholder={placeholder}
          {...props}
          className={`w-full px-3 py-2.5 bg-[#16161f] border rounded-md text-sm text-[#f0f0f5] placeholder-[#9898aa] focus:outline-none transition-colors ${
            isPassword ? 'pr-9' : ''
          } ${error ? 'border-red-500/60' : 'border-[rgba(255,255,255,0.08)] focus:border-[#7c6aef]/60'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9898aa] hover:text-[#f0f0f5]"
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-[#9898aa]">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}


export function Settings({ defaultTab }: { defaultTab?: SettingsStep } = {}) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState<SettingsStep>(defaultTab ?? 'account');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<'ok' | 'fail' | null>(null);

  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const storedUser = localStorage.getItem('auth_user');
  let user: { name?: string; email?: string } | null = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }


  // Form Conta
  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  // Form Email
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    values: {
      smtpHost:      settings?.smtpHost      ?? '',
      smtpPort:      settings?.smtpPort      ?? 587,
      smtpUser:      settings?.smtpUser      ?? '',
      smtpPass:      settings?.smtpPass      ?? '',
      imapHost:      settings?.imapHost      ?? '',
      imapPort:      settings?.imapPort      ?? 993,
      emailFrom:     settings?.emailFrom     ?? '',
      emailFromName: settings?.emailFromName ?? '',
    },
  });

  async function handleSaveEmail(data: EmailForm) {
    console.log('[Settings] Salvando configurações Email');
    try {
      await updateMutation.mutateAsync(data);
      showToast('Configurações Email salvas!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  }

  async function handleTestEmail() {
    console.log('[Settings] Testando conexão Email');
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      await apiClient.post('/settings/test-smtp');
      setEmailTestResult('ok');
      showToast('Email conectado com sucesso!', 'success');
    } catch (err) {
      setEmailTestResult('fail');
      showToast('Falha na conexão Email', 'error');
    } finally {
      setTestingEmail(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#7c6aef]" />
        <span className="ml-3 text-[#9898aa]">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Configurações"
        description="Configure sua conta, integrações e agente de prospecção"
        breadcrumb={[
          { label: 'Home', to: '/' },
          { label: 'Ecosystem', to: '/' },
          { label: 'Configurações' },
        ]}
      />

      {/* Layout */}
      <div className="flex" style={{ gap: 'var(--space-lg)' }}>
        {/* Nav lateral */}
        <nav
          className="w-48 shrink-0 rounded-lg border border-[rgba(255,255,255,0.08)] p-3 flex flex-col gap-1 self-start sticky top-20"
          style={{ background: '#16161f' }}
          aria-label="Seções de configuração"
        >
          {STEPS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => {
                console.log('[Settings] Trocando seção', { key });
                setActiveStep(key);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left ${
                activeStep === key
                  ? 'bg-[#7c6aef]/10 text-[#9080f5] border-l-2 border-l-[#7c6aef]'
                  : 'text-[#9898aa] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0f0f5]'
              }`}
              aria-current={activeStep === key ? 'page' : undefined}
            >
              <span className={activeStep === key ? 'text-[#9080f5]' : 'text-[#9898aa]'}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 rounded-lg border border-[rgba(255,255,255,0.08)] p-6" style={{ background: '#16161f' }}>
          {/* CONTA */}
          {activeStep === 'account' && (
            <form
              onSubmit={accountForm.handleSubmit((data) => {
                console.log('[Settings] Atualizando conta', data);
                showToast('Dados de conta atualizados localmente', 'info');
              })}
              className="flex flex-col gap-5"
            >
              <div>
                <h2 className="text-base font-semibold text-[#f0f0f5]">
                  Minha Conta
                </h2>
                <p className="text-xs text-[#9898aa] mt-1">Informações do usuário logado</p>
              </div>
              <FieldGroup>
                <Field
                  label="Nome *"
                  id="acc-name"
                  placeholder="Seu nome"
                  error={accountForm.formState.errors.name?.message}
                  {...accountForm.register('name')}
                />
                <Field
                  label="Email *"
                  id="acc-email"
                  type="email"
                  placeholder="seu@email.com"
                  error={accountForm.formState.errors.email?.message}
                  {...accountForm.register('email')}
                />
              </FieldGroup>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  <Save size={14} />
                  Salvar Conta
                </button>
              </div>
            </form>
          )}

          {/* EMAIL */}
          {activeStep === 'email' && (
            <form onSubmit={emailForm.handleSubmit(handleSaveEmail)} className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold text-[#f0f0f5]">
                  Email — SMTP/IMAP
                </h2>
                <p className="text-xs text-[#9898aa] mt-1">Configure o envio e recebimento de emails</p>
              </div>

              {/* SMTP */}
              <div>
                <p className="text-[13px] font-semibold text-[#9898aa] uppercase tracking-wide mb-3">SMTP (Envio)</p>
                <div className="flex flex-col gap-3">
                  <FieldGroup>
                    <Field label="Host SMTP" id="smtp-host" placeholder="smtp.gmail.com" {...emailForm.register('smtpHost')} />
                    <Field label="Porta SMTP" id="smtp-port" type="number" placeholder="587" hint="TLS: 587 | SSL: 465" {...emailForm.register('smtpPort', { valueAsNumber: true })} />
                  </FieldGroup>
                  <FieldGroup>
                    <Field label="Usuário" id="smtp-user" placeholder="seu@email.com" {...emailForm.register('smtpUser')} />
                    <Field label="Senha" id="smtp-pass" type="password" placeholder="••••••••" {...emailForm.register('smtpPass')} />
                  </FieldGroup>
                  <FieldGroup>
                    <Field label="Email Remetente" id="email-from" type="email" placeholder="noreply@empresa.com" error={emailForm.formState.errors.emailFrom?.message} {...emailForm.register('emailFrom')} />
                    <Field label="Nome Remetente" id="email-from-name" placeholder="Empresa Ltda" {...emailForm.register('emailFromName')} />
                  </FieldGroup>
                </div>
              </div>

              {/* IMAP */}
              <div>
                <p className="text-[13px] font-semibold text-[#9898aa] uppercase tracking-wide mb-3">IMAP (Recebimento)</p>
                <FieldGroup>
                  <Field label="Host IMAP" id="imap-host" placeholder="imap.gmail.com" {...emailForm.register('imapHost')} />
                  <Field label="Porta IMAP" id="imap-port" type="number" placeholder="993" hint="SSL: 993" {...emailForm.register('imapPort', { valueAsNumber: true })} />
                </FieldGroup>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border border-[rgba(255,255,255,0.08)] text-[#9898aa] hover:border-[rgba(255,255,255,0.14)] hover:text-[#f0f0f5] disabled:opacity-60 transition-colors"
                >
                  {testingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Testar Email
                </button>
                {emailTestResult === 'ok' && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={13} /> Conectado
                  </span>
                )}
                {emailTestResult === 'fail' && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle size={13} /> Falha na conexão
                  </span>
                )}
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white ml-auto disabled:opacity-60"
                  style={{ background: 'var(--accent)' }}
                >
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar Email
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
